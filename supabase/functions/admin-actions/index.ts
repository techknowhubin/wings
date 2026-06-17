/**
 * Admin Actions Edge Function
 * Handles privileged operations: role changes, suspend, ban, session revocation.
 * Every call requires a valid admin JWT verified server-side.
 */

import {
  requireAuth,
  makeAdminClient,
  jsonResponse,
  errorResponse,
  ForbiddenError,
} from "../_shared/jwt-middleware.ts";

const ENC_PREFIX = 'gcm_';
const IV_LENGTH = 12;
const SALT = 'xplorwing-v1';

function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

let _cryptoKey: CryptoKey | null = null;

async function getEncryptionKey(): Promise<CryptoKey> {
  if (_cryptoKey) return _cryptoKey;

  const raw = Deno.env.get("ENCRYPTION_KEY");
  if (!raw) {
    throw new Error('ENCRYPTION_KEY is not set in Deno environment variables.');
  }

  const keyBytes = base64ToBytes(raw);
  if (keyBytes.length !== 32) {
    throw new Error('ENCRYPTION_KEY must be exactly 32 bytes (base64-encoded).');
  }

  _cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyBytes,
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt']
  );

  return _cryptoKey;
}

async function encryptField(plaintext: string): Promise<string> {
  if (!plaintext) return plaintext;
  if (plaintext.startsWith(ENC_PREFIX)) return plaintext;

  const key = await getEncryptionKey();
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const encoded = new TextEncoder().encode(plaintext);

  const cipherBuf = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, additionalData: new TextEncoder().encode(SALT) },
    key,
    encoded
  );

  const combined = new Uint8Array(IV_LENGTH + cipherBuf.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(cipherBuf), IV_LENGTH);

  return ENC_PREFIX + bytesToBase64(combined);
}

