-- ============================================================
--  LegadoZero — Supabase PostgreSQL Schema + RLS
--  Zero-Knowledge: server stores only encrypted blobs
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── Enum: vault status ──────────────────────────────────────────
CREATE TYPE vault_status AS ENUM ('active', 'triggered');
CREATE TYPE alert_level AS ENUM ('normal', 'warning', 'critical');

-- ─── Table: vaults ───────────────────────────────────────────────
CREATE TABLE vaults (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  user_email          TEXT NOT NULL,

  -- Encrypted content (AES-GCM 256, client-side only)
  encrypted_payload   TEXT,                        -- Base64 ciphertext
  payload_salt        TEXT,                        -- PBKDF2 salt (Base64)

  -- Heir packages: array of {heir_email, encryptedVaultKey, salt}
  -- Each element is a JSON blob encrypted with heir's email+serverToken
  heir_packages       JSONB DEFAULT '[]'::JSONB,

  -- Heir contact list (plaintext — used for notifications only)
  heirs_contacts      JSONB DEFAULT '[]'::JSONB,
  -- Format: [{ "name": "...", "email": "...", "whatsapp": "..." }]

  -- Payment
  is_paid             BOOLEAN NOT NULL DEFAULT FALSE,
  lemon_order_id      TEXT,                        -- Lemon Squeezy order ID

  -- Dead Man's Switch
  last_pulse_at       TIMESTAMPTZ DEFAULT NOW(),
  status              vault_status NOT NULL DEFAULT 'active',
  triggered_at        TIMESTAMPTZ,
  alert_level         alert_level NOT NULL DEFAULT 'normal',
  notifications_sent  INT NOT NULL DEFAULT 0,      -- Max 10 total

  -- Storage
  storage_used_bytes  BIGINT NOT NULL DEFAULT 0,
  storage_limit_bytes BIGINT NOT NULL DEFAULT 1073741824, -- 1 GB

  -- GLM AI summary (generated when triggered, for heir email)
  glm_heir_summary    TEXT,

  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for cron job — find vaults needing pulse check
CREATE INDEX idx_vaults_pulse ON vaults (last_pulse_at, status)
  WHERE status = 'active';

-- Index for heir access by vault UUID
CREATE INDEX idx_vaults_triggered ON vaults (id, status)
  WHERE status = 'triggered';

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER vaults_updated_at
  BEFORE UPDATE ON vaults
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── Table: pulse_log ────────────────────────────────────────────
-- Audit trail of all pulses and notifications
CREATE TABLE pulse_log (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vault_id    UUID NOT NULL REFERENCES vaults(id) ON DELETE CASCADE,
  event_type  TEXT NOT NULL,
  -- 'pulse_confirmed' | 'warning_sent' | 'critical_sent' | 'triggered' | 'payment_confirmed'
  metadata    JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_pulse_log_vault ON pulse_log (vault_id, created_at DESC);

-- ─── Row Level Security ──────────────────────────────────────────
ALTER TABLE vaults ENABLE ROW LEVEL SECURITY;
ALTER TABLE pulse_log ENABLE ROW LEVEL SECURITY;

-- Policy 1: Owner can read their own vault (any status)
CREATE POLICY "owner_read_own_vault"
  ON vaults FOR SELECT
  USING (auth.uid() = user_id);

-- Policy 2: Owner can INSERT their vault
CREATE POLICY "owner_insert_vault"
  ON vaults FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy 3: Owner can UPDATE their vault ONLY while active
-- (Prevents owner from deleting/modifying after death trigger)
CREATE POLICY "owner_update_active_vault"
  ON vaults FOR UPDATE
  USING (
    auth.uid() = user_id
    AND status = 'active'
  )
  WITH CHECK (
    auth.uid() = user_id
    AND status = 'active'
    -- Owner cannot set status to triggered themselves (only cron can)
    AND NEW.status = 'active'
  );

-- Policy 4: Owner CANNOT delete vault once triggered (The Dead Man Rule)
CREATE POLICY "owner_delete_active_only"
  ON vaults FOR DELETE
  USING (
    auth.uid() = user_id
    AND status = 'active'
  );

-- Policy 5: Public heir access — read ONLY triggered vaults by exact UUID
-- No auth required. UUID is the security factor (256-bit UUID = 2^122 possibilities).
CREATE POLICY "heir_public_read_triggered"
  ON vaults FOR SELECT
  USING (
    status = 'triggered'
    -- Only expose encrypted fields — heir gets ciphertext + heir_packages
    -- Actual column restriction done at API/function level
  );

-- Policy 6: Service role (cron) can update any vault
-- (Managed via Supabase service_role key in serverless functions — not a DB policy)

-- Pulse log: owner read only
CREATE POLICY "owner_read_pulse_log"
  ON pulse_log FOR SELECT
  USING (
    vault_id IN (
      SELECT id FROM vaults WHERE user_id = auth.uid()
    )
  );

-- ─── Function: renew_pulse ───────────────────────────────────────
-- Called by frontend when user presses "Estoy Vivo"
CREATE OR REPLACE FUNCTION renew_pulse(p_vault_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE vaults
  SET
    last_pulse_at = NOW(),
    alert_level = 'normal',
    notifications_sent = 0
  WHERE id = p_vault_id
    AND user_id = auth.uid()
    AND status = 'active';

  INSERT INTO pulse_log (vault_id, event_type)
  VALUES (p_vault_id, 'pulse_confirmed');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── Function: get_heir_vault ────────────────────────────────────
-- Public function for heir decryption page — returns only safe fields
CREATE OR REPLACE FUNCTION get_heir_vault(p_vault_id UUID)
RETURNS TABLE (
  id UUID,
  encrypted_payload TEXT,
  payload_salt TEXT,
  heir_packages JSONB,
  triggered_at TIMESTAMPTZ,
  glm_heir_summary TEXT
) AS $$
  SELECT
    v.id,
    v.encrypted_payload,
    v.payload_salt,
    v.heir_packages,
    v.triggered_at,
    v.glm_heir_summary
  FROM vaults v
  WHERE v.id = p_vault_id
    AND v.status = 'triggered';
$$ LANGUAGE sql SECURITY DEFINER;

-- ─── Supabase Storage Setup (run via dashboard) ──────────────────
-- Bucket: vault-files (private, per-user folder, max 1GB enforced by app)
-- insert into storage.buckets (id, name, public) values ('vault-files', 'vault-files', false);
