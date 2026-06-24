import * as OTPAuth from 'otpauth';
import { supabase } from '@/integrations/supabase/client';
import { encryptField, decryptField } from './crypto';
import { toast } from 'sonner';

/**
 * Generate a new TOTP secret and provisioning URI for a given user email.
 * Note: Secret should be 20 bytes (160 bits) minimum for good security.
 */
export function generateTOTP(email: string, issuer: string = 'Xplorwing') {
  const secret = new OTPAuth.Secret({ size: 20 });
  const totp = new OTPAuth.TOTP({
    issuer,
    label: email,
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret,
  });

  return {
    secret: secret.base32,
    uri: totp.toString(),
  };
}

/**
 * Verify a 6-digit TOTP code against a base32 secret.
 */
export function verifyTOTP(secretBase32: string, token: string): boolean {
  const totp = new OTPAuth.TOTP({
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(secretBase32),
  });

  const delta = totp.validate({ token, window: 1 });
  return delta !== null;
}

/**
 * Generate 10 random 8-character recovery codes (hex).
 */
export function generateRecoveryCodes(): string[] {
  const codes = [];
  for (let i = 0; i < 10; i++) {
    // Generate an 8-character hex string
    const array = new Uint8Array(4);
    crypto.getRandomValues(array);
    const code = Array.from(array).map((b) => b.toString(16).padStart(2, '0')).join('');
    codes.push(code);
  }
  return codes;
}

/**
 * Save 2FA settings to the user's profile securely.
 * Encrypts the secret and recovery codes before storing.
 */
export async function enable2FA(userId: string, secretPlaintext: string, recoveryCodes: string[]) {
  try {
    const encryptedSecret = await encryptField(secretPlaintext);
    const encryptedCodes = await encryptField(JSON.stringify(recoveryCodes));

    const { error } = await supabase
      .from('profiles')
      .update({
        two_factor_enabled: true,
        two_factor_secret_encrypted: encryptedSecret,
        recovery_codes_encrypted: encryptedCodes,
        two_factor_enabled_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (error) throw error;
    
    // Log audit event securely using the RPC
    await supabase.rpc('log_audit_event', {
      p_user_id: userId,
      p_actor_id: userId,
      p_action: '2fa_enabled',
      p_entity_type: 'user',
      p_entity_id: userId,
      p_ip_address: 'client',
      p_metadata: { method: 'totp' }
    });

    return true;
  } catch (err) {
    console.error('Error enabling 2FA:', err);
    toast.error('Failed to save 2FA configuration securely.');
    return false;
  }
}

/**
 * Disable 2FA for the user.
 */
export async function disable2FA(userId: string) {
  try {
    const { error } = await supabase
      .from('profiles')
      .update({
        two_factor_enabled: false,
        two_factor_secret_encrypted: null,
        recovery_codes_encrypted: null,
        two_factor_enabled_at: null,
        otp_failed_attempts: 0,
        otp_locked_until: null,
      })
      .eq('id', userId);

    if (error) throw error;

    // Log audit event
    await supabase.from('audit_logs').insert({
      user_id: userId,
      actor_id: userId,
      action: '2fa_disabled',
      entity_type: 'user',
      entity_id: userId,
      ip_address: 'client',
      metadata: { method: 'totp' }
    });

    return true;
  } catch (err) {
    console.error('Error disabling 2FA:', err);
    toast.error('Failed to disable 2FA.');
    return false;
  }
}

/**
 * Check if user is locked out due to too many failed OTP attempts.
 */
export async function checkOTPLockout(userId: string): Promise<{ locked: boolean, remainingAttempts: number, lockedUntil: Date | null }> {
  const { data, error } = await supabase
    .from('profiles')
    .select('otp_failed_attempts, otp_locked_until')
    .eq('id', userId)
    .single();

  if (error || !data) return { locked: false, remainingAttempts: 5, lockedUntil: null };

  const failedAttempts = data.otp_failed_attempts || 0;
  const lockedUntil = data.otp_locked_until ? new Date(data.otp_locked_until) : null;

  if (lockedUntil && lockedUntil > new Date()) {
    return { locked: true, remainingAttempts: 0, lockedUntil };
  }

  return { locked: false, remainingAttempts: Math.max(0, 5 - failedAttempts), lockedUntil: null };
}

/**
 * Record a failed OTP attempt and possibly lock out.
 */
export async function recordFailedOTP(userId: string): Promise<{ locked: boolean, remainingAttempts: number }> {
  const { data } = await supabase
    .from('profiles')
    .select('otp_failed_attempts')
    .eq('id', userId)
    .single();

  const currentFailures = (data?.otp_failed_attempts || 0) + 1;
  const updates: any = { otp_failed_attempts: currentFailures };

  let locked = false;
  if (currentFailures >= 5) {
    // Lock for 15 minutes
    const lockTime = new Date();
    lockTime.setMinutes(lockTime.getMinutes() + 15);
    updates.otp_locked_until = lockTime.toISOString();
    locked = true;
  }

  await supabase.from('profiles').update(updates).eq('id', userId);
  
  await supabase.from('audit_logs').insert({
    user_id: userId,
    actor_id: userId,
    action: '2fa_failed_attempt',
    entity_type: 'user',
    entity_id: userId,
    ip_address: 'client',
    metadata: { attempt_number: currentFailures, locked_out: locked }
  });

  return { locked, remainingAttempts: Math.max(0, 5 - currentFailures) };
}

/**
 * Reset failed attempts on successful login.
 */
export async function resetOTPAttempts(userId: string) {
  await supabase.from('profiles').update({
    otp_failed_attempts: 0,
    otp_locked_until: null
  }).eq('id', userId);
  
  await supabase.from('audit_logs').insert({
    user_id: userId,
    actor_id: userId,
    action: '2fa_successful_verification',
    entity_type: 'user',
    entity_id: userId,
    ip_address: 'client',
    metadata: { method: 'totp' }
  });
}
