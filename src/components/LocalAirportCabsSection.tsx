import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { format, addDays } from "date-fns";
import sedanImg from "@/assets/sedan.png";
import muvImg from "@/assets/muv.png";
import suvImg from "@/assets/suv.png";
import airportCabsImg from "@/assets/airport-cabs1.png";
import airportCabsOriginalImg from "@/assets/airport-cabs.png";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";
import LocationAutocomplete, { LocationData } from "@/components/LocationAutocomplete";
import { getGoogleRouteDistance, haversineDistance, DEFAULT_AIRPORTS, AirportConfig } from "@/lib/googleMaps";


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

export default function LocalAirportCabsSection() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Airports configuration
  const [airports, setAirports] = useState<AirportConfig[]>(DEFAULT_AIRPORTS);
  const [detectedAirport, setDetectedAirport] = useState<AirportConfig | null>(null);

  // Booking states
  const [activeBookingType, setActiveBookingType] = useState<BookingType | null>(null);
  const [isVehicleSelectOpen, setIsVehicleSelectOpen] = useState(false);
  const [pickedVehicle, setPickedVehicle] = useState<"Sedan" | "MUV" | "SUV" | null>(null);
  const [tripSubType, setTripSubType] = useState<"drop" | "pickup">("drop");

  const [travelTime, setTravelTime] = useState("08:00");
  const [travelDate, setTravelDate] = useState(format(addDays(new Date(), 1), "yyyy-MM-dd"));

  // Locations details
  const [pickupAddress, setPickupAddress] = useState("");
  const [pickupCoords, setPickupCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [pickupPlaceId, setPickupPlaceId] = useState("");

  const [dropAddress, setDropAddress] = useState("");
  const [dropCoords, setDropCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [dropPlaceId, setDropPlaceId] = useState("");

  const [isAirportPickup, setIsAirportPickup] = useState(false);
  const [areaValidationError, setAreaValidationError] = useState<string | null>(null);

  // Route distance states
  const [distanceKm, setDistanceKm] = useState<number | null>(null);
  const [durationMins, setDurationMins] = useState<number | null>(null);
  const [isCalculatingDistance, setIsCalculatingDistance] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);

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
    const container = scrollContainerRef.current;
    if (!container) return;
    const interval = setInterval(() => {
      const { scrollLeft, clientWidth, scrollWidth } = container;
      const atEnd = scrollLeft + clientWidth >= scrollWidth - 1;
      container.scrollTo({ left: atEnd ? 0 : scrollLeft + clientWidth, behavior: "smooth" });
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Fetch customizable airports list from Supabase
  useEffect(() => {
    const fetchAirports = async () => {
      try {
        const { data, error } = await supabase
          .from("airports")
          .select("*");
        if (!error && data && data.length > 0) {
          const parsed = data.map((item: any) => ({
            ...item,
            base_fares: typeof item.base_fares === 'string' ? JSON.parse(item.base_fares) : item.base_fares,
            extra_km_rates: typeof item.extra_km_rates === 'string' ? JSON.parse(item.extra_km_rates) : item.extra_km_rates,
          }));
          setAirports(parsed);
          console.log("Configured airports fetched:", parsed);
        }
      } catch (err) {
        console.warn("Error loading airports from database. Falling back to default list.", err);
      }
    };
    fetchAirports();
  }, []);

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
    setTripSubType("drop");

    // Reset location states
    setPickupAddress("");
    setPickupCoords(null);
    setPickupPlaceId("");
    setDropAddress("");
    setDropCoords(null);
    setDropPlaceId("");
    setIsAirportPickup(false);
    setDetectedAirport(null);
    setDistanceKm(null);
    setDurationMins(null);
    setRouteError(null);

    setAreaValidationError(null);
    setSpecialInstructions("");
    setIsVehicleSelectOpen(true);
  };

  const handleTripSubTypeChange = (type: "drop" | "pickup") => {
    setTripSubType(type);
    setPickupAddress("");
    setPickupCoords(null);
    setPickupPlaceId("");
    setDropAddress("");
    setDropCoords(null);
    setDropPlaceId("");
    setIsAirportPickup(false);
    setDistanceKm(null);
    setDurationMins(null);
    setRouteError(null);

    setAreaValidationError(null);

    if (type === "pickup") {
      const airport = (airports.length > 0 ? airports : DEFAULT_AIRPORTS)[0];
      setPickupAddress(airport.name);
      setPickupCoords({ lat: airport.latitude, lng: airport.longitude });
      setPickupPlaceId(airport.place_id);
      setDetectedAirport(airport);
    } else {
      setDetectedAirport(null);
    }
  };

  // Helper: Geofence and Place ID Airport Detector
  const detectAirport = (coords: { lat: number; lng: number }, placeId?: string): AirportConfig | null => {
    for (const airport of airports) {
      if (placeId && placeId === airport.place_id) {
        return airport;
      }
      const distanceMeters = haversineDistance(coords, { lat: airport.latitude, lng: airport.longitude });
      if (distanceMeters <= (airport.geofence_radius_meters || 3000)) {
        return airport;
      }
    }
    return null;
  };

  const handlePickupChange = (data: LocationData) => {
    setPickupAddress(data.address);
    setPickupCoords({ lat: data.lat, lng: data.lng });
    setPickupPlaceId(data.placeId || "");
    setRouteError(null);

    if (activeBookingType === "Airport Transfer") {
      const airport = detectAirport({ lat: data.lat, lng: data.lng }, data.placeId);
      if (airport) {
        // Scenario B: Selected Pickup IS an Airport
        setIsAirportPickup(true);
        setDetectedAirport(airport);

        // Reset drop so the user can search destination manually
        setDropAddress("");
        setDropCoords(null);
        setDropPlaceId("");
        setDistanceKm(null);
        setDurationMins(null);
      } else {
        // Scenario A: Selected Pickup is NOT an Airport
        setIsAirportPickup(false);

        // Find closest airport based on straight-line distance
        const airportsList = airports.length > 0 ? airports : DEFAULT_AIRPORTS;
        let closest = airportsList[0];
        let minDistance = Infinity;
        for (const ap of airportsList) {
          const dist = haversineDistance({ lat: data.lat, lng: data.lng }, { lat: ap.latitude, lng: ap.longitude });
          if (dist < minDistance) {
            minDistance = dist;
            closest = ap;
          }
        }

        setDetectedAirport(closest);
        setDropAddress(closest.name);
        setDropCoords({ lat: closest.latitude, lng: closest.longitude });
        setDropPlaceId(closest.place_id);
      }
    } else {
      // Local Rental: Drop matches pickup
      setDropAddress(data.address);
      setDropCoords({ lat: data.lat, lng: data.lng });
      setDropPlaceId(data.placeId || "");
    }
  };

  const handleDropChange = (data: LocationData) => {
    setDropAddress(data.address);
    setDropCoords({ lat: data.lat, lng: data.lng });
    setDropPlaceId(data.placeId || "");
    setRouteError(null);
  };

  // Perform route distance matrix calculation dynamically on coordinate changes
  useEffect(() => {
    if (!pickupCoords || !dropCoords) {
      setDistanceKm(null);
      setDurationMins(null);
      return;
    }

    if (activeBookingType !== "Airport Transfer") {
      setDistanceKm(null);
      setDurationMins(null);
      return;
    }

    setIsCalculatingDistance(true);
    setRouteError(null);

    getGoogleRouteDistance(pickupCoords, dropCoords)
      .then((info) => {
        setDistanceKm(info.distanceKm);
        setDurationMins(info.durationMins);
      })
      .catch((err) => {
        console.error("Distance Matrix error:", err);
        setRouteError("Unable to calculate road route. Please verify addresses.");
        setDistanceKm(null);
        setDurationMins(null);
      })
      .finally(() => {
        setIsCalculatingDistance(false);
      });
  }, [pickupCoords, dropCoords, activeBookingType]);

  // Pricing calculations
  const getAirportFares = (vehicle: "Sedan" | "MUV" | "SUV") => {
    const airport = detectedAirport || airports[0] || DEFAULT_AIRPORTS[0];
    const baseFare = airport.base_fares[vehicle] ?? (vehicle === "Sedan" ? 1099 : vehicle === "MUV" ? 1699 : 2299);
    const includedDistance = airport.included_distance_km ?? 35;
    const perKmRate = airport.extra_km_rates[vehicle] ?? (vehicle === "Sedan" ? 14 : vehicle === "MUV" ? 18 : 24);

    const actualDistance = distanceKm || 0;
    let extraDistance = 0;
    let extraCharges = 0;

    if (actualDistance > includedDistance) {
      extraDistance = Number((actualDistance - includedDistance).toFixed(1));
      extraCharges = parseFloat((extraDistance * perKmRate).toFixed(2));
    }

    const totalFare = parseFloat((baseFare + extraCharges).toFixed(2));

    return {
      baseFare,
      includedDistance,
      actualDistance,
      extraDistance,
      extraCharges,
      totalFare,
    };
  };

  const getBookingFare = (vehicle: "Sedan" | "MUV" | "SUV") => {
    if (activeBookingType === "Airport Transfer") {
      return getAirportFares(vehicle).totalFare;
    }
    return PRICING[activeBookingType!].prices[vehicle];
  };

  const buildWhatsAppUrl = () => {
    if (!pickedVehicle || !activeBookingType) return "";
    const isAirport = activeBookingType === "Airport Transfer";
    const fare = isAirport ? getAirportFares(pickedVehicle).totalFare : PRICING[activeBookingType].prices[pickedVehicle];
    const formattedDate = travelDate ? format(new Date(travelDate), "dd MMM yyyy") : "—";

    const tripTypeLabel = isAirport
      ? (tripSubType === "pickup" ? "Airport Pickup" : "Airport Drop")
      : undefined;

    let message = `Hi Xplorwing! I would like to book a Cab.\n\n` +
      `🚗 *Booking Details:*\n` +
      (customerName ? `• *Customer Name:* ${customerName.trim()}\n` : "") +
      (customerPhone ? `• *Mobile Number:* ${customerPhone.trim()}\n` : "") +
      `• *Booking Type:* ${activeBookingType}\n` +
      (tripTypeLabel ? `• *Trip Type:* ${tripTypeLabel}\n` : "") +
      `• *Pickup Location:* ${pickupAddress}\n` +
      `• *Drop Location:* ${dropAddress}\n` +
      (isAirport && distanceKm ? `• *Estimated Distance:* ${distanceKm} KM\n` : "") +
      (isAirport && durationMins ? `• *Estimated Duration:* ${durationMins} mins\n` : "") +
      `• *Date:* ${formattedDate}\n` +
      `• *Time:* ${travelTime}\n` +
      `• *Vehicle Type:* ${pickedVehicle}\n` +
      (specialInstructions ? `• *Special Instructions:* ${specialInstructions}\n` : "") +
      `• *Total Fare:* ₹${fare.toLocaleString()}*\n\n` +
      `Please confirm availability. Thank you!`;

    return `https://wa.me/916362986420?text=${encodeURIComponent(message)}`;
  };

  const handleOnlinePayment = () => {
    if (!travelDate || !pickedVehicle || !activeBookingType || !pickupAddress) return;

    const isAirport = activeBookingType === "Airport Transfer";
    const fare = isAirport ? getAirportFares(pickedVehicle).totalFare : PRICING[activeBookingType].prices[pickedVehicle];
    const distanceIncluded = isAirport ? `${getAirportFares(pickedVehicle).includedDistance} KM` : PRICING[activeBookingType].distance;

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
      listingTitle: isAirport
        ? `${tripSubType === "pickup" ? "Airport Pickup" : "Airport Drop"} - ${pickedVehicle}`
        : `${activeBookingType} - ${pickedVehicle}`,
      listingImage:
        pickedVehicle === "Sedan" ? sedanImg : pickedVehicle === "MUV" ? muvImg : suvImg,
      currencySymbol: "₹",
      unitLabel: "Trip",
      unitPrice: fare,
      quantity: 1,
      startDate: new Date(travelDate).toISOString(),
      endDate: new Date(travelDate).toISOString(),
      description: `${pickupAddress} → ${dropAddress} · ${distanceIncluded}`,
      subtotal: fare,
      discount: 0,
      serviceFee: 0,
      total: fare,
      bookingSource,
      cabDetails: {
        pickup_location: pickupAddress,
        drop_location: dropAddress,
        travel_date: travelDate,
        pickup_time: travelTime,
        cab_type: pickedVehicle,
        fare_amount: fare,
        state: "Local",
        distance_km: isAirport ? distanceKm : parseInt(distanceIncluded),
        special_instructions: specialInstructions,
        booking_source: bookingSource,
        trip_type: isAirport ? tripSubType : undefined,
        pickup_latitude: pickupCoords?.lat,
        pickup_longitude: pickupCoords?.lng,
        pickup_place_id: pickupPlaceId,
        drop_latitude: dropCoords?.lat,
        drop_longitude: dropCoords?.lng,
        drop_place_id: dropPlaceId,
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

  // Button disabled status checker
  const isAirport = activeBookingType === "Airport Transfer";
  const isDistanceLoading = isAirport && isCalculatingDistance;
  const hasRouteError = isAirport && !!routeError;
  const isLocationEmpty = isAirport
    ? (tripSubType === "pickup" ? !dropAddress : !pickupAddress)
    : !pickupAddress;
  const isBookDisabled = isDistanceLoading || hasRouteError || isLocationEmpty || !pickedVehicle || !!areaValidationError;

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
          <DialogTitle className="text-xl font-bold">
            {activeBookingType === "Airport Transfer" ? "Airport Transfer Booking" : "Local Rental Booking"}
          </DialogTitle>
          <DialogDescription>Select a vehicle and fill in your details to proceed.</DialogDescription>
        </DialogHeader>

        {/* Toggle for Airport Transfer: Drop / Pickup */}
        {activeBookingType === "Airport Transfer" && (
          <div className="flex justify-center gap-2 pt-2 pb-1">
            <button
              type="button"
              className={`px-5 py-2 rounded-full text-sm font-bold transition-all ${tripSubType === "drop"
                ? "bg-[#013220] text-white shadow-md"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              onClick={() => handleTripSubTypeChange("drop")}
            >
              ✈ Airport Drop
            </button>
            <button
              type="button"
              className={`px-5 py-2 rounded-full text-sm font-bold transition-all ${tripSubType === "pickup"
                ? "bg-[#013220] text-white shadow-md"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              onClick={() => handleTripSubTypeChange("pickup")}
            >
              🛬 Airport Pickup
            </button>
          </div>
        )}

        {/* Toggle for Local Rentals */}
        {(activeBookingType === "4 Hours Local" || activeBookingType === "8 Hours Local") && (
          <div className="flex justify-center gap-2 pt-2 pb-1">
            <button
              type="button"
              className={`px-5 py-2 rounded-full text-sm font-bold transition-all ${activeBookingType === "4 Hours Local"
                ? "bg-[#013220] text-white shadow-md"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              onClick={() => setActiveBookingType("4 Hours Local")}
            >
              4 Hours Local
            </button>
            <button
              type="button"
              className={`px-5 py-2 rounded-full text-sm font-bold transition-all ${activeBookingType === "8 Hours Local"
                ? "bg-[#013220] text-white shadow-md"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              onClick={() => setActiveBookingType("8 Hours Local")}
            >
              8 Hours Local
            </button>
          </div>
        )}

        {/* Vehicle Selection */}
        {activeBookingType && (
          <div className="grid grid-cols-3 gap-3 pt-2">
            {VEHICLES.map(({ type, img, desc }) => {
              const isSelected = pickedVehicle === type;
              const fare = getBookingFare(type);
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
                    className={`h-14 md:h-20 w-full object-contain mix-blend-multiply dark:mix-blend-normal transition-transform ${type === 'MUV' || type === 'SUV' ? 'scale-[1.3] md:scale-[1.4] mt-1' : ''}`}
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

        {/* Form Details */}
        <AnimatePresence>
          {pickedVehicle && activeBookingType && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="mt-4 space-y-4 overflow-hidden"
            >
              {/* Pickup Location */}
              <div className="space-y-1.5">
                {isAirport && tripSubType === "pickup" ? (
                  <>
                    <Label className="text-sm font-semibold text-[#013220]">✈ Pickup Location</Label>
                    <div className="flex items-center gap-2 px-3 h-10 rounded-xl border border-[#e2e8f0] bg-muted/50 text-sm text-muted-foreground font-medium">
                      ✈ {pickupAddress || "Rajiv Gandhi International Airport (HYD)"}
                    </div>
                  </>
                ) : (
                  <LocationAutocomplete
                    label="Pickup Location *"
                    value={pickupAddress}
                    placeholder="Search for pickup address..."
                    onChange={handlePickupChange}
                    restrictToTelangana={isAirport}
                    onError={isAirport ? setAreaValidationError : undefined}
                  />
                )}
              </div>

              {/* Destination */}
              <div className="space-y-1.5">
                {activeBookingType === "Airport Transfer" ? (
                  tripSubType === "pickup" ? (
                    <LocationAutocomplete
                      label="Destination *"
                      value={dropAddress}
                      placeholder="Search for drop address..."
                      onChange={handleDropChange}
                      restrictToTelangana={isAirport}
                      onError={isAirport ? setAreaValidationError : undefined}
                    />
                  ) : (
                    <>
                      <Label className="text-sm font-semibold text-[#013220]">✈ Destination</Label>
                      <div className="flex items-center gap-2 px-3 h-10 rounded-xl border border-[#e2e8f0] bg-muted/50 text-sm text-muted-foreground font-medium">
                        ✈ {dropAddress || "Rajiv Gandhi International Airport (HYD)"}
                      </div>
                    </>
                  )
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

              {/* Date & Time */}
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
                    className="h-10 text-sm rounded-xl border-[#e2e8f0] bg-white text-foreground"
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

              {/* Traveller Details */}
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

              {/* Price & Fare Summary UI */}
              {activeBookingType === "Airport Transfer" ? (
                <div className="rounded-2xl border border-[#e2e8f0] p-4 bg-muted/20 space-y-2 text-sm shadow-sm">
                  <p className="font-bold text-[#013220] mb-1">Fare Breakdown</p>

                  {isCalculatingDistance ? (
                    <div className="flex items-center justify-center py-4 gap-2 text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin text-[#013220]" />
                      <span>Calculating distance and fares...</span>
                    </div>
                  ) : routeError ? (
                    <p className="text-sm font-semibold text-destructive text-center py-2">
                      ⚠️ {routeError}
                    </p>
                  ) : !pickupCoords ? (
                    <p className="text-xs text-muted-foreground text-center py-2">
                      Search and select pickup address to load fares.
                    </p>
                  ) : (
                    <>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Base Fare</span>
                        <span className="font-semibold text-[#013220]">
                          ₹{getAirportFares(pickedVehicle).baseFare}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Included Distance</span>
                        <span className="font-semibold text-[#013220]">
                          {getAirportFares(pickedVehicle).includedDistance} km
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Actual Distance</span>
                        <span className="font-semibold text-[#013220]">
                          {getAirportFares(pickedVehicle).actualDistance} km
                        </span>
                      </div>
                      <div className="flex justify-between text-amber-800 bg-amber-50 px-2 py-0.5 rounded text-xs font-semibold">
                        <span>Extra Distance</span>
                        <span>{getAirportFares(pickedVehicle).extraDistance} km</span>
                      </div>
                      <div className="flex justify-between text-amber-800 bg-amber-50 px-2 py-0.5 rounded text-xs font-semibold">
                        <span>Extra Charges</span>
                        <span>₹{getAirportFares(pickedVehicle).extraCharges}</span>
                      </div>
                      {durationMins && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Estimated Duration</span>
                          <span className="font-semibold text-[#013220]">{durationMins} mins</span>
                        </div>
                      )}

                      <div className="flex justify-between border-t border-[#e2e8f0] pt-2.5 mt-1 bg-gradient-to-r from-emerald-50/50 to-teal-50/50 px-2 py-1 rounded">
                        <span className="font-bold text-base text-[#013220]">Total Payable</span>
                        <span className="font-bold text-xl text-[#013220]">
                          ₹{getAirportFares(pickedVehicle).totalFare}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              ) : (
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
              )}

              {/* Verification & route helper warnings */}
              {routeError && (
                <p className="text-xs font-semibold text-center text-red-600 mt-1">
                  ⚠️ {routeError}
                </p>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={isBookDisabled}
                  className="flex-1 h-12 text-sm font-bold border-[#25D366] text-[#25D366] rounded-xl hover:bg-[#25D366]/10 hover:text-[#25D366] disabled:opacity-50 disabled:pointer-events-none"
                  onClick={() => {
                    window.open(buildWhatsAppUrl(), "_blank");
                    setIsVehicleSelectOpen(false);
                  }}
                >
                  Book via WhatsApp
                </Button>
                <Button
                  type="button"
                  disabled={isBookDisabled}
                  className="flex-1 h-12 text-sm font-bold bg-[#013220] text-white rounded-xl hover:bg-[#013220]/90 shadow-md disabled:opacity-50 disabled:pointer-events-none"
                  onClick={() => {
                    setIsVehicleSelectOpen(false);
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

  return (
    <section className="py-4 md:py-16 px-4">
      <div className="container mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-6 md:mb-10"
        >
          <h2 className="text-3xl font-bold text-foreground mb-4">Local & Airport Transfer</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Hassle-free airport drops, pickups, and local hourly rentals. Choose your vehicle and book instantly.
          </p>
        </motion.div>

        {vehicleSelectDialog}

        {/* Mobile: swipe slider; Desktop: 2-column grid */}
        <div className="overflow-hidden w-full md:overflow-visible">
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="flex md:grid md:grid-cols-2 overflow-x-auto md:overflow-visible snap-x snap-mandatory scroll-smooth gap-0 md:gap-12 w-full"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none", paddingBottom: 20, marginBottom: -20 }}
        >
          {/* Airport Transfer card */}
          <div className="flex-shrink-0 w-full md:w-auto snap-center">
            <div className="relative w-full rounded-[24px] overflow-hidden shadow-[0_12px_40px_rgba(0,0,0,0.15)]">
              <img src={airportCabsOriginalImg} alt="Airport Transfer Cabs" className="w-full h-[65vw] md:h-[400px] object-cover object-center block" />
              <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/50 to-transparent" />
              <button
                onClick={() => openBookingFor("Airport Transfer")}
                className="absolute bottom-4 right-4 px-5 py-2.5 rounded-full bg-[#013220] hover:bg-[#035939] text-white text-sm font-bold shadow-lg transition-all duration-200 hover:scale-105"
              >
                Book Airport Transfer
              </button>
            </div>
          </div>

          {/* Local Rental card */}
          <div className="flex-shrink-0 w-full md:w-auto snap-center">
            <div className="relative w-full rounded-[24px] overflow-hidden shadow-[0_12px_40px_rgba(0,0,0,0.15)]">
              <img src={airportCabsImg} alt="Local Cabs (4hrs & 8hrs)" className="w-full h-[65vw] md:h-[400px] object-cover object-center block" />
              <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/50 to-transparent" />
              <button
                onClick={() => openBookingFor("4 Hours Local")}
                className="absolute bottom-4 right-4 px-5 py-2.5 rounded-full bg-[#013220] hover:bg-[#035939] text-white text-sm font-bold shadow-lg transition-all duration-200 hover:scale-105"
              >
                Book Local Rental
              </button>
            </div>
          </div>
        </div>
        </div>

        {/* Pagination Dots for Mobile */}
        <div className="flex justify-center gap-2 mt-2 md:hidden">
          {[0, 1].map((i) => (
            <div
              key={i}
              className={`h-2 rounded-full transition-all duration-300 ${activeIndex === i ? "w-6 bg-[#013220]" : "w-2 bg-[#013220]/20"
                }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

