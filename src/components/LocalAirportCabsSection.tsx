import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { format, addDays } from "date-fns";
import sedanImg from "@/assets/sedan-dzire.jpeg";
import muvImg from "@/assets/MUV-Ertiga.jpeg";
import suvImg from "@/assets/SUV-Innova.jpeg";
import { useAuth } from "@/hooks/useAuth";
import { Check } from "lucide-react";
import LocationAutocomplete, { LocationData } from "@/components/LocationAutocomplete";


type BookingType = "Airport Transfer" | "4 Hours Local" | "8 Hours Local";

const PRICING: Record<BookingType, { distance: string; prices: Record<string, number>; img: string; badge: string; vehicleBadge: string }> = {
  "Airport Transfer": {
    distance: "35 KM",
    prices: { Sedan: 1099, MUV: 1699, SUV: 2299 },
    img: sedanImg,
    badge: "✈ AIRPORT",
    vehicleBadge: "SEDAN",
  },
  "4 Hours Local": {
    distance: "40 KM",
    prices: { Sedan: 1399, MUV: 1899, SUV: 2499 },
    img: muvImg,
    badge: "🕒 4HRS LOCAL",
    vehicleBadge: "MUV",
  },
  "8 Hours Local": {
    distance: "80 KM",
    prices: { Sedan: 2399, MUV: 2899, SUV: 3499 },
    img: suvImg,
    badge: "🕒 8HRS LOCAL",
    vehicleBadge: "SUV",
  },
};

const VEHICLES = [
  { type: "Sedan" as const, img: sedanImg, desc: "4 seats · Comfortable" },
  { type: "MUV" as const, img: muvImg, desc: "6 seats · Spacious" },
  { type: "SUV" as const, img: suvImg, desc: "7 seats · Premium" },
];

const FIXED_AIRPORT_DROP = "Rajiv Gandhi International Airport (HYD), Shamshabad, Hyderabad";
const FIXED_AIRPORT_LAT = 17.2403;
const FIXED_AIRPORT_LNG = 78.4294;

