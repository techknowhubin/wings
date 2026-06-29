/**
 * Frontend R2 helper — NO credentials here.
 *
 * All R2 operations proxy through the r2-storage Supabase Edge Function,
 * which holds the credentials server-side. The browser only ever receives
 * short-lived presigned URLs or public CDN URLs.
 */

const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL ?? "").trim()
  || "https://uhtwkajqpuazxpnbaojx.supabase.co";

const SUPABASE_KEY = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "").trim()
  || "sb_publishable_kX4YhhekZFFrnYiSO0UEwg_u4CLPOJW";

export const R2_PUBLIC_URL = (import.meta.env.VITE_R2_PUBLIC_URL ?? "").trim();

/** Build a permanent public CDN URL for a public R2 object key. */
export function getPublicUrl(key: string): string {
  if (!R2_PUBLIC_URL) {
    console.warn("[r2] VITE_R2_PUBLIC_URL is not set. Images may not load.");
    return key;
  }
  return `${R2_PUBLIC_URL}/${key}`;
}

async function callEdgeFunction(body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const { supabase } = await import("@/integrations/supabase/client");
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token ?? SUPABASE_KEY;

  const res = await fetch(`${SUPABASE_URL}/functions/v1/r2-storage`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": SUPABASE_KEY,
      "Authorization": `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
  if (!res.ok) {
    throw new Error((data as any).error ?? `r2-storage returned ${res.status}`);
  }
  return data as Record<string, unknown>;
}

/**
 * Get a presigned PUT URL so the browser can upload directly to R2.
 * Expires in 5 minutes.
 */
export async function presignPut(
  key: string,
  contentType: string,
  size: number
): Promise<{ uploadUrl: string; publicUrl: string }> {
  const data = await callEdgeFunction({ action: "presign-put", key, contentType, size });
  // Prefer the server-side publicUrl (uses R2_PUBLIC_URL secret).
  // Fall back to local computation if the secret isn't set yet.
  const publicUrl = (data.publicUrl as string) || getPublicUrl(key);
  return { uploadUrl: data.url as string, publicUrl };
}

/**
 * Get a presigned GET URL for a private object (e.g. KYC documents).
 * Default expiry: 5 minutes.
 */
export async function presignGet(key: string, expiresIn = 300): Promise<string> {
  const data = await callEdgeFunction({ action: "presign-get", key, expiresIn });
  return data.url as string;
}

/** Delete a single R2 object by key. */
export async function deleteR2Object(key: string): Promise<void> {
  await callEdgeFunction({ action: "delete", key });
}

/** Delete multiple R2 objects by key. No-op if empty. */
export async function deleteR2Objects(keys: string[]): Promise<void> {
  if (keys.length === 0) return;
  await callEdgeFunction({ action: "delete-many", keys });
}
