/**
 * Client-side Security Utilities
 *
 * - Input sanitization & validation
 * - Request signing
 * - Security headers helper
 * - Abuse detection
 */

// ─── Input Sanitization ───────────────────────────────────────

/**
 * Strip HTML tags and dangerous characters from user input.
 */
export function sanitizeInput(input: string): string {
  return input
    .replace(/<[^>]*>/g, '')
    .replace(/[<>"'`]/g, c => `&#${c.charCodeAt(0)};`)
    .trim();
}

export function sanitizeHtml(input: string): string {
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .trim();
}

// ─── Validation ───────────────────────────────────────────────

export const VALIDATION = {
  phone: /^\+?[0-9]{10,15}$/,
  email: /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/,
  aadhaar: /^[0-9]{12}$/,
  pan: /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/,
  ifsc: /^[A-Z]{4}0[A-Z0-9]{6}$/,
  gst: /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/,
  pincode: /^[0-9]{6}$/,
  upi: /^[\w.-]+@[\w]+$/,
};

export function validatePhone(phone: string): boolean {
  return VALIDATION.phone.test(phone.replace(/\s/g, ''));
}

export function validateEmail(email: string): boolean {
  return VALIDATION.email.test(email.trim());
}

export function validateAadhaar(num: string): boolean {
  return VALIDATION.aadhaar.test(num.replace(/\s/g, ''));
}

export function validatePan(pan: string): boolean {
  return VALIDATION.pan.test(pan.trim().toUpperCase());
}

export function validateIfsc(ifsc: string): boolean {
  return VALIDATION.ifsc.test(ifsc.trim().toUpperCase());
}

export function validateGst(gst: string): boolean {
  return VALIDATION.gst.test(gst.trim().toUpperCase());
}

// ─── SQL Injection Prevention ─────────────────────────────────

const SQL_INJECTION_PATTERNS = [
  /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/gi,
  /('|--|;|\/\*|\*\/|xp_)/gi,
];

export function containsSqlInjection(value: string): boolean {
  return SQL_INJECTION_PATTERNS.some(p => p.test(value));
}

export function assertSafeInput(value: string, fieldName = 'input'): void {
  if (containsSqlInjection(value)) {
    throw new Error(`Invalid characters in ${fieldName}`);
  }
}

// ─── XSS Prevention ───────────────────────────────────────────

const XSS_PATTERNS = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /javascript:/gi,
  /on\w+\s*=/gi,
  /<iframe/gi,
];

export function containsXss(value: string): boolean {
  return XSS_PATTERNS.some(p => p.test(value));
}

// ─── Amount Validation ────────────────────────────────────────

export function validatePaymentAmount(amount: number): boolean {
  if (!Number.isFinite(amount) || amount <= 0) return false;
  if (amount > 10_000_000) return false; // Max ₹1 Cr per transaction
  if (Math.round(amount * 100) !== amount * 100) return false; // Max 2 decimal places
  return true;
}

// ─── Content Security Policy ──────────────────────────────────

export function getSecurityHeaders(): Record<string, string> {
  const isDev = import.meta.env.DEV;
  return {
    'X-Content-Type-Options':        'nosniff',
    'X-Frame-Options':               'DENY',
    'X-XSS-Protection':             '1; mode=block',
    'Referrer-Policy':               'strict-origin-when-cross-origin',
    'Permissions-Policy':            'camera=(), microphone=(), geolocation=(self), payment=(self)',
    ...(isDev
      ? {}
      : {
          'Content-Security-Policy': [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline' https://checkout.razorpay.com https://www.googletagmanager.com",
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
            "font-src 'self' https://fonts.gstatic.com",
            "img-src 'self' data: blob: https://*.supabase.co https://lh3.googleusercontent.com",
            "connect-src 'self' https://*.supabase.co https://api.razorpay.com wss://*.supabase.co",
            "frame-src https://api.razorpay.com",
            "object-src 'none'",
            "base-uri 'self'",
            "form-action 'self'",
          ].join('; '),
        }),
  };
}

// ─── Device fingerprint generation ────────────────────────────

export async function generateDeviceFingerprint(): Promise<string> {
  const components = [
    navigator.userAgent,
    navigator.language,
    screen.width + 'x' + screen.height,
    new Intl.DateTimeFormat().resolvedOptions().timeZone,
    navigator.hardwareConcurrency?.toString() ?? '',
    (navigator as any).deviceMemory?.toString() ?? '',
  ].join('|');

  const buf = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(components)
  );
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// ─── CSRF Token ───────────────────────────────────────────────

export function generateCsrfToken(): string {
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
}

export function storeCsrfToken(): string {
  let token = sessionStorage.getItem('csrf_token');
  if (!token) {
    token = generateCsrfToken();
    sessionStorage.setItem('csrf_token', token);
  }
  return token;
}

export function getCsrfToken(): string | null {
  return sessionStorage.getItem('csrf_token');
}
