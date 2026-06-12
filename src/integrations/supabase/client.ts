import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL             = (import.meta.env.VITE_SUPABASE_URL             ?? "").trim();
const SUPABASE_PUBLISHABLE_KEY = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "").trim();

/** False when URL/key missing — UI should gate before relying on Supabase. */
export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY);

const resolvedUrl = SUPABASE_URL || "https://configuration-required.supabase.co";
const resolvedKey = SUPABASE_PUBLISHABLE_KEY || "sb-publishable-api-key-not-configured";

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

const customStorage = {
  getItem: (key: string) => {
    if (typeof window !== 'undefined' && window.localStorage.getItem('remember_me') === 'false') {
      return window.sessionStorage.getItem(key);
    }
    return typeof window !== 'undefined' ? window.localStorage.getItem(key) : null;
  },
  setItem: (key: string, value: string) => {
    if (typeof window !== 'undefined') {
      if (window.localStorage.getItem('remember_me') === 'false') {
        window.sessionStorage.setItem(key, value);
      } else {
        window.localStorage.setItem(key, value);
      }
    }
  },
  removeItem: (key: string) => {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(key);
      window.sessionStorage.removeItem(key);
    }
  }
};

export const supabase = createClient<Database>(resolvedUrl, resolvedKey, {
  auth: {
    storage: customStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});