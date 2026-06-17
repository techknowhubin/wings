import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { format, addDays } from "date-fns";
import carIcon from "@/assets/car-icon-5436.png";
import sedanImg from "@/assets/sedan-dzire.jpeg";
import muvImg from "@/assets/MUV-Ertiga.jpeg";
import suvImg from "@/assets/SUV-Innova.jpeg";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import "./CabFareCard.css";

// Import local destination images for the ticket design
import goaImg from "@/assets/destinations/goa.jpg";
import manaliImg from "@/assets/destinations/manali.jpg";
import jaipurImg from "@/assets/destinations/jaipur.jpg";
import udaipurImg from "@/assets/destinations/udaipur.jpg";
import munnarImg from "@/assets/destinations/munnar.jpg";
import rishikeshImg from "@/assets/destinations/rishikesh.jpg";
import lonavalaImg from "@/assets/destinations/lonavala.jpg";
import mahabaleshwarImg from "@/assets/destinations/mahabaleshwar.jpg";
import hyderabadImg from "@/assets/destinations/hyderabad.jpg";
import warangalImg from "@/assets/destinations/warangal.jpg";
import visakhapatnamImg from "@/assets/destinations/visakhapatnam.jpg";
import tirupatiImg from "@/assets/destinations/tirupati.jpg";
import arakuImg from "@/assets/destinations/araku.jpg";
import nagarjunasagarImg from "@/assets/destinations/nagarjunasagar.jpg";
import coorgImg from "@/assets/destinations/coorg.jpg";
import wayanadImg from "@/assets/destinations/wayanad.jpg";

interface CabFareCardProps {
  fromCode: string;
  fromCity: string;
  toCode: string;
  toCity: string;
  distance: string;
  sedanPrice: number;
  sedanDiscountedPrice?: number;
  suvPrice: number;
  suvDiscountedPrice?: number;
  muvPrice?: number;
  muvDiscountedPrice?: number;
  oneWaySedanPrice?: number;
  oneWaySedanDiscountedPrice?: number;
  oneWaySuvPrice?: number;
  oneWaySuvDiscountedPrice?: number;
  imageUrl?: string;
  delay?: number;
  variant?: "previous" | "ticket";
}

// Map destination codes to high-quality images for the ticket layout
const destinationImages: Record<string, string> = {
  WGL: warangalImg,
  KHM: nagarjunasagarImg,
  NZB: arakuImg,
  KRM: warangalImg,
  MHB: nagarjunasagarImg,
  SDD: nagarjunasagarImg,
  ADL: arakuImg,
  NLG: nagarjunasagarImg,
  VJA: visakhapatnamImg,
  VSK: visakhapatnamImg,
  TPT: tirupatiImg,
  GNT: visakhapatnamImg,
  NEL: visakhapatnamImg,
  KDP: tirupatiImg,
  RJM: visakhapatnamImg,
  KNL: tirupatiImg,
  BLR: coorgImg,
  MYS: coorgImg,
  HBL: coorgImg,
  BGM: coorgImg,
  MNG: coorgImg,
  GLP: coorgImg,
  DVG: coorgImg,
  BDR: coorgImg,
  GOA: goaImg,
  MNL: manaliImg,
  JAI: jaipurImg,
  UDP: udaipurImg,
  MNR: munnarImg,
  RSH: rishikeshImg,
  LNV: lonavalaImg,
  MHB_M: mahabaleshwarImg,
  WYD: wayanadImg,
};

const getDestinationImage = (code: string) => {
  return destinationImages[code.toUpperCase()] || hyderabadImg;
};

const extractDriveId = (url: string) => {
  const fileMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (fileMatch) return fileMatch[1];
  const idMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (idMatch && url.includes("drive.google.com")) return idMatch[1];
  return null;
};

const resolveImageUrl = (url: string) => {
  if (!url) return "";
  const driveId = extractDriveId(url);
  if (driveId) {
    return `https://drive.google.com/thumbnail?id=${driveId}&sz=w600`;
  }
  return url;
};

