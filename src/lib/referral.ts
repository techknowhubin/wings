const STORAGE_KEY = 'xplorwing_referral_code';
const USER_REF_KEY = 'xplorwing_user_ref';
const COOKIE_MAX_AGE = 30 * 24 * 60 * 60; // 30 days

export function captureReferral(code: string): void {
  if (!code || typeof code !== 'string') return;
  const clean = code.trim().toUpperCase();

  // Hub partner referral (HUB-XXXXXXXX)
  if (/^HUB-[A-Z0-9]{8}$/.test(clean)) {
    try {
      localStorage.setItem(STORAGE_KEY, clean);
      document.cookie = `${STORAGE_KEY}=${clean}; max-age=${COOKIE_MAX_AGE}; path=/; SameSite=Lax`;
    } catch { /* storage blocked — silently ignore */ }
    return;
  }

  // User-to-user WING referral (WINGXXXXXX)
  if (/^WING[A-Z0-9]{6,}$/.test(clean)) {
    try {
      localStorage.setItem(USER_REF_KEY, clean);
      document.cookie = `${USER_REF_KEY}=${clean}; max-age=${COOKIE_MAX_AGE}; path=/; SameSite=Lax`;
    } catch { /* storage blocked — silently ignore */ }
  }
}

export function getReferralCode(): string | null {
  try {
    const ls = localStorage.getItem(STORAGE_KEY);
    if (ls) return ls;
  } catch { /* ignore */ }
  const match = document.cookie.match(new RegExp(`(?:^|; )${STORAGE_KEY}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export function getUserReferralCode(): string | null {
  try {
    const ls = localStorage.getItem(USER_REF_KEY);
    if (ls) return ls;
  } catch { /* ignore */ }
  const match = document.cookie.match(new RegExp(`(?:^|; )${USER_REF_KEY}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export function clearReferral(): void {
  try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
  document.cookie = `${STORAGE_KEY}=; max-age=0; path=/`;
}

export function clearUserReferral(): void {
  try { localStorage.removeItem(USER_REF_KEY); } catch { /* ignore */ }
  document.cookie = `${USER_REF_KEY}=; max-age=0; path=/`;
}

export function generateHubReferralId(): string {
  const chars = 'ABCDEF0123456789';
  const suffix = Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `HUB-${suffix}`;
}

export function buildReferralLink(referralId: string): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://xplorwing.com';
  return `${origin}?ref=${referralId}`;
}
