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
}: VehicleBookingPanelProps) => {
  const navigate = useNavigate();
  const today = useMemo(() => startOfDay(new Date()), []);
  const tomorrow = useMemo(() => addDays(today, 1), []);
  
  const [pickupDate, setPickupDate] = useState<Date>(tomorrow);
  const [dropoffDate, setDropoffDate] = useState<Date>(addDays(tomorrow, 1));

  // The duration logic
  const days = Math.max(differenceInDays(dropoffDate, pickupDate), 1);

  // Dynamic pricing calculation
  const pricing = calculateLongStayPricing(pricePerDay, days, longStayDiscounts);
  const subtotal = pricing.finalTotal; // Base calculation with duration discount

  // If there's an additional hostDiscountPercent (from coupons or general host discount), apply it on top
  const hostDiscountAmount = Math.round((subtotal * hostDiscountPercent) / 100);
  const serviceFee = 0;
  const total = subtotal - hostDiscountAmount + serviceFee;

  return (
    <Card className="border-border shadow-strong sticky top-24 p-4 rounded-2xl bg-white dark:bg-card">
      <div className="mb-2">
        <span className="text-2xl font-bold text-foreground">{currencySymbol}{pricePerDay.toLocaleString()}</span>
        <span className="text-sm text-muted-foreground font-medium">/Day</span>
      </div>

      <div className="bg-secondary/50 rounded-lg p-2.5 mb-3">
        <p className="text-sm text-foreground">
          <span className="font-bold">{days} Day{days > 1 ? "s" : ""}</span>
          <span className="text-muted-foreground"> with {title}</span>
        </p>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          {format(pickupDate, "MMM dd, yyyy")} - {format(dropoffDate, "MMM dd, yyyy")}
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
                  "w-full justify-start text-left font-normal h-9 rounded-full border-border px-3 text-xs"
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
                onSelect={setPickupDate}
                disabled={(date) => date < today}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>
        </div>
        <div>
          <label className="text-[10px] font-semibold text-muted-foreground uppercase block mb-0.5">Drop-off</label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal h-9 rounded-full border-border px-3 text-xs"
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
            unitLabel: days === 1 ? "day" : "days",
            unitPrice: pricePerDay,
            quantity: days,
            startDate: pickupDate.toISOString(),
            endDate: dropoffDate.toISOString(),
            description: `${days} day rental of ${title}`,
            subtotal,
            discount: hostDiscountAmount,
            serviceFee,
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

      <div className="space-y-1.5 pt-3 border-t border-border">
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">{currencySymbol}{pricePerDay.toLocaleString()} × {days} day{days > 1 ? "s" : ""}</span>
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
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Service fee</span>
          <span className="text-foreground font-medium">{currencySymbol}{serviceFee}</span>
        </div>
        <div className="flex justify-between text-xs font-bold pt-2 border-t border-border">
          <span className="text-foreground">Total before taxes</span>
          <span className="text-foreground">{currencySymbol}{total.toLocaleString()}</span>
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
