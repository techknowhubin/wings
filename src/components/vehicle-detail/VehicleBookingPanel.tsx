import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarDays } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { format, differenceInDays, addDays } from "date-fns";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import type { BookingDetails } from "@/types/booking";
import type { CouponOffer } from "@/lib/discounts";

interface VehicleBookingPanelProps {
  pricePerDay: number;
  currencySymbol?: string;
  title: string;
  requirements?: string;
  imageUrl?: string;
  hostId?: string;
  listingCouponType?: "cars" | "bikes";
  hostDiscountPercent?: number;
  availableCoupons?: CouponOffer[];
}

const VehicleBookingPanel = ({
  pricePerDay,
  currencySymbol = "₹",
  title,
  requirements,
  imageUrl,
  hostId,
  listingCouponType = "cars",
  hostDiscountPercent = 0,
  availableCoupons = [],
}: VehicleBookingPanelProps) => {
  const navigate = useNavigate();
  const tomorrow = useMemo(() => addDays(new Date(), 1), []);
  const [pricingOption, setPricingOption] = useState<"daily" | "weekly" | "monthly">("daily");
  
  const getDurationDays = (option: "daily" | "weekly" | "monthly") => {
    if (option === "daily") return 1;
    if (option === "weekly") return 7;
    return 30;
  };

  const [pickupDate, setPickupDate] = useState<Date>(tomorrow);
  const [dropoffDate, setDropoffDate] = useState<Date>(addDays(tomorrow, getDurationDays("daily")));

  useEffect(() => {
    setDropoffDate(addDays(pickupDate, getDurationDays(pricingOption)));
  }, [pricingOption, pickupDate]);

  const weeklyPrice = pricePerDay * 7 * 0.90;
  const monthlyPrice = pricePerDay * 30 * 0.80;

  const days = Math.max(differenceInDays(dropoffDate, pickupDate), 1);
  const subtotal = pricePerDay * days;
  const discount = Math.round((subtotal * hostDiscountPercent) / 100);
  const serviceFee = 0;
  const total = subtotal - discount + serviceFee;

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
                disabled={(date) => date < new Date()}
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
                disabled={(date) => date <= pickupDate}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>
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
          <p className="text-xs font-bold text-foreground">{currencySymbol}{pricePerDay}</p>
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

      <Button
        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground h-10 rounded-full text-sm font-semibold"
        size="lg"
        onClick={() => {
          const booking: BookingDetails = {
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

      <div className="space-y-1.5 pt-3 border-t border-border">
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">{currencySymbol}{pricePerDay.toLocaleString()} × {days} day{days > 1 ? "s" : ""}</span>
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

      {requirements && (
        <p className="text-[10px] text-muted-foreground mt-3">
          <strong>Requirements:</strong> {requirements}
        </p>
      )}
    </Card>
  );
};

export default VehicleBookingPanel;
