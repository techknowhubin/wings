import { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string, role?: 'user' | 'host') => Promise<{ data: any; error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signInWithProvider: (provider: 'google' | 'apple' | 'facebook' | 'linkedin_oidc', role?: 'user' | 'host') => Promise<{ error: any }>;
  signInWithPopup: (provider: 'google' | 'apple' | 'facebook' | 'linkedin_oidc', role?: 'user' | 'host') => Promise<{ error: any }>;
  signOut: () => Promise<{ error: any }>;
  getUserRole: () => Promise<'user' | 'host' | 'admin' | 'moderator' | null>;
  signInWithOtp: (phone: string) => Promise<{ error: Error | null }>;
  verifyOtp: (phone: string, token: string) => Promise<{ data: any; error: any }>;
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

        // Close the popup window automatically after a successful login
        if (newSession && typeof window !== 'undefined' && window.opener && window.opener !== window) {
          setTimeout(() => { window.close(); }, 500); // 500ms buffer to ensure localStorage is flushed
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Auth Actions ─────────────────────────────────────────────────────────────

  const signUp = async (
    email: string,
    password: string,
    fullName: string,
    role: 'user' | 'host' = 'user',
  ) => {
    const redirectUrl = `${window.location.origin}/auth`;
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: { full_name: fullName, role },
      },
    });

    if (!error && data.user) {
      await supabase.from('user_roles').insert({ user_id: data.user.id, role });
    }

    return { data, error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signInWithProvider = async (
    provider: 'google' | 'apple' | 'facebook' | 'linkedin_oidc',
    role: 'user' | 'host' = 'user',
  ) => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth`,
        queryParams: { prompt: 'select_account' },
      },
    });
    return { error };
  };

  const signInWithPopup = async (
    provider: 'google' | 'apple' | 'facebook' | 'linkedin_oidc',
    role: 'user' | 'host' = 'user',
  ) => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth`,
        skipBrowserRedirect: true,
        queryParams: { prompt: 'select_account' },
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

  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://uhtwkajqpuazxpnbaojx.supabase.co';
  const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVodHdrYWpxcHVhenhwbmJhb2p4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE2NzY1NTcsImV4cCI6MjA3NzI1MjU1N30.RPdeJk13uqnFssQXUyA0acsf53xgceR-59VLzoB7Wfg';
  const WA_OTP_URL = `${SUPABASE_URL}/functions/v1/send-whatsapp-otp`;
  const WA_OTP_HEADERS = {
    'Content-Type': 'application/json',
    'apikey': SUPABASE_ANON_KEY,
  };

  // Safe JSON parser — gives a clear error when server returns HTML (e.g. 404)
  const safeJson = async (res: Response): Promise<{ data: any; parseError: string | null }> => {
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
  };

  const signInWithOtp = async (phone: string): Promise<{ error: Error | null }> => {
    try {
      const res = await fetch(WA_OTP_URL, {
        method: 'POST',
        headers: WA_OTP_HEADERS,
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
    try {
      const res = await fetch(WA_OTP_URL, {
        method: 'POST',
        headers: WA_OTP_HEADERS,
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
