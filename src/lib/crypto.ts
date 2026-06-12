/**
 * Xplorwing Field-Level Encryption
 *
 * Calls the backend Deno Edge Function ('admin-actions') for AES-256-GCM
 * encryption/decryption, ensuring keys are never exposed to the frontend.
 * Uses local SHA-256 for deterministic hashing (search & uniqueness checks).
 */

import { supabase } from '@/integrations/supabase/client';

const ENC_PREFIX = 'gcm_';

// ─── Encryption ───────────────────────────────────────────────

/**
 * Encrypt plaintext using AES-256-GCM via Edge Function.
 * Returns a base64 string prefixed with "gcm_".
 */
export async function encryptField(plaintext: string): Promise<string> {
  if (!plaintext) return plaintext;
  if (plaintext.startsWith(ENC_PREFIX)) return plaintext; // already encrypted

  const { data, error } = await supabase.functions.invoke('admin-actions', {
    body: { action: 'encrypt', plaintext }
  });

  if (error || data?.error) {
    console.error('Encryption failed:', error || data?.error);
    throw new Error(error?.message || data?.error || 'Encryption failed');
  }

  return data.encrypted ?? '';
}

/**
 * Decrypt an AES-256-GCM ciphertext via Edge Function.
 * Input must start with "gcm_".
 * Non-admins must provide context (table, column, recordId) or the call will be rejected.
 */
export async function decryptField(
  ciphertext: string,
  context?: { table: string; column: string; recordId: string }
): Promise<string> {
  if (!ciphertext) return ciphertext;
  if (!ciphertext.startsWith(ENC_PREFIX)) return ciphertext; // not encrypted

  const { data, error } = await supabase.functions.invoke('admin-actions', {
    body: {
      action: 'decrypt',
      ciphertext,
      table: context?.table,
      column: context?.column,
      recordId: context?.recordId
    }
  });

  if (error || data?.error) {
    console.error('Decryption failed:', error || data?.error);
    throw new Error(error?.message || data?.error || 'Decryption failed');
  }

  return data.decrypted ?? '';
}

/**
 * Decrypt a field that might be plaintext (legacy) or encrypted.
 * Safe to call on any value.
 */
export async function safeDecrypt(
  value: string | null | undefined,
  context?: { table: string; column: string; recordId: string }
): Promise<string> {
  if (!value) return '';
  if (!value.startsWith(ENC_PREFIX)) return value;
  try {
    return await decryptField(value, context);
  } catch {
    return '[decryption failed]';
  }
}

// ─── Hashing (Safe to run locally on client) ──────────────────

/**
 * SHA-256 hash of a normalized value. Used for search & uniqueness.
 * Phone numbers are normalized to their last 10 digits before hashing.
 */
export async function hashField(value: string): Promise<string> {
  const normalized = normalizeForHash(value);
  const buf = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(normalized)
  );
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Hash a phone number (last 10 digits) for consistent lookup
 * regardless of country code format (+91XXXXXXXXXX vs XXXXXXXXXX).
 */
export async function hashPhone(phone: string): Promise<string> {
  const digits = phone.replace(/\D/g, '').slice(-10);
  return hashField(digits);
}

/**
 * Hash an email address (lowercase trimmed) for consistent lookup.
 */
export async function hashEmail(email: string): Promise<string> {
  return hashField(email.trim().toLowerCase());
}

// ─── Helpers ──────────────────────────────────────────────────

function normalizeForHash(value: string): string {
  return value.trim().toLowerCase();
}

// ─── Batch helpers ────────────────────────────────────────────

export interface EncryptedPiiPayload {
  phone_encrypted?: string;
  phone_hash?: string;
  email_encrypted?: string;
  email_hash?: string;
}

/**
 * Encrypt and hash PII fields before storing to Supabase.
 */
export async function prepareEncryptedPii(data: {
  phone?: string;
  email?: string;
}): Promise<EncryptedPiiPayload> {
  const result: EncryptedPiiPayload = {};

  if (data.phone) {
    result.phone_encrypted = await encryptField(data.phone);
    result.phone_hash      = await hashPhone(data.phone);
  }

  if (data.email) {
    result.email_encrypted = await encryptField(data.email);
    result.email_hash      = await hashEmail(data.email);
  }

  return result;
}

export interface EncryptedBankingPayload {
  gst_number_encrypted?: string;
  bank_account_encrypted?: string;
  ifsc_code_encrypted?: string;
  upi_id_encrypted?: string;
  pan_number_encrypted?: string;
}

/**
 * Encrypt banking/identity fields for host profiles.
 */
export async function prepareEncryptedBanking(data: {
  gstNumber?: string;
  bankAccount?: string;
  ifscCode?: string;
  upiId?: string;
  panNumber?: string;
}): Promise<EncryptedBankingPayload> {
  const result: EncryptedBankingPayload = {};

  if (data.gstNumber)   result.gst_number_encrypted   = await encryptField(data.gstNumber);
  if (data.bankAccount) result.bank_account_encrypted  = await encryptField(data.bankAccount);
  if (data.ifscCode)    result.ifsc_code_encrypted     = await encryptField(data.ifscCode);
  if (data.upiId)       result.upi_id_encrypted        = await encryptField(data.upiId);
  if (data.panNumber)   result.pan_number_encrypted    = await encryptField(data.panNumber);

  return result;
}