const CabFareCard = ({
  fromCode,
  fromCity,
  toCode,
  toCity,
  distance,
  sedanPrice,
  sedanDiscountedPrice,
  suvPrice,
  suvDiscountedPrice,
  muvPrice: muvPriceProp,
  muvDiscountedPrice: muvDiscountedPriceProp,
  oneWaySedanPrice,
  oneWaySedanDiscountedPrice,
  oneWaySuvPrice,
  oneWaySuvDiscountedPrice,
  imageUrl,
  delay = 0,
  variant = "previous",
}: CabFareCardProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);
  const [isVehicleSelectOpen, setIsVehicleSelectOpen] = useState(false);
  const [selectedCabType, setSelectedCabType] = useState<"Sedan" | "MUV" | "SUV">("Sedan");
  const [pickedVehicle, setPickedVehicle] = useState<"Sedan" | "MUV" | "SUV" | null>(null);
  const [travelTime, setTravelTime] = useState("06:00");
  const [selectedTripType, setSelectedTripType] = useState<"One Way" | "Round Trip">("Round Trip");
  const [travelDate, setTravelDate] = useState(format(addDays(new Date(), 1), "yyyy-MM-dd"));
  const [returnDate, setReturnDate] = useState(format(addDays(new Date(), 2), "yyyy-MM-dd"));
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [adminHostId, setAdminHostId] = useState<string>("");
  const [isOpen, setIsOpen] = useState(false);

  const [timeSettings, setTimeSettings] = useState<{
    same_day_restrictions_enabled: boolean;
    min_advance_hours: number;
    available_time_slots: string[];
    blocked_time_slots: string[];
  }>({
    same_day_restrictions_enabled: true,
    min_advance_hours: 1,
    available_time_slots: [],
    blocked_time_slots: []
  });

  useEffect(() => {
    // Fetch an admin user ID to act as the host for outstation cabs
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
          setCustomerPhone(profile.phone || user.phone || "");
        }
      } catch (err) {
        console.error("Prefill error:", err);
      }
    };
    prefillProfile();
  }, [user]);

  useEffect(() => {
    const fetchTimeSettings = async () => {
      try {
        const { data, error } = await supabase
          .from('platform_settings' as any)
          .select('same_day_restrictions_enabled, min_advance_hours, available_time_slots, blocked_time_slots')
          .limit(1)
          .maybeSingle();
        if (data && !error) {
          setTimeSettings({
            same_day_restrictions_enabled: data.same_day_restrictions_enabled !== false,
            min_advance_hours: Number(data.min_advance_hours ?? 1),
            available_time_slots: Array.isArray(data.available_time_slots) ? data.available_time_slots : [],
            blocked_time_slots: Array.isArray(data.blocked_time_slots) ? data.blocked_time_slots : [],
          });
        }
      } catch (err) {
        console.error("Failed to fetch platform settings for cab timing:", err);
      }
    };
    fetchTimeSettings();
  }, []);

  useEffect(() => {
    if (isVehicleSelectOpen || isBookModalOpen) {
      document.body.classList.add('hide-wa-btn');
    } else {
      document.body.classList.remove('hide-wa-btn');
    }
    return () => document.body.classList.remove('hide-wa-btn');
  }, [isVehicleSelectOpen, isBookModalOpen]);

  useEffect(() => {
    if (travelDate && returnDate && returnDate < travelDate) {
      setReturnDate(travelDate);
    }
  }, [travelDate, returnDate]);

  const getFilteredTimeSlots = () => {
    const allSlots = Array.from({ length: 48 }, (_, i) => {
      const h = Math.floor(i / 2);
      const m = i % 2 === 0 ? "00" : "30";
      const hh = String(h).padStart(2, "0");
      const timeStr = `${hh}:${m}`;
      const ampm = h < 12 ? "AM" : "PM";
      const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
      const displayStr = `${String(h12).padStart(2, "0")}:${m} ${ampm}`;
      return { value: timeStr, label: displayStr };
    });

    return allSlots.filter((slot) => {
      const [sh, sm] = slot.value.split(":").map(Number);

      // 1. Block 12 hours from current time and date
      if (travelDate) {
        const now = new Date();
        const [ty, tm, td] = travelDate.split("-").map(Number);
        const slotDate = new Date(ty, tm - 1, td, sh, sm, 0, 0);

        const diffMs = slotDate.getTime() - now.getTime();
        const diffHours = diffMs / (1000 * 60 * 60);

        if (diffHours < 12) {
          return false;
        }
      }

      // 2. Filter by available time slots configured by admin
      if (timeSettings.available_time_slots.length > 0) {
        if (!timeSettings.available_time_slots.includes(slot.value)) {
          return false;
        }
      }

      // 3. Filter by manually blocked time slots configured by admin
      if (timeSettings.blocked_time_slots.includes(slot.value)) {
        return false;
      }

      return true;
    });
  };

  useEffect(() => {
    const slots = getFilteredTimeSlots();
    if (slots.length > 0) {
      const currentStillValid = slots.some((s) => s.value === travelTime);
      if (!currentStillValid) {
        setTravelTime(slots[0].value);
      }
    }
  }, [travelDate, timeSettings]);

  // ── Shared pricing variables (needed by both variants and the Dialog) ──
  const effectiveSedanRound =
    sedanDiscountedPrice && sedanDiscountedPrice > 0 && sedanDiscountedPrice < sedanPrice
      ? sedanDiscountedPrice
      : sedanPrice;
  const displaySedanRoundOriginal =
    sedanDiscountedPrice && sedanDiscountedPrice > 0
      ? sedanPrice
      : Math.round(effectiveSedanRound * 1.15 / 10) * 10;

  const effectiveSuvRound =
    suvDiscountedPrice && suvDiscountedPrice > 0 && suvDiscountedPrice < suvPrice
      ? suvDiscountedPrice
      : suvPrice;
  const displaySuvRoundOriginal =
    suvDiscountedPrice && suvDiscountedPrice > 0
      ? suvPrice
      : Math.round(effectiveSuvRound * 1.15 / 10) * 10;

  const effectiveSedanOneWay =
    oneWaySedanDiscountedPrice && oneWaySedanDiscountedPrice > 0
      ? oneWaySedanDiscountedPrice
      : oneWaySedanPrice && oneWaySedanPrice > 0
        ? oneWaySedanPrice
        : Math.round((effectiveSedanRound * 0.7) / 10) * 10;
  const displaySedanOneWayOriginal =
    oneWaySedanPrice && oneWaySedanPrice > 0 && oneWaySedanDiscountedPrice && oneWaySedanDiscountedPrice > 0
      ? oneWaySedanPrice
      : Math.round((displaySedanRoundOriginal * 0.7) / 10) * 10;

  const effectiveSuvOneWay =
    oneWaySuvDiscountedPrice && oneWaySuvDiscountedPrice > 0
      ? oneWaySuvDiscountedPrice
      : oneWaySuvPrice && oneWaySuvPrice > 0
        ? oneWaySuvPrice
        : Math.round((effectiveSuvRound * 0.7) / 10) * 10;
  const displaySuvOneWayOriginal =
    oneWaySuvPrice && oneWaySuvPrice > 0 && oneWaySuvDiscountedPrice && oneWaySuvDiscountedPrice > 0
      ? oneWaySuvPrice
      : Math.round((displaySuvRoundOriginal * 0.7) / 10) * 10;

  // MUV pricing — use sheet value when available, else fall back to Sedan × (16/12) ratio
  const muvRatio = 16 / 12;
  const sheetMuvRound = muvPriceProp && muvPriceProp > 0 ? muvPriceProp
    : muvDiscountedPriceProp && muvDiscountedPriceProp > 0 ? muvDiscountedPriceProp
      : 0;
  const effectiveMuvRound = sheetMuvRound > 0
    ? sheetMuvRound
    : Math.round(effectiveSedanRound * muvRatio / 10) * 10;
  const effectiveMuvOneWay = Math.round(effectiveMuvRound * 0.7 / 10) * 10;
  const displayMuvRoundOrig = Math.round(effectiveMuvRound * 1.15 / 10) * 10;
  const displayMuvOneWayOrig = Math.round(effectiveMuvOneWay * 1.15 / 10) * 10;

  // Distance values
  const numericDistance = parseInt(distance) || 300;
  const bufferDistance = 50;
  const oneWayDistance = Math.round(numericDistance / 2);
  const oneWayBuffer = Math.round(bufferDistance / 2);
  const totalCovered = numericDistance + bufferDistance;
  const minToll = Math.max(150, Math.round((numericDistance * 0.5) / 50) * 50);
  const maxToll = minToll + 150;

  const getFareForType = (type: string, trip: "One Way" | "Round Trip") => {
    if (type === "Sedan") return trip === "One Way" ? effectiveSedanOneWay : effectiveSedanRound;
    if (type === "MUV") return trip === "One Way" ? effectiveMuvOneWay : effectiveMuvRound;
    return trip === "One Way" ? effectiveSuvOneWay : effectiveSuvRound;
  };

  const getOriginalFareForType = (type: string, trip: "One Way" | "Round Trip") => {
    if (type === "Sedan") return trip === "One Way" ? displaySedanOneWayOriginal : displaySedanRoundOriginal;
    if (type === "MUV") return trip === "One Way" ? displayMuvOneWayOrig : displayMuvRoundOrig;
    return trip === "One Way" ? displaySuvOneWayOriginal : displaySuvRoundOriginal;
  };

  const buildWhatsAppUrl = (vehicleType: string) => {
    const fare = getFareForType(vehicleType, selectedTripType);
    const formattedPickupDate = travelDate ? format(new Date(travelDate), "dd MMM yyyy") : "—";
    const tripDist = selectedTripType === "One Way" ? `${oneWayDistance} km` : distance;

    let message = `Hi Xplorwing! I would like to book a Cab.\n\n` +
      `🚗 *Booking Details:*\n` +
      (customerName ? `• *Customer Name:* ${customerName.trim()}\n` : "") +
      (customerPhone ? `• *Mobile Number:* ${customerPhone.trim()}\n` : "") +
      `• *Pickup Location:* ${fromCity} (${fromCode})\n` +
      `• *Drop Location:* ${toCity} (${toCode})\n` +
      `• *Route:* ${fromCity} → ${toCity}\n` +
      `• *Distance:* ${tripDist}\n` +
      `• *Trip Type:* ${selectedTripType}\n` +
      `• *Pickup Date:* ${formattedPickupDate}\n` +
      `• *Pickup Time:* ${travelTime}\n` +
      `• *Vehicle Type:* ${vehicleType}\n` +
      `• *Total Fare:* ₹${fare.toLocaleString()}*\n\n` +
      `Please confirm availability. Thank you!`;

    return `https://wa.me/919492986412?text=${encodeURIComponent(message)}`;
  };

  const handleBookNowClick = (cabType: "Sedan" | "MUV" | "SUV", tripType: "One Way" | "Round Trip" = "Round Trip") => {
    setSelectedCabType(cabType);
    setSelectedTripType(tripType);
    setIsBookModalOpen(true);
  };

  const openVehicleSelect = (tripType: "One Way" | "Round Trip" = "Round Trip") => {
    setSelectedTripType(tripType);
    setPickedVehicle(null);
    setIsVehicleSelectOpen(true);
  };

  const handleOnlinePayment = () => {
    if (!travelDate) return;
    const fare = getFareForType(selectedCabType, selectedTripType);

    const stateStr = variant === "ticket" ? "Telangana" : "Andhra Pradesh";

    const bookingDetails = {
      listingType: "vehicle" as const,
      listingCouponType: "cabs" as const,
      hostId: adminHostId || "00000000-0000-0000-0000-000000000000",
      listingTitle: `Outstation Cab - ${selectedCabType} (${selectedTripType})`,
      listingImage: selectedCabType === "Sedan" ? sedanImg : selectedCabType === "MUV" ? muvImg : suvImg,
      currencySymbol: "₹",
      unitLabel: "Trip",
      unitPrice: fare,
      quantity: 1,
      startDate: new Date(travelDate).toISOString(),
      endDate: new Date(selectedTripType === "Round Trip" ? returnDate : travelDate).toISOString(),
      description: `${fromCity} to ${toCity} - Distance: ${distance}`,
      subtotal: fare,
      discount: 0,
      serviceFee: 0,
      total: fare,
      cabDetails: {
        pickup_location: fromCity,
        drop_location: toCity,
        travel_date: travelDate,
        pickup_time: travelTime,
        return_date: selectedTripType === "Round Trip" ? returnDate : undefined,
        cab_type: selectedCabType,
        fare_amount: fare,
        state: stateStr,
        distance_km: numericDistance,
      }
    };

    navigate("/confirm-and-pay", { state: { booking: bookingDetails } });
  };

  // ── Vehicle selection popup ──
  const VEHICLES = [
    { type: "Sedan" as const, img: sedanImg, desc: "4 seats · Comfortable", owFare: effectiveSedanOneWay, rtFare: effectiveSedanRound },
    { type: "MUV" as const, img: muvImg, desc: "6 seats · Spacious", owFare: effectiveMuvOneWay, rtFare: effectiveMuvRound },
    { type: "SUV" as const, img: suvImg, desc: "7 seats · Premium", owFare: effectiveSuvOneWay, rtFare: effectiveSuvRound },
  ];

  const vehicleSelectDialog = (
    <Dialog open={isVehicleSelectOpen} onOpenChange={(open) => { setIsVehicleSelectOpen(open); if (!open) setPickedVehicle(null); }}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Choose Your Vehicle</DialogTitle>
          <DialogDescription>{fromCity} → {toCity} · Tap a vehicle type to proceed</DialogDescription>
        </DialogHeader>

        {/* Vehicle cards */}
        <div className="grid grid-cols-3 gap-3 pt-2">
          {VEHICLES.map(({ type, img, desc, owFare, rtFare }) => {
            const isSelected = pickedVehicle === type;
            return (
              <button
                key={type}
                onClick={() => { setPickedVehicle(type); setSelectedCabType(type); }}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl border-2 transition-all text-center ${isSelected
                  ? "border-[#064e3b] bg-[#f0fdf4] shadow-md"
                  : "border-border hover:border-[#064e3b]/40 hover:bg-muted/40"
                  }`}
              >
                <img
                  src={img}
                  alt={type}
                  className="h-16 w-full object-contain mix-blend-multiply dark:mix-blend-normal"
                />
                <p className={`font-bold text-sm ${isSelected ? "text-[#064e3b]" : "text-foreground"}`}>{type}</p>
                <p className="text-[10px] text-muted-foreground mb-1">{desc}</p>
                {isSelected && <span className="text-[9px] font-bold text-[#064e3b]">✓ Selected</span>}
              </button>
            );
          })}
        </div>

        {/* Booking form — only appears after vehicle is selected */}
        <AnimatePresence>
          {pickedVehicle && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="mt-4 space-y-4 overflow-hidden"
            >
              {/* Trip Type Toggle */}
              <div className="flex items-center justify-center">
                <div className="flex items-center bg-muted/50 rounded-full p-1 border border-border/50">
                  <button
                    onClick={() => setSelectedTripType("One Way")}
                    className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${selectedTripType === "One Way" ? "bg-[#013220] shadow-sm text-white" : "text-muted-foreground hover:text-[#013220]"}`}
                  >
                    ONE WAY
                  </button>
                  <button
                    onClick={() => setSelectedTripType("Round Trip")}
                    className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${selectedTripType === "Round Trip" ? "bg-[#013220] shadow-sm text-white" : "text-muted-foreground hover:text-[#013220]"}`}
                  >
                    ROUND TRIP
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="travelDate" className="text-sm font-semibold text-[#013220]">Travel Date</Label>
                  <Input
                    id="travelDate"
                    type="date"
                    value={travelDate}
                    onChange={(e) => {
                      setTravelDate(e.target.value);
                      setTravelTime("");
                    }}
                    min={format(new Date(Date.now() + 24 * 60 * 60 * 1000), "yyyy-MM-dd")}
                    required
                    className="h-10 text-sm rounded-xl border-[#e2e8f0]"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="travelTime" className="text-sm font-semibold text-[#013220]">Pickup Time</Label>
                  <select
                    id="travelTime"
                    value={travelTime}
                    onChange={(e) => setTravelTime(e.target.value)}
                    required
                    className="flex h-10 w-full items-center justify-between rounded-xl border border-[#e2e8f0] bg-white px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-[#013220]"
                  >
                    <option value="" disabled>Select time</option>
                    {getFilteredTimeSlots().map((slot) => (
                      <option key={slot.value} value={slot.value}>{slot.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="rounded-2xl border border-[#e2e8f0] p-4 bg-white space-y-3 text-sm shadow-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Route</span><span className="font-semibold text-right text-[#013220]">{fromCity} → {toCity}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Distance</span><span className="font-semibold text-[#013220]">{selectedTripType === "One Way" ? `${oneWayDistance} km` : distance}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Vehicle</span><span className="font-semibold text-[#013220]">{pickedVehicle}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Trip</span><span className="font-semibold text-[#013220]">{selectedTripType}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Pickup Time</span><span className="font-semibold text-[#013220]">{travelTime || "—"}</span></div>
                <div className="flex justify-between border-t border-[#e2e8f0] pt-3 mt-1">
                  <span className="font-bold text-base text-[#013220] flex items-center">Estimated Fare</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground line-through">
                      ₹{getOriginalFareForType(pickedVehicle, selectedTripType).toLocaleString()}
                    </span>
                    <span className="font-bold text-xl text-[#013220]">
                      ₹{getFareForType(pickedVehicle, selectedTripType).toLocaleString()}*
                    </span>
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground text-right mt-0">*Excl. tolls, parking,driver allowances and night charges.</p>
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 h-12 text-sm font-bold border-[#25D366] text-[#25D366] rounded-xl hover:bg-[#25D366]/10 hover:text-[#25D366]"
                  onClick={() => {
                    if (!travelDate || !travelTime) {
                      alert("Please fill travel date and time");
                      return;
                    }
                    window.open(buildWhatsAppUrl(pickedVehicle), "_blank");
                    setIsVehicleSelectOpen(false);
                  }}
                >
                  Book via WhatsApp
                </Button>
                <Button
                  type="button"
                  className="flex-1 h-12 text-sm font-bold bg-[#013220] text-white rounded-xl hover:bg-[#013220]/90"
                  onClick={() => {
                    if (!travelDate || !travelTime) {
                      alert("Please fill travel date and time");
                      return;
                    }
                    setIsVehicleSelectOpen(false);
                    setSelectedCabType(pickedVehicle);
                    handleOnlinePayment();
                  }}
                >
                  Book Now (Pay Online)
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );

  // ── Shared Dialog (rendered by both variants) ──
  const bookingDialog = (
    <Dialog open={isBookModalOpen} onOpenChange={setIsBookModalOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Book Your Ride</DialogTitle>
          <DialogDescription>
            Complete your booking for {fromCity} to {toCity} ({selectedCabType} - {selectedTripType}).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="travelDate">Travel Date</Label>
            <Input
              id="travelDate"
              type="date"
              value={travelDate}
              onChange={(e) => setTravelDate(e.target.value)}
              min={format(new Date(Date.now() + 24 * 60 * 60 * 1000), "yyyy-MM-dd")}
              required
            />
          </div>

          <div className="rounded-xl border p-4 bg-muted/20 space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Route</span><span className="font-medium text-right">{fromCity} → {toCity}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Vehicle</span><span className="font-medium">{selectedCabType}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Trip Type</span><span className="font-medium">{selectedTripType}</span></div>
            <div className="flex justify-between border-t border-[#e2e8f0] pt-3 mt-1">
              <span className="font-bold text-base text-[#013220] flex items-center">Estimated Fare</span>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground line-through">
                  ₹{getOriginalFareForType(selectedCabType, selectedTripType).toLocaleString()}
                </span>
                <span className="font-bold text-xl text-[#013220]">
                  ₹{getFareForType(selectedCabType, selectedTripType).toLocaleString()}*
                </span>
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground text-right">*Excl. tolls, parking,driver allowances and  night charges.</p>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2 w-full">
          <Button
            type="button"
            variant="outline"
            className="flex-1 border-[#25D366] text-[#25D366] hover:bg-[#25D366]/10 hover:text-[#25D366]"
            onClick={() => {
              window.open(buildWhatsAppUrl(selectedCabType), "_blank");
              setIsBookModalOpen(false);
            }}
          >
            Book via WhatsApp
          </Button>
          <Button
            type="button"
            className="flex-1 bg-primary text-primary-foreground"
            onClick={() => {
              setIsBookModalOpen(false);
              handleOnlinePayment();
            }}
          >
            Book Now (Pay Online)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  // ────────────────────────────────────────────────────────────────
  // PREVIOUS (ORIGINAL) STYLE RENDERER
  // ────────────────────────────────────────────────────────────────
  if (variant === "previous") {
    return (
      <>
        {vehicleSelectDialog}
        {bookingDialog}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay }}
          className="bg-card border border-border rounded-2xl shadow-sm hover:shadow-md transition-shadow overflow-hidden w-full max-w-full"
        >
          <div className="flex items-center w-full relative min-h-[100px] md:min-h-[120px]">
            {/* From */}
            <div className="flex-1 p-1 md:p-5 flex flex-col items-center justify-center text-center min-w-[60px] md:min-w-[110px]">
              <p className="text-sm md:text-2xl font-bold text-foreground leading-tight">{fromCode}</p>
              <p className="text-[9px] md:text-sm text-muted-foreground leading-tight mt-0.5">{fromCity}</p>
            </div>

            {/* Car icon + distance */}
            <div className="flex flex-col items-center px-0.5 md:px-2 py-4 shrink-0">
              <p className="text-[7px] md:text-[10px] font-bold text-muted-foreground tracking-tighter md:tracking-widest uppercase mb-1">ROUND TRIP</p>
              <div className="flex items-center gap-0.5 md:gap-1">
                <div className="w-2 md:w-8 h-[1px] border-t border-dashed border-primary/30" />
                <img src={carIcon} alt="Car" className="h-5 w-8 md:h-10 md:w-16 object-contain shrink-0" />
                <div className="w-2 md:w-8 h-[1px] border-t border-dashed border-primary/30" />
              </div>
              <p className="text-[8px] md:text-xs text-muted-foreground mt-1 font-medium whitespace-nowrap">
                {distance}
              </p>
            </div>

            {/* To */}
            <div className="flex-1 p-1 md:p-5 flex flex-col items-center justify-center text-center min-w-[60px] md:min-w-[110px]">
              <p className="text-sm md:text-2xl font-bold text-foreground leading-tight">{toCode}</p>
              <p className="text-[9px] md:text-sm text-muted-foreground leading-tight mt-0.5">{toCity}</p>
            </div>

            {/* Price and Book Now — fixed width so all cards are identical height */}
            <div className="p-2 md:p-4 self-stretch flex flex-col items-center justify-center bg-[#064e3b] border-l border-emerald-900 shadow-inner shrink-0 gap-1.5 md:gap-2 w-[100px] md:w-[140px]">
              <div className="flex flex-col items-center text-center text-white w-full">
                <span className="opacity-80 text-[8px] md:text-[10px] font-semibold whitespace-nowrap">Starting from</span>
                <span className="text-[8px] md:text-[10px] text-white/60 line-through mt-0.5 whitespace-nowrap">
                  ₹{displaySedanRoundOriginal.toLocaleString()}
                </span>
                <span className="font-bold text-[#E5F76E] whitespace-nowrap leading-tight"
                  style={{ fontSize: effectiveSedanRound >= 10000 ? 'clamp(0.75rem, 2.5vw, 1rem)' : 'clamp(0.85rem, 3vw, 1.125rem)' }}>
                  ₹{effectiveSedanRound.toLocaleString()}
                </span>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); openVehicleSelect("Round Trip"); }}
                className="w-full px-2 md:px-4 py-1 md:py-1.5 bg-[#E5F76E] text-gray-900 text-[9px] md:text-xs font-bold rounded-full hover:bg-[#d4e85e] transition-colors whitespace-nowrap"
              >
                Book Now
              </button>
            </div>
          </div>
        </motion.div>
      </>
    );
  }

  // ────────────────────────────────────────────────────────────────
  // TICKET STYLE RENDERER (variant === "ticket")
  // ────────────────────────────────────────────────────────────────

  return (
    <>
      {vehicleSelectDialog}
      {bookingDialog}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay }}
        className={`ticket-wrap ${isOpen ? "open" : ""}`}
      >
        <div className="ticket">
          {/* LEFT PANEL */}
          <div className="ticket-left">
            <img
              src={resolveImageUrl(imageUrl || "") || getDestinationImage(toCode)}
              alt={toCity}
              onError={(e) => {
                const img = e.target as HTMLImageElement;
                const driveId = imageUrl ? extractDriveId(imageUrl) : null;
                if (driveId && !img.src.includes("lh3") && !img.src.includes("uc?export")) {
                  img.src = `https://lh3.googleusercontent.com/d/${driveId}`;
                } else if (driveId && !img.src.includes("uc?export")) {
                  img.src = `https://drive.google.com/uc?export=view&id=${driveId}`;
                } else {
                  img.src = getDestinationImage(toCode);
                }
              }}
            />
            <div className="dest-label">
              <div className="dest-code">{toCode}</div>
              <div className="dest-city">{toCity}</div>
            </div>
          </div>

          <div className="divider-line"></div>

          {/* RIGHT PANEL */}
          <div className="ticket-right">
            {/* ROUTE */}
            <div className="route-row">
              <div className="city-block" style={{ alignSelf: "flex-start" }}>
                <div className="city-c">{fromCode}</div>
                <div className="city-n">{fromCity}</div>
              </div>
              <div className="route-mid">
                <span className="dist-chip-ow">
                  One Way · {oneWayDistance} km <span className="dist-buf">+{oneWayBuffer}</span>
                </span>
                <div className="route-line">
                  <div className="rdot"></div>
                  <div className="rline"></div>
                  <svg className="car-svg" viewBox="0 0 32 16" fill="none">
                    <path
                      d="M4 10h24M7 10V7.5L10 4h12l3 3.5V10"
                      stroke="#1a5c3a"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <circle cx="9" cy="11.5" r="1.8" fill="#1a5c3a" />
                    <circle cx="23" cy="11.5" r="1.8" fill="#1a5c3a" />
                  </svg>
                  <div className="rline"></div>
                  <div className="rdot"></div>
                </div>
                <span className="dist-chip-rt">
                  Round Trip · {numericDistance} km <span className="dist-buf">+{bufferDistance}</span>
                </span>
              </div>
              <div className="city-block right" style={{ alignSelf: "flex-end" }}>
                <div className="city-c">{toCode}</div>
                <div className="city-n">{toCity}</div>
              </div>
            </div>

            {/* VEHICLE CARDS — Sedan / MUV / SUV */}
            <div className="vehicle-row">
              <div className="v-card flex justify-center items-center py-4">
                <div className="v-type mb-0" style={{ fontSize: '10px' }}>Sedan</div>
              </div>

              <div className="v-card flex justify-center items-center py-4">
                <div className="v-type mb-0" style={{ fontSize: '10px' }}>MUV</div>
              </div>

              <div className="v-card flex justify-center items-center py-4">
                <div className="v-type mb-0" style={{ fontSize: '10px' }}>SUV</div>
              </div>
            </div>

            {/* SINGLE BOOK NOW BUTTON */}
            <div style={{ display: 'flex', justifyContent: 'center', padding: '4px 0 2px' }}>
              <button onClick={() => openVehicleSelect("Round Trip")} className="v-btn" style={{ minWidth: 120 }}>
                Book Now
              </button>
            </div>

            {/* FOOTER */}
            <div className="ticket-footer">
              <span className="footer-note">* Excl. tolls & driver night charges</span>
              <button onClick={() => setIsOpen(!isOpen)} className="acc-toggle" aria-label="Show details">
                <span className="plus-icon">
                  <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                    <path d="M6 1v10M1 6h10" strokeWidth="1.8" strokeLinecap="round" fill="none" />
                  </svg>
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* ACCORDION */}
        <div className="acc-panel">
          <div className="acc-inner">
            <div>
              <div className="acc-section-title">Fare Breakdown</div>
              <div className="acc-trip-header">One Way</div>
              <div className="acc-row"><span className="acc-key">Distance</span><span className="acc-val">{oneWayDistance} km</span></div>
              <div className="acc-row"><span className="acc-key">Buffer</span><span className="acc-val">+{oneWayBuffer} km</span></div>
              <div className="acc-row"><span className="acc-key">Total</span><span className="acc-val">{oneWayDistance + oneWayBuffer} km</span></div>
              <div className="acc-trip-header">Round Trip</div>
              <div className="acc-row"><span className="acc-key">Distance</span><span className="acc-val">{numericDistance} km</span></div>
              <div className="acc-row"><span className="acc-key">Buffer</span><span className="acc-val">+{bufferDistance} km</span></div>
              <div className="acc-row"><span className="acc-key">Total</span><span className="acc-val">{totalCovered} km</span></div>
              <div className="acc-trip-header">Extra KM</div>
              <div className="acc-row"><span className="acc-key">Sedan</span><span className="acc-val">₹12 / km</span></div>
              <div className="acc-row"><span className="acc-key">MUV</span><span className="acc-val">₹16 / km</span></div>
              <div className="acc-row"><span className="acc-key">SUV</span><span className="acc-val">₹22 / km</span></div>
            </div>
            <div>
              <div className="acc-section-title">What's Included</div>
              <div className="acc-row"><span className="acc-key">Fuel</span><span className="acc-val">✓ Included</span></div>
              <div className="acc-row"><span className="acc-key">GST</span><span className="acc-val">✓ Included</span></div>
              <div className="acc-row"><span className="acc-key">Driver night</span><span className="acc-val">₹300 / night</span></div>
              <div className="acc-row"><span className="acc-key">Toll est.</span><span className="acc-val">₹{minToll}–₹{maxToll}</span></div>
              <div className="acc-section-title" style={{ marginTop: "10px" }}>Policy</div>
              <div className="acc-note">Fixed · No surge · No disputes · Beyond buffer at base rate</div>
              <div className="acc-highlight">✓ No penalty charges</div>
            </div>
            <div className="acc-divider"></div>
            <div className="acc-full">
              <div className="acc-section-title">Cancellation</div>
              <div className="acc-note">Free up to 24 hrs before pickup · 50% within 12 hrs · Full charge on no-show</div>
            </div>
          </div>
        </div>
      </motion.div>
    </>
  );
};

export default CabFareCard;
