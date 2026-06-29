/**
 * r2-storage Edge Function
 *
 * Uses native Web Crypto API for SigV4 signing — no AWS SDK dependency.
 * Actions: presign-put, presign-get, delete, delete-many, delete-prefix
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ─── Config ──────────────────────────────────────────────────────────────────

const R2_ENDPOINT   = Deno.env.get("R2_ENDPOINT") ?? "";
const R2_BUCKET     = Deno.env.get("R2_BUCKET") ?? "";
const R2_ACCESS_KEY = Deno.env.get("R2_ACCESS_KEY_ID") ?? "";
const R2_SECRET_KEY = Deno.env.get("R2_SECRET_ACCESS_KEY") ?? "";
const R2_PUBLIC_URL = Deno.env.get("R2_PUBLIC_URL") ?? "";
const R2_REGION     = Deno.env.get("R2_REGION") ?? "auto";

const PRIMARY_ORIGIN = (Deno.env.get("ALLOWED_ORIGIN") ?? "https://xplorwing.com").split(",")[0].trim();
const ALLOWED_ORIGINS = new Set<string>([
  ...(Deno.env.get("ALLOWED_ORIGIN") ?? "https://xplorwing.com").split(",").map((s) => s.trim()),
  "http://localhost:8080",
  "http://localhost:5173",
  "http://localhost:3000",
]);

const BLOCKED_EXTENSIONS = new Set([
  "exe", "bat", "sh", "cmd", "com", "pif", "msi", "vbs", "jar", "py",
  "rb", "php", "ps1", "scr", "hta", "lnk",
]);

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/zip",
  "application/octet-stream",
]);

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_DOC_BYTES   = 20 * 1024 * 1024;

// ─── SigV4 helpers (Web Crypto) ───────────────────────────────────────────────

const enc = new TextEncoder();

async function hmac(key: Uint8Array | string, data: string): Promise<Uint8Array> {
  const rawKey = typeof key === "string" ? enc.encode(key) : key;
  const k = await crypto.subtle.importKey(
    "raw", rawKey, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", k, enc.encode(data));
  return new Uint8Array(sig);
}

function hex(bytes: Uint8Array): string {
  return Array.from(bytes, b => b.toString(16).padStart(2, "0")).join("");
}

async function sha256hex(data: string): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", enc.encode(data));
  return hex(new Uint8Array(hash));
}

async function signingKey(secret: string, date: string, region: string): Promise<Uint8Array> {
  const k1 = await hmac(`AWS4${secret}`, date);
  const k2 = await hmac(k1, region);
  const k3 = await hmac(k2, "s3");
  return hmac(k3, "aws4_request");
}

function isoDateTime(): { dt: string; d: string } {
  const now = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  return { dt: now, d: now.slice(0, 8) };
}

/** Encode path segments without double-encoding slashes */
function encodeKey(key: string): string {
  return key.split("/").map(encodeURIComponent).join("/");
}

/**
 * Generate a presigned URL (PUT or GET) for an R2 object.
 * Uses UNSIGNED-PAYLOAD (no body signing) which R2 supports.
 */
