import { useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type RateLimitType = 'otp' | 'login' | 'sensitive' | 'public' | 'scrape' | 'registration' | 'password_reset' | 'admin';

interface RateLimitResult {
  allowed: boolean;
  retryAfter?: number;
  blocked?: boolean;
  message?: string;
}

/**
 * Client-side rate limit enforcer.
 * Calls the rate-limiter edge function, then enforces the server decision.
 * Also applies a local in-memory throttle so the server isn't spammed.
 */
export function useRateLimit() {
  // Local throttle: map of bucketKey → timestamp of last allowed call
  const localThrottle = useRef<Map<string, number>>(new Map());

  const checkLimit = useCallback(
    async (
      type: RateLimitType,
      identifier?: string
    ): Promise<RateLimitResult> => {
      const bucketKey = identifier ? `${type}:${identifier}` : type;
      const now = Date.now();

      // Local in-memory guard: for 'public' type, enforce 200 ms minimum between calls
      if (type === 'public') {
        const last = localThrottle.current.get(bucketKey) ?? 0;
        if (now - last < 200) {
          return { allowed: false, retryAfter: 1, message: 'Too fast. Please slow down.' };
        }
      }

      try {
        const { data, error } = await supabase.functions.invoke('rate-limiter', {
          body: { type, identifier },
        });

        if (error) {
          // On edge function error, allow the request to proceed (fail open)
          console.warn('[useRateLimit] edge function error:', error.message);
          return { allowed: true };
        }

        if (data?.allowed) {
          localThrottle.current.set(bucketKey, now);
        }

        return {
          allowed: data?.allowed ?? true,
          retryAfter: data?.retry_after,
          blocked: data?.blocked,
          message: data?.message,
        };
      } catch {
        return { allowed: true }; // fail open on network error
      }
    },
    []
  );

  return { checkLimit };
}
