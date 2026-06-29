/**
 * Reusable R2 upload utilities.
 *
 * All uploads happen in two steps:
 *   1. Request a presigned PUT URL from the r2-storage Edge Function.
 *   2. PUT the file directly to R2 using that URL (no credentials in browser).
 *
 * Folder structure mirrors the spec:
 *   profiles/        avatars / host profile photos
 *   listings/        listing images
 *   listing-gallery/ tour package gallery / cover images
 *   kyc/             KYC documents (private)
 *   documents/       booking documents, package itineraries
 *   blog/            blog images
 */

import { presignPut, getPublicUrl, deleteR2Object, deleteR2Objects } from "./r2";

// ─── Validation ───────────────────────────────────────────────────────────────

const ALLOWED_EXTENSIONS = new Set([
  "jpg", "jpeg", "png", "webp", "gif", "svg",
  "pdf", "doc", "docx", "xls", "xlsx", "zip",
]);

const BLOCKED_EXTENSIONS = new Set([
  "exe", "bat", "sh", "cmd", "com", "pif", "msi", "vbs",
  "js", "jar", "py", "rb", "php", "ps1", "scr", "hta", "lnk",
]);

const IMAGE_MAX_BYTES   = 10 * 1024 * 1024; // 10 MB
const DOC_MAX_BYTES     = 20 * 1024 * 1024; // 20 MB

function getExt(filename: string): string {
  return filename.split(".").pop()?.toLowerCase() ?? "";
}

function validateImageFile(file: File): void {
  const ext = getExt(file.name);
  if (BLOCKED_EXTENSIONS.has(ext)) throw new Error(`File type .${ext} is blocked for security reasons.`);
  if (!ALLOWED_EXTENSIONS.has(ext)) throw new Error(`Unsupported file type .${ext}. Allowed: jpg, png, webp, gif, svg.`);
  if (!file.type.startsWith("image/") && ext !== "svg") throw new Error("Only image files are allowed.");
  if (file.size > IMAGE_MAX_BYTES) throw new Error(`Image must be under ${IMAGE_MAX_BYTES / 1024 / 1024} MB.`);
  if (file.size === 0) throw new Error("File is empty.");
}

function validateDocumentFile(file: File): void {
  const ext = getExt(file.name);
  if (BLOCKED_EXTENSIONS.has(ext)) throw new Error(`File type .${ext} is blocked for security reasons.`);
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    throw new Error(`Unsupported file type .${ext}. Allowed: jpg, png, pdf, doc, docx, xls, xlsx, zip.`);
  }
  if (file.size > DOC_MAX_BYTES) throw new Error(`Document must be under ${DOC_MAX_BYTES / 1024 / 1024} MB.`);
  if (file.size === 0) throw new Error("File is empty.");
}

// ─── Key generation ───────────────────────────────────────────────────────────

/**
 * Generate a collision-safe object key.
 * Result: `{folder}/{uuid}.{ext}`
 */
export function generateObjectKey(folder: string, filename: string): string {
  const ext = getExt(filename) || "bin";
  const uuid = crypto.randomUUID();
  return `${folder}/${uuid}.${ext}`;
}

// ─── Core upload helper ───────────────────────────────────────────────────────

async function uploadViaPresignedUrl(
  file: File,
  key: string
): Promise<{ key: string; publicUrl: string }> {
  const contentType = file.type || "application/octet-stream";

  // 1. Get presigned PUT URL + publicUrl from Edge Function (uses server-side R2_PUBLIC_URL)
  const { uploadUrl, publicUrl } = await presignPut(key, contentType, file.size);

  // 2. PUT the file directly to R2 using the presigned URL
  const res = await fetch(uploadUrl, {
    method: "PUT",
    body: file,
    headers: { "Content-Type": contentType },
  });

  if (!res.ok) {
    throw new Error(`Upload to R2 failed: ${res.status} ${res.statusText}`);
  }

  console.log(`[r2-upload] ✓ ${key} → ${publicUrl}`);
  return { key, publicUrl };
}

// ─── Public upload functions ──────────────────────────────────────────────────

/**
 * Upload an image file to the specified folder.
 *
 * @param file   The image File from an <input type="file">
 * @param folder R2 folder prefix (e.g. "profiles/userId", "listings/userId", "blog")
 * @returns      { key, publicUrl }
 */
export async function uploadImage(
  file: File,
  folder: string
): Promise<{ key: string; publicUrl: string }> {
  validateImageFile(file);
  const key = generateObjectKey(folder, file.name);
  return uploadViaPresignedUrl(file, key);
}

/**
 * Upload a document file to the specified folder.
 *
 * @param file   The File from an <input type="file">
 * @param folder R2 folder prefix (e.g. "kyc/userId/aadhaar/front", "documents")
 * @returns      { key, publicUrl }
 */
export async function uploadDocument(
  file: File,
  folder: string
): Promise<{ key: string; publicUrl: string }> {
  validateDocumentFile(file);
  const key = generateObjectKey(folder, file.name);
  return uploadViaPresignedUrl(file, key);
}

/**
 * Delete a single R2 object by key.
 * Safe to call with null / undefined / empty — will no-op.
 */
export async function deleteObject(key: string | null | undefined): Promise<void> {
  if (!key) return;
  await deleteR2Object(key);
  console.log(`[r2-upload] deleted ${key}`);
}

/**
 * Delete multiple R2 objects by key. Ignores empty/null entries.
 */
export async function deleteObjects(keys: (string | null | undefined)[]): Promise<void> {
  const validKeys = keys.filter((k): k is string => Boolean(k));
  if (validKeys.length === 0) return;
  await deleteR2Objects(validKeys);
  console.log(`[r2-upload] deleted ${validKeys.length} objects`);
}

// Re-export for consumers who only need these
export { getPublicUrl, presignGet } from "./r2";
export type { } from "./r2";
