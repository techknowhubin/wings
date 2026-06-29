import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarDays } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { format, differenceInDays, addDays, startOfDay } from "date-fns";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import type { BookingDetails } from "@/types/booking";
import type { CouponOffer } from "@/lib/discounts";
import { calculateLongStayPricing } from "@/lib/pricing";

interface VehicleBookingPanelProps {
  listingId?: string;
  pricePerDay: number;
  currencySymbol?: string;
  title: string;
  requirements?: string;
  imageUrl?: string;
  hostId?: string;
  listingCouponType?: "cars" | "bikes";
  hostDiscountPercent?: number;
  availableCoupons?: CouponOffer[];
  longStayDiscounts?: { discount7?: number; discount14?: number; discount30?: number };
  weeklyPrice?: number;
  monthlyPrice?: number;
}

const VehicleBookingPanel = ({
  listingId,
  pricePerDay,
  currencySymbol = "₹",
  title,
  requirements,
  imageUrl,
  hostId,
  listingCouponType = "cars",
  hostDiscountPercent = 0,
  availableCoupons = [],
  longStayDiscounts = {},
  weeklyPrice,
  monthlyPrice,
}: VehicleBookingPanelProps) => {
  const navigate = useNavigate();
  const today = useMemo(() => startOfDay(new Date()), []);
  const tomorrow = useMemo(() => addDays(today, 1), []);
  
  const [pickupDate, setPickupDate] = useState<Date>(tomorrow);
  const [dropoffDate, setDropoffDate] = useState<Date>(addDays(tomorrow, 1));
  const [bookingType, setBookingType] = useState<"daily" | "weekly" | "monthly">("daily");
  const [durationValue, setDurationValue] = useState<number>(1);

  // The duration logic
  let days = Math.max(differenceInDays(dropoffDate, pickupDate), 1);
  let subtotal = 0;
  let unitLabel = "day";
  let unitPrice = pricePerDay;
  let finalDuration = durationValue;

  if (bookingType === "daily") {
    days = Math.max(differenceInDays(dropoffDate, pickupDate), 1);
    const pricing = calculateLongStayPricing(pricePerDay, days, longStayDiscounts);
    subtotal = pricing.finalTotal;
    unitLabel = days === 1 ? "day" : "days";
    unitPrice = pricePerDay;
    finalDuration = days;
  } else if (bookingType === "weekly") {
    unitLabel = durationValue === 1 ? "week" : "weeks";
    unitPrice = weeklyPrice || (pricePerDay * 7);
    subtotal = unitPrice * durationValue;
    finalDuration = durationValue;
    // Auto sync dropoff date for display purposes
    days = durationValue * 7;
  } else if (bookingType === "monthly") {
    unitLabel = durationValue === 1 ? "month" : "months";
    unitPrice = monthlyPrice || (pricePerDay * 30);
    subtotal = unitPrice * durationValue;
    finalDuration = durationValue;
    // Auto sync dropoff date for display purposes
    days = durationValue * 30;
  }

  // Calculate dates for weekly/monthly
  const actualDropoffDate = bookingType === "daily" ? dropoffDate : addDays(pickupDate, days);

  // If there's an additional hostDiscountPercent (from coupons or general host discount), apply it on top
  const hostDiscountAmount = Math.round((subtotal * hostDiscountPercent) / 100);
  const serviceFee = 0;
  const total = subtotal - hostDiscountAmount + serviceFee;
  const advanceAmount = Math.round(total * 0.20);
  const remainingAmount = total - advanceAmount;

  return (
    <Card className="border-border shadow-strong sticky top-24 p-4 rounded-2xl bg-white dark:bg-card">
      <div className="flex gap-1 mb-4 bg-muted p-1 rounded-lg">
        <button
          onClick={() => setBookingType("daily")}
          className={cn("flex-1 text-xs font-medium py-1.5 rounded-md transition-colors", bookingType === "daily" ? "bg-background shadow-sm" : "text-muted-foreground hover:bg-background/50")}
        >
          Daily
        </button>
        <button
          onClick={() => setBookingType("weekly")}
          className={cn("flex-1 text-xs font-medium py-1.5 rounded-md transition-colors", bookingType === "weekly" ? "bg-background shadow-sm" : "text-muted-foreground hover:bg-background/50")}
        >
          Weekly
        </button>
        <button
          onClick={() => setBookingType("monthly")}
          className={cn("flex-1 text-xs font-medium py-1.5 rounded-md transition-colors", bookingType === "monthly" ? "bg-background shadow-sm" : "text-muted-foreground hover:bg-background/50")}
        >
          Monthly
        </button>
      </div>

      <div className="mb-2">
        <span className="text-2xl font-bold text-foreground">{currencySymbol}{unitPrice.toLocaleString()}</span>
        <span className="text-sm text-muted-foreground font-medium">/{unitLabel.replace(/s$/, '')}</span>
      </div>

      <div className="bg-secondary/50 rounded-lg p-2.5 mb-3">
        <p className="text-sm text-foreground">
          <span className="font-bold">{finalDuration} {unitLabel.charAt(0).toUpperCase() + unitLabel.slice(1)}</span>
          <span className="text-muted-foreground"> with {title}</span>
        </p>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          {format(pickupDate, "MMM dd, yyyy")} - {format(actualDropoffDate, "MMM dd, yyyy")}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-1.5 mb-3">
        <div>
          <label className="text-[10px] font-semibold text-muted-foreground uppercase block mb-0.5">Pickup</label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal h-9 rounded-md border-border px-3 text-xs"
                )}
              >
                <CalendarDays className="h-3.5 w-3.5 mr-1 text-accent flex-shrink-0" />
                {format(pickupDate, "MMM dd")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={pickupDate}
                onSelect={(d) => d && setPickupDate(d)}
                disabled={(date) => date < today}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>
        </div>
        
        {bookingType === "daily" ? (
          <div>
            <label className="text-[10px] font-semibold text-muted-foreground uppercase block mb-0.5">Drop-off</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal h-9 rounded-md border-border px-3 text-xs"
                  )}
                >
                  <CalendarDays className="h-3.5 w-3.5 mr-1 text-accent flex-shrink-0" />
                  {format(dropoffDate, "MMM dd")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dropoffDate}
                  onSelect={(d) => d && setDropoffDate(d)}
                  disabled={(date) => date < pickupDate}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>
        ) : (
          <div>
            <label className="text-[10px] font-semibold text-muted-foreground uppercase block mb-0.5">Duration</label>
            <select 
              className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-xs shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              value={durationValue}
              onChange={(e) => setDurationValue(Number(e.target.value))}
            >
              {[1, 2, 3, 4, 5, 6].map((num) => (
                <option key={num} value={num}>
                  {num} {bookingType === "weekly" ? (num === 1 ? "Week" : "Weeks") : (num === 1 ? "Month" : "Months")}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* 20% Advance Highlight */}
      <div className="bg-green-50 border border-green-200 rounded-xl p-3 mb-4 text-center">
        <p className="text-sm font-semibold text-green-800">
          🟢 Pay Only 20% to Confirm Booking
        </p>
      </div>

      <Button
        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground h-10 rounded-full text-sm font-semibold"
        size="lg"
        onClick={() => {
          const booking: BookingDetails = {
            listingId,
            listingType: "vehicle",
            listingCouponType,
            hostId,
            listingTitle: title,
            listingImage: imageUrl,
            currencySymbol,
            unitLabel,
            unitPrice,
            quantity: finalDuration,
            startDate: pickupDate.toISOString(),
            endDate: actualDropoffDate.toISOString(),
            description: `${finalDuration} ${unitLabel} rental of ${title}`,
            subtotal,
            discount: hostDiscountAmount,
            serviceFee,
            total,
            advanceAmount,
            balanceAmount: remainingAmount,
            bookingType,
            durationValue: finalDuration,
            paymentStatus: "partial_paid",
            hostDiscountPercent,
            availableCoupons,
          };

          navigate("/confirm-and-pay", {
            state: { booking },
          });
        }}
      >
        Pay {currencySymbol}{advanceAmount.toLocaleString()} (20%) & Confirm
      </Button>

      <p className="text-[11px] text-center text-muted-foreground mt-2 mb-3">
        You won't be charged yet
      </p>

      <div className="space-y-1.5 pt-3 border-t border-border">
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Rental Price ({finalDuration} {unitLabel})</span>
          <span className="text-foreground font-medium">{currencySymbol}{subtotal.toLocaleString()}</span>
        </div>
        {hostDiscountPercent > 0 ? (
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Host discount ({hostDiscountPercent}%)</span>
            <span className="text-accent font-medium">-{currencySymbol}{hostDiscountAmount}</span>
          </div>
        ) : null}
        <div className="flex justify-between text-xs font-bold pt-2 border-t border-border">
          <span className="text-foreground">Total Amount</span>
          <span className="text-foreground">{currencySymbol}{total.toLocaleString()}</span>
        </div>
        <div className="flex justify-between text-sm font-bold text-primary pt-2">
          <span>Pay Now (20%)</span>
          <span>{currencySymbol}{advanceAmount.toLocaleString()}</span>
        </div>
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Remaining (Pay at pickup)</span>
          <span>{currencySymbol}{remainingAmount.toLocaleString()}</span>
        </div>
      </div>

      {requirements && (
        <p className="text-[10px] text-muted-foreground mt-3">
          <strong>Requirements:</strong> {requirements}
        </p>
      )}
    </Card>
  );
};

export default VehicleBookingPanel;
