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
import { CalendarDays, CreditCard, MapPin, Receipt, ShieldCheck, UserRound } from "lucide-react";
import type { BookingDetails } from "@/types/booking";
import type { CouponOffer } from "@/lib/discounts";

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

const ConfirmAndPay = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { state } = useLocation();
  const booking = (state as ConfirmAndPayState | null)?.booking;

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasAcceptedPolicies, setHasAcceptedPolicies] = useState(false);
  const [promoCode, setPromoCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<HostedCoupon | null>(null);
  const [globalCoupons, setGlobalCoupons] = useState<HostedCoupon[]>([]);

  useEffect(() => {
    const fetchCoupons = async () => {
      if (!booking?.hostId || !booking.listingCouponType) return;
      const { data } = await supabase
        .from("host_coupons" as any)
        .select("id,code,discount_percent,starts_at,ends_at,usage_limit,used_count,one_time_per_user")
        .eq("host_id", booking.hostId)
        .eq("is_active", true)
        .contains("listing_types", [booking.listingCouponType]);
      setGlobalCoupons(
        (data ?? []).map((item: any) => ({
          id: String(item.id),
          code: String(item.code ?? "").toUpperCase(),
          type: "percent" as const,
          value: Number(item.discount_percent ?? 0),
          startsAt: item.starts_at ?? null,
          endsAt: item.ends_at ?? null,
          usageLimit: item.usage_limit ?? null,
          usedCount: Number(item.used_count ?? 0),
          oneTimePerUser: Boolean(item.one_time_per_user),
        })),
      );
    };
    void fetchCoupons();
  }, [booking?.hostId, booking?.listingCouponType]);

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
      return [
        "Valid driving license and age proof are mandatory for vehicle handover.",
        ...common,
      ];
    }

    if (booking.listingType === "experience") {
      return [
        "Please arrive at least 15 minutes before the activity start time.",
        ...common,
      ];
    }

    return common;
  }, [booking]);

  const hostDiscountAmount = booking?.discount ?? 0;
  const availableCoupons = globalCoupons.length > 0 ? globalCoupons : (booking?.availableCoupons as HostedCoupon[] | undefined) ?? [];
  const couponDiscountAmount = useMemo(() => {
    if (!booking || !appliedCoupon) return 0;
    return Math.round(((booking.subtotal - hostDiscountAmount) * appliedCoupon.value) / 100);
  }, [appliedCoupon, booking, hostDiscountAmount]);
  const totalPayable = useMemo(() => {
    if (!booking) return 0;
    return Math.max(booking.subtotal - hostDiscountAmount - couponDiscountAmount + booking.serviceFee, 0);
  }, [booking, couponDiscountAmount, hostDiscountAmount]);

  const handleApplyCoupon = async () => {
    if (!availableCoupons.length) {
      toast.error("No coupons are available for this listing.");
      return;
    }
    const normalized = promoCode.trim().toUpperCase();
    if (!normalized) {
      toast.error("Enter a coupon code to apply.");
      return;
    }
    const match = availableCoupons.find((coupon) => coupon.code.toUpperCase() === normalized);
    if (!match) {
      toast.error("Invalid coupon code.");
      return;
    }
    const now = new Date();
    if (match.startsAt && new Date(match.startsAt) > now) {
      toast.error("This coupon is not active yet.");
      return;
    }
    if (match.endsAt && new Date(match.endsAt) < now) {
      toast.error("This coupon has expired.");
      return;
    }
    if (match.usageLimit && (match.usedCount ?? 0) >= match.usageLimit) {
      toast.error("This coupon reached its usage limit.");
      return;
    }
    if (match.oneTimePerUser && user) {
      const { data: redemption } = await supabase
        .from("host_coupon_redemptions" as any)
        .select("id")
        .eq("coupon_id", match.id)
        .eq("user_id", user.id)
        .maybeSingle();
      if (redemption) {
        toast.error("This coupon can be used only once per user.");
        return;
      }
    }
    setAppliedCoupon(match);
    toast.success(`Coupon ${match.code} applied successfully.`);
  };

  const handleProceedToPay = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!booking) return;
    if (!name.trim() || !email.trim() || !phone.trim()) {
      toast.error("Please fill all customer details before paying.");
      return;
    }
    if (!hasAcceptedPolicies) {
      toast.error("Please accept the privacy and cancellation policy to continue.");
      return;
    }

    setIsProcessing(true);
    await initiateRazorpayPayment({
      amount: totalPayable,
      title: booking.listingTitle,
      description: booking.description,
      prefill: { name, email, contact: phone },
      onSuccess: (response) => {
        setIsProcessing(false);
        if (appliedCoupon?.id && user && booking.hostId) {
          void supabase
            .from("host_coupon_redemptions" as any)
            .insert({
              coupon_id: appliedCoupon.id,
              host_id: booking.hostId,
              user_id: user.id,
              booking_context: {
                listingTitle: booking.listingTitle,
                listingType: booking.listingCouponType || booking.listingType,
                paymentId: response.razorpay_payment_id,
                amount: totalPayable,
              },
            });
          void supabase
            .from("host_coupons" as any)
            .update({ used_count: (appliedCoupon.usedCount ?? 0) + 1 })
            .eq("id", appliedCoupon.id);
        }
        const finalizedBooking: BookingDetails = {
          ...booking,
          discount: hostDiscountAmount + couponDiscountAmount,
          total: totalPayable,
        };
        navigate("/booking-confirmation", {
          state: {
            booking: finalizedBooking,
            paymentId: response.razorpay_payment_id,
            customerName: name,
          },
        });
      },
      onFailure: () => {
        setIsProcessing(false);
        navigate("/transaction-failed", {
          state: {
            booking: {
              ...booking,
              discount: hostDiscountAmount + couponDiscountAmount,
              total: totalPayable,
            },
          },
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
            <p className="text-muted-foreground mb-5">
              Please start from a listing detail page and click Book Now again.
            </p>
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
          <Card className="lg:col-span-2 rounded-2xl border-border shadow-sm bg-white dark:bg-card p-6">
            <h1 className="text-3xl font-bold text-foreground mb-1">Review your items</h1>
            <p className="text-sm text-muted-foreground mb-5">
              Please carefully review the dates and details before completing payment.
            </p>

            <div className="rounded-2xl border border-border bg-background p-4 mb-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="h-24 w-28 rounded-xl overflow-hidden border border-border bg-secondary/40 shrink-0">
                    {booking.listingImage ? (
                      <img
                        src={booking.listingImage}
                        alt={booking.listingTitle}
                        className="h-full w-full object-cover"
                      />
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
                    {booking.currencySymbol}{booking.total}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-secondary/30 p-4">
              <h2 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
                <UserRound className="h-5 w-5 text-accent" />
                Customer details
              </h2>
              <form className="space-y-3" onSubmit={handleProceedToPay} id="checkout-form">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="customer-name">Full Name</Label>
                    <Input
                      id="customer-name"
                      className="h-11 rounded-xl bg-white dark:bg-background"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Enter your full name"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="customer-phone">Phone Number</Label>
                    <Input
                      id="customer-phone"
                      className="h-11 rounded-xl bg-white dark:bg-background"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="Enter your phone number"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="customer-email">Email</Label>
                  <Input
                    id="customer-email"
                    type="email"
                    className="h-11 rounded-xl bg-white dark:bg-background"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                  />
                </div>
              </form>
            </div>

            <div className="mt-5 rounded-xl bg-accent/10 border border-accent/20 px-4 py-3 flex items-center gap-2 text-sm text-accent">
              <ShieldCheck className="h-4 w-4" />
              WingsNNests guarantee: 24x7 support and secure checkout.
            </div>
          </Card>

          <Card className="rounded-2xl border-border shadow-sm bg-white dark:bg-card p-6 h-fit">
            <h2 className="text-xl font-semibold text-foreground mb-4">Checkout Summary</h2>
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
                Applied {appliedCoupon.code} ({appliedCoupon.value}% off).
              </p>
            ) : null}
            <div className="space-y-2 text-sm border-t border-border pt-4">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Item total</span>
                <span className="font-medium text-foreground">{booking.currencySymbol}{booking.subtotal}</span>
              </div>
              {hostDiscountAmount > 0 ? (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Host discount ({booking.hostDiscountPercent ?? 0}%)</span>
                  <span className="font-medium text-accent">-{booking.currencySymbol}{hostDiscountAmount}</span>
                </div>
              ) : null}
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Coupon discount</span>
                <span className="font-medium text-accent">-{booking.currencySymbol}{couponDiscountAmount}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Service fee</span>
                <span className="font-medium text-foreground">{booking.currencySymbol}{booking.serviceFee}</span>
              </div>
              <div className="flex items-center justify-between pt-3 mt-2 border-t border-border">
                <span className="font-semibold text-foreground flex items-center gap-1.5">
                  <Receipt className="h-4 w-4 text-accent" />
                  Total payable
                </span>
                <span className="font-bold text-xl text-accent">{booking.currencySymbol}{totalPayable}</span>
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
                By clicking Complete Payment, I confirm I have read and accepted Xplorwing's Privacy Policy,
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
              {isProcessing ? "Processing..." : "Complete Payment"}
            </Button>
          </Card>
        </div>

        <Card className="rounded-2xl border-border shadow-sm bg-white dark:bg-card p-6 mt-6">
          <h3 className="text-2xl font-semibold text-foreground mb-3">Cancellation Policy</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            {cancellationPolicy.map((item) => (
              <li key={item} className="leading-relaxed">
                • {item}
              </li>
            ))}
          </ul>
        </Card>

        <Card className="rounded-2xl border-border shadow-sm bg-white dark:bg-card p-6 mt-6">
          <h3 className="text-2xl font-semibold text-foreground mb-3">Important Notice</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            {importantNotices.map((item) => (
              <li key={item} className="leading-relaxed">
                • {item}
              </li>
            ))}
          </ul>
        </Card>
      </main>
      <Footer />
    </div>
  );
};

export default ConfirmAndPay;
