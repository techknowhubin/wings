import { FormEvent, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Marquee from "@/components/Marquee";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { initiateRazorpayPayment } from "@/lib/razorpay";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { CalendarDays, CreditCard, MapPin, Plus, Receipt, ShieldCheck, Trash2, UserPlus, UserRound, X, Wallet, Ticket } from "lucide-react";
import type { BookingDetails } from "@/types/booking";
import type { CouponOffer } from "@/lib/discounts";
import { getReferralCode, clearReferral } from "@/lib/referral";

import { createNotification } from "@/lib/supabase-helpers";
import LocationAutocomplete, { LocationData } from "@/components/LocationAutocomplete";

type ConfirmAndPayState = {
  booking?: BookingDetails;
};

interface HostedCoupon extends CouponOffer {
  id: string;
  startsAt?: string | null;
  endsAt?: string | null;
  usageLimit?: number | null;
  usedCount?: number;
  oneTimePerUser?: boolean;
  assignments?: any[];
}

interface ExtraGuest {
  name: string;
  phone: string;
  email: string;
  age: string;
  id_proof: string;
}

const emptyGuest = (): ExtraGuest => ({ name: "", phone: "", email: "", age: "", id_proof: "" });

const ConfirmAndPay = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { state } = useLocation();

  const [booking, setBooking] = useState<BookingDetails | null>(() => {
    if (state?.booking) {
      // Fresh booking from navigation — clear any stale localStorage cache
      localStorage.removeItem("pending_booking");
      return state.booking;
    }
    const saved = localStorage.getItem("pending_booking");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // support both new format with timestamp and old format
        return parsed.booking || parsed;
      } catch {
        return null;
      }
    }
    return null;
  });

  useEffect(() => {
    if (state?.booking) {
      localStorage.removeItem("pending_booking");
      setBooking(state.booking);
    }
  }, [state]);

  useEffect(() => {
    if (!authLoading && !user) {
      if (booking) {
        localStorage.setItem("pending_booking", JSON.stringify({ booking, timestamp: Date.now() }));
      }
      toast.info("Please sign up or sign in to complete your booking.");
      navigate("/auth");
    }
  }, [user, authLoading, navigate, booking]);

  // Primary guest details
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [pickupAddress, setPickupAddress] = useState(booking?.cabDetails?.pickup_location || "");
  const [pickupCoords, setPickupCoords] = useState<{ lat: number; lng: number } | null>(() => {
    if (booking?.cabDetails?.pickup_latitude && booking?.cabDetails?.pickup_longitude) {
      return {
        lat: Number(booking.cabDetails.pickup_latitude),
        lng: Number(booking.cabDetails.pickup_longitude),
      };
    }
    return null;
  });
  const [pickupPlaceId, setPickupPlaceId] = useState<string>(() => {
    return booking?.cabDetails?.pickup_place_id || "";
  });

  // Keep coords and place ID in sync if booking updates
  useEffect(() => {
    if (booking?.cabDetails) {
      if (booking.cabDetails.pickup_location) {
        setPickupAddress(booking.cabDetails.pickup_location);
      }
      if (booking.cabDetails.pickup_latitude && booking.cabDetails.pickup_longitude) {
        setPickupCoords({
          lat: Number(booking.cabDetails.pickup_latitude),
          lng: Number(booking.cabDetails.pickup_longitude),
        });
      }
      if (booking.cabDetails.pickup_place_id) {
        setPickupPlaceId(booking.cabDetails.pickup_place_id);
      }
    }
  }, [booking]);

  // Additional guests
  const [extraGuests, setExtraGuests] = useState<ExtraGuest[]>([]);
  const [showAddGuest, setShowAddGuest] = useState(false);

  const [isProcessing, setIsProcessing] = useState(false);
  const [hasAcceptedPolicies, setHasAcceptedPolicies] = useState(false);
  const [promoCode, setPromoCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<HostedCoupon | null>(null);
  const [globalCoupons, setGlobalCoupons] = useState<HostedCoupon[]>([]);
  const [bookingFeeRate, setBookingFeeRate] = useState(10);


  // Wing Credits
  const [walletBalance, setWalletBalance] = useState(0);
  const [maxRedemptionPercentage, setMaxRedemptionPercentage] = useState(10);
  const [programEnabled, setProgramEnabled] = useState(true);
  const [useWingCredits, setUseWingCredits] = useState(false);

  // GST Settings
  const [gstPercentage, setGstPercentage] = useState(0);
  const [gstEnabled, setGstEnabled] = useState(false);

  useEffect(() => {
    async function fetchPlatformCommissionAndWallet() {
      if (!booking) return;
      const { data, error } = await supabase.from('platform_settings').select('marketplace_commission_pct, linkinbio_commission_pct').maybeSingle();
      if (!error && data) {
        if (booking.bookingChannel === 'link-in-bio' && data.linkinbio_commission_pct) {
          setBookingFeeRate(Number(data.linkinbio_commission_pct));
        } else if (data.marketplace_commission_pct) {
          setBookingFeeRate(Number(data.marketplace_commission_pct));
        }
      }

      if (user) {
        const [walletRes, settingsRes] = await Promise.all([
          supabase.from('wallets').select('balance').eq('user_id', user.id).maybeSingle(),
          supabase.from('wallet_settings').select('max_redemption_percentage, program_enabled').maybeSingle()
        ]);
        if (walletRes.data) setWalletBalance(Number(walletRes.data.balance || 0));
        if (settingsRes.data) {
          setMaxRedemptionPercentage(Number(settingsRes.data.max_redemption_percentage || 10));
          setProgramEnabled(Boolean(settingsRes.data.program_enabled ?? true));
        }
      }

      // Fetch GST Settings
      let rawType = "stays";
      if (booking.listingType === "stay") {
        if (booking.listingCouponType === "hotels") rawType = "hotels";
        else if (booking.listingCouponType === "resorts") rawType = "resorts";
        else rawType = "stays";
      } else if (booking.listingType === "experience") {
        rawType = "experiences";
      } else if (booking.listingType === "vehicle") {
        rawType = booking.listingCouponType === "bikes" ? "bikes" : "cars";
      } else if (booking.listingType === "outstation_cab") {
        rawType = "outstation_cabs";
      } else if (booking.listingType === "airport_cab") {
        rawType = "airport_cabs";
      } else if (booking.listingType === "tour_package") {
        rawType = "experiences";
      }

      console.log("[GST] Booking listingType:", booking.listingType, "| listingCouponType:", booking.listingCouponType, "| Resolved rawType:", rawType);

      try {
        const { data: gstData, error: gstError } = await supabase
          .from('gst_settings' as any)
          .select('listing_type, gst_percentage, is_enabled')
          .in('listing_type', ['GLOBAL', rawType]);

        console.log("[GST] Query result:", { gstData, gstError });

        if (gstError) {
          console.error("[GST] Supabase query error:", gstError);
        }

        if (gstData && Array.isArray(gstData) && gstData.length > 0) {
          const globalSetting = gstData.find((s: any) => s.listing_type === 'GLOBAL');
          const typeSetting = gstData.find((s: any) => s.listing_type === rawType);

          console.log("[GST] Global setting:", globalSetting, "| Type setting:", typeSetting);

          if (globalSetting?.is_enabled && typeSetting?.is_enabled) {
            const pct = Number(typeSetting.gst_percentage);
            setGstEnabled(true);
            setGstPercentage(pct);
            console.log("[GST] ✅ Enabled with", pct, "% for", rawType);
          } else {
            setGstEnabled(false);
            setGstPercentage(0);
            console.log("[GST] ❌ Disabled. Global enabled:", globalSetting?.is_enabled, "| Type enabled:", typeSetting?.is_enabled);
          }
        } else {
          setGstEnabled(false);
          setGstPercentage(0);
          console.log("[GST] ⚠️ No data returned for rawType:", rawType);
        }
      } catch (gstFetchError) {
        console.error("[GST] Fetch failed:", gstFetchError);
        setGstEnabled(false);
        setGstPercentage(0);
      }

    }
    fetchPlatformCommissionAndWallet();
  }, [booking?.bookingChannel, user, booking]);

  useEffect(() => {
    const prefillFromProfile = async () => {
      if (!user) return;
      try {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, phone")
          .eq("id", user.id)
          .maybeSingle();

        if (profile) {
          setName(prev => prev || profile.full_name || "");
          setPhone(prev => prev || profile.phone || user.phone || "");
        }
      } catch {
        // ignore
      }
      setEmail(prev => prev || user.email || "");
    };
    void prefillFromProfile();
  }, [user]);

  const handleSameAsLogin = async () => {
    if (!user) {
      toast.error("Please login first to use this feature.");
      return;
    }
    try {
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("full_name, phone")
        .eq("id", user.id)
        .maybeSingle();

      if (error) throw error;

      setName(profile?.full_name || "");
      setPhone(profile?.phone || user.phone || "");
      setEmail(user.email || "");
      toast.success("Details filled from your profile.");
    } catch {
      setName("");
      setPhone(user.phone || "");
      setEmail(user.email || "");
      toast.success("Details filled from login session.");
    }
  };

  // Extra guest helpers
  const addExtraGuest = () => setExtraGuests(prev => [...prev, emptyGuest()]);
  const removeExtraGuest = (i: number) => setExtraGuests(prev => prev.filter((_, idx) => idx !== i));
  const updateExtraGuest = (i: number, field: keyof ExtraGuest, value: string) =>
    setExtraGuests(prev => prev.map((g, idx) => idx === i ? { ...g, [field]: value } : g));

  useEffect(() => {
    const fetchCoupons = async () => {
      if (!booking?.hostId) return;
      // Query 1: New multi-user assignments
      const { data: data1 } = await supabase
        .from("host_coupons" as any)
        .select(
          "id,code,discount_type,discount_value,discount_percent,is_enabled,listing_id,starts_at,ends_at,expires_at,usage_limit,used_count,one_time_per_user,listing_types,target_user_id,target_email,target_phone,is_platform_offer, assignments!inner(user_id)"
        )
        .eq("assignments.user_id", user?.id)
        .eq("is_active", true);

      // Query 2: Legacy single-user assignments
      const { data: data2 } = await supabase
        .from("host_coupons" as any)
        .select(
          "id,code,discount_type,discount_value,discount_percent,is_enabled,listing_id,starts_at,ends_at,expires_at,usage_limit,used_count,one_time_per_user,listing_types,target_user_id,target_email,target_phone,is_platform_offer"
        )
        .or(`target_user_id.eq.${user?.id},target_email.eq.${user?.email},target_phone.eq.${user?.phone}`)
        .eq("is_active", true);

      // Merge and deduplicate
      const combinedData = [...(data1 || []), ...(data2 || [])];
      const uniqueDataMap = new Map();
      combinedData.forEach(c => uniqueDataMap.set(c.id, c));
      const finalData = Array.from(uniqueDataMap.values());

      const filtered = finalData.filter((item: any) => {
        if (!item.is_enabled && !item.is_active) return false;
        if (booking.listingCouponType && Array.isArray(item.listing_types) && item.listing_types.length > 0) {
          if (!item.listing_types.includes(booking.listingCouponType)) return false;
        }
        if (item.listing_id && item.listing_id !== booking.listingId) return false;
        return true;
      });
      setGlobalCoupons(
        filtered.map((item: any) => {
          const isFlat = item.discount_type === "flat";
          const discountType: "percent" | "flat" = isFlat ? "flat" : "percent";
          const value = isFlat
            ? Number(item.discount_value ?? 0)
            : Number(item.discount_percent ?? item.discount_value ?? 0);
          return {
            id: String(item.id),
            code: String(item.code ?? "").toUpperCase(),
            type: discountType,
            value,
            startsAt: item.starts_at ?? null,
            endsAt: item.expires_at ?? item.ends_at ?? null,
            usageLimit: item.usage_limit ?? null,
            usedCount: Number(item.used_count ?? 0),
            oneTimePerUser: Boolean(item.one_time_per_user),
            listingId: item.listing_id ?? null,
            targetUserId: item.target_user_id ?? null,
            targetEmail: item.target_email ?? null,
            targetPhone: item.target_phone ?? null,
            assignments: item.assignments ?? [],
          };
        })
      );
      
      console.log("=== VIP COUPONS DEBUG ===");
      console.log("Logged In User ID:", user?.id);
      console.log("Coupons Returned (Assignments Query):", data1);
      console.log("Coupons Returned (Legacy Query):", data2);
      console.log("Filtered Final Coupons:", filtered);
      console.log("=========================");
    };
    void fetchCoupons();
  }, [booking]);



  const stayDates = useMemo(() => {
    if (!booking) return "";
    const start = format(new Date(booking.startDate), "MMM dd, yyyy");
    const end = format(new Date(booking.endDate), "MMM dd, yyyy");
    return `${start} - ${end}`;
  }, [booking]);

  const cancellationPolicy = useMemo(() => {
    if (!booking) return [];
    if (booking.listingType === "stay") {
      return [
        "Free cancellation within 24 hours of booking confirmation.",
        "For cancellations made up to 7 days before check-in, 90% of the paid amount is refunded.",
        "For cancellations within 7 days of check-in, one night charge and platform fee are non-refundable.",
        "No-show bookings are treated as completed and are not eligible for refunds.",
      ];
    }
    if (booking.listingType === "vehicle") {
      return [
        "Free cancellation up to 48 hours before pickup.",
        "For cancellations within 48 hours, one day rental amount is charged as cancellation fee.",
        "Security deposit refunds (if collected) are processed within 5-7 business days.",
        "Late pickup beyond 2 hours may lead to automatic cancellation based on host availability.",
      ];
    }
    return [
      "Free cancellation up to 72 hours before the experience start time.",
      "For cancellations between 72 and 24 hours, 50% refund is applicable.",
      "No refunds are provided for same-day cancellations or no-shows.",
      "If an experience is cancelled by host/weather conditions, full refund is issued automatically.",
    ];
  }, [booking]);

  const importantNotices = useMemo(() => {
    if (!booking) return [];
    const common = [
      "Government-issued photo ID may be required at check-in/pickup for verification.",
      "Prices shown include applicable platform fees; local taxes may vary by destination rules.",
      "All refunds, if applicable, are processed to the original payment method.",
      "By proceeding, you agree to Xplorwing's booking terms, cancellation rules, and privacy policy.",
    ];
    if (booking.listingType === "vehicle") {
      return ["Valid driving license and age proof are mandatory for vehicle handover.", ...common];
    }
    if (booking.listingType === "experience") {
      return ["Please arrive at least 15 minutes before the activity start time.", ...common];
    }
    return common;
  }, [booking]);

  const hostDiscountAmount = booking?.discount ?? 0;
  const availableCoupons = useMemo(() => {
    return globalCoupons.length > 0 ? [...globalCoupons] : [...((booking?.availableCoupons as HostedCoupon[] | undefined) ?? [])];
  }, [globalCoupons, booking?.availableCoupons]);

  const baseTotal = useMemo(() => {
    if (!booking) return 0;
    return Math.max(booking.subtotal - hostDiscountAmount + booking.serviceFee, 0);
  }, [booking, hostDiscountAmount]);

  const isLocalOrAirport = useMemo(() => {
    const src = booking?.bookingSource ?? booking?.cabDetails?.booking_source;
    return src === 'airport_transfer' || src === 'local_4hrs' || src === 'local_8hrs';
  }, [booking]);

  const normalBookingFee = useMemo(() => baseTotal * (bookingFeeRate / 100), [baseTotal, bookingFeeRate]);

  const couponDiscountAmount = useMemo(() => {
    if (!booking || !appliedCoupon) return 0;
    // For airport/local transfers: apply coupon to the full fare, not just the booking-fee slice
    const couponBase = isLocalOrAirport ? baseTotal : normalBookingFee;
    if (appliedCoupon.type === "flat") return Math.min(appliedCoupon.value, couponBase);
    return (couponBase * appliedCoupon.value) / 100;
  }, [appliedCoupon, booking, normalBookingFee, isLocalOrAirport, baseTotal]);

  const maxRedeemableCredits = useMemo(() => {
    if (!booking) return 0;
    const rawMax = (baseTotal * maxRedemptionPercentage) / 100;
    return Math.min(rawMax, walletBalance);
  }, [baseTotal, maxRedemptionPercentage, walletBalance, booking]);

  const wingCreditsDiscountAmount = useWingCredits ? maxRedeemableCredits : 0;

  const fullBaseAmount = baseTotal;
  const gstAmount = gstEnabled ? (fullBaseAmount * gstPercentage) / 100 : 0;
  const fullTotalWithTax = fullBaseAmount + gstAmount;

  const totalPayable = useMemo(() => {
    let raw: number;
    if (isLocalOrAirport) {
      // Airport/Local transfers: customer pays the full fare upfront
      raw = fullTotalWithTax - couponDiscountAmount - wingCreditsDiscountAmount;
    } else {
      // All other bookings: customer pays only the booking-fee % now (rest at time of service)
      const bookingFeeAmount = (fullTotalWithTax * bookingFeeRate) / 100;
      raw = bookingFeeAmount - couponDiscountAmount - wingCreditsDiscountAmount;
    }
    if (raw <= 0) return 0;
    return Math.max(raw, 1.00);
  }, [fullTotalWithTax, couponDiscountAmount, wingCreditsDiscountAmount, isLocalOrAirport, bookingFeeRate]);

  const formatAmount = (val: number) => val.toFixed(2);

  const handleApplyCoupon = async (codeOverride?: string | React.MouseEvent) => {
    const codeToUse = typeof codeOverride === 'string' ? codeOverride : promoCode;
    const normalized = codeToUse.trim().toUpperCase();
    if (!normalized) { toast.error("Enter a coupon code to apply."); return; }
    const match = availableCoupons.find((coupon) => coupon.code.toUpperCase() === normalized);
    if (!match) { toast.error("Invalid or unavailable coupon code."); return; }
    const now = new Date();
    if (match.startsAt && new Date(match.startsAt) > now) { toast.error("This coupon is not active yet."); return; }
    if (match.endsAt && new Date(match.endsAt) < now) { toast.error("This coupon has expired."); return; }
    if (match.usageLimit && (match.usedCount ?? 0) >= match.usageLimit) { toast.error("This coupon has reached its usage limit."); return; }
    if ((match as any).listingId && booking?.listingId && (match as any).listingId !== booking.listingId) {
      toast.error("This coupon is not valid for the selected listing."); return;
    }
    
    // Validate User-Specific constraints
    const matchAsAny = match as any;
    if (matchAsAny.targetUserId || matchAsAny.targetEmail || matchAsAny.targetPhone || (match.assignments && match.assignments.length > 0)) {
      if (!user) { toast.error("You must be logged in to use this coupon."); return; }
      
      let isAssigned = false;
      if (match.assignments && match.assignments.length > 0) {
        isAssigned = match.assignments.some((a: any) => a.user_id === user.id);
      }
      
      const isUserMatch = 
        isAssigned ||
        (matchAsAny.targetUserId && matchAsAny.targetUserId === user.id) ||
        (matchAsAny.targetEmail && matchAsAny.targetEmail.toLowerCase() === user.email?.toLowerCase()) ||
        (matchAsAny.targetPhone && matchAsAny.targetPhone === user.phone);
        
      if (!isUserMatch) {
        toast.error("This VIP coupon is not applicable to your account."); return;
      }
    }

    if (match.oneTimePerUser && user) {
      const { data: redemption } = await supabase
        .from("host_coupon_redemptions" as any)
        .select("id")
        .eq("coupon_id", match.id)
        .eq("user_id", user.id)
        .maybeSingle();
      if (redemption) { toast.error("This coupon can be used only once per user."); return; }
    }
    setAppliedCoupon(match);
    toast.success(`Coupon ${match.code} applied successfully.`);
  };

  const handleProceedToPay = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!booking) return;

    if (!name.trim() || !email.trim() || !phone.trim()) {
      toast.error("Please fill primary customer details before paying.");
      return;
    }
    if (!hasAcceptedPolicies) {
      toast.error("Please accept the privacy and cancellation policy to continue.");
      return;
    }
    if (!booking.hostId && !booking.cabDetails) {
      toast.error("Booking host details are missing. Please go back and book again.");
      return;
    }
    if (!user?.id) {
      toast.error("Session expired. Please sign in again.");
      navigate("/auth");
      return;
    }
    if (booking.cabDetails && !pickupCoords) {
      toast.error("Please click '🗺️ Show on Map' to verify your exact pickup location.");
      setIsProcessing(false);
      return;
    }

    setIsProcessing(true);

    // Map UI listing type → DB enum value
    const listingTypeMap: Record<string, string> = {
      stay: "stay",
      hotel: "hotel",
      resort: "resort",
      car: "car",
      bike: "bike",
      experience: "experience",
      cab: "cab",
      outstation: "outstation",
      package: "package"
    };

    let rawType = "stay";
    if (booking.listingType === "stay") {
      if (booking.listingCouponType === "hotels") rawType = "hotel";
      else if (booking.listingCouponType === "resorts") rawType = "resort";
      else rawType = "stay";
    } else if (booking.listingType === "experience") {
      rawType = "experience";
    } else if (booking.listingType === "vehicle") {
      if (booking.listingCouponType === "cabs") {
        rawType = booking.cabDetails?.booking_source === "outstation_cab" ? "outstation" : "cab";
      } else {
        rawType = booking.listingCouponType === "bikes" ? "bike" : "car";
      }
    } else if (booking.listingType === "outstation_cab") {
      rawType = "outstation";
    } else if (booking.listingType === "airport_cab") {
      rawType = "cab";
    } else if (booking.listingType === "tour_package") {
      rawType = "package";
    }
    const dbListingType = listingTypeMap[rawType] ?? "stay";

    // Store additional guests in notes as JSON
    const allGuests = extraGuests.filter(g => g.name.trim());
    const notesPayload = {
      primaryGuest: { name, email, phone },
      additionalGuests: allGuests,
    };

    let pendingBookingId = "";
    try {
      const bookingData: any = {
        user_id: user.id,
        listing_type: dbListingType,
        start_date: new Date(booking.startDate).toISOString(),
        end_date: new Date(booking.endDate).toISOString(),
        total_price: Number(totalPayable.toFixed(2)),
        base_amount: Number(fullBaseAmount.toFixed(2)),
        gst_percentage: Number(gstPercentage.toFixed(2)),
        gst_amount: Number(gstAmount.toFixed(2)),
        currency: booking.currencySymbol === "₹" ? "INR" : "USD",
        payment_status: "pending",
        booking_status: "pending",
        guests_count: (booking.quantity || 1) + allGuests.length,
        booking_channel: booking.bookingChannel || "marketplace",
        commission_amount: Number(normalBookingFee.toFixed(2)),
        notes: JSON.stringify(notesPayload),
      };

      const finalListingId = booking.listingId || "00000000-0000-0000-0000-000000000001";
      bookingData.listing_id = finalListingId;

      const finalHostId = (booking.hostId && booking.hostId !== "00000000-0000-0000-0000-000000000000") ? booking.hostId : user.id;
      bookingData.host_id = finalHostId;

      const { data: newBooking, error: bookingError } = await supabase
        .from("bookings")
        .insert(bookingData)
        .select()
        .single();

      if (bookingError || !newBooking) {
        const errMsg = bookingError?.message ?? "Unknown error";
        console.error("Booking insert error:", bookingError);

        // Show exact error message for debugging
        toast.error(`Booking DB Error: ${errMsg}`, { duration: 10000 });
        setIsProcessing(false);
        return;
      }
      pendingBookingId = newBooking.id;

      if (booking.cabDetails) {
        try {
          let finalTravelDate = new Date(booking.cabDetails.travel_date);
          if (booking.cabDetails.pickup_time) {
            const timeMatch = booking.cabDetails.pickup_time.match(/(\d+):(\d+)\s*(AM|PM)/i);
            if (timeMatch) {
              let hours = parseInt(timeMatch[1], 10);
              const mins = parseInt(timeMatch[2], 10);
              const ampm = timeMatch[3].toUpperCase();
              if (ampm === "PM" && hours < 12) hours += 12;
              if (ampm === "AM" && hours === 12) hours = 0;
              finalTravelDate.setHours(hours, mins, 0, 0);
            }
          }

          // Auto-routing logic for Hub Partner
          let matchedHubPartnerId: string | null = null;
          let assignmentStatus = "Awaiting Hub Partner Assignment";

          try {
            const { data: partners } = await supabase
              .from("profiles")
              .select("id, assigned_district, assigned_area, assigned_state")
              .eq("role", "hub_partner");

            if (partners && partners.length > 0) {
              const pickupLower = booking.cabDetails.pickup_location.toLowerCase();
              const matched = partners.find((p: any) =>
                (p.assigned_district && pickupLower.includes(p.assigned_district.toLowerCase())) ||
                (p.assigned_area && pickupLower.includes(p.assigned_area.toLowerCase())) ||
                (p.assigned_state && pickupLower.includes(p.assigned_state.toLowerCase()))
              );
              if (matched) {
                matchedHubPartnerId = matched.id;
                assignmentStatus = "Assigned";
              }
            }
          } catch (e) {
            console.error("Failed to route to hub partner:", e);
          }

          // Derive booking_source from the booking details
          const bookingSource = booking.bookingSource
            || booking.cabDetails.booking_source
            || (booking.listingTitle?.toLowerCase().includes('airport') ? 'airport_transfer'
              : booking.listingTitle?.toLowerCase().includes('4 hour') || booking.listingTitle?.toLowerCase().includes('4hrs') ? 'local_4hrs'
                : booking.listingTitle?.toLowerCase().includes('8 hour') || booking.listingTitle?.toLowerCase().includes('8hrs') ? 'local_8hrs'
                  : 'outstation_cab');

          const { error: cabError } = await supabase.from('cab_bookings').insert({
            booking_id: newBooking.id,
            traveller_id: user.id,
            host_id: finalHostId,
            hub_partner_id: matchedHubPartnerId,
            assignment_status: assignmentStatus,
            distance_km: booking.cabDetails.distance_km,
            state: booking.cabDetails.state,
            pickup_location: pickupAddress,
            drop_location: booking.cabDetails.drop_location,
            travel_date: finalTravelDate.toISOString(),
            return_date: booking.cabDetails.return_date ? new Date(booking.cabDetails.return_date).toISOString() : null,
            cab_type: booking.cabDetails.cab_type,
            fare_amount: booking.cabDetails.fare_amount,
            airport_parking_charge: booking.cabDetails.parking_charge || 0,
            base_amount: Number(fullBaseAmount.toFixed(2)),
            base_fare: Number(fullBaseAmount.toFixed(2)),
            gst_percentage: Number(gstPercentage.toFixed(2)),
            gst_amount: Number(gstAmount.toFixed(2)),
            payment_status: 'pending',
            booking_status: 'pending',
            booking_type: booking.listingTitle,
            booking_source: bookingSource,
            booking_category: 'cab',
            customer_name: name,
            customer_phone: phone,
            pickup_latitude: pickupCoords?.lat,
            pickup_longitude: pickupCoords?.lng,
            pickup_place_id: pickupPlaceId || booking.cabDetails.pickup_place_id,
            drop_latitude: booking.cabDetails.drop_latitude,
            drop_longitude: booking.cabDetails.drop_longitude,
            drop_place_id: booking.cabDetails.drop_place_id
          });
          if (cabError) console.error("Cab booking insert error:", cabError);

          // Notify the matched Hub Partner
          if (matchedHubPartnerId) {
            await createNotification({
              user_id: matchedHubPartnerId,
              title: "New Assigned Cab Booking!",
              message: `${name} has booked a cab from ${booking.cabDetails.pickup_location} to ${booking.cabDetails.drop_location}. Distance: ${booking.cabDetails.distance_km || "Unknown"} KM.`,
              type: "bookings",
              link: "/hub/bookings",
              reference_id: newBooking.id,
              reference_type: "booking",
            });
          }
        } catch (err) {
          console.error("Cab booking insert exception:", err);
        }
      }

      // Notify the host about the new booking request
      if (booking.hostId && booking.hostId !== "00000000-0000-0000-0000-000000000000") {
        await createNotification({
          user_id: booking.hostId,
          title: "New Booking Request!",
          message: `${name} has booked "${booking.listingTitle}". Check-in: ${format(new Date(booking.startDate), "MMM d, yyyy")} — Check-out: ${format(new Date(booking.endDate), "MMM d, yyyy")}.`,
          type: "bookings",
          link: "/host/bookings",
          reference_id: newBooking.id,
          reference_type: "booking",
        });
      }
    } catch (err: any) {
      console.error("Booking init exception:", err);
      toast.error(`Booking error: ${err?.message ?? "Unknown error"}`);
      setIsProcessing(false);
      return;
    }

    await initiateRazorpayPayment({
      amount: totalPayable,
      title: booking.listingTitle,
      description: booking.description,
      prefill: { name, email, contact: phone },
      onSuccess: async (response) => {
        try {
          const { data, error } = await supabase.functions.invoke('verify-razorpay-payment', {
            body: {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              booking_id: pendingBookingId,
              coupon_id: appliedCoupon?.id,
              referral_code: getReferralCode() || undefined,
              used_wing_credits: wingCreditsDiscountAmount,
            }
          });

          if (error || !data?.success) {
            console.error("Payment verification failed:", error);
            toast.error("Payment verification failed. Invalid signature.");
            setIsProcessing(false);
            navigate("/transaction-failed", {
              state: { booking: { ...booking, discount: hostDiscountAmount + couponDiscountAmount, total: totalPayable } },
            });
            return;
          }

          clearReferral();
          toast.success("Booking confirmed securely!");
          setIsProcessing(false);
          navigate("/booking-confirmation", {
            state: {
              booking: { ...booking, discount: hostDiscountAmount + couponDiscountAmount, total: totalPayable },
              paymentId: response.razorpay_payment_id,
              customerName: name,
            },
          });
        } catch (err) {
          console.error("Edge function error:", err);
          setIsProcessing(false);
          navigate("/transaction-failed", {
            state: { booking: { ...booking, discount: hostDiscountAmount + couponDiscountAmount, total: totalPayable } },
          });
        }
      },
      onFailure: async () => {
        // Mark the booking as payment_failed so it doesn't sit as 'pending' forever
        if (pendingBookingId) {
          // bookings table only supports 'cancelled', not 'failed' for booking_status
          await supabase.from('bookings').update({
            payment_status: 'failed',
            booking_status: 'cancelled',
          }).eq('id', pendingBookingId);

          // cab_bookings supports 'failed' for booking_status
          await supabase.from('cab_bookings').update({
            payment_status: 'failed',
            booking_status: 'failed',
          }).eq('booking_id', pendingBookingId);
        }
        setIsProcessing(false);
        navigate("/transaction-failed", {
          state: { booking: { ...booking, discount: hostDiscountAmount + couponDiscountAmount, total: totalPayable } },
        });
      },
    });
  };

  if (!booking) {
    return (
      <div className="min-h-screen flex flex-col">
        <Marquee />
        <Header />
        <main className="container mx-auto px-4 py-12 flex-grow">
          <Card className="max-w-xl mx-auto p-8 rounded-3xl border-border shadow-strong bg-white dark:bg-card">
            <h1 className="text-2xl font-bold text-foreground mb-2">Booking details missing</h1>
            <p className="text-muted-foreground mb-5">Please start from a listing detail page and click Book Now again.</p>
            <Button className="rounded-full px-6" onClick={() => navigate("/")}>Go to Home</Button>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Marquee />
      <Header />
      <main className="max-w-7xl mx-auto w-full px-4 py-10 flex-grow">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left — Review & Customer Details */}
          <Card className="lg:col-span-2 rounded-2xl border-border shadow-sm bg-white dark:bg-card p-6">
            <h1 className="text-3xl font-bold text-foreground mb-1">Review your items</h1>
            <p className="text-sm text-muted-foreground mb-5">
              Please carefully review the dates and details before completing payment.
            </p>

            {/* Listing Summary */}
            <div className="rounded-2xl border border-border bg-background p-4 mb-5">
              <div className="flex items-start gap-3">
                {/* Car image */}
                <div className="h-20 w-28 sm:h-28 sm:w-36 rounded-xl overflow-hidden border border-border bg-white shrink-0 flex items-center justify-center">
                  {booking.listingImage ? (
                    <img
                      src={booking.listingImage}
                      alt={booking.listingTitle}
                      className="h-full w-full object-contain mix-blend-multiply"
                    />
                  ) : null}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm sm:text-lg font-semibold text-foreground leading-snug">{booking.listingTitle}</p>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-1 flex items-center gap-1">
                      <CalendarDays className="h-3.5 w-3.5 text-accent shrink-0" />
                      {stayDates}
                    </p>
                    {booking.cabDetails && (
                      <>
                        <p className="text-xs sm:text-sm font-medium text-foreground mt-1">
                          📍 {booking.cabDetails.pickup_location} → {booking.cabDetails.drop_location}
                        </p>
                        {booking.cabDetails.pickup_time && (
                          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 flex items-center gap-1">
                            🕐 Pickup at {booking.cabDetails.pickup_time}
                          </p>
                        )}
                      </>
                    )}
                    {/* Total — shown below on mobile only */}
                    <p className="sm:hidden text-sm font-bold text-foreground mt-2">
                      Total — {booking.currencySymbol}{formatAmount(booking.total)}
                    </p>
                  </div>

                  {/* Total — shown on the right on desktop only */}
                  <div className="hidden sm:block text-right shrink-0">
                    <p className="text-xs text-muted-foreground">Total</p>
                    <p className="text-2xl font-bold text-foreground whitespace-nowrap">
                      {booking.currencySymbol}{formatAmount(booking.total)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Primary Customer Details */}
            <div className="rounded-2xl border border-border bg-secondary/30 p-4">
              <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <UserRound className="h-5 w-5 text-accent" />
                  Primary guest details
                </h2>
                <div className="flex gap-2">
                  {user && (
                    <Button
                      type="button"
                      size="sm"
                      className="h-8 rounded-full bg-[#115f10] hover:bg-[#0c4b0c] text-white px-4 text-xs font-semibold shadow-sm transition-all"
                      onClick={handleSameAsLogin}
                    >
                      Same as login details
                    </Button>
                  )}
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-8 rounded-full px-4 text-xs font-semibold gap-1.5"
                    onClick={() => setShowAddGuest(true)}
                  >
                    <UserPlus className="h-3.5 w-3.5" />
                    Add Customers
                  </Button>
                </div>
              </div>
              <form className="space-y-3" onSubmit={handleProceedToPay} id="checkout-form">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="customer-name">Full Name *</Label>
                    <Input
                      id="customer-name"
                      className="h-11 rounded-xl bg-white dark:bg-background"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Enter your full name"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="customer-phone">Phone Number *</Label>
                    <Input
                      id="customer-phone"
                      className="h-11 rounded-xl bg-white dark:bg-background"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="Enter your phone number"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="customer-email">Email *</Label>
                  <Input
                    id="customer-email"
                    type="email"
                    className="h-11 rounded-xl bg-white dark:bg-background"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    required
                  />
                </div>
                {booking.cabDetails && (
                  <div className="space-y-3">
                    <LocationAutocomplete
                      label="Pickup Address *"
                      value={pickupAddress}
                      placeholder="Search for your exact pickup location..."
                      onChange={(data: LocationData) => {
                        setPickupAddress(data.address);
                        setPickupCoords({ lat: data.lat, lng: data.lng });
                        if (data.placeId) setPickupPlaceId(data.placeId);
                        
                        console.log("Selected Address:", data.address);
                        console.log("Selected Latitude:", data.lat);
                        console.log("Selected Longitude:", data.lng);
                        console.log("Place ID:", data.placeId);
                      }}
                    />

                    {/* Coordinates display — shown after detection */}
                    {pickupCoords && (
                      <div className="mt-2 rounded-xl border border-border bg-muted/30 p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-foreground">📌 GPS Coordinates</span>
                          <a
                            href={`https://www.google.com/maps?q=${pickupCoords.lat},${pickupCoords.lng}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] font-semibold text-[#064e3b] underline underline-offset-2 hover:opacity-80"
                          >
                            Open in Google Maps ↗
                          </a>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="rounded-lg border bg-white px-3 py-2">
                            <p className="text-[9px] text-muted-foreground uppercase tracking-wide">Latitude</p>
                            <p className="text-sm font-mono font-semibold text-foreground">{pickupCoords.lat.toFixed(6)}</p>
                          </div>
                          <div className="rounded-lg border bg-white px-3 py-2">
                            <p className="text-[9px] text-muted-foreground uppercase tracking-wide">Longitude</p>
                            <p className="text-sm font-mono font-semibold text-foreground">{pickupCoords.lng.toFixed(6)}</p>
                          </div>
                        </div>
                        <p className="text-[9px] text-muted-foreground">
                          Share these coordinates with your cab driver to navigate directly to your location.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </form>
            </div>

            {/* Additional Guests Panel */}
            {(showAddGuest || extraGuests.length > 0) && (
              <div className="rounded-2xl border border-border bg-secondary/10 p-4 mt-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-foreground flex items-center gap-2">
                    <UserPlus className="h-4 w-4 text-accent" />
                    Additional Guests
                  </h3>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-8 rounded-full gap-1 px-3 text-xs"
                    onClick={addExtraGuest}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add Guest
                  </Button>
                </div>

                {extraGuests.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Click "Add Guest" to add details for additional travellers.
                  </p>
                )}

                {extraGuests.map((guest, i) => (
                  <div key={i} className="relative border border-border rounded-xl p-4 bg-white dark:bg-card space-y-3">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-semibold text-foreground">Guest {i + 1}</p>
                      <button
                        type="button"
                        onClick={() => removeExtraGuest(i)}
                        className="text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Full Name *</Label>
                        <Input
                          className="h-9 rounded-lg text-sm"
                          value={guest.name}
                          onChange={e => updateExtraGuest(i, "name", e.target.value)}
                          placeholder="Guest full name"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Phone Number</Label>
                        <Input
                          className="h-9 rounded-lg text-sm"
                          value={guest.phone}
                          onChange={e => updateExtraGuest(i, "phone", e.target.value)}
                          placeholder="Phone number"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Email</Label>
                        <Input
                          className="h-9 rounded-lg text-sm"
                          type="email"
                          value={guest.email}
                          onChange={e => updateExtraGuest(i, "email", e.target.value)}
                          placeholder="Email address"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Age (optional)</Label>
                        <Input
                          className="h-9 rounded-lg text-sm"
                          type="number"
                          min={1}
                          max={120}
                          value={guest.age}
                          onChange={e => updateExtraGuest(i, "age", e.target.value)}
                          placeholder="Age"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">ID Proof (optional)</Label>
                        <Input
                          className="h-9 rounded-lg text-sm"
                          value={guest.id_proof}
                          onChange={e => updateExtraGuest(i, "id_proof", e.target.value)}
                          placeholder="Aadhar / Passport no."
                        />
                      </div>
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 ml-auto"
                  onClick={() => { setShowAddGuest(false); if (extraGuests.length === 0) setExtraGuests([]); }}
                >
                  <X className="h-3 w-3" />
                  Close
                </button>
              </div>
            )}

            <div className="mt-5 rounded-xl bg-accent/10 border border-accent/20 px-4 py-3 flex items-center gap-2 text-sm text-accent">
              <ShieldCheck className="h-4 w-4" />
              WingsNNests guarantee: 24x7 support and secure checkout.
            </div>
          </Card>

          {/* Right — Checkout Summary */}
          <Card className="rounded-2xl border-border shadow-sm bg-white dark:bg-card p-6 h-fit">
            <h2 className="text-xl font-semibold text-foreground mb-4">Checkout Summary</h2>

            {/* Wing Credits */}
            {programEnabled && walletBalance > 0 && (
              <div className="mb-4 rounded-xl border border-primary/20 bg-primary/5 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-semibold text-foreground flex items-center gap-2">
                      <Wallet className="h-4 w-4 text-primary" />
                      Wing Credits
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      Available: <span className="font-semibold text-foreground">{booking?.currencySymbol}{formatAmount(walletBalance)}</span>
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      You can use up to <span className="font-semibold">{booking?.currencySymbol}{formatAmount(maxRedeemableCredits)}</span> for this booking.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="use-wing-credits"
                      checked={useWingCredits}
                      onChange={(e) => setUseWingCredits(e.target.checked)}
                      className="h-4 w-4 rounded border-primary/30 accent-primary"
                    />
                    <Label htmlFor="use-wing-credits" className="text-xs font-semibold cursor-pointer">
                      Apply
                    </Label>
                  </div>
                </div>
              </div>
            )}

            {/* Promo Code */}
            <div className="flex gap-2 mb-4">
              <Input
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value)}
                className="h-10 rounded-lg bg-background"
                placeholder="Enter Promo Code"
              />
              <Button type="button" variant="outline" className="h-10 rounded-lg" onClick={handleApplyCoupon}>
                Apply
              </Button>
            </div>
            {appliedCoupon ? (
              <p className="text-xs text-accent mb-3">
                Applied {appliedCoupon.code} ({appliedCoupon.type === "flat" ? `₹${appliedCoupon.value} off` : `${appliedCoupon.value}% off`}).
              </p>
            ) : null}

            {/* Available Coupons */}
            {user && availableCoupons.length > 0 && !appliedCoupon && (
              <div className="mb-4">
                <p className="text-xs font-semibold text-muted-foreground mb-2">🎁 Available Coupons</p>
                <div className="flex flex-col gap-2">
                  {availableCoupons.map((coupon: any) => (
                    <div 
                      key={coupon.id} 
                      className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-md px-3 py-2.5"
                    >
                      <div className="flex items-center gap-2">
                        <Ticket className="h-5 w-5 text-emerald-600" />
                        <div>
                          <p className="text-sm font-bold text-emerald-800 tracking-wide">{coupon.code}</p>
                          <p className="text-xs text-emerald-600 font-medium">
                            {coupon.type === "flat" ? `₹${coupon.value} OFF` : `${coupon.value}% OFF`}
                          </p>
                          {(coupon.endsAt || coupon.expiresAt) && (
                            <p className="text-[10px] text-emerald-600/70 mt-0.5">
                              Expires: {new Date(coupon.endsAt || coupon.expiresAt).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700 text-white h-7 px-3 text-xs rounded-full"
                        onClick={() => {
                          setAppliedCoupon({ code: coupon.code, type: coupon.type, value: coupon.value });
                          setPromoCode(coupon.code);
                          console.log("Applied Coupon:", coupon.code);
                          handleApplyCoupon(coupon.code);
                        }}
                      >
                        Apply
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}



            {/* Price Breakdown */}
            <div className="space-y-2 text-sm border-t border-border pt-4">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium text-foreground">{booking.currencySymbol}{formatAmount(fullBaseAmount)}</span>
              </div>

              {booking.cabDetails && booking.cabDetails.parking_charge > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Parking Charges</span>
                  <span className="font-medium text-foreground">{booking.currencySymbol}{formatAmount(booking.cabDetails.parking_charge)}</span>
                </div>
              )}

              {gstEnabled && gstPercentage > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">GST ({gstPercentage}%)</span>
                  <span className="font-medium text-foreground">{booking.currencySymbol}{formatAmount(gstAmount)}</span>
                </div>
              )}

              {appliedCoupon ? (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground font-semibold text-accent">
                    Coupon discount ({appliedCoupon.type === "flat" ? `₹${appliedCoupon.value} flat` : `${appliedCoupon.value}%`})
                  </span>
                  <span className="font-medium text-accent">-{booking.currencySymbol}{formatAmount(couponDiscountAmount)}</span>
                </div>
              ) : null}
              {useWingCredits && wingCreditsDiscountAmount > 0 ? (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground font-semibold text-accent">
                    Wing Credits Used
                  </span>
                  <span className="font-medium text-accent">-{booking.currencySymbol}{formatAmount(wingCreditsDiscountAmount)}</span>
                </div>
              ) : null}
              {extraGuests.filter(g => g.name.trim()).length > 0 && (
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Additional guests</span>
                  <span>{extraGuests.filter(g => g.name.trim()).length} added</span>
                </div>
              )}
              <div className="flex items-center justify-between pt-3 mt-2 border-t border-border">
                <span className="font-semibold text-foreground flex items-center gap-1.5">
                  <Receipt className="h-4 w-4 text-accent" />
                  {isLocalOrAirport ? "Total Fare" : `Total payable (${bookingFeeRate}% Booking Fee)`}
                </span>
                <span className="font-bold text-xl text-accent">{booking.currencySymbol}{formatAmount(totalPayable)}</span>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-secondary/30 p-3 mt-4 text-xs text-muted-foreground">
              <p className="font-medium text-foreground mb-1">Booking destination</p>
              <p className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" />
                {booking.listingTitle}
              </p>
            </div>

            <label className="flex items-start gap-2 text-xs text-muted-foreground mt-4">
              <input
                type="checkbox"
                checked={hasAcceptedPolicies}
                onChange={(e) => setHasAcceptedPolicies(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-border accent-primary"
              />
              <span>
                By clicking {isLocalOrAirport ? "Pay and confirm booking" : `Pay ${bookingFeeRate}% and confirm booking`}, I confirm I have read and accepted Xplorwing's Privacy Policy,
                Terms of Use, and Cancellation Policy for this booking.
              </span>
            </label>

            <Button
              type="submit"
              form="checkout-form"
              size="lg"
              disabled={isProcessing || !hasAcceptedPolicies}
              className="w-full mt-5 h-12 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              <CreditCard className="h-4 w-4 mr-1" />
              {isProcessing ? "Processing..." : isLocalOrAirport ? "Pay and confirm booking" : `Pay ${bookingFeeRate}% and confirm booking`}
            </Button>
          </Card>
        </div>

        {/* Cancellation Policy */}
        <Card className="rounded-2xl border-border shadow-sm bg-white dark:bg-card p-6 mt-6">
          <h3 className="text-2xl font-semibold text-foreground mb-3">Cancellation Policy</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            {cancellationPolicy.map((item) => (
              <li key={item} className="leading-relaxed">• {item}</li>
            ))}
          </ul>
        </Card>

        {/* Important Notice */}
        <Card className="rounded-2xl border-border shadow-sm bg-white dark:bg-card p-6 mt-6">
          <h3 className="text-2xl font-semibold text-foreground mb-3">Important Notice</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            {importantNotices.map((item) => (
              <li key={item} className="leading-relaxed">• {item}</li>
            ))}
          </ul>
        </Card>
      </main>
      <Footer />
    </div>
  );
};

export default ConfirmAndPay;