async function presignUrl(
  method: "PUT" | "GET",
  key: string,
  contentType: string | null,
  expiresIn: number
): Promise<string> {
  const { dt, d } = isoDateTime();
  const host = new URL(R2_ENDPOINT).host;
  const scope = `${d}/${R2_REGION}/s3/aws4_request`;

  // For PUT we include content-type in signed headers so R2 enforces the MIME
  const signedHeaders = method === "PUT" && contentType
    ? "content-type;host"
    : "host";

  const qp = new URLSearchParams({
    "X-Amz-Algorithm":     "AWS4-HMAC-SHA256",
    "X-Amz-Credential":    `${R2_ACCESS_KEY}/${scope}`,
    "X-Amz-Date":          dt,
    "X-Amz-Expires":       String(expiresIn),
    "X-Amz-SignedHeaders": signedHeaders,
  });
  // URLSearchParams sorts by insertion order; we need lexicographic sort
  const sortedQs = [...qp.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&");

  const canonicalHeaders = method === "PUT" && contentType
    ? `content-type:${contentType}\nhost:${host}\n`
    : `host:${host}\n`;

  const canonicalRequest = [
    method,
    `/${R2_BUCKET}/${encodeKey(key)}`,
    sortedQs,
    canonicalHeaders,
    signedHeaders,
    "UNSIGNED-PAYLOAD",
  ].join("\n");

  const stringToSign = [
    "AWS4-HMAC-SHA256",
    dt,
    scope,
    await sha256hex(canonicalRequest),
  ].join("\n");

  const sk  = await signingKey(R2_SECRET_KEY, d, R2_REGION);
  const sig = hex(await hmac(sk, stringToSign));

  return `${R2_ENDPOINT}/${R2_BUCKET}/${encodeKey(key)}?${sortedQs}&X-Amz-Signature=${sig}`;
}

/** Sign and execute a DELETE (or batch DELETE via POST with XML) directly. */
async function deleteObject(key: string): Promise<void> {
  const { dt, d } = isoDateTime();
  const host      = new URL(R2_ENDPOINT).host;
  const scope     = `${d}/${R2_REGION}/s3/aws4_request`;
  const uri       = `/${R2_BUCKET}/${encodeKey(key)}`;
  const payloadHash = await sha256hex("");

  const canonHeaders  = `host:${host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${dt}\n`;
  const signedHeaders = "host;x-amz-content-sha256;x-amz-date";

  const canonRequest = ["DELETE", uri, "", canonHeaders, signedHeaders, payloadHash].join("\n");
  const stringToSign = ["AWS4-HMAC-SHA256", dt, scope, await sha256hex(canonRequest)].join("\n");
  const sk  = await signingKey(R2_SECRET_KEY, d, R2_REGION);
  const sig = hex(await hmac(sk, stringToSign));

  const res = await fetch(`${R2_ENDPOINT}/${R2_BUCKET}/${encodeKey(key)}`, {
    method: "DELETE",
    headers: {
      "Authorization":          `AWS4-HMAC-SHA256 Credential=${R2_ACCESS_KEY}/${scope}, SignedHeaders=${signedHeaders}, Signature=${sig}`,
      "x-amz-content-sha256":   payloadHash,
      "x-amz-date":             dt,
      "host":                   host,
    },
  });

  if (!res.ok && res.status !== 204 && res.status !== 404) {
    throw new Error(`R2 DELETE failed: ${res.status}`);
  }
}

/** List objects with a prefix using S3 ListObjectsV2. */
async function listObjects(prefix: string, continuationToken?: string): Promise<{ keys: string[]; nextToken?: string }> {
  const { dt, d } = isoDateTime();
  const host      = new URL(R2_ENDPOINT).host;
  const scope     = `${d}/${R2_REGION}/s3/aws4_request`;
  const payloadHash = await sha256hex("");

  const qp: Record<string, string> = {
    "list-type": "2",
    "max-keys":  "1000",
    "prefix":    prefix,
  };
  if (continuationToken) qp["continuation-token"] = continuationToken;

  const qs = Object.entries(qp)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&");

  const canonHeaders  = `host:${host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${dt}\n`;
  const signedHeaders = "host;x-amz-content-sha256;x-amz-date";

  const canonRequest = ["GET", `/${R2_BUCKET}/`, qs, canonHeaders, signedHeaders, payloadHash].join("\n");
  const stringToSign = ["AWS4-HMAC-SHA256", dt, scope, await sha256hex(canonRequest)].join("\n");
  const sk  = await signingKey(R2_SECRET_KEY, d, R2_REGION);
  const sig = hex(await hmac(sk, stringToSign));

  const res = await fetch(`${R2_ENDPOINT}/${R2_BUCKET}/?${qs}`, {
    headers: {
      "Authorization":          `AWS4-HMAC-SHA256 Credential=${R2_ACCESS_KEY}/${scope}, SignedHeaders=${signedHeaders}, Signature=${sig}`,
      "x-amz-content-sha256":   payloadHash,
      "x-amz-date":             dt,
      "host":                   host,
    },
  });

  if (!res.ok) throw new Error(`R2 ListObjects failed: ${res.status}`);

  const xml  = await res.text();
  const keys = [...xml.matchAll(/<Key>([^<]+)<\/Key>/g)].map(m => m[1]);
  const nextToken = xml.match(/<NextContinuationToken>([^<]+)<\/NextContinuationToken>/)?.[1];
  return { keys, nextToken };
}

// ─── Validation ───────────────────────────────────────────────────────────────

function validateKey(key: string): void {
  if (!key || key.length > 1024) throw new Error("Invalid object key.");
  if (BLOCKED_EXTENSIONS.has(key.split(".").pop()?.toLowerCase() ?? ""))
    throw new Error(`File type is blocked for security reasons.`);
  if (key.includes("..") || key.startsWith("/")) throw new Error("Invalid key path.");
}

function validateContentType(ct: string): void {
  const base = ct.split(";")[0].trim().toLowerCase();
  if (!ALLOWED_MIME_TYPES.has(base) && !base.startsWith("image/"))
    throw new Error(`Content type '${ct}' is not allowed.`);
}

function validateSize(size: number, ct: string): void {
  const max = ct.startsWith("image/") ? MAX_IMAGE_BYTES : MAX_DOC_BYTES;
  if (size > max) throw new Error(`File exceeds ${max / 1024 / 1024} MB limit.`);
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

async function verifyUser(req: Request): Promise<{ id: string; isAdmin: boolean }> {
  const token  = (req.headers.get("authorization") ?? "").replace("Bearer ", "").trim();
  const apikey = req.headers.get("apikey") ?? Deno.env.get("SUPABASE_ANON_KEY") ?? "";

  const client = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const { data: { user }, error } = await client.auth.getUser(token || apikey);
  if (error || !user) throw new Error("Unauthorized: invalid or missing session.");

  const { data: roleRow } = await client
    .from("user_roles").select("role").eq("user_id", user.id).maybeSingle();

  return { id: user.id, isAdmin: roleRow?.role === "admin" };
}

// ─── CORS ─────────────────────────────────────────────────────────────────────

function corsHeaders(origin: string): Record<string, string> {
  const allowed = ALLOWED_ORIGINS.has(origin) ? origin : PRIMARY_ORIGIN;
  return {
    "Access-Control-Allow-Origin":  allowed,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

function json(data: unknown, status = 200, cors: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

// ─── Main ─────────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  const origin = req.headers.get("origin") ?? "";
  const cors   = corsHeaders(origin);

  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST")    return json({ error: "Method not allowed." }, 405, cors);

  if (!R2_ENDPOINT || !R2_BUCKET || !R2_ACCESS_KEY || !R2_SECRET_KEY) {
    console.error("[r2-storage] Missing R2 environment variables.");
    return json({ error: "Storage not configured. Contact support." }, 503, cors);
  }

  try {
    const body   = await req.json();
    const action = body.action as string;
    if (!action) return json({ error: "Missing 'action' field." }, 400, cors);

    const actor = await verifyUser(req);

    // ── presign-put ──────────────────────────────────────────────────────────
    if (action === "presign-put") {
      const { key, contentType = "application/octet-stream", size = 0 } = body;
      validateKey(key);
      validateContentType(contentType);
      validateSize(size, contentType);

      const url = await presignUrl("PUT", key, contentType, 300);
      const publicUrl = R2_PUBLIC_URL ? `${R2_PUBLIC_URL}/${key}` : null;
      console.log(`[r2-storage] presign-put user=${actor.id} key=${key}`);
      return json({ url, key, publicUrl }, 200, cors);
    }

    // ── presign-get ──────────────────────────────────────────────────────────
    if (action === "presign-get") {
      const { key, expiresIn = 300 } = body;
      validateKey(key);

      if (!actor.isAdmin && !key.includes(actor.id))
        return json({ error: "Forbidden: you can only access your own files." }, 403, cors);

      const url = await presignUrl("GET", key, null, Math.min(expiresIn, 3600));
      console.log(`[r2-storage] presign-get user=${actor.id} key=${key}`);
      return json({ url }, 200, cors);
    }

    // ── delete ───────────────────────────────────────────────────────────────
    if (action === "delete") {
      const { key } = body;
      validateKey(key);
      if (!actor.isAdmin && !key.includes(actor.id))
        return json({ error: "Forbidden: you can only delete your own files." }, 403, cors);

      await deleteObject(key);
      console.log(`[r2-storage] delete user=${actor.id} key=${key}`);
      return json({ success: true }, 200, cors);
    }

    // ── delete-many ──────────────────────────────────────────────────────────
    if (action === "delete-many") {
      const { keys } = body as { keys: string[] };
      if (!Array.isArray(keys) || keys.length === 0)
        return json({ error: "'keys' must be a non-empty array." }, 400, cors);
      if (keys.length > 1000)
        return json({ error: "Too many keys (max 1000)." }, 400, cors);

      keys.forEach(validateKey);
      if (!actor.isAdmin && keys.some(k => !k.includes(actor.id)))
        return json({ error: "Forbidden: can only delete your own files." }, 403, cors);

      await Promise.all(keys.map(deleteObject));
      console.log(`[r2-storage] delete-many user=${actor.id} count=${keys.length}`);
      return json({ success: true, deleted: keys.length }, 200, cors);
    }

    // ── delete-prefix (admin only) ───────────────────────────────────────────
    if (action === "delete-prefix") {
      if (!actor.isAdmin)
        return json({ error: "Forbidden: admin only." }, 403, cors);

      const { prefixes } = body as { prefixes: string[] };
      if (!Array.isArray(prefixes) || prefixes.length === 0)
        return json({ error: "'prefixes' must be a non-empty array." }, 400, cors);

      let totalDeleted = 0;
      for (const prefix of prefixes) {
        let nextToken: string | undefined;
        do {
          const { keys, nextToken: nt } = await listObjects(prefix, nextToken);
          if (keys.length > 0) {
            await Promise.all(keys.map(deleteObject));
            totalDeleted += keys.length;
          }
          nextToken = nt;
        } while (nextToken);
      }

      console.log(`[r2-storage] delete-prefix admin=${actor.id} deleted=${totalDeleted}`);
      return json({ success: true, deleted: totalDeleted }, 200, cors);
    }

    return json({ error: `Unknown action '${action}'.` }, 400, cors);

  } catch (err: unknown) {
    const msg    = err instanceof Error ? err.message : String(err);
    const isAuth = msg.toLowerCase().includes("unauthorized") || msg.toLowerCase().includes("forbidden");
    const status = isAuth ? (msg.includes("Forbidden") ? 403 : 401) : 500;
    console.error(`[r2-storage] Error (${status}):`, msg);
    return json({ error: msg }, status, cors);
  }
});
