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
import {
  S3Client,
  ListObjectsV2Command,
  DeleteObjectsCommand,
} from "npm:@aws-sdk/client-s3";

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

        // 4. Insert into hubs table (atomic — done server-side to guarantee email is stored)
        await admin.from('hubs').upsert({
          id: newUserId,
          hub_name: `${full_name} Hub`,
          owner_name: full_name,
          email,
          mobile: phone || '',
          district: assigned_district || '',
          area: assigned_area || '',
          status: 'active'
        });

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

      case "get_hub_partner_emails": {
        if (!ctx.isAdmin) throw new ForbiddenError("Unauthorized: admin only");

        const { userIds } = body;
        if (!Array.isArray(userIds) || userIds.length === 0) {
          return jsonResponse({ emails: {} });
        }

        const emails: Record<string, string> = {};
        await Promise.all(
          userIds.map(async (uid: string) => {
            try {
              const { data } = await admin.auth.admin.getUserById(uid);
              if (data?.user?.email) emails[uid] = data.user.email;
            } catch (_) { /* skip failed lookups */ }
          })
        );

        return jsonResponse({ emails });
      }

      case "send_hub_credentials": {
        if (!ctx.isAdmin) throw new ForbiddenError("Unauthorized: admin only");

        const { hubId, password: credPassword } = body;
        if (!hubId) return jsonResponse({ success: false, error: "hubId is required" });
        if (!credPassword) return jsonResponse({ success: false, error: "password is required" });

        // Step 1: resolve email + name — hubs table first, then auth.users fallback
        const { data: hubRow } = await admin
          .from('hubs')
          .select('email, owner_name, district, area')
          .eq('id', hubId)
          .maybeSingle();

        let partnerEmail: string | null = hubRow?.email ?? null;
        let partnerName: string | null = hubRow?.owner_name ?? null;

        if (!partnerEmail || !partnerName) {
          const { data: authUserData, error: authErr } = await admin.auth.admin.getUserById(hubId);
          if (authErr) console.error('[send_hub_credentials] getUserById error:', authErr.message);
          if (!partnerEmail) partnerEmail = authUserData?.user?.email ?? null;

          if (!partnerName) {
            const { data: prof } = await admin
              .from('profiles').select('full_name').eq('id', hubId).maybeSingle();
            partnerName = prof?.full_name
              ?? authUserData?.user?.user_metadata?.full_name
              ?? 'Hub Partner';
          }
        }

        console.log('[send_hub_credentials] hubId:', hubId, 'email:', partnerEmail, 'name:', partnerName);

        if (!partnerEmail) {
          return jsonResponse({ success: false, error: "Could not find email address for this hub partner" });
        }

        // Step 2: backfill hubs row if missing
        if (!hubRow) {
          const { error: upsertErr } = await admin.from('hubs').upsert({
            id: hubId,
            hub_name: `${partnerName} Hub`,
            owner_name: partnerName,
            email: partnerEmail,
            mobile: '',
            district: '',
            area: '',
            status: 'active',
          });
          if (upsertErr) console.error('[send_hub_credentials] hubs upsert error:', upsertErr.message);
        }

        // Step 3: send email via ZeptoMail
        const zeptoKey = Deno.env.get("ZEPTO_MAIL_API_KEY");
        if (!zeptoKey) {
          console.error('[send_hub_credentials] ZEPTO_MAIL_API_KEY not set');
          return jsonResponse({ success: false, error: "Email service not configured — ZEPTO_MAIL_API_KEY secret missing" });
        }

        const loginUrl = "https://xplorwing.com/auth";

        const emailHtml = `
          <div style="font-family:'Segoe UI',sans-serif;max-width:600px;margin:auto;background:#f9fafb;border-radius:12px;overflow:hidden;">
            <div style="background:#013220;padding:32px 40px;text-align:center;">
              <h1 style="color:#fff;margin:0;font-size:24px;font-weight:700;">Xplorwing</h1>
              <p style="color:#86efac;margin:8px 0 0;font-size:14px;">Hub Partner Platform</p>
            </div>
            <div style="padding:40px;background:#fff;">
              <h2 style="color:#013220;font-size:20px;margin:0 0 8px;">Welcome, ${partnerName}!</h2>
              <p style="color:#6b7280;font-size:14px;margin:0 0 28px;">Your Hub Partner account has been set up by the Xplorwing admin team. Use the credentials below to log in.</p>
              <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:20px 24px;margin-bottom:24px;">
                <p style="margin:0 0 12px;font-size:13px;font-weight:600;color:#166534;text-transform:uppercase;letter-spacing:0.5px;">Your Login Credentials</p>
                <table style="width:100%;border-collapse:collapse;">
                  <tr>
                    <td style="padding:6px 0;font-size:13px;color:#6b7280;width:80px;">Email</td>
                    <td style="padding:6px 0;font-size:14px;color:#111827;font-weight:600;">${partnerEmail}</td>
                  </tr>
                  <tr>
                    <td style="padding:6px 0;font-size:13px;color:#6b7280;">Password</td>
                    <td style="padding:6px 0;font-size:14px;color:#111827;font-weight:600;font-family:monospace;">${credPassword}</td>
                  </tr>
                </table>
              </div>
              <div style="text-align:center;margin-bottom:28px;">
                <a href="${loginUrl}" style="display:inline-block;background:#013220;color:#fff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:600;font-size:15px;">Log In to Dashboard →</a>
              </div>
              <p style="font-size:13px;color:#9ca3af;">We recommend changing your password after your first login.</p>
            </div>
            <div style="padding:20px 40px;background:#f9fafb;text-align:center;border-top:1px solid #e5e7eb;">
              <p style="font-size:12px;color:#9ca3af;margin:0;">© 2026 Xplorwing. All rights reserved.</p>
            </div>
          </div>`;

        let mailOk = false;
        let mailErrMsg = '';
        try {
          const mailRes = await fetch("https://api.zeptomail.in/v1.1/email", {
            method: "POST",
            headers: {
              "accept": "application/json",
              "content-type": "application/json",
              "Authorization": `Zoho-enczpt ${zeptoKey}`,
            },
            body: JSON.stringify({
              from: { address: "hello@xplorwing.com", name: "Xplorwing" },
              to: [{ email_address: { address: partnerEmail, name: partnerName } }],
              subject: "Your Hub Partner Login Credentials – Xplorwing",
              htmlbody: emailHtml,
            }),
          });

          const mailResult = await mailRes.json().catch(() => ({}));
          console.log('[send_hub_credentials] ZeptoMail status:', mailRes.status, 'body:', JSON.stringify(mailResult));

          if (mailRes.ok) {
            mailOk = true;
          } else {
            mailErrMsg = mailResult?.error?.message
              || mailResult?.message
              || mailResult?.data?.message
              || `ZeptoMail error ${mailRes.status}`;
          }
        } catch (fetchErr: any) {
          mailErrMsg = `Network error: ${fetchErr.message}`;
          console.error('[send_hub_credentials] fetch error:', fetchErr.message);
        }

        if (!mailOk) {
          return jsonResponse({ success: false, error: `Failed to send email: ${mailErrMsg}` });
        }

        return jsonResponse({ success: true });
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

        // Delete all user-owned R2 objects by prefix
        const r2Endpoint   = Deno.env.get("R2_ENDPOINT");
        const r2AccessKey  = Deno.env.get("R2_ACCESS_KEY_ID");
        const r2SecretKey  = Deno.env.get("R2_SECRET_ACCESS_KEY");
        const r2Bucket     = Deno.env.get("R2_BUCKET");

        if (r2Endpoint && r2AccessKey && r2SecretKey && r2Bucket) {
          const s3 = new S3Client({
            region: "auto",
            endpoint: r2Endpoint,
            credentials: { accessKeyId: r2AccessKey, secretAccessKey: r2SecretKey },
          });

          // All user-scoped prefixes in R2
          const prefixes = [
            `kyc/${userId}/`,
            `profiles/${userId}/`,
            `listings/${userId}/`,
          ];

          for (const prefix of prefixes) {
            try {
              let continuationToken: string | undefined;
              do {
                const list = await s3.send(new ListObjectsV2Command({
                  Bucket: r2Bucket,
                  Prefix: prefix,
                  MaxKeys: 1000,
                  ContinuationToken: continuationToken,
                }));
                const objects = list.Contents ?? [];
                if (objects.length > 0) {
                  await s3.send(new DeleteObjectsCommand({
                    Bucket: r2Bucket,
                    Delete: { Objects: objects.map(({ Key }) => ({ Key: Key! })), Quiet: true },
                  }));
                  console.log(`[admin-actions] delete_user R2 cleanup: ${prefix} (${objects.length} objects)`);
                }
                continuationToken = list.IsTruncated ? list.NextContinuationToken : undefined;
              } while (continuationToken);
            } catch (err) {
              console.error(`[admin-actions] R2 cleanup failed for prefix ${prefix}:`, err);
            }
          }
        } else {
          console.warn("[admin-actions] R2 credentials not set — skipping R2 file cleanup for delete_user.");
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
