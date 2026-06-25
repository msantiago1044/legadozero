/**
 * LegadoZero — Zero-Knowledge Cryptography Engine
 * Uses Web Crypto API exclusively (AES-GCM 256-bit + PBKDF2)
 * All operations happen client-side. Server never sees plaintext.
 */

const PBKDF2_ITERATIONS = 600_000; // OWASP 2024 recommendation
const SALT_LENGTH = 32;
const IV_LENGTH = 12;

// ─── Key Derivation ───────────────────────────────────────────────

/**
 * Derive a 256-bit AES-GCM key from a password + salt using PBKDF2
 */
export async function deriveKey(password, salt) {
  const encoder = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );
  return window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt instanceof Uint8Array ? salt : encoder.encode(salt),
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    true, // extractable — needed to export for heir package
    ["encrypt", "decrypt"]
  );
}

/**
 * Generate a cryptographically random salt
 */
export function generateSalt() {
  return window.crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
}

/**
 * Generate a cryptographically random IV
 */
export function generateIV() {
  return window.crypto.getRandomValues(new Uint8Array(IV_LENGTH));
}

// ─── Encode / Decode helpers ──────────────────────────────────────

export function bufferToBase64(buffer) {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)));
}

export function base64ToBuffer(b64) {
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

// ─── Core Encrypt / Decrypt ───────────────────────────────────────

/**
 * Encrypt arbitrary data (string or ArrayBuffer) with a derived key.
 * Returns a Base64 string: [IV (12 bytes) + ciphertext]
 */
export async function encryptData(data, key) {
  const iv = generateIV();
  const encoder = new TextEncoder();
  const plaintext =
    typeof data === "string" ? encoder.encode(data) : data;

  const ciphertext = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    plaintext
  );

  // Prepend IV to ciphertext for storage
  const combined = new Uint8Array(iv.byteLength + ciphertext.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ciphertext), iv.byteLength);

  return bufferToBase64(combined.buffer);
}

/**
 * Decrypt a Base64 string produced by encryptData.
 * Returns an ArrayBuffer.
 */
export async function decryptData(encryptedBase64, key) {
  const combined = base64ToBuffer(encryptedBase64);
  const iv = combined.slice(0, IV_LENGTH);
  const ciphertext = combined.slice(IV_LENGTH);

  return window.crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    ciphertext
  );
}

// ─── Vault Payload ────────────────────────────────────────────────

/**
 * Encrypt a full vault payload (testament + files metadata)
 * Returns: { encryptedPayload: string, salt: string }
 */
export async function encryptVaultPayload(payload, masterPassword) {
  const salt = generateSalt();
  const key = await deriveKey(masterPassword, salt);
  const json = JSON.stringify(payload);
  const encryptedPayload = await encryptData(json, key);
  return {
    encryptedPayload,
    salt: bufferToBase64(salt.buffer),
  };
}

/**
 * Decrypt a vault payload given the encrypted string, salt, and password.
 * Returns the original JS object.
 */
export async function decryptVaultPayload(encryptedPayload, saltBase64, masterPassword) {
  const salt = base64ToBuffer(saltBase64);
  const key = await deriveKey(masterPassword, salt);
  const decrypted = await decryptData(encryptedPayload, key);
  const text = new TextDecoder().decode(decrypted);
  return JSON.parse(text);
}

// ─── Heir Package ─────────────────────────────────────────────────

/**
 * Encrypt the vault key with a token derived from heir's email + serverToken.
 * This is what gets stored server-side and sent to heirs on trigger.
 *
 * Protocol:
 * 1. Export the raw AES key from the vault
 * 2. Derive an "heir key" from (heirEmail + serverToken) via PBKDF2
 * 3. Encrypt the raw vault key with the heir key
 * 4. Store ciphertext on server — server never has plaintext key
 */
export async function createHeirPackage(vaultKey, heirEmail, serverToken) {
  const exportedKey = await window.crypto.subtle.exportKey("raw", vaultKey);
  const heirPassword = `${heirEmail.toLowerCase()}:${serverToken}`;
  const salt = generateSalt();
  const heirKey = await deriveKey(heirPassword, salt);
  const encryptedVaultKey = await encryptData(exportedKey, heirKey);

  return {
    encryptedVaultKey,
    salt: bufferToBase64(salt.buffer),
    algorithm: "AES-GCM-256-PBKDF2-600k",
    version: "1.0",
  };
}

/**
 * Heir-side: reconstruct vault key from heir package + server token
 */
export async function reconstructVaultKey(heirPackage, heirEmail, serverToken) {
  const { encryptedVaultKey, salt: saltBase64 } = heirPackage;
  const salt = base64ToBuffer(saltBase64);
  const heirPassword = `${heirEmail.toLowerCase()}:${serverToken}`;
  const heirKey = await deriveKey(heirPassword, salt);
  const rawVaultKey = await decryptData(encryptedVaultKey, heirKey);

  return window.crypto.subtle.importKey(
    "raw",
    rawVaultKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["decrypt"]
  );
}

// ─── File Encryption ──────────────────────────────────────────────

/**
 * Encrypt a File object. Returns { name, type, size, encryptedBase64 }
 */
export async function encryptFile(file, key) {
  const buffer = await file.arrayBuffer();
  const encryptedBase64 = await encryptData(buffer, key);
  return {
    name: file.name,
    type: file.type,
    size: file.size,
    encryptedBase64,
  };
}

/**
 * Decrypt an encrypted file record. Returns a Blob.
 */
export async function decryptFile(encryptedFileRecord, key) {
  const { name, type, encryptedBase64 } = encryptedFileRecord;
  const decrypted = await decryptData(encryptedBase64, key);
  return {
    name,
    blob: new Blob([decrypted], { type }),
  };
}

// ─── Biometric Auth (WebAuthn hint) ──────────────────────────────

/**
 * Check if the platform supports biometric/local authenticator.
 * Used to gate app open with Windows Hello / FaceID / Fingerprint.
 */
export async function checkBiometricSupport() {
  if (!window.PublicKeyCredential) return false;
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}