export default function LocalAirportCabsSection() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [activeBookingType, setActiveBookingType] = useState<BookingType | null>(null);
  const [isVehicleSelectOpen, setIsVehicleSelectOpen] = useState(false);
  const [pickedVehicle, setPickedVehicle] = useState<"Sedan" | "MUV" | "SUV" | null>(null);

  const [travelTime, setTravelTime] = useState("08:00");
  const [travelDate, setTravelDate] = useState(format(addDays(new Date(), 1), "yyyy-MM-dd"));
  const [pickupLocation, setPickupLocation] = useState("");
  const [specialInstructions, setSpecialInstructions] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [adminHostId, setAdminHostId] = useState<string>("");
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollLeft, clientWidth } = scrollContainerRef.current;
    const index = Math.round(scrollLeft / clientWidth);
    setActiveIndex(index);
  };

  useEffect(() => {
    const fetchAdminId = async () => {
      const { data } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin")
        .limit(1)
        .maybeSingle();
      if (data) setAdminHostId(data.user_id);
    };
    fetchAdminId();
  }, []);

  useEffect(() => {
    const prefillProfile = async () => {
      if (!user) return;
      try {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, phone")
          .eq("id", user.id)
          .maybeSingle();
        if (profile) {
          setCustomerName(profile.full_name || "");
          setCustomerPhone(profile.phone || (user as any).phone || "");
        }
      } catch { }
    };
    prefillProfile();
  }, [user]);

  const openBookingFor = (type: BookingType) => {
    setActiveBookingType(type);
    setPickedVehicle(null);
    setTravelTime("08:00");
    setPickupLocation("");
    setSpecialInstructions("");
    setIsVehicleSelectOpen(true);
  };

  // Compute the drop location string based on booking type
  const getDropLocation = () => {
    if (!activeBookingType) return "";
    if (activeBookingType === "Airport Transfer") return FIXED_AIRPORT_DROP;
    return pickupLocation || "Same as Pickup Location";
  };

  const handleOnlinePayment = () => {
    if (!travelDate || !pickedVehicle || !activeBookingType || !pickupLocation) return;

    const fare = PRICING[activeBookingType].prices[pickedVehicle];
    const distanceIncluded = PRICING[activeBookingType].distance;
    const dropLocStr = getDropLocation();

    // Determine the exact booking source from the active booking type
    const bookingSourceMap: Record<BookingType, 'airport_transfer' | 'local_4hrs' | 'local_8hrs'> = {
      "Airport Transfer": "airport_transfer",
      "4 Hours Local": "local_4hrs",
      "8 Hours Local": "local_8hrs",
    };
    const bookingSource = bookingSourceMap[activeBookingType];

    const bookingDetails = {
      listingType: "vehicle" as const,
      listingCouponType: "cabs" as const,
      hostId: adminHostId || "00000000-0000-0000-0000-000000000000",
      listingTitle: `${activeBookingType} - ${pickedVehicle}`,
      listingImage:
        pickedVehicle === "Sedan" ? sedanImg : pickedVehicle === "MUV" ? muvImg : suvImg,
      currencySymbol: "₹",
      unitLabel: "Trip",
      unitPrice: fare,
      quantity: 1,
      startDate: new Date(travelDate).toISOString(),
      endDate: new Date(travelDate).toISOString(),
      description: `${pickupLocation} → ${dropLocStr} · ${distanceIncluded}`,
      subtotal: fare,
      discount: 0,
      serviceFee: 0,
      total: fare,
      bookingSource,
      cabDetails: {
        pickup_location: pickupLocation,
        drop_location: dropLocStr,
        travel_date: travelDate,
        pickup_time: travelTime,
        cab_type: pickedVehicle,
        fare_amount: fare,
        state: "Local",
        distance_km: parseInt(distanceIncluded),
        special_instructions: specialInstructions,
        booking_source: bookingSource,
        drop_latitude: activeBookingType === "Airport Transfer" ? FIXED_AIRPORT_LAT : undefined,
        drop_longitude: activeBookingType === "Airport Transfer" ? FIXED_AIRPORT_LNG : undefined,
      },
    };

    navigate("/confirm-and-pay", { state: { booking: bookingDetails } });
  };

  const getFilteredTimeSlots = () => {
    return Array.from({ length: 48 }, (_, i) => {
      const h = Math.floor(i / 2);
      const m = i % 2 === 0 ? "00" : "30";
      const hh = String(h).padStart(2, "0");
      const ampm = h < 12 ? "AM" : "PM";
      const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
      return { value: `${hh}:${m}`, label: `${String(h12).padStart(2, "0")}:${m} ${ampm}` };
    });
  };

  const vehicleSelectDialog = (
    <Dialog
      open={isVehicleSelectOpen}
      onOpenChange={(open) => {
        setIsVehicleSelectOpen(open);
        if (!open) setPickedVehicle(null);
      }}
    >
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">{activeBookingType} Booking</DialogTitle>
          <DialogDescription>Select a vehicle and fill in your details to proceed.</DialogDescription>
        </DialogHeader>

        {/* Vehicle Selection */}
        {activeBookingType && (
          <div className="grid grid-cols-3 gap-3 pt-2">
            {VEHICLES.map(({ type, img, desc }) => {
              const isSelected = pickedVehicle === type;
              const fare = PRICING[activeBookingType].prices[type];
              return (
                <button
                  key={type}
                  onClick={() => setPickedVehicle(type)}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl border-2 transition-all text-center ${isSelected
                    ? "border-[#064e3b] bg-[#f0fdf4] shadow-md"
                    : "border-border hover:border-[#064e3b]/40 hover:bg-muted/40"
                    }`}
                >
                  <img
                    src={img}
                    alt={type}
                    className="h-14 md:h-20 w-full object-contain mix-blend-multiply dark:mix-blend-normal"
                  />
                  <p className={`font-bold text-sm ${isSelected ? "text-[#064e3b]" : "text-foreground"}`}>{type}</p>
                  <p className="font-bold text-[#064e3b]">₹{fare}</p>
                  <p className="text-[10px] text-muted-foreground hidden md:block">{desc}</p>
                  {isSelected && <span className="text-[9px] font-bold text-[#064e3b] mt-1">✓ Selected</span>}
                </button>
              );
            })}
          </div>
        )}

        {/* Form — slides in after vehicle is picked */}
        <AnimatePresence>
          {pickedVehicle && activeBookingType && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="mt-4 space-y-4 overflow-hidden"
            >
              {/* ── Pickup Location ── */}
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold text-[#013220]">Pickup Location *</Label>
                <Input
                  value={pickupLocation}
                  onChange={(e) => setPickupLocation(e.target.value)}
                  placeholder="Enter your pickup address"
                  className="h-10 text-sm rounded-xl border-[#e2e8f0]"
                />
              </div>

              {/* ── Drop Location (dynamic based on booking type) ── */}
              <div className="space-y-1.5">
                {activeBookingType === "Airport Transfer" ? (
                  <>
                    <Label className="text-sm font-semibold text-[#013220]">✈ Destination</Label>
                    <div className="flex items-center gap-2 px-3 h-10 rounded-xl border border-[#e2e8f0] bg-muted/50 text-sm text-muted-foreground font-medium">
                      ✈ {FIXED_AIRPORT_DROP}
                    </div>
                  </>
                ) : (
                  <>
                    <Label className="text-sm font-semibold text-[#013220]">
                      {activeBookingType === "4 Hours Local" ? "🔄 Round Trip Local Rental" : "📅 Full Day Local Rental"}
                    </Label>
                    <div className="flex items-center gap-2 px-3 h-10 rounded-xl border border-[#e2e8f0] bg-muted/50 text-sm text-muted-foreground font-medium">
                      📍 Same as Pickup Location
                    </div>
                  </>
                )}
              </div>

              {/* ── Date & Time ── */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold text-[#013220]">
                    {activeBookingType === "Airport Transfer" ? "Pickup Date *" : "Date *"}
                  </Label>
                  <Input
                    type="date"
                    value={travelDate}
                    onChange={(e) => setTravelDate(e.target.value)}
                    min={format(new Date(), "yyyy-MM-dd")}
                    className="h-10 text-sm rounded-xl border-[#e2e8f0]"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold text-[#013220]">
                    {activeBookingType === "Airport Transfer" ? "Pickup Time *" : "Start Time *"}
                  </Label>
                  <select
                    value={travelTime}
                    onChange={(e) => setTravelTime(e.target.value)}
                    className="flex h-10 w-full items-center justify-between rounded-xl border border-[#e2e8f0] bg-white px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-[#013220]"
                  >
                    {getFilteredTimeSlots().map((slot) => (
                      <option key={slot.value} value={slot.value}>
                        {slot.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* ── Traveller Details ── */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold text-[#013220]">Traveller Name</Label>
                  <Input
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Name"
                    className="h-10 text-sm rounded-xl border-[#e2e8f0]"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold text-[#013220]">Mobile Number</Label>
                  <Input
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="Phone"
                    className="h-10 text-sm rounded-xl border-[#e2e8f0]"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm font-semibold text-[#013220]">Special Instructions (Optional)</Label>
                <Input
                  value={specialInstructions}
                  onChange={(e) => setSpecialInstructions(e.target.value)}
                  placeholder="Any specific requirements?"
                  className="h-10 text-sm rounded-xl border-[#e2e8f0]"
                />
              </div>

              {/* ── Live Price Summary ── */}
              <div className="rounded-2xl border border-[#e2e8f0] p-4 bg-muted/20 space-y-2.5 text-sm shadow-sm">
                <p className="font-bold text-[#013220] mb-1">Price Summary</p>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Booking Type</span>
                  <span className="font-semibold text-right text-[#013220]">{activeBookingType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Vehicle</span>
                  <span className="font-semibold text-[#013220]">{pickedVehicle}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Included Distance</span>
                  <span className="font-semibold text-[#013220]">{PRICING[activeBookingType].distance}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Base Fare</span>
                  <span className="font-semibold text-[#013220]">₹{PRICING[activeBookingType].prices[pickedVehicle]}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Extra KM</span>
                  <span className="text-xs text-amber-600 font-semibold">Additional charges apply</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Extra Waiting</span>
                  <span className="text-xs text-amber-600 font-semibold">Additional charges apply Rs. 100/Hour</span>
                </div>
                <div className="flex justify-between border-t border-[#e2e8f0] pt-2.5 mt-1">
                  <span className="font-bold text-base text-[#013220]">Estimated Total</span>
                  <span className="font-bold text-xl text-[#013220]">
                    ₹{PRICING[activeBookingType].prices[pickedVehicle]}
                  </span>
                </div>
              </div>

              <Button
                className="w-full h-12 text-sm font-bold bg-gradient-to-r from-[#013220] to-[#064e3b] hover:from-[#064e3b] hover:to-[#013220] text-white rounded-xl shadow-md"
                onClick={() => {
                  if (!pickupLocation.trim()) {
                    alert("Please enter a Pickup Location.");
                    return;
                  }
                  setIsVehicleSelectOpen(false);
                  handleOnlinePayment();
                }}
              >
                Continue To Booking →
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );

  return (
    <section className="py-12 md:py-16 px-4 bg-background">
      <div className="container mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-10"
        >
          <h2 className="text-3xl font-bold text-foreground mb-4">Local & Airport Transfer</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Hassle-free airport drops, pickups, and local hourly rentals. Choose your vehicle and book instantly.
          </p>
        </motion.div>

        {vehicleSelectDialog}

        <div 
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="flex overflow-x-auto snap-x snap-mandatory md:grid md:grid-cols-3 gap-6 md:gap-8 pb-4 md:pb-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] scroll-smooth"
        >
          {(Object.keys(PRICING) as BookingType[]).map((type, i) => {
            const data = PRICING[type];
            return (
              <motion.div
                key={type}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                className="snap-center shrink-0 w-full max-w-full md:w-auto bg-white dark:bg-card border border-[#e2e8f0] dark:border-border rounded-[24px] overflow-hidden shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] hover:shadow-[0_12px_30px_-8px_rgba(0,0,0,0.15)] transition-all duration-300 hover:-translate-y-1 group flex flex-col"
              >
                <div className="p-6 flex-grow flex flex-col items-center">
                  <div className="w-full flex justify-between items-center mb-6">
                    <span className="bg-[#013220] text-[#E5F76E] text-xs font-bold px-3 py-1.5 rounded-full tracking-wider">
                      {data.badge}
                    </span>
                    <span className="bg-[#E5F76E]/20 text-[#013220] text-xs font-bold px-3 py-1.5 rounded-full border border-[#E5F76E]/50">
                      {data.vehicleBadge}
                    </span>
                  </div>

                  <div className="h-32 w-full flex items-center justify-center mb-6">
                    <img
                      src={data.img}
                      alt={type}
                      className="max-h-full max-w-[80%] object-contain mix-blend-multiply dark:mix-blend-normal group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>

                  <div className="text-center mb-6">
                    <p className="text-sm text-muted-foreground font-medium mb-1">Starts From</p>
                    <h3 className="text-3xl font-extrabold text-[#013220]">₹{data.prices.Sedan}</h3>
                    <p className="text-sm font-semibold text-muted-foreground mt-2 bg-muted/50 px-4 py-1 rounded-full inline-block">
                      Upto {data.distance}
                    </p>
                  </div>

                  <div className="w-full space-y-2 mt-auto text-sm text-left px-2">
                    <div className="flex items-center gap-2 text-muted-foreground font-medium">
                      <div className="bg-[#25D366]/20 p-0.5 rounded-full shrink-0">
                        <Check className="h-3 w-3 text-[#25D366]" />
                      </div>
                      Extra KM Charges Apply
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground font-medium">
                      <div className="bg-[#25D366]/20 p-0.5 rounded-full shrink-0">
                        <Check className="h-3 w-3 text-[#25D366]" />
                      </div>
                      Extra Hours / Waiting Time Charges Apply
                    </div>
                  </div>
                </div>

                <div className="p-4 pt-0">
                  <Button
                    onClick={() => openBookingFor(type)}
                    className="w-full py-6 text-base font-bold bg-gradient-to-r from-[#013220] to-[#064e3b] hover:from-[#064e3b] hover:to-[#013220] text-white rounded-xl shadow-md group-hover:shadow-lg transition-all"
                  >
                    Book Now
                  </Button>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Pagination Dots for Mobile */}
        <div className="flex justify-center gap-2 mt-2 md:hidden">
          {(Object.keys(PRICING) as BookingType[]).map((_, i) => (
            <div
              key={i}
              className={`h-2 rounded-full transition-all duration-300 ${
                activeIndex === i ? "w-6 bg-[#013220]" : "w-2 bg-[#013220]/20"
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
