import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";

/**
 * Global component to catch Supabase auth redirects (confirmation, recovery, etc.)
 * and ensure they land on the /auth page with the correct UI state.
 */
const AuthRedirectHandler = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const hash = location.hash;
    const search = location.search;
    const pathname = location.pathname;

    // Detection criteria for Supabase Auth events
    const isAuthEvent = 
      hash.includes("access_token") || 
      hash.includes("type=signup") || 
      hash.includes("type=recovery") || 
      hash.includes("type=invite") || 
      hash.includes("error_description") ||
      search.includes("type=signup") || 
      search.includes("type=recovery") || 
      search.includes("code="); // PKCE code

    // If we detect an auth event but we are NOT on the /auth page, redirect there
    if (isAuthEvent && pathname !== "/auth") {
      console.log("[AuthRedirectHandler] Auth event detected on " + pathname + ", redirecting to /auth");
      
      // Preserve all params so the Auth page can handle them
      navigate("/auth" + search + hash, { replace: true });
    }
  }, [location, navigate]);

  return null;
};

export default AuthRedirectHandler;
