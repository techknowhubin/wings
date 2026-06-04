import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";

/**
 * Global component to catch Supabase auth redirects and route them correctly:
 * - type=recovery  → /reset-password  (password reset flow)
 * - type=signup    → /auth            (email confirmation flow)
 * - access_token   → /auth            (OAuth / magic-link flow)
 */
const AuthRedirectHandler = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const hash = location.hash;
    const search = location.search;
    const pathname = location.pathname;

    const isRecovery =
      hash.includes("type=recovery") ||
      search.includes("type=recovery");

    const isAuthEvent =
      hash.includes("access_token") ||
      hash.includes("type=signup") ||
      hash.includes("type=invite") ||
      hash.includes("error_description") ||
      search.includes("type=signup") ||
      search.includes("code=");

    // Password recovery link — always send to /reset-password regardless of current path.
    // Never redirect away from /reset-password so the form can set the new password.
    if (isRecovery) {
      if (pathname !== "/reset-password") {
        console.log("[AuthRedirectHandler] Recovery token detected, routing to /reset-password");
        navigate("/reset-password" + search + hash, { replace: true });
      }
      return;
    }

    // Other auth events (signup confirmation, OAuth, magic link) on a non-/auth page
    // → redirect to /auth so it can handle them.
    if (isAuthEvent && pathname !== "/auth") {
      console.log("[AuthRedirectHandler] Auth event on " + pathname + ", redirecting to /auth");
      navigate("/auth" + search + hash, { replace: true });
    }
  }, [location, navigate]);

  return null;
};

export default AuthRedirectHandler;
