import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarDays, Minus, Plus } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { format, differenceInDays, addDays } from "date-fns";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import type { BookingDetails } from "@/types/booking";
import type { CouponOffer } from "@/lib/discounts";

interface StayBookingPanelProps {
  pricePerNight: number;
  currencySymbol: string;
  maxGuests: number;
  title: string;
  imageUrl?: string;
  hostId?: string;
  listingCouponType?: "stays" | "hotels" | "resorts";
  hostDiscountPercent?: number;
  availableCoupons?: CouponOffer[];
}

const StayBookingPanel = ({
  pricePerNight,
  currencySymbol,
  maxGuests,
  title,
  imageUrl,
  hostId,
  listingCouponType = "stays",
  hostDiscountPercent = 0,
  availableCoupons = [],
}: StayBookingPanelProps) => {
  const navigate = useNavigate();
  const [guests, setGuests] = useState(1);
  const [pricingOption, setPricingOption] = useState<"daily" | "weekly" | "monthly">("weekly");
  const tomorrow = useMemo(() => addDays(new Date(), 1), []);

  const getDurationDays = (option: "daily" | "weekly" | "monthly") => {
    if (option === "daily") return 1;
    if (option === "weekly") return 7;
    return 30;
  };

  const [checkIn, setCheckIn] = useState<Date>(tomorrow);
  const [checkOut, setCheckOut] = useState<Date>(addDays(tomorrow, getDurationDays("weekly")));

  // Update checkout when pricing option changes
  useEffect(() => {
    setCheckOut(addDays(checkIn, getDurationDays(pricingOption)));
  }, [pricingOption, checkIn]);

  const weeklyPrice = pricePerNight * 7 * 0.85;
  const monthlyPrice = pricePerNight * 30 * 0.7;

  const nights = Math.max(differenceInDays(checkOut, checkIn), 1);
  const subtotal = pricePerNight * nights;
  const discount = Math.round((subtotal * hostDiscountPercent) / 100);
  const serviceFee = 0;
  const total = subtotal - discount + serviceFee;

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
                disabled={(date) => date < new Date()}
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
                disabled={(date) => date < (checkIn || new Date())}
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

      {/* Pricing Options */}
      <div className="grid grid-cols-3 gap-1.5 mb-3">
        <button
          type="button"
          onClick={() => setPricingOption("daily")}
          className={`py-2 px-1 border rounded-lg text-center transition-all ${
            pricingOption === "daily"
              ? "border-accent bg-accent/10"
              : "border-border hover:border-muted-foreground"
          }`}
        >
          <p className="text-[10px] font-semibold text-muted-foreground mb-0.5">Daily</p>
          <p className="text-xs font-bold text-foreground">{currencySymbol}{pricePerNight}</p>
        </button>
        <button
          type="button"
          onClick={() => setPricingOption("weekly")}
          className={`py-2 px-1 border rounded-lg text-center transition-all relative ${
            pricingOption === "weekly"
              ? "border-accent bg-accent/10 scale-[1.03]"
              : "border-border hover:border-muted-foreground"
          }`}
        >
          {pricingOption === "weekly" && (
            <span className="absolute -top-2 left-1/2 -translate-x-1/2 bg-accent text-accent-foreground text-[9px] font-bold px-1.5 py-0.5 rounded-full">
              POPULAR
            </span>
          )}
          <p className="text-[10px] font-semibold text-muted-foreground mb-0.5">Weekly</p>
          <p className="text-xs font-bold text-foreground">{currencySymbol}{Math.round(weeklyPrice)}</p>
        </button>
        <button
          type="button"
          onClick={() => setPricingOption("monthly")}
          className={`py-2 px-1 border rounded-lg text-center transition-all ${
            pricingOption === "monthly"
              ? "border-accent bg-accent/10"
              : "border-border hover:border-muted-foreground"
          }`}
        >
          <p className="text-[10px] font-semibold text-muted-foreground mb-0.5">Monthly</p>
          <p className="text-xs font-bold text-foreground">{currencySymbol}{Math.round(monthlyPrice)}</p>
        </button>
      </div>

      {/* Book Now */}
      <Button
        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground h-10 rounded-full text-sm font-semibold"
        size="lg"
        onClick={() => {
          const booking: BookingDetails = {
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
            discount,
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

      {/* Price Breakdown */}
      <div className="space-y-1.5 pt-3 border-t border-border">
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">{currencySymbol}{pricePerNight} × {nights} nights</span>
          <span className="text-foreground font-medium">{currencySymbol}{subtotal.toLocaleString()}</span>
        </div>
        {hostDiscountPercent > 0 ? (
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Host discount ({hostDiscountPercent}%)</span>
            <span className="text-accent font-medium">-{currencySymbol}{discount}</span>
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
    </Card>
  );
};

export default StayBookingPanel;
