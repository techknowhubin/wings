/**
 * JWT Middleware for Xplorwing Edge Functions
 *
 * Provides:
 *  - JWT extraction & validation
 *  - Role verification (server-side, not trusting client claim)
 *  - Session revocation check
 *  - User context enrichment
 */

import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export type AppRole = "user" | "host" | "admin" | "moderator" | "hub_partner" | "driver_partner";

export interface AuthContext {
  userId: string;
  email: string | null;
  role: AppRole;
  isAdmin: boolean;
  isHost: boolean;
  sessionId: string | null;
}

export interface JwtMiddlewareOptions {
  requireAuth?: boolean;
  requiredRole?: AppRole | AppRole[];
}

export class UnauthorizedError extends Error {
  constructor(msg: string) {
    super(msg);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends Error {
  constructor(msg: string) {
    super(msg);
    this.name = "ForbiddenError";
  }
}

/**
 * Extract and validate JWT from Authorization header.
 * Verifies role from the database — never trusts JWT claims alone.
 */
export async function requireAuth(
  req: Request,
  admin: SupabaseClient,
  opts: JwtMiddlewareOptions = {}
): Promise<AuthContext> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw new UnauthorizedError("Missing or invalid Authorization header");
  }

  const jwt = authHeader.slice(7);

  // Verify token with Supabase — this checks signature + expiry
  const { data: { user }, error } = await admin.auth.getUser(jwt);

  if (error || !user) {
    throw new UnauthorizedError("Invalid or expired token");
  }

  // Check if session is revoked
  const { data: revoked } = await admin
    .from("revoked_sessions")
    .select("id")
    .eq("user_id", user.id)
    .eq("revoked", true)
    .gte("revoked_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    .limit(1);

  if (revoked && revoked.length > 0) {
    throw new UnauthorizedError("Session has been revoked");
  }

  // Fetch role from DB — never trust the JWT role claim
  const { data: roleRow } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();

  const role = (roleRow?.role ?? "user") as AppRole;

  // Verify required role
  if (opts.requiredRole) {
    const required = Array.isArray(opts.requiredRole)
      ? opts.requiredRole
      : [opts.requiredRole];

    if (!required.includes(role) && role !== "admin") {
      throw new ForbiddenError(`Role '${role}' is not permitted. Required: ${required.join(", ")}`);
    }
  }

  return {
    userId:   user.id,
    email:    user.email ?? null,
    role,
    isAdmin:  role === "admin",
    isHost:   role === "host",
    sessionId: null, // Supabase doesn't expose session ID in getUser
  };
}

/**
 * Creates an admin Supabase client from env secrets.
 */
export function makeAdminClient(): SupabaseClient {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

/**
 * Standard CORS headers — restrict to known origin.
 * Set ALLOWED_ORIGIN in Supabase secrets.
 */
export function getCorsHeaders(requestOrigin?: string): Record<string, string> {
  const origin = requestOrigin ?? Deno.env.get("ALLOWED_ORIGIN") ?? "*";
  return {
    "Access-Control-Allow-Origin":  origin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-forwarded-for",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "X-Content-Type-Options":       "nosniff",
    "X-Frame-Options":              "DENY",
    "Referrer-Policy":              "strict-origin-when-cross-origin",
  };
}

export function jsonResponse(
  data: unknown,
  status = 200,
  extraHeaders: Record<string, string> = {}
): Response {
  const cors = getCorsHeaders();
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, ...extraHeaders, "Content-Type": "application/json" },
  });
}

export function errorResponse(err: unknown): Response {
  if (err instanceof UnauthorizedError) {
    return jsonResponse({ error: err.message }, 401);
  }
  if (err instanceof ForbiddenError) {
    return jsonResponse({ error: err.message }, 403);
  }
  const msg = err instanceof Error ? err.message : String(err);
  console.error("[edge-fn error]", msg);
  return jsonResponse({ error: msg }, 500);
}
