import { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '@/integrations/supabase/client';

function getWhatsappOtpEndpoint(): { url: string; headers: Record<string, string> } | null {
  const url = (import.meta.env.VITE_SUPABASE_URL ?? '').trim() || 'https://uhtwkajqpuazxpnbaojx.supabase.co';
  const key = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? '').trim() || 'sb_publishable_kX4YhhekZFFrnYiSO0UEwg_u4CLPOJW';
  if (!url || !key) return null;
  return {
    url: `${url}/functions/v1/send-whatsapp-otp`,
    headers: {
      'Content-Type': 'application/json',
      apikey: key,
    },
  };
}

async function safeJson(res: Response): Promise<{ data: any; parseError: string | null }> {
  const text = await res.text();
  try {
    return { data: JSON.parse(text), parseError: null };
  } catch {
    const preview = text.slice(0, 80).replace(/\n/g, ' ');
    console.error('[OTP] Non-JSON response from Edge Function:', preview);
    return {
      data: null,
      parseError: `Edge Function returned non-JSON (${res.status}). Check if the function is deployed.`,
    };
  }
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string, mobileNumber: string, role: 'user' | 'host' | 'admin') => Promise<{ data: any; error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signInWithProvider: (provider: 'google' | 'apple' | 'facebook' | 'linkedin_oidc', role?: 'user' | 'host' | 'admin') => Promise<{ error: any }>;
  signInWithPopup: (provider: 'google' | 'apple' | 'facebook' | 'linkedin_oidc', role?: 'user' | 'host' | 'admin') => Promise<{ error: any }>;
  signOut: () => Promise<{ error: any }>;
  getUserRole: () => Promise<'user' | 'host' | 'admin' | 'moderator' | null>;
  signInWithOtp: (phone: string) => Promise<{ error: Error | null }>;
  verifyOtp: (phone: string, token: string) => Promise<{ data: any; error: any }>;
  resendEmail: (email: string) => Promise<{ error: any }>;
  checkEmailRegistered: (email: string) => Promise<{ exists: boolean; checked: boolean }>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  // Start loading=true so the app waits for the first real auth event
  const [loading, setLoading] = useState(true);
  // Ref to avoid stale closure — tracks whether we've set loading→false yet
  const hasInitialized = useRef(false);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      if (!hasInitialized.current) {
        hasInitialized.current = true;
        setLoading(false);
      }
      return;
    }

    // Set up ONE auth state listener for the entire app.
    // The INITIAL_SESSION event fires immediately with the persisted session
    // (or null if none), making a redundant getSession() call unnecessary.
    // Removing getSession() eliminates the race condition where both calls
    // land slightly out of order and overwrite each other's state.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        console.log(`[AuthContext] event: ${event}`, { hasSession: !!newSession });

        setSession(newSession);
        setUser(newSession?.user ?? null);

        // Unblock the UI after the very first auth event.
        if (!hasInitialized.current) {
          hasInitialized.current = true;
          setLoading(false);
        }

        // Close the popup window automatically after a successful login, but ONLY if we are on the /auth route
        if (
          newSession &&
          typeof window !== 'undefined' &&
          window.opener &&
          window.opener !== window &&
          window.location.pathname === '/auth'
        ) {
          setTimeout(() => { window.close(); }, 500); // 500ms buffer to ensure localStorage is flushed
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Deleted-account detection ─────────────────────────────────────────────────
  // Two-layer defence so admin-deleted accounts are immediately signed out:
  //   Layer 1 — Supabase Realtime (instant): subscribes to DELETE events on the
  //             user's own profiles row. Fires the moment the row is removed.
  //   Layer 2 — Polling fallback (every 30 s + tab-focus): catches cases where
  //             the Realtime channel is unavailable or slow to deliver.
  useEffect(() => {
    if (!user) return;

    const forceLogout = async () => {
      localStorage.setItem(
        'account_deleted_msg',
        'Your account has been removed. Please contact support for assistance.'
      );
      // Clear local session state without waiting for server round-trip
      await supabase.auth.signOut({ scope: 'local' });
      window.location.href = '/auth';
    };

    // Layer 1: Realtime — fires the instant the profiles row is deleted
    const channel = supabase
      .channel(`account-watchdog:${user.id}`)
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'profiles', filter: `id=eq.${user.id}` },
        forceLogout
      )
      .subscribe();

    // Layer 2: Polling — safety net if Realtime misses the event
    const checkAlive = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .maybeSingle();
      if (!profile) await forceLogout();
    };

    const onVisibility = () => {
      if (document.visibilityState === 'visible') checkAlive();
    };

    document.addEventListener('visibilitychange', onVisibility);
    const interval = setInterval(checkAlive, 30_000);

    return () => {
      supabase.removeChannel(channel);
      document.removeEventListener('visibilitychange', onVisibility);
      clearInterval(interval);
    };
  }, [user?.id]);

  // ── Auth Actions ─────────────────────────────────────────────────────────────

  const signUp = async (
    email: string,
    password: string,
    fullName: string,
    mobileNumber: string,
    role: 'user' | 'host' | 'admin',
  ) => {
    const redirectUrl = `${window.location.origin}/auth`;
    const { getUserReferralCode } = await import('@/lib/referral');
    const referredBy = getUserReferralCode();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          role,
          full_name: fullName,
          phone: mobileNumber ? `+91${mobileNumber.replace(/\D/g, '')}` : undefined,
          ...(referredBy ? { referred_by: referredBy } : {}),
        },
      },
    });

    return { data, error };
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error };

    // When Supabase email-enumeration-protection is ON it returns no error but also no
    // user/session for a non-existent email — treat that as "no account found".
    if (!data.user || !data.session) {
      return { error: new Error('No account found with this email address') };
    }

    return { error: null };
  };

  const signInWithProvider = async (
    provider: 'google' | 'apple' | 'facebook' | 'linkedin_oidc',
    role: 'user' | 'host' | 'admin' = 'user',
  ) => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth`,
        queryParams: { prompt: 'select_account', role },
      },
    });
    return { error };
  };

  const signInWithPopup = async (
    provider: 'google' | 'apple' | 'facebook' | 'linkedin_oidc',
    role: 'user' | 'host' | 'admin' = 'user',
  ) => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth`,
        skipBrowserRedirect: true,
        queryParams: { prompt: 'select_account', role },
      },
    });

    if (error || !data.url) return { error: error || new Error('No OAuth URL returned') };

    const w = 500, h = 600;
    const left = window.screenX + (window.outerWidth - w) / 2;
    const top = window.screenY + (window.outerHeight - h) / 2;
    const popup = window.open(
      data.url,
      'oauth-popup',
      `width=${w},height=${h},left=${left},top=${top},toolbar=no,menubar=no,resizable=yes,scrollbars=yes`,
    );

    if (popup) {
      const interval = setInterval(() => {
        if (popup.closed) clearInterval(interval);
      }, 500);
    }

    return { error: null };
  };

  const signOut = async () => {
    // Clear all pending session data on logout
    localStorage.removeItem("pending_booking");
    localStorage.removeItem("intended_url");
    localStorage.removeItem("pending_role");
    localStorage.removeItem("google_auth_mode");
    localStorage.removeItem("remember_me");

    const { error } = await supabase.auth.signOut();
    return { error };
  };

  const getUserRole = async (): Promise<'user' | 'host' | 'admin' | 'moderator' | null> => {
    if (!user) return null;
    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle();
    return data?.role ?? null;
  };

  // ── WhatsApp OTP ─────────────────────────────────────────────────────────────

  const signInWithOtp = async (phone: string): Promise<{ error: Error | null }> => {
    const otp = getWhatsappOtpEndpoint();
    if (!otp) {
      return {
        error: new Error(
          'Missing Supabase configuration. Add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY to your .env file.',
        ),
      };
    }
    try {
      const res = await fetch(otp.url, {
        method: 'POST',
        headers: otp.headers,
        body: JSON.stringify({ action: 'send', phone }),
      });
      const { data, parseError } = await safeJson(res);
      if (parseError) return { error: new Error(parseError) };
      if (!res.ok) return { error: new Error(data?.error || 'Failed to send OTP') };
      return { error: null };
    } catch (err: unknown) {
      return { error: err instanceof Error ? err : new Error(String(err)) };
    }
  };

  const verifyOtp = async (phone: string, token: string) => {
    const otp = getWhatsappOtpEndpoint();
    if (!otp) {
      return {
        data: null,
        error: new Error(
          'Missing Supabase configuration. Add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY to your .env file.',
        ),
      };
    }
    try {
      const res = await fetch(otp.url, {
        method: 'POST',
        headers: otp.headers,
        body: JSON.stringify({ action: 'verify', phone, otp: token }),
      });
      const { data, parseError } = await safeJson(res);
      if (parseError) return { data: null, error: new Error(parseError) };
      if (!res.ok) return { data: null, error: new Error(data?.error || 'Verification failed') };

      if (data.hashed_token) {
        const tokenType = data.token_type ?? 'magiclink';
        const { data: sessionData, error } = await supabase.auth.verifyOtp({
          token_hash: data.hashed_token,
          type: tokenType as any,
        });
        return { data: { ...sessionData, is_new_user: data.is_new_user }, error };
      }
      return { data: null, error: new Error('No token returned from server') };
    } catch (err: unknown) {
      return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
    }
  };

  const resendEmail = async (email: string) => {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth`,
      },
    });
    return { error };
  };

  const checkEmailRegistered = async (email: string): Promise<{ exists: boolean; checked: boolean }> => {
    try {
      const { data, error } = await supabase.rpc('check_email_registered' as any, {
        check_email: email.trim().toLowerCase(),
      });
      if (error) {
        // RPC not deployed yet — SQL not run. Return checked:false so caller can fallback gracefully.
        console.warn('[checkEmailRegistered] RPC unavailable:', error.message);
        return { exists: false, checked: false };
      }
      return { exists: !!data, checked: true };
    } catch {
      return { exists: false, checked: false };
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        signUp,
        signIn,
        signInWithProvider,
        signInWithPopup,
        signOut,
        getUserRole,
        signInWithOtp,
        verifyOtp,
        resendEmail,
        checkEmailRegistered,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside <AuthProvider>. Wrap your app in AuthProvider.');
  }
  return ctx;
}
