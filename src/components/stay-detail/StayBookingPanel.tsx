import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarDays, Minus, Plus } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { format, differenceInDays, addDays, startOfDay } from "date-fns";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import type { BookingDetails } from "@/types/booking";
import type { CouponOffer } from "@/lib/discounts";
import { calculateLongStayPricing } from "@/lib/pricing";

interface StayBookingPanelProps {
  listingId?: string;
  pricePerNight: number;
  currencySymbol: string;
  maxGuests: number;
  title: string;
  imageUrl?: string;
  hostId?: string;
  listingCouponType?: "stays" | "hotels" | "resorts";
  hostDiscountPercent?: number;
  availableCoupons?: CouponOffer[];
  weeklyPrice?: number;
  monthlyPrice?: number;
  cleaningFee?: number;
  securityDeposit?: number;
  longStayDiscounts?: { discount7?: number; discount14?: number; discount30?: number };
}

const StayBookingPanel = ({
  listingId,
  pricePerNight,
  currencySymbol,
  maxGuests,
  title,
  imageUrl,
  hostId,
  listingCouponType = "stays",
  hostDiscountPercent = 0,
  availableCoupons = [],
  weeklyPrice: weeklyPriceProp,
  monthlyPrice: monthlyPriceProp,
  cleaningFee = 0,
  securityDeposit = 0,
  longStayDiscounts = {},
}: StayBookingPanelProps) => {
  const navigate = useNavigate();
  const [guests, setGuests] = useState(1);
  const today = useMemo(() => startOfDay(new Date()), []);
  const tomorrow = useMemo(() => addDays(today, 1), []);

  const [checkIn, setCheckIn] = useState<Date>(tomorrow);
  const [checkOut, setCheckOut] = useState<Date>(addDays(tomorrow, 1));

  // Update checkOut if it becomes invalid compared to checkIn
  useEffect(() => {
    if (checkOut <= checkIn) {
      setCheckOut(addDays(checkIn, 1));
    }
  }, [checkIn, checkOut]);

  const nights = Math.max(differenceInDays(checkOut, checkIn), 1);

  // Dynamic pricing calculation
  const pricing = calculateLongStayPricing(pricePerNight, nights, longStayDiscounts);
  const subtotal = pricing.finalTotal; // Base calculation with duration discount

  // If there's an additional hostDiscountPercent (from coupons or general host discount), apply it on top
  const hostDiscountAmount = Math.round((subtotal * hostDiscountPercent) / 100);
  const serviceFee = 0;
  const total = subtotal - hostDiscountAmount + serviceFee + cleaningFee + securityDeposit;

  return (
    <Card className="border-border shadow-strong sticky top-24 p-4 rounded-2xl bg-white dark:bg-card">
      {/* Price */}
      <div className="mb-2">
        <span className="text-2xl font-bold text-foreground">{currencySymbol}{pricePerNight}</span>
        <span className="text-sm text-muted-foreground font-medium">/Night</span>
      </div>

      {/* Stay summary */}
      <div className="bg-secondary/50 rounded-lg p-2.5 mb-3">
        <p className="text-sm text-foreground">
          <span className="font-bold">{nights} Nights</span>
          <span className="text-muted-foreground"> in {title}</span>
        </p>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          {checkIn ? format(checkIn, "MMM dd, yyyy") : "Select date"} - {checkOut ? format(checkOut, "MMM dd, yyyy") : "Select date"}
        </p>
      </div>

      {/* Check-in / Check-out / Guests — single row */}
      <div className="grid grid-cols-3 gap-1.5 mb-3">
        <div>
          <label className="text-[10px] font-semibold text-muted-foreground uppercase block mb-0.5">Check in</label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal h-9 rounded-full border-border px-3 text-xs",
                  !checkIn && "text-muted-foreground"
                )}
              >
                <CalendarDays className="h-3.5 w-3.5 mr-1 text-accent flex-shrink-0" />
                {checkIn ? format(checkIn, "MMM dd") : "Select"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={checkIn}
                onSelect={setCheckIn}
                disabled={(date) => date < today}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>
        </div>
        <div>
          <label className="text-[10px] font-semibold text-muted-foreground uppercase block mb-0.5">Check out</label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal h-9 rounded-full border-border px-3 text-xs",
                  !checkOut && "text-muted-foreground"
                )}
              >
                <CalendarDays className="h-3.5 w-3.5 mr-1 text-accent flex-shrink-0" />
                {checkOut ? format(checkOut, "MMM dd") : "Select"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={checkOut}
                onSelect={setCheckOut}
                disabled={(date) => date <= (checkIn || today)}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>
        </div>
        <div>
          <label className="text-[10px] font-semibold text-muted-foreground uppercase block mb-0.5">Guests</label>
          <div className="flex items-center justify-between h-9 border border-border rounded-full px-2">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setGuests(Math.max(1, guests - 1)); }}
              disabled={guests <= 1}
              className="h-6 w-6 rounded flex items-center justify-center text-muted-foreground hover:bg-secondary disabled:opacity-30 transition-colors"
              aria-label="Decrease guests"
            >
              <Minus className="h-3 w-3" />
            </button>
            <span className="text-sm font-semibold text-foreground">{guests}</span>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setGuests(Math.min(maxGuests, guests + 1)); }}
              disabled={guests >= maxGuests}
              className="h-6 w-6 rounded flex items-center justify-center text-accent hover:bg-accent/10 disabled:opacity-30 transition-colors"
              aria-label="Increase guests"
            >
              <Plus className="h-3 w-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Pricing Summary */}
      <div className="bg-secondary/20 rounded-xl p-3 mb-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Original Price:</span>
          <span className={pricing.discountPercent > 0 ? "line-through text-muted-foreground" : "font-semibold"}>
            {currencySymbol}{pricing.originalTotal.toLocaleString()}
          </span>
        </div>

        {pricing.discountPercent > 0 && (
          <>
            <div className="flex justify-between text-sm text-green-600 font-medium bg-green-50 p-1.5 rounded">
              <span>{pricing.discountPercent}% Long Stay Discount Applied</span>
              <span>-{currencySymbol}{pricing.discountAmount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm font-semibold">
              <span>Final Price:</span>
              <span>{currencySymbol}{pricing.finalTotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-xs text-accent font-bold">
              <span>You Save:</span>
              <span>{currencySymbol}{pricing.discountAmount.toLocaleString()}</span>
            </div>
          </>
        )}
      </div>

      {/* Book Now */}
      <Button
        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground h-10 rounded-full text-sm font-semibold"
        size="lg"
        onClick={() => {
          const booking: BookingDetails = {
            listingId,
            listingType: "stay",
            listingCouponType,
            hostId,
            listingTitle: title,
            listingImage: imageUrl,
            currencySymbol,
            unitLabel: nights === 1 ? "night" : "nights",
            unitPrice: pricePerNight,
            quantity: nights,
            startDate: checkIn.toISOString(),
            endDate: checkOut.toISOString(),
            description: `${nights} night stay at ${title}`,
            subtotal,
            discount: hostDiscountAmount,
            serviceFee: serviceFee + cleaningFee + securityDeposit,
            total,
            hostDiscountPercent,
            availableCoupons,
          };

          navigate("/confirm-and-pay", {
            state: { booking },
          });
        }}
      >
        Book Now
      </Button>

      <p className="text-[11px] text-center text-muted-foreground mt-2 mb-3">
        You won't be charged yet
      </p>

      {/* Price Breakdown */}
      <div className="space-y-1.5 pt-3 border-t border-border">
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">{currencySymbol}{pricePerNight.toLocaleString()} × {nights} night{nights > 1 ? "s" : ""}</span>
          <span className="text-foreground font-medium">{currencySymbol}{pricing.originalTotal.toLocaleString()}</span>
        </div>
        {pricing.discountPercent > 0 ? (
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Long stay discount ({pricing.discountPercent}%)</span>
            <span className="text-accent font-medium">-{currencySymbol}{pricing.discountAmount.toLocaleString()}</span>
          </div>
        ) : null}
        {hostDiscountPercent > 0 ? (
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Host discount ({hostDiscountPercent}%)</span>
            <span className="text-accent font-medium">-{currencySymbol}{hostDiscountAmount}</span>
          </div>
        ) : null}
        {(cleaningFee > 0 || securityDeposit > 0) && (
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Additional Fees</span>
            <span className="text-foreground font-medium">{currencySymbol}{cleaningFee + securityDeposit}</span>
          </div>
        )}
        {cleaningFee > 0 && (
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Cleaning fee</span>
            <span className="text-foreground font-medium">{currencySymbol}{cleaningFee.toLocaleString()}</span>
          </div>
        )}
        {securityDeposit > 0 && (
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Security deposit (refundable)</span>
            <span className="text-foreground font-medium">{currencySymbol}{securityDeposit.toLocaleString()}</span>
          </div>
        )}
        <div className="flex justify-between text-xs font-bold pt-2 border-t border-border">
          <span className="text-foreground">Total before taxes</span>
          <span className="text-foreground">{currencySymbol}{total.toLocaleString()}</span>
        </div>
      </div>
    </Card>
  );
};

export default StayBookingPanel;
