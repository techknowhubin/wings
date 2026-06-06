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
import { CalendarDays, CreditCard, MapPin, Plus, Receipt, ShieldCheck, Trash2, UserPlus, UserRound, X } from "lucide-react";
import type { BookingDetails } from "@/types/booking";
import type { CouponOffer } from "@/lib/discounts";
import { getReferralCode, clearReferral } from "@/lib/referral";
import type { Enums } from "@/integrations/supabase/types";
import { createNotification } from "@/lib/supabase-helpers";

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
    if (state?.booking) return state.booking;
    const saved = localStorage.getItem("pending_booking");
    return saved ? JSON.parse(saved) : null;
  });

  useEffect(() => {
    if (state?.booking) {
      setBooking(state.booking);
    }
  }, [state]);

  useEffect(() => {
    if (!authLoading && !user) {
      if (booking) {
        localStorage.setItem("pending_booking", JSON.stringify(booking));
      }
      toast.info("Please sign up or sign in to complete your booking.");
      navigate("/auth");
    }
  }, [user, authLoading, navigate, booking]);

  // Primary guest details
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  // Additional guests
  const [extraGuests, setExtraGuests] = useState<ExtraGuest[]>([]);
  const [showAddGuest, setShowAddGuest] = useState(false);

  const [isProcessing, setIsProcessing] = useState(false);
  const [hasAcceptedPolicies, setHasAcceptedPolicies] = useState(false);
  const [promoCode, setPromoCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<HostedCoupon | null>(null);
  const [globalCoupons, setGlobalCoupons] = useState<HostedCoupon[]>([]);
  const [bookingFeeRate, setBookingFeeRate] = useState(10);
  const [referralCode, setReferralCode] = useState(() => getReferralCode() ?? "");
  const [referralPartner, setReferralPartner] = useState<{ id: string; business_name: string; commission_rate: number } | null>(null);
  const [referralValidating, setReferralValidating] = useState(false);

  useEffect(() => {
    async function fetchPlatformCommission() {
      if (!booking) return;
      const { data, error } = await supabase.from('platform_settings').select('marketplace_commission_pct, linkinbio_commission_pct').maybeSingle();
      if (!error && data) {
        if (booking.bookingChannel === 'link-in-bio' && data.linkinbio_commission_pct) {
          setBookingFeeRate(Number(data.linkinbio_commission_pct));
        } else if (data.marketplace_commission_pct) {
          setBookingFeeRate(Number(data.marketplace_commission_pct));
        }
      }
    }
    fetchPlatformCommission();
  }, [booking?.bookingChannel]);

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
          setName(prev => prev || profile.full_name || user.user_metadata?.full_name || user.user_metadata?.name || "");
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

      setName(profile?.full_name || user.user_metadata?.full_name || user.user_metadata?.name || "");
      setPhone(profile?.phone || user.phone || "");
      setEmail(user.email || "");
      toast.success("Details filled from your profile.");
    } catch {
      setName(user.user_metadata?.full_name || user.user_metadata?.name || "");
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
      const { data } = await supabase
        .from("host_coupons" as any)
        .select(
          "id,code,discount_type,discount_value,discount_percent,is_enabled,listing_id,starts_at,ends_at,expires_at,usage_limit,used_count,one_time_per_user,listing_types"
        )
        .eq("host_id", booking.hostId)
        .eq("is_active", true);
      const filtered = (data ?? []).filter((item: any) => {
        if (!item.is_enabled) return false;
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
          };
        })
      );
    };
    void fetchCoupons();
  }, [booking]);

  const handleValidateReferral = async () => {
    const code = referralCode.trim().toUpperCase();
    if (!code) return;
    setReferralValidating(true);
    try {
      const { data, error } = await supabase
        .from("hub_partners" as any)
        .select("id, business_name, commission_rate, is_active")
        .eq("referral_id", code)
        .maybeSingle();
      if (error || !data) { toast.error("Referral code not found."); setReferralPartner(null); return; }
      if (!(data as any).is_active) { toast.error("This referral code is no longer active."); setReferralPartner(null); return; }
      setReferralPartner(data as any);
      toast.success(`Referral from ${(data as any).business_name} applied!`);
    } catch {
      toast.error("Could not validate referral code.");
    } finally {
      setReferralValidating(false);
    }
  };

  useEffect(() => {
    if (referralCode && !referralPartner) {
      void handleValidateReferral();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const normalBookingFee = useMemo(() => baseTotal * (bookingFeeRate / 100), [baseTotal, bookingFeeRate]);

  const couponDiscountAmount = useMemo(() => {
    if (!booking || !appliedCoupon) return 0;
    if (appliedCoupon.type === "flat") return Math.min(appliedCoupon.value, normalBookingFee);
    return (normalBookingFee * appliedCoupon.value) / 100;
  }, [appliedCoupon, booking, normalBookingFee]);

  const totalPayable = useMemo(() => {
    const raw = normalBookingFee - couponDiscountAmount;
    if (raw <= 0) return 0;
    return Math.max(raw, 1.00);
  }, [normalBookingFee, couponDiscountAmount]);

  const formatAmount = (val: number) => val.toFixed(2);

  const handleApplyCoupon = async () => {
    const normalized = promoCode.trim().toUpperCase();
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
    if (!booking.hostId) {
      toast.error("Booking host details are missing. Please go back and book again.");
      return;
    }
    if (!user?.id) {
      toast.error("Session expired. Please sign in again.");
      navigate("/auth");
      return;
    }

    setIsProcessing(true);

    // Map UI listing type → DB enum value
    const listingTypeMap: Record<string, Enums<"listing_type">> = {
      stay: "stay",
      hotel: "hotel",
      resort: "resort",
      car: "car",
      bike: "bike",
      experience: "experience",
    };

    let rawType = "stay";
    if (booking.listingType === "stay") {
      if (booking.listingCouponType === "hotels") rawType = "hotel";
      else if (booking.listingCouponType === "resorts") rawType = "resort";
      else rawType = "stay";
    } else if (booking.listingType === "experience") {
      rawType = "experience";
    } else if (booking.listingType === "vehicle") {
      rawType = booking.listingCouponType === "bikes" ? "bike" : "car";
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
      const bookingData = {
        user_id: user.id,
        listing_id: booking.listingId || "00000000-0000-0000-0000-000000000001",
        listing_type: dbListingType,
        host_id: booking.hostId,
        start_date: new Date(booking.startDate).toISOString(),
        end_date: new Date(booking.endDate).toISOString(),
        total_price: Number(totalPayable.toFixed(2)),
        currency: booking.currencySymbol === "₹" ? "INR" : "USD",
        payment_status: "pending" as Enums<"payment_status">,
        payment_method: "razorpay",
        booking_status: "pending" as Enums<"booking_status">,
        guests_count: (booking.quantity || 1) + allGuests.length,
        booking_channel: booking.bookingChannel || "marketplace",
        commission_amount: Number(normalBookingFee.toFixed(2)),
        notes: JSON.stringify(notesPayload),
      };

      const { data: newBooking, error: bookingError } = await supabase
        .from("bookings")
        .insert(bookingData)
        .select()
        .single();

      if (bookingError || !newBooking) {
        const errMsg = bookingError?.message ?? "Unknown error";
        console.error("Booking insert error:", bookingError);

        // Give an actionable message for RLS violations
        if (errMsg.includes("row-level security") || errMsg.includes("violates")) {
          toast.error(
            "Booking failed: database permission denied. Please ask your admin to add an INSERT policy on the bookings table for authenticated users.",
            { duration: 8000 }
          );
        } else {
          toast.error(`Failed to initialize booking: ${errMsg}`);
        }
        setIsProcessing(false);
        return;
      }
      pendingBookingId = newBooking.id;

      // Notify the host about the new booking request
      if (booking.hostId) {
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
              referral_code: referralPartner ? referralCode.trim().toUpperCase() : undefined,
              referral_partner_id: referralPartner?.id ?? undefined,
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

          if (referralPartner) clearReferral();
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
      onFailure: () => {
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
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="h-24 w-28 rounded-xl overflow-hidden border border-border bg-secondary/40 shrink-0">
                    {booking.listingImage ? (
                      <img src={booking.listingImage} alt={booking.listingTitle} className="h-full w-full object-cover" />
                    ) : null}
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-foreground">{booking.listingTitle}</p>
                    <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1.5">
                      <CalendarDays className="h-4 w-4 text-accent" />
                      {stayDates}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {booking.quantity} {booking.unitLabel} • {booking.currencySymbol}{booking.unitPrice} each
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Total</p>
                  <p className="text-3xl font-bold text-foreground">
                    {booking.currencySymbol}{formatAmount(booking.total)}
                  </p>
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

            {/* Referral Code */}
            <div className="mb-4">
              <p className="text-xs font-semibold text-muted-foreground mb-1.5">Referral Code <span className="font-normal">(from QR scan)</span></p>
              <div className="flex gap-2">
                <Input
                  value={referralCode}
                  onChange={(e) => { setReferralCode(e.target.value.toUpperCase()); setReferralPartner(null); }}
                  className="h-10 rounded-lg bg-background font-mono text-sm"
                  placeholder="HUB-XXXXXXXX"
                  disabled={!!referralPartner}
                />
                {referralPartner ? (
                  <Button type="button" variant="ghost" className="h-10 text-red-500 hover:bg-red-50 px-3" onClick={() => { setReferralPartner(null); setReferralCode(""); clearReferral(); }}>
                    Remove
                  </Button>
                ) : (
                  <Button type="button" variant="outline" className="h-10 rounded-lg" onClick={handleValidateReferral} disabled={referralValidating || !referralCode.trim()}>
                    {referralValidating ? "…" : "Apply"}
                  </Button>
                )}
              </div>
              {referralPartner && (
                <p className="text-xs text-green-600 font-medium mt-1.5 flex items-center gap-1">
                  <span>✓</span> Referred by {referralPartner.business_name} ({referralPartner.commission_rate}% commission to partner)
                </p>
              )}
            </div>

            {/* Price Breakdown */}
            <div className="space-y-2 text-sm border-t border-border pt-4">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Item total</span>
                <span className="font-medium text-foreground">{booking.currencySymbol}{formatAmount(booking.subtotal)}</span>
              </div>
              {hostDiscountAmount > 0 ? (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Host discount ({booking.hostDiscountPercent ?? 0}%)</span>
                  <span className="font-medium text-accent">-{booking.currencySymbol}{formatAmount(hostDiscountAmount)}</span>
                </div>
              ) : null}
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Service fee</span>
                <span className="font-medium text-foreground">{booking.currencySymbol}{formatAmount(booking.serviceFee)}</span>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-dashed border-border">
                <span className="text-muted-foreground">Booking Fee ({bookingFeeRate}%)</span>
                <span className="font-medium text-foreground">{booking.currencySymbol}{formatAmount(normalBookingFee)}</span>
              </div>
              {appliedCoupon ? (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground font-semibold text-accent">
                    Coupon discount ({appliedCoupon.type === "flat" ? `₹${appliedCoupon.value} flat` : `${appliedCoupon.value}%`})
                  </span>
                  <span className="font-medium text-accent">-{booking.currencySymbol}{formatAmount(couponDiscountAmount)}</span>
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
                  Total payable ({bookingFeeRate}% Booking Fee)
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
                By clicking Pay {bookingFeeRate}% and confirm booking, I confirm I have read and accepted Xplorwing's Privacy Policy,
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
              {isProcessing ? "Processing..." : `Pay ${bookingFeeRate}% and confirm booking`}
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
