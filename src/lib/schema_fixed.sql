-- ============================================================
--  LegadoZero — Schema CORREGIDO para Supabase
--  Fix: eliminado NEW.status de WITH CHECK (no válido en RLS)
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── Tipos ENUM ──────────────────────────────────────────────────
-- Si ya existen, ignora el error y continúa
DO $$ BEGIN
  CREATE TYPE vault_status AS ENUM ('active', 'triggered');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE alert_level AS ENUM ('normal', 'warning', 'critical');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── Tabla: vaults ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS vaults (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  user_email          TEXT NOT NULL,

  encrypted_payload   TEXT,
  payload_salt        TEXT,
  heir_packages       JSONB DEFAULT '[]'::JSONB,
  heirs_contacts      JSONB DEFAULT '[]'::JSONB,

  is_paid             BOOLEAN NOT NULL DEFAULT FALSE,
  lemon_order_id      TEXT,

  last_pulse_at       TIMESTAMPTZ DEFAULT NOW(),
  status              vault_status NOT NULL DEFAULT 'active',
  triggered_at        TIMESTAMPTZ,
  alert_level         alert_level NOT NULL DEFAULT 'normal',
  notifications_sent  INT NOT NULL DEFAULT 0,

  storage_used_bytes  BIGINT NOT NULL DEFAULT 0,
  storage_limit_bytes BIGINT NOT NULL DEFAULT 1073741824,

  glm_heir_summary    TEXT,

  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_vaults_pulse
  ON vaults (last_pulse_at, status)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_vaults_triggered
  ON vaults (id, status)
  WHERE status = 'triggered';

-- ─── Trigger: auto-actualizar updated_at ─────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS vaults_updated_at ON vaults;
CREATE TRIGGER vaults_updated_at
  BEFORE UPDATE ON vaults
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── Tabla: pulse_log ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pulse_log (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vault_id    UUID NOT NULL REFERENCES vaults(id) ON DELETE CASCADE,
  event_type  TEXT NOT NULL,
  metadata    JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pulse_log_vault
  ON pulse_log (vault_id, created_at DESC);

-- ─── Row Level Security ──────────────────────────────────────────
ALTER TABLE vaults ENABLE ROW LEVEL SECURITY;
ALTER TABLE pulse_log ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas previas para evitar conflictos
DROP POLICY IF EXISTS "owner_read_own_vault"        ON vaults;
DROP POLICY IF EXISTS "owner_insert_vault"           ON vaults;
DROP POLICY IF EXISTS "owner_update_active_vault"    ON vaults;
DROP POLICY IF EXISTS "owner_delete_active_only"     ON vaults;
DROP POLICY IF EXISTS "heir_public_read_triggered"   ON vaults;
DROP POLICY IF EXISTS "owner_read_pulse_log"         ON pulse_log;

-- Política 1: propietario lee su propia bóveda
CREATE POLICY "owner_read_own_vault"
  ON vaults FOR SELECT
  USING (auth.uid() = user_id);

-- Política 2: propietario crea su bóveda
CREATE POLICY "owner_insert_vault"
  ON vaults FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Política 3: propietario actualiza SOLO mientras está activa
-- CORRECCIÓN: se eliminó NEW.status (no válido en RLS)
-- El bloqueo de cambio de status lo hace la función renew_pulse (SECURITY DEFINER)
CREATE POLICY "owner_update_active_vault"
  ON vaults FOR UPDATE
  USING (
    auth.uid() = user_id
    AND status = 'active'
  )
  WITH CHECK (
    auth.uid() = user_id
  );

-- Política 4: propietario no puede borrar bóveda disparada (La Regla del Muerto)
CREATE POLICY "owner_delete_active_only"
  ON vaults FOR DELETE
  USING (
    auth.uid() = user_id
    AND status = 'active'
  );

-- Política 5: herederos pueden leer bóvedas disparadas (solo por UUID exacto)
CREATE POLICY "heir_public_read_triggered"
  ON vaults FOR SELECT
  USING (
    status = 'triggered'
  );

-- Política 6: pulse_log — propietario lee su propio log
CREATE POLICY "owner_read_pulse_log"
  ON pulse_log FOR SELECT
  USING (
    vault_id IN (
      SELECT id FROM vaults WHERE user_id = auth.uid()
    )
  );

-- ─── Función: renew_pulse ────────────────────────────────────────
-- El usuario presiona "Estoy Vivo". Usa SECURITY DEFINER para
-- actualizar solo los campos permitidos, bloqueando cambios de status.
CREATE OR REPLACE FUNCTION renew_pulse(p_vault_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE vaults
  SET
    last_pulse_at      = NOW(),
    alert_level        = 'normal',
    notifications_sent = 0
  WHERE id        = p_vault_id
    AND user_id   = auth.uid()
    AND status    = 'active';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Vault not found, not owned by user, or already triggered';
  END IF;

  INSERT INTO pulse_log (vault_id, event_type)
  VALUES (p_vault_id, 'pulse_confirmed');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── Función: get_heir_vault ─────────────────────────────────────
-- Pública — devuelve solo campos cifrados de bóvedas disparadas
CREATE OR REPLACE FUNCTION get_heir_vault(p_vault_id UUID)
RETURNS TABLE (
  id               UUID,
  encrypted_payload TEXT,
  payload_salt     TEXT,
  heir_packages    JSONB,
  triggered_at     TIMESTAMPTZ,
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
  WHERE v.id     = p_vault_id
    AND v.status = 'triggered';
$$ LANGUAGE sql SECURITY DEFINER;

-- ─── Función: create_vault ───────────────────────────────────────
-- Crea la bóveda inicial para un usuario recién registrado
CREATE OR REPLACE FUNCTION create_vault(p_email TEXT)
RETURNS UUID AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO vaults (user_id, user_email)
  VALUES (auth.uid(), p_email)
  RETURNING id INTO v_id;

  INSERT INTO pulse_log (vault_id, event_type)
  VALUES (v_id, 'vault_created');

  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