async function decryptField(ciphertext: string): Promise<string> {
  if (!ciphertext) return ciphertext;
  if (!ciphertext.startsWith(ENC_PREFIX)) return ciphertext;

  const key = await getEncryptionKey();
  const combined = base64ToBytes(ciphertext.slice(ENC_PREFIX.length));

  const iv = combined.slice(0, IV_LENGTH);
  const data = combined.slice(IV_LENGTH);

  const plainBuf = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv, additionalData: new TextEncoder().encode(SALT) },
    key,
    data
  );

  return new TextDecoder().decode(plainBuf);
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin") ?? "*";
  const cors = {
    "Access-Control-Allow-Origin":  origin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };

  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const admin = makeAdminClient();

    // Verify JWT
    const ctx = await requireAuth(req, admin);

    const body = await req.json().catch(() => ({}));
    const { action, userId, newRole, reason, plaintext, ciphertext, plaintexts, ciphertexts } = body;

    const clientIp =
      req.headers.get("cf-connecting-ip") ??
      req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
      "unknown";

    switch (action) {
      case "encrypt": {
        if (plaintext === undefined) return jsonResponse({ error: "plaintext is required" }, 400);
        const encrypted = await encryptField(plaintext);
        return jsonResponse({ encrypted });
      }

      case "encrypt_batch": {
        if (!Array.isArray(plaintexts)) return jsonResponse({ error: "plaintexts must be an array" }, 400);
        const encrypted = await Promise.all(plaintexts.map(p => encryptField(p)));
        return jsonResponse({ encrypted });
      }

      case "create_hub_partner": {
        if (!ctx.isAdmin) {
          throw new ForbiddenError("Unauthorized: admin only");
        }
        const { email, password, full_name, phone, assigned_state, assigned_district, assigned_area } = body;
        
        if (!email || !password || !full_name) {
          return jsonResponse({ error: "Missing required fields" }, 400);
        }

        // 1. Create auth user securely
        const { data: user, error: createErr } = await admin.auth.admin.createUser({
          email,
          password,
          email_confirm: true, // auto-confirm since admin created
          user_metadata: { full_name, phone, role: 'hub_partner' }
        });
        
        if (createErr) {
          return jsonResponse({ error: createErr.message }, 400);
        }

        const newUserId = user.user.id;

        // 2. Insert into profiles
        const { error: profileErr } = await admin.from('profiles').upsert({
          id: newUserId,
          full_name,
          phone,
          role: 'hub_partner',
          assigned_state,
          assigned_district,
          assigned_area,
          account_status: 'active'
        });

        if (profileErr) {
          // If profile fails, rollback user creation to prevent orphaned records
          await admin.auth.admin.deleteUser(newUserId);
          return jsonResponse({ error: profileErr.message }, 400);
        }

        // 3. Insert into user_roles
        const { error: roleErr } = await admin.from('user_roles').upsert({ 
          user_id: newUserId, 
          role: 'hub_partner' 
        });

        if (roleErr) {
           // Best effort rollback
           await admin.auth.admin.deleteUser(newUserId);
           return jsonResponse({ error: roleErr.message }, 400);
        }

        await admin.from("audit_logs").insert({
          user_id:    newUserId,
          actor_id:   ctx.userId,
          action:     "admin_created_hub_partner",
          entity_type:"user",
          entity_id:  newUserId,
          ip_address: clientIp,
          metadata:   { assigned_state, assigned_district, assigned_area }
        });

        return jsonResponse({ success: true, userId: newUserId, email });
      }

      case "decrypt": {
        const { ciphertext, table, column, recordId } = body;
        if (ciphertext === undefined) return jsonResponse({ error: "ciphertext is required" }, 400);

        let isAuthorized = false;
        if (ctx.isAdmin) {
          isAuthorized = true;
        } else {
          if (table && recordId) {
            if (table === "profiles") {
              if (recordId === ctx.userId) isAuthorized = true;
            } else if (table === "host_profiles") {
              if (recordId === ctx.userId) isAuthorized = true;
            } else if (table === "user_documents") {
              if (recordId === ctx.userId) isAuthorized = true;
            } else if (table === "bookings") {
              const { data: booking } = await admin
                .from("bookings")
                .select("user_id, host_id")
                .eq("id", recordId)
                .maybeSingle();
              if (booking && (booking.user_id === ctx.userId || booking.host_id === ctx.userId)) {
                isAuthorized = true;
              }
            }
          }
        }

        if (!isAuthorized) {
          throw new ForbiddenError("Unauthorized to decrypt this record");
        }

        const decrypted = await decryptField(ciphertext);
        return jsonResponse({ decrypted });
      }

      case "decrypt_batch": {
        const { requests } = body;
        if (!Array.isArray(requests)) return jsonResponse({ error: "requests must be an array" }, 400);

        const decryptedList = [];
        for (const reqObj of requests) {
          const { ciphertext, table, column, recordId } = reqObj;
          let isAuthorized = false;

          if (ctx.isAdmin) {
            isAuthorized = true;
          } else {
            if (table && recordId) {
              if (table === "profiles") {
                if (recordId === ctx.userId) isAuthorized = true;
              } else if (table === "host_profiles") {
                if (recordId === ctx.userId) isAuthorized = true;
              } else if (table === "user_documents") {
                if (recordId === ctx.userId) isAuthorized = true;
              } else if (table === "bookings") {
                const { data: booking } = await admin
                  .from("bookings")
                  .select("user_id, host_id")
                  .eq("id", recordId)
                  .maybeSingle();
                if (booking && (booking.user_id === ctx.userId || booking.host_id === ctx.userId)) {
                  isAuthorized = true;
                }
              }
            }
          }

          if (!isAuthorized) {
            decryptedList.push("[unauthorized]");
          } else {
            try {
              decryptedList.push(await decryptField(ciphertext));
            } catch {
              decryptedList.push("[decryption failed]");
            }
          }
        }
        return jsonResponse({ decrypted: decryptedList });
      }

      case "change_role": {
        if (!ctx.isAdmin) {
          throw new ForbiddenError("Unauthorized: admin only");
        }
        if (!userId) return jsonResponse({ error: "userId is required" }, 400);
        if (!newRole) return jsonResponse({ error: "newRole is required" }, 400);

        const { data, error } = await admin.rpc("admin_change_user_role", {
          p_target_user_id: userId,
          p_new_role:        newRole,
          p_reason:          reason ?? null,
          p_actor_id:        ctx.userId,
        });
        if (error) throw error;

        await admin.from("audit_logs").insert({
          user_id:    userId,
          actor_id:   ctx.userId,
          action:     "admin_role_change",
          entity_type:"user",
          entity_id:  userId,
          ip_address: clientIp,
          metadata:   { new_role: newRole, reason, user_agent: req.headers.get("user-agent") ?? "unknown" },
        });

        return jsonResponse(data);
      }

      case "suspend": {
        if (!ctx.isAdmin) {
          throw new ForbiddenError("Unauthorized: admin only");
        }
        const { data, error } = await admin.rpc("admin_suspend_user", {
          p_user_id: userId,
          p_reason:  reason ?? "Policy violation",
          p_actor_id: ctx.userId,
        });
        if (error) throw error;

        // Also ban via Supabase Auth (prevents re-login)
        await admin.auth.admin.updateUserById(userId, { ban_duration: "876600h" }); // 100 years

        await admin.from("audit_logs").insert({
          user_id:    userId,
          actor_id:   ctx.userId,
          action:     "admin_user_suspended",
          entity_type:"user",
          entity_id:  userId,
          ip_address: clientIp,
          metadata:   { reason, user_agent: req.headers.get("user-agent") ?? "unknown" },
        });

        return jsonResponse(data);
      }

      case "ban": {
        if (!ctx.isAdmin) {
          throw new ForbiddenError("Unauthorized: admin only");
        }
        const { data, error } = await admin.rpc("admin_ban_user", {
          p_user_id: userId,
          p_reason:  reason ?? "Policy violation",
          p_actor_id: ctx.userId,
        });
        if (error) throw error;

        // Permanent ban via Supabase Auth
        await admin.auth.admin.updateUserById(userId, { ban_duration: "876600h" });

        await admin.from("audit_logs").insert({
          user_id:    userId,
          actor_id:   ctx.userId,
          action:     "admin_user_banned",
          entity_type:"user",
          entity_id:  userId,
          ip_address: clientIp,
          metadata:   { reason, user_agent: req.headers.get("user-agent") ?? "unknown" },
        });

        return jsonResponse(data);
      }

      case "reactivate": {
        if (!ctx.isAdmin) {
          throw new ForbiddenError("Unauthorized: admin only");
        }
        const { data, error } = await admin.rpc("admin_reactivate_user", {
          p_user_id: userId,
          p_actor_id: ctx.userId,
        });
        if (error) throw error;

        // Unban via Supabase Auth
        await admin.auth.admin.updateUserById(userId, { ban_duration: "none" });

        await admin.from("audit_logs").insert({
          user_id:    userId,
          actor_id:   ctx.userId,
          action:     "admin_user_reactivated",
          entity_type:"user",
          entity_id:  userId,
          ip_address: clientIp,
          metadata:   { user_agent: req.headers.get("user-agent") ?? "unknown" },
        });

        return jsonResponse(data);
      }

      case "revoke_sessions": {
        if (!ctx.isAdmin) {
          throw new ForbiddenError("Unauthorized: admin only");
        }
        const { error } = await admin.rpc("revoke_user_sessions", {
          p_user_id: userId,
          p_reason:  reason ?? "admin_forced_logout",
          p_actor_id: ctx.userId,
        });
        if (error) throw error;

        // Sign out everywhere via Supabase Auth
        await admin.auth.admin.signOut(userId, "global");

        return jsonResponse({ success: true });
      }

      case "delete_user": {
        if (!ctx.isAdmin) {
          throw new ForbiddenError("Unauthorized: admin only");
        }
        // First delete from storage
        const buckets = ['user-documents', 'listing-images', 'profiles'];
        for (const bucket of buckets) {
          try {
            const { data: files, error: listError } = await admin.storage.from(bucket).list(userId);
            if (listError) {
              console.error(`Error listing files in bucket ${bucket}:`, listError);
              continue;
            }
            if (files && files.length > 0) {
              const pathsToDelete = files.map(file => `${userId}/${file.name}`);
              const { error: deleteError } = await admin.storage.from(bucket).remove(pathsToDelete);
              if (deleteError) {
                console.error(`Error deleting files in bucket ${bucket}:`, deleteError);
              }
            }
          } catch (err) {
            console.error(`Failed to cleanup bucket ${bucket}:`, err);
          }
        }

        // Call the cascade delete RPC to clean public tables, log security event, and soft-delete bookings
        const { error: cascadeError } = await admin.rpc("admin_delete_user_cascade", {
          p_user_id: userId,
          p_reason: reason ?? "Admin deleted user",
          p_actor_id: ctx.userId,
        });
        if (cascadeError) throw cascadeError;

        // Delete from auth.users
        const { error: deleteError } = await admin.auth.admin.deleteUser(userId);
        if (deleteError) throw deleteError;

        return jsonResponse({ success: true });
      }

      case "assign_admin": {
        if (!ctx.isAdmin) {
          throw new ForbiddenError("Unauthorized: admin only");
        }
        // Extra guard: prevent accidental mass admin assignment
        const { data, error } = await admin.rpc("admin_assign_super_admin", {
          p_user_id: userId,
          p_actor_id: ctx.userId,
        });
        if (error) throw error;
        return jsonResponse(data);
      }

      case "remove_admin": {
        if (!ctx.isAdmin) {
          throw new ForbiddenError("Unauthorized: admin only");
        }
        if (userId === ctx.userId) {
          throw new ForbiddenError("Cannot remove your own admin role");
        }
        const { data, error } = await admin.rpc("admin_remove_super_admin", {
          p_user_id: userId,
          p_actor_id: ctx.userId,
        });
        if (error) throw error;
        return jsonResponse(data);
      }

      default:
        return jsonResponse({ error: `Unknown action: ${action}` }, 400);
    }
  } catch (err) {
    return errorResponse(err);
  }
});
