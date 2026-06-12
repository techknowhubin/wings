/**
 * Secure Storage Helpers
 *
 * - KYC / user-documents: always use signed URLs (private bucket)
 * - listing-images / profiles: direct public URL is fine
 */

import { supabase } from '@/integrations/supabase/client';

const SIGNED_URL_EXPIRY_SECONDS = 300; // 5 minutes

type Bucket = 'user-documents' | 'listing-images' | 'profiles';

/**
 * Get a signed URL for a private bucket file (KYC documents).
 * Expires in 5 minutes.
 */
export async function getSignedUrl(
  bucket: Extract<Bucket, 'user-documents'>,
  path: string,
  expiresInSeconds = SIGNED_URL_EXPIRY_SECONDS
): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresInSeconds);

  if (error) {
    console.error(`[storage] Failed to create signed URL for ${bucket}/${path}:`, error.message);
    return null;
  }
  return data.signedUrl;
}

/**
 * Get public URL for public bucket files (listings, profiles).
 */
export function getPublicUrl(
  bucket: Exclude<Bucket, 'user-documents'>,
  path: string
): string {
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Upload a KYC document to the private user-documents bucket.
 * Path is scoped to the user's folder: {userId}/{filename}
 */
export async function uploadKycDocument(
  userId: string,
  file: File,
  documentType: string
): Promise<{ path: string | null; error: string | null }> {
  const ext = file.name.split('.').pop() ?? 'jpg';
  const filename = `${documentType}_${Date.now()}.${ext}`;
  const path = `${userId}/${filename}`;

  const { error } = await supabase.storage
    .from('user-documents')
    .upload(path, file, {
      cacheControl: '0',
      upsert: false,
      contentType: file.type,
    });

  if (error) {
    return { path: null, error: error.message };
  }
  return { path, error: null };
}

/**
 * Upload a listing image to the public listing-images bucket.
 */
export async function uploadListingImage(
  hostId: string,
  file: File,
  listingId?: string
): Promise<{ publicUrl: string | null; error: string | null }> {
  const ext = file.name.split('.').pop() ?? 'jpg';
  const filename = `${listingId ?? Date.now()}_${crypto.randomUUID()}.${ext}`;
  const path = `${hostId}/${filename}`;

  const { error } = await supabase.storage
    .from('listing-images')
    .upload(path, file, { cacheControl: '3600', upsert: false });

  if (error) {
    return { publicUrl: null, error: error.message };
  }

  const publicUrl = getPublicUrl('listing-images', path);
  return { publicUrl, error: null };
}

/**
 * Upload a profile avatar to the public profiles bucket.
 */
export async function uploadProfileAvatar(
  userId: string,
  file: File
): Promise<{ publicUrl: string | null; error: string | null }> {
  const ext = file.name.split('.').pop() ?? 'jpg';
  const path = `${userId}/avatar.${ext}`;

  const { error } = await supabase.storage
    .from('profiles')
    .upload(path, file, { cacheControl: '3600', upsert: true });

  if (error) {
    return { publicUrl: null, error: error.message };
  }

  const publicUrl = getPublicUrl('profiles', path);
  return { publicUrl, error: null };
}

/**
 * Get a KYC document for display. Returns a short-lived signed URL.
 * Pass the stored path (not the full URL).
 */
export async function getKycDocumentUrl(path: string): Promise<string | null> {
  if (!path) return null;
  // If it's already a signed URL with an expiry, return as-is
  if (path.startsWith('http') && path.includes('token=')) return path;
  return getSignedUrl('user-documents', path);
}
