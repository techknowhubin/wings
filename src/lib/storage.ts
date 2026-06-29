/**
 * Storage helpers — backed by Cloudflare R2.
 *
 * Drop-in replacement for the former Supabase Storage helpers.
 * Callers keep the same function signatures; only the backend changed.
 *
 * KYC documents are stored with their R2 object key (not a URL).
 * Call getKycDocumentUrl(key) to obtain a short-lived signed URL for display.
 */

import { uploadImage, uploadDocument } from "./r2-upload";
import { presignGet, getPublicUrl as r2PublicUrl } from "./r2";

// ─── Public URL helper ────────────────────────────────────────────────────────

/**
 * Build a permanent CDN URL for a public R2 object.
 * (Replaces supabase.storage.from(bucket).getPublicUrl(path))
 */
export function getPublicUrl(_bucket: string, key: string): string {
  return r2PublicUrl(key);
}

// ─── Signed URL helper ────────────────────────────────────────────────────────

const SIGNED_URL_EXPIRY_SECONDS = 300; // 5 minutes

/**
 * Get a short-lived presigned GET URL for a private R2 object (KYC documents).
 * (Replaces supabase.storage.from('user-documents').createSignedUrl(path, n))
 */
export async function getSignedUrl(
  _bucket: "user-documents",
  key: string,
  expiresInSeconds = SIGNED_URL_EXPIRY_SECONDS
): Promise<string | null> {
  if (!key) return null;
  try {
    return await presignGet(key, expiresInSeconds);
  } catch (err) {
    console.error(`[storage] Failed to create presigned URL for ${key}:`, err);
    return null;
  }
}

// ─── Upload helpers ───────────────────────────────────────────────────────────

/**
 * Upload a KYC document.
 * Returns the R2 object key (not a URL) — store the key in the DB.
 * Retrieve the document later with getKycDocumentUrl(key).
 *
 * Key pattern: kyc/{userId}/{documentType}/{uuid}.{ext}
 */
export async function uploadKycDocument(
  userId: string,
  file: File,
  documentType: string
): Promise<{ path: string | null; error: string | null }> {
  try {
    const { key } = await uploadDocument(file, `kyc/${userId}/${documentType}`);
    return { path: key, error: null };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[storage] KYC upload failed:", msg);
    return { path: null, error: msg };
  }
}

/**
 * Upload a listing image.
 * Returns the public R2 URL.
 *
 * Key pattern: listings/{hostId}/{uuid}.{ext}
 */
export async function uploadListingImage(
  hostId: string,
  file: File,
  _listingId?: string
): Promise<{ publicUrl: string | null; error: string | null }> {
  try {
    const { publicUrl } = await uploadImage(file, `listings/${hostId}`);
    return { publicUrl, error: null };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[storage] Listing image upload failed:", msg);
    return { publicUrl: null, error: msg };
  }
}

/**
 * Upload a profile avatar.
 * Returns the public R2 URL.
 *
 * Key pattern: profiles/{userId}/{uuid}.{ext}
 */
export async function uploadProfileAvatar(
  userId: string,
  file: File
): Promise<{ publicUrl: string | null; error: string | null }> {
  try {
    const { publicUrl } = await uploadImage(file, `profiles/${userId}`);
    return { publicUrl, error: null };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[storage] Avatar upload failed:", msg);
    return { publicUrl: null, error: msg };
  }
}

/**
 * Get a short-lived URL to display a KYC document.
 *
 * Pass the stored object key (not a full URL).
 * If the value is already a full URL (legacy Supabase URLs), returns it as-is.
 */
export async function getKycDocumentUrl(keyOrUrl: string): Promise<string | null> {
  if (!keyOrUrl) return null;
  // Legacy Supabase Storage URL or any absolute URL — return as-is
  if (keyOrUrl.startsWith("http")) return keyOrUrl;
  return getSignedUrl("user-documents", keyOrUrl);
}
