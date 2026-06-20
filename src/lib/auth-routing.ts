import { supabase } from "@/integrations/supabase/client";

/**
 * Executes a centralized role-based redirection post-login.
 * 
 * Flow:
 * 1. Checks if an intended_url was saved (Deep linking).
 * 2. Checks if a valid pending_booking exists (Checkout bounce).
 * 3. Checks the user's role and routes them to their specific dashboard.
 */
export async function executeRoleBasedRedirect(
  user: any,
  navigate: (path: string, options?: any) => void,
  targetRole?: string | null
) {
  if (!user) return;

  // 1. Deep Link Checkout
  const intended = localStorage.getItem("intended_url");
  if (intended) {
    localStorage.removeItem("intended_url");
    // Don't redirect to intended URL if it's the auth page itself
    if (!intended.includes("/auth") && !intended.includes("/login")) {
      console.log("[RoleRedirect] Routing to intended URL:", intended);
      navigate(intended);
      return;
    }
  }

  // 2. Checkout Bounce
  const pendingBookingData = localStorage.getItem("pending_booking");
  if (pendingBookingData) {
    try {
      const parsedData = JSON.parse(pendingBookingData);
      const isOldFormat = !parsedData.timestamp;
      const timestamp = parsedData.timestamp || Date.now();
      const booking = parsedData.booking || parsedData;
      
      localStorage.removeItem("pending_booking");
      
      // If the booking is older than 1 hour, ignore it and fall through to normal role routing
      if (!isOldFormat && Date.now() - timestamp > 60 * 60 * 1000) {
        console.log("[RoleRedirect] Pending booking is expired, proceeding to normal role routing");
      } else {
        console.log("[RoleRedirect] Found valid pending booking, redirecting to confirm-and-pay");
        navigate("/confirm-and-pay", { state: { booking } });
        return;
      }
    } catch {
      localStorage.removeItem("pending_booking");
    }
  }

  // 3. Role-Based Routing
  const savedRole = localStorage.getItem("pending_role");
  
  // Fetch actual role from database
  let role = null;
  try {
    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle();
    role = data?.role;
  } catch (err) {
    console.error("[RoleRedirect] Failed to fetch role:", err);
  }

  // Super Admin / Admin
  if (role === "admin" || role === "super_admin") {
    navigate("/admin");
    return;
  } 
  
  // Hub Partner
  if (role === "hub_partner" || role === "HUB_PARTNER") {
    const { data: hubData } = await supabase
      .from('hubs')
      .select('uuid')
      .eq('id', user.id)
      .maybeSingle();
      
    let finalUuid = hubData?.uuid;

    if (!finalUuid) {
      console.log("[RoleRedirect] Missing hub record, attempting auto-create for existing partner");
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
      
      if (profile) {
        const { error: insertErr } = await supabase.from('hubs').insert({
          id: user.id,
          hub_name: `${profile.full_name || 'Partner'} Hub`,
          owner_name: profile.full_name || 'Hub Owner',
          email: user.email || '',
          mobile: profile.phone || '',
          district: profile.assigned_district || '',
          area: profile.assigned_area || '',
          status: 'active'
        });

        if (!insertErr) {
          const { data: newHub } = await supabase.from('hubs').select('uuid').eq('id', user.id).maybeSingle();
          finalUuid = newHub?.uuid;
        }
      }
    }

    if (finalUuid) {
      navigate(`/hub/${finalUuid}`);
    } else {
      console.warn("[RoleRedirect] Hub profile could not be auto-created.");
      navigate("/");
    }
    return;
  } 
  
  // Host
  if (role === "host") {
    // Check if they have finished onboarding by seeing if a host_profile exists
    const { data: hostProfile } = await supabase.from('host_profiles').select('id').eq('id', user.id).maybeSingle();
    if (hostProfile) {
      navigate("/host");
    } else {
      navigate("/host/onboarding");
    }
    return;
  } 
  
  // Implicit intended host signup via search params or local storage
  if (targetRole === "host" || savedRole === "host") {
    localStorage.removeItem("pending_role");
    navigate("/host/onboarding");
    return;
  }

  // Regular user (Traveler)
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .maybeSingle();
    
  if (!profile?.full_name) {
    navigate("/onboarding/user");
  } else {
    navigate("/profile/bookings"); // Default dashboard for traveler
  }
}
