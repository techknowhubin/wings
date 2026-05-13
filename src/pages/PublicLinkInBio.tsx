import { useMemo, useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getLinkInBioPageBySlug, formatPrice } from "@/lib/supabase-helpers";
import { parseListingDiscountConfig } from "@/lib/discounts";
import type { BookingDetails } from "@/types/booking";
import {
  Globe, Instagram, Facebook, Twitter, Mail, Phone, MapPin, Youtube,
  ArrowUpRight, ChevronLeft, Star, Users, BedDouble, Bath,
  CalendarDays, Minus, Plus, Share2, Heart, MoreHorizontal,
  Wifi, Tv, Coffee, Wind, Utensils, Snowflake, Dumbbell, ParkingCircle, Camera,
  type LucideIcon,
} from "lucide-react";
import logo from "@/assets/logo.png";
import logoLight from "@/assets/logo-light.png";
import { differenceInDays, format, addDays } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import Header from "@/components/Header";
import Marquee from "@/components/Marquee";

// ── Types ─────────────────────────────────────────────────────────────────

interface LinkInBioSettings {
  businessName: string; tagline: string; bio: string;
  theme: "forest" | "minimal" | "sunset" | "ocean";
  showEmail: boolean; showPhone: boolean; showLocation: boolean;
  instagram: string; facebook: string; twitter: string; website: string;
  youtube: string; email: string;
  featuredListings: string[];
}

interface Listing {
  id: string; title: string; location: string; images: string[];
  type: string; unit: string; price: number; discountedPrice: number;
  hostDiscountPercent: number; description?: string; rating?: number;
  total_reviews?: number; amenities?: any; currency?: string;
  host_id?: string; max_guests?: number; bedrooms?: number;
  bathrooms?: number; group_size?: number; seating_capacity?: number;
  brand?: string; model?: string; property_type?: string;
}

// ── Themes ────────────────────────────────────────────────────────────────

const themes = {
  forest: { bg: "bg-gradient-to-br from-[#013220] to-[#0a4a32]", text: "text-white", socialChip: "bg-white/10 border-white/20", card: "bg-white/10 backdrop-blur-sm border-white/20", muted: "text-white/75", footer: "text-white/70 border-white/20", discount: "text-[#e5f76e]" },
  minimal: { bg: "bg-white", text: "text-gray-900", socialChip: "bg-gray-100 border-gray-200", card: "bg-gray-100/50 border-gray-200", muted: "text-gray-500", footer: "text-gray-600 border-gray-200", discount: "text-[#065f46]" },
  luxury: { bg: "bg-[#0a0a0a]", text: "text-white", socialChip: "bg-zinc-800 border-zinc-700", card: "bg-zinc-900 border-zinc-800", muted: "text-zinc-400", footer: "text-zinc-500 border-zinc-900", discount: "text-[#e5f76e]" },
  electric: { bg: "bg-[#e5f76e]", text: "text-[#065f46]", socialChip: "bg-[#065f46]/10 border-[#065f46]/20", card: "bg-white/50 border-[#065f46]/10", muted: "text-[#065f46]/70", footer: "text-[#065f46]/40 border-[#065f46]/10", discount: "text-[#065f46]" },
};

// ── Helpers ───────────────────────────────────────────────────────────────

const isNightBased = (t: string) => ["stay", "hotel", "resort"].includes(t);
const isDayBased = (t: string) => ["car", "bike"].includes(t);

const typeLabel = (t: string) => ({ stay: "Homestay", hotel: "Hotel", resort: "Resort", car: "Car Rental", bike: "Bike Rental", experience: "Experience" }[t] ?? t);

const getAmenityIcon = (amenity: string): LucideIcon => {
  const a = amenity.toLowerCase();
  if (a.includes("wifi") || a.includes("internet")) return Wifi;
  if (a.includes("tv") || a.includes("television")) return Tv;
  if (a.includes("coffee") || a.includes("kitchen")) return Coffee;
  if (a.includes("air") || a.includes("ac")) return Wind;
  if (a.includes("breakfast") || a.includes("meal")) return Utensils;
  if (a.includes("fridge") || a.includes("refrigerator")) return Snowflake;
  if (a.includes("gym") || a.includes("fitness")) return Dumbbell;
  if (a.includes("parking")) return ParkingCircle;
  if (a.includes("security") || a.includes("camera")) return Camera;
  return Wifi;
};

// ── Detail Screen matching marketplace layout ─────────────────────────────

function DetailScreen({
  listing, onBack, goToConfirm,
}: { listing: Listing; onBack: () => void; goToConfirm: (b: BookingDetails) => void; }) {
  const tomorrow = useMemo(() => addDays(new Date(), 1), []);
  const [pricingOption, setPricingOption] = useState<"daily" | "weekly" | "monthly">("weekly");
  const [checkIn, setCheckIn] = useState<Date>(tomorrow);
  const [checkOut, setCheckOut] = useState<Date>(addDays(tomorrow, 7));
  const [guests, setGuests] = useState(1);
  const [wishlisted, setWishlisted] = useState(false);
  const [imgIdx, setImgIdx] = useState(0);

  const getDurationDays = (o: "daily" | "weekly" | "monthly") =>
    o === "daily" ? 1 : o === "weekly" ? 7 : 30;

  useEffect(() => {
    setCheckOut(addDays(checkIn, getDurationDays(pricingOption)));
  }, [pricingOption, checkIn]);

  const symb = listing.currency === "INR" ? "₹" : "$";
  const pricePerUnit = listing.discountedPrice;
  const discountPct = listing.hostDiscountPercent;
  const imgs = listing.images?.filter(Boolean) ?? [];
  const amenities: string[] = Array.isArray(listing.amenities)
    ? listing.amenities
    : typeof listing.amenities === "object" && listing.amenities !== null
      ? Object.values(listing.amenities).flat() as string[]
      : [];

  let nights = 1;
  let unitLabel = "night";
  if (isNightBased(listing.type)) {
    nights = Math.max(differenceInDays(checkOut, checkIn), 1);
    unitLabel = nights === 1 ? "night" : "nights";
  } else if (isDayBased(listing.type)) {
    nights = Math.max(differenceInDays(checkOut, checkIn), 1);
    unitLabel = nights === 1 ? "day" : "days";
  } else {
    nights = guests;
    unitLabel = guests === 1 ? "guest" : "guests";
  }

  const basePrice = listing.price; // original price
  const subtotal = basePrice * nights;
  const discount = Math.round((subtotal * discountPct) / 100);
  const serviceFee = 0;
  const total = subtotal - discount + serviceFee;

  const weeklyPrice = basePrice * 7 * 0.85;
  const monthlyPrice = basePrice * 30 * 0.7;

  const maxG = listing.max_guests ?? listing.group_size ?? 10;
  const propType = listing.property_type ?? typeLabel(listing.type);

  const handleBook = () => {
    const booking: BookingDetails = {
      listingType: isNightBased(listing.type) ? "stay" : listing.type === "experience" ? "experience" : "vehicle",
      listingCouponType: ({ stay: "stays", hotel: "hotels", resort: "resorts", car: "cars", bike: "bikes", experience: "experiences" } as any)[listing.type],
      hostId: listing.host_id,
      listingTitle: listing.title,
      listingImage: imgs[0],
      currencySymbol: symb,
      unitLabel,
      unitPrice: basePrice,
      quantity: nights,
      startDate: checkIn.toISOString(),
      endDate: checkOut.toISOString(),
      description: `${nights} ${unitLabel} at ${listing.title}`,
      subtotal,
      discount,
      serviceFee,
      total,
      hostDiscountPercent: discountPct,
    };
    goToConfirm(booking);
  };

  return (
    <div
      className="absolute inset-0 z-10 bg-background text-foreground flex flex-col overflow-hidden"
      style={{ animation: "slideInUp 0.28s cubic-bezier(.4,0,.2,1)" }}
    >
      <style>{`@keyframes slideInUp { from { transform:translateY(100%); opacity:0; } to { transform:translateY(0); opacity:1; } }`}</style>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">

        {/* ── Title & meta ── */}
        <div className="px-4 pt-4 pb-2">
          {/* Back */}
          <button
            onClick={onBack}
            className="flex items-center gap-1 text-xs text-muted-foreground mb-3 hover:text-foreground transition-colors"
          >
            <ChevronLeft className="h-3.5 w-3.5" /> Back
          </button>

          {/* Title */}
          <h1 className="text-xl font-bold text-foreground leading-tight mb-2">{listing.title}</h1>

          {/* Badge + location + rating row */}
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <Badge variant="outline" className="bg-accent/10 text-accent border-accent/30 text-[10px] font-semibold">
              {propType}
            </Badge>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <MapPin className="h-3 w-3" />{listing.location}
            </span>
            <span className="text-xs flex items-center gap-1">
              <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
              <span className="font-semibold text-foreground">{Number(listing.rating ?? 0).toFixed(1)}</span>
              <span className="text-muted-foreground">({listing.total_reviews ?? 0} reviews)</span>
            </span>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 mb-4">
            {[
              { icon: <Share2 className="h-3.5 w-3.5" />, onClick: undefined },
              {
                icon: <Heart className={`h-3.5 w-3.5 ${wishlisted ? "fill-destructive text-destructive" : ""}`} />,
                onClick: () => setWishlisted(w => !w),
              },
              { icon: <MoreHorizontal className="h-3.5 w-3.5" />, onClick: undefined },
            ].map((btn, i) => (
              <button
                key={i}
                onClick={btn.onClick}
                className={`h-8 w-8 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:bg-secondary transition-colors ${i === 1 && wishlisted ? "bg-destructive/10 border-destructive/30" : ""}`}
              >
                {btn.icon}
              </button>
            ))}
          </div>
        </div>

        {/* ── Image ── */}
        <div className="mx-4 mb-4 relative rounded-2xl overflow-hidden bg-muted" style={{ height: "180px" }}>
          {imgs.length > 0 ? (
            <img src={imgs[imgIdx]} alt={listing.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">No image</div>
          )}
          {imgs.length > 1 && (
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
              {imgs.slice(0, 5).map((_, i) => (
                <button key={i} onClick={() => setImgIdx(i)}
                  className={`h-1.5 rounded-full transition-all ${i === imgIdx ? "w-4 bg-white" : "w-1.5 bg-white/60"}`}
                />
              ))}
            </div>
          )}
        </div>

        {/* ── Property specs ── */}
        <div className="px-4 pb-4 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground mb-2">
            {isNightBased(listing.type) ? `Entire ${propType} Details` :
              isDayBased(listing.type) ? "Vehicle Details" : "Experience Details"}
          </h2>
          <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
            {listing.max_guests && (
              <span className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5" />{listing.max_guests} Guests</span>
            )}
            {listing.bedrooms && (
              <span className="flex items-center gap-1.5"><BedDouble className="h-3.5 w-3.5" />{listing.bedrooms} {listing.bedrooms === 1 ? "Bedroom" : "Bedrooms"}</span>
            )}
            {listing.bathrooms && (
              <span className="flex items-center gap-1.5"><Bath className="h-3.5 w-3.5" />{listing.bathrooms} Private {listing.bathrooms === 1 ? "bath" : "baths"}</span>
            )}
            {listing.seating_capacity && (
              <span className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5" />{listing.seating_capacity} Seats</span>
            )}
            {listing.group_size && (
              <span className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5" />Group of {listing.group_size}</span>
            )}
            {(listing.brand || listing.model) && (
              <span className="flex items-center gap-1.5">{[listing.brand, listing.model].filter(Boolean).join(" ")}</span>
            )}
          </div>
        </div>


        {/* ── Amenities ── */}
        {amenities.length > 0 && (
          <div className="px-4 py-4 border-b border-border">
            <h2 className="text-sm font-semibold text-foreground mb-3">What this place offers</h2>
            <div className="grid grid-cols-2 gap-2">
              {amenities.slice(0, 6).map((a: string, i: number) => {
                const Icon = getAmenityIcon(a);
                return (
                  <div key={i} className="flex items-center gap-1.5 text-xs text-foreground">
                    <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <span>{a}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Booking Panel (marketplace style) ── */}
        <div className="mx-4 my-4 border border-border rounded-2xl p-3 bg-card shadow-sm">

          {/* Price */}
          <div className="mb-2">
            <span className="text-xl font-bold text-foreground">{symb}{basePrice.toLocaleString()}</span>
            <span className="text-xs text-muted-foreground font-medium">/{isNightBased(listing.type) ? "Night" : isDayBased(listing.type) ? "Day" : "Person"}</span>
          </div>

          {/* Stay summary */}
          {!listing.type.includes("experience") && (
            <div className="bg-secondary/50 rounded-lg px-2.5 py-2 mb-3">
              <p className="text-xs text-foreground">
                <span className="font-bold">{nights} {unitLabel}</span>
                <span className="text-muted-foreground"> in {listing.title}</span>
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {format(checkIn, "MMM dd, yyyy")} - {format(checkOut, "MMM dd, yyyy")}
              </p>
            </div>
          )}

          {/* Date pickers + Guests — identical to StayBookingPanel */}
          <div className="grid grid-cols-3 gap-1.5 mb-3">
            {/* Check-in / pickup */}
            <div>
              <label className="text-[10px] font-semibold text-muted-foreground uppercase block mb-0.5">
                {isNightBased(listing.type) ? "Check in" : isDayBased(listing.type) ? "Pickup" : "Date"}
              </label>
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    className={cn(
                      "w-full flex items-center h-9 rounded-full border border-border px-2 gap-1 text-left bg-background text-xs",
                      !checkIn && "text-muted-foreground"
                    )}
                  >
                    <CalendarDays className="h-3.5 w-3.5 text-accent flex-shrink-0" />
                    <span className="truncate">{checkIn ? format(checkIn, "MMM dd") : "Select"}</span>
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start" style={{ zIndex: 9999 }}>
                  <Calendar
                    mode="single"
                    selected={checkIn}
                    onSelect={(d) => d && setCheckIn(d)}
                    disabled={(d) => d < new Date()}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Check-out / drop-off */}
            {listing.type !== "experience" ? (
              <div>
                <label className="text-[10px] font-semibold text-muted-foreground uppercase block mb-0.5">
                  {isNightBased(listing.type) ? "Check out" : "Drop-off"}
                </label>
                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      className={cn(
                        "w-full flex items-center h-9 rounded-full border border-border px-2 gap-1 text-left bg-background text-xs",
                        !checkOut && "text-muted-foreground"
                      )}
                    >
                      <CalendarDays className="h-3.5 w-3.5 text-accent flex-shrink-0" />
                      <span className="truncate">{checkOut ? format(checkOut, "MMM dd") : "Select"}</span>
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start" style={{ zIndex: 9999 }}>
                    <Calendar
                      mode="single"
                      selected={checkOut}
                      onSelect={(d) => d && setCheckOut(d)}
                      disabled={(d) => d < addDays(checkIn, 1)}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            ) : (
              <div /> /* placeholder */
            )}

            {/* Guests */}
            <div>
              <label className="text-[10px] font-semibold text-muted-foreground uppercase block mb-0.5">Guests</label>
              <div className="flex items-center justify-between h-9 border border-border rounded-full px-2 bg-background">
                <button
                  onClick={() => setGuests(g => Math.max(1, g - 1))}
                  disabled={guests <= 1}
                  className="h-6 w-6 rounded flex items-center justify-center text-muted-foreground hover:bg-secondary disabled:opacity-30 transition-colors"
                >
                  <Minus className="h-3 w-3" />
                </button>
                <span className="text-sm font-semibold text-foreground">{guests}</span>
                <button
                  onClick={() => setGuests(g => Math.min(maxG, g + 1))}
                  disabled={guests >= maxG}
                  className="h-6 w-6 rounded flex items-center justify-center text-accent hover:bg-accent/10 disabled:opacity-30 transition-colors"
                >
                  <Plus className="h-3 w-3" />
                </button>
              </div>
            </div>
          </div>


          {/* Daily / Weekly / Monthly selector (stays only) */}
          {isNightBased(listing.type) && (
            <div className="grid grid-cols-3 gap-1.5 mb-3">
              {(["daily", "weekly", "monthly"] as const).map((opt) => (
                <button
                  key={opt}
                  onClick={() => setPricingOption(opt)}
                  className={`py-1.5 px-1 border rounded-lg text-center transition-all relative ${pricingOption === opt
                    ? "border-accent bg-accent/10 scale-[1.03]"
                    : "border-border hover:border-muted-foreground"
                    }`}
                >
                  {pricingOption === opt && opt === "weekly" && (
                    <span className="absolute -top-1.5 left-1/2 -translate-x-1/2 bg-accent text-accent-foreground text-[8px] font-bold px-1 py-0.5 rounded-full">POPULAR</span>
                  )}
                  <p className="text-[9px] font-semibold text-muted-foreground capitalize mb-0.5">{opt.charAt(0).toUpperCase() + opt.slice(1)}</p>
                  <p className="text-[10px] font-bold text-foreground">
                    {symb}{opt === "daily" ? basePrice.toLocaleString() : opt === "weekly" ? Math.round(weeklyPrice).toLocaleString() : Math.round(monthlyPrice).toLocaleString()}
                  </p>
                </button>
              ))}
            </div>
          )}

          {/* Book Now button */}
          <button
            onClick={handleBook}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground h-10 rounded-full text-sm font-bold transition-colors"
          >
            Book Now
          </button>
          <p className="text-[10px] text-center text-muted-foreground mt-1.5 mb-3">You won't be charged yet</p>

          {/* Price breakdown */}
          <div className="space-y-1.5 pt-3 border-t border-border">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">{symb}{basePrice.toLocaleString()} × {nights} {unitLabel}</span>
              <span className="text-foreground font-medium">{symb}{subtotal.toLocaleString()}</span>
            </div>
            {discountPct > 0 && (
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Host discount ({discountPct}%)</span>
                <span className="text-accent font-medium">-{symb}{discount.toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Service fee</span>
              <span className="text-foreground font-medium">{symb}{serviceFee}</span>
            </div>
            <div className="flex justify-between text-xs font-bold pt-2 border-t border-border">
              <span className="text-foreground">Total before taxes</span>
              <span className="text-foreground">{symb}{total.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Bottom padding */}
        <div className="h-4" />

        {/* Footer inside Detail View */}
        <div className="mt-4 pt-4 pb-8 text-center border-t border-border space-y-2">
          <div className="flex items-center justify-center gap-1.5">
            <span className="text-[10px] text-muted-foreground uppercase font-semibold">Powered by</span>
            <a href="/" className="hover:opacity-80 transition-opacity">
              <img src={logo} alt="Xplorwing" className="h-4 dark:hidden" />
              <img src={logoLight} alt="Xplorwing" className="h-4 hidden dark:block" />
            </a>
          </div>
          <p className="text-[10px] opacity-60 text-muted-foreground">
            &copy; {new Date().getFullYear()} WINGSNNESTS ECO SOLUTIONS PVT LTD. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────

export default function PublicLinkInBio() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);

  const withDiscount = (basePrice: number, rawDiscounts: unknown) => {
    const { hostDiscountPercent } = parseListingDiscountConfig(rawDiscounts as any);
    const discountedPrice = Math.max(0, basePrice - (basePrice * hostDiscountPercent) / 100);
    return { price: basePrice, discountedPrice, hostDiscountPercent };
  };

  const { data: page, isLoading } = useQuery({
    queryKey: ["link-in-bio-public", slug],
    queryFn: () => getLinkInBioPageBySlug(slug!),
    enabled: !!slug,
  });

  const { data: hostProfile } = useQuery({
    queryKey: ["link-in-bio-host-profile", page?.user_id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("profile_image, full_name").eq("id", page!.user_id).maybeSingle();
      return data;
    },
    enabled: !!page?.user_id,
  });

  const settings = useMemo(() => {
    if (!page?.settings || typeof page.settings !== "object" || Array.isArray(page.settings)) return null;
    return page.settings as unknown as LinkInBioSettings;
  }, [page]);

  const featuredIds = settings?.featuredListings ?? [];
  const hostUserId = page?.user_id;

  const { data: listings = [] } = useQuery<Listing[]>({
    queryKey: ["link-in-bio-public-listings", featuredIds, hostUserId],
    queryFn: async () => {
      const staysCols = "id,title,location,price_per_night,images,availability_status,discounts,description,rating,total_reviews,amenities,currency,host_id,max_guests,bedrooms,bathrooms,property_type";
      const carsCols = "id,title,location,price_per_day,images,availability_status,discounts,description,rating,total_reviews,amenities,currency,host_id,seating_capacity,brand,model";
      const bikesCols = "id,title,location,price_per_day,images,availability_status,discounts,description,rating,total_reviews,currency,host_id,brand,model";
      const expCols = "id,title,location,price_per_person,images,availability_status,discounts,description,rating,total_reviews,currency,host_id,group_size";
      const hotelCols = "id,title,location,price_per_night,images,availability_status,discounts,description,rating,total_reviews,currency,host_id";

      const byId = featuredIds.length > 0;

      const [stays, hotels, resorts, cars, bikes, experiences] = await Promise.all([
        byId ? supabase.from("stays").select(staysCols).in("id", featuredIds)
          : supabase.from("stays").select(staysCols).eq("host_id", hostUserId!).eq("availability_status", true),
        byId ? (supabase as any).from("hotels").select(hotelCols).in("id", featuredIds)
          : (supabase as any).from("hotels").select(hotelCols).eq("host_id", hostUserId!).eq("availability_status", true),
        byId ? (supabase as any).from("resorts").select(hotelCols).in("id", featuredIds)
          : (supabase as any).from("resorts").select(hotelCols).eq("host_id", hostUserId!).eq("availability_status", true),
        byId ? supabase.from("cars").select(carsCols).in("id", featuredIds)
          : supabase.from("cars").select(carsCols).eq("host_id", hostUserId!).eq("availability_status", true),
        byId ? supabase.from("bikes").select(bikesCols).in("id", featuredIds)
          : supabase.from("bikes").select(bikesCols).eq("host_id", hostUserId!).eq("availability_status", true),
        byId ? supabase.from("experiences").select(expCols).in("id", featuredIds)
          : supabase.from("experiences").select(expCols).eq("host_id", hostUserId!).eq("availability_status", true),
      ]);

      return [
        ...(stays.data ?? []).map((i: any) => ({ ...i, type: "stay", unit: "/night", ...withDiscount(Number(i.price_per_night), i.discounts) })),
        ...((hotels.data ?? []) as any[]).map((i) => ({ ...i, type: "hotel", unit: "/night", ...withDiscount(Number(i.price_per_night), i.discounts) })),
        ...((resorts.data ?? []) as any[]).map((i) => ({ ...i, type: "resort", unit: "/night", ...withDiscount(Number(i.price_per_night), i.discounts) })),
        ...(cars.data ?? []).map((i: any) => ({ ...i, type: "car", unit: "/day", ...withDiscount(Number(i.price_per_day), i.discounts) })),
        ...(bikes.data ?? []).map((i: any) => ({ ...i, type: "bike", unit: "/day", ...withDiscount(Number(i.price_per_day), i.discounts) })),
        ...(experiences.data ?? []).map((i: any) => ({ ...i, type: "experience", unit: "/person", ...withDiscount(Number(i.price_per_person), i.discounts) })),
      ] as Listing[];
    },
    enabled: !!hostUserId,
  });

  if (isLoading) {
    return (
      <>
        <Marquee />
        <Header />
        <div className="min-h-[calc(100vh-100px)] flex items-center justify-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
        </div>
      </>
    );
  }
  if (!page || !settings) {
    return (
      <>
        <Marquee />
        <Header />
        <div className="min-h-[calc(100vh-100px)] flex items-center justify-center text-muted-foreground">Link not found.</div>
      </>
    );
  }

  const T = themes[settings.theme] ?? themes.forest;

  const formatSocialLink = (val: string, type: "ig" | "fb" | "tw" | "yt" | "email" | "web") => {
    if (!val) return "";
    if (val.startsWith("http") || val.startsWith("mailto:")) return val;
    const clean = val.startsWith("@") ? val.slice(1) : val;
    if (type === "ig") return `https://instagram.com/${clean}`;
    if (type === "fb") return `https://facebook.com/${clean}`;
    if (type === "tw") return `https://twitter.com/${clean}`;
    if (type === "yt") return `https://youtube.com/@${clean}`;
    if (type === "email") return `mailto:${val}`;
    return val.startsWith("www") ? `https://${val}` : `https://${val}`;
  };

  return (
    <>
      <Marquee />
      <Header />
      <div className="sm:min-h-[calc(100vh-100px)] sm:bg-stone-100 sm:dark:bg-stone-900 sm:flex sm:items-center sm:justify-center sm:p-6">
        <div className="w-full h-screen sm:h-[667px] sm:max-w-[375px] sm:rounded-3xl sm:border-[8px] sm:border-gray-900/90 overflow-hidden sm:shadow-2xl shadow-none relative bg-background">
          <div className={`w-full h-full flex flex-col ${T.bg} ${T.text} relative`}>

            {/* ── Detail screen overlaid ── */}
            {selectedListing && (
              <DetailScreen
                listing={selectedListing}
                onBack={() => setSelectedListing(null)}
                goToConfirm={(booking) => navigate("/confirm-and-pay", { state: { booking } })}
              />
            )}

            {/* ── Scrollable list area ── */}
            <div className={`flex-1 ${selectedListing ? "overflow-hidden" : "overflow-y-auto"}`}>
              <div className="px-3 py-5">
                {/* Profile */}
                <div className="text-center mb-5">
                  <div className="w-24 h-24 mx-auto rounded-full bg-white/20 border-4 border-white/30 overflow-hidden mb-4 flex items-center justify-center text-3xl font-bold">
                    {hostProfile?.profile_image
                      ? <img src={hostProfile.profile_image} alt={settings.businessName} className="w-full h-full object-cover" />
                      : settings.businessName?.charAt(0)?.toUpperCase() || "X"}
                  </div>
                  <h1 className="text-3xl font-bold">{settings.businessName}</h1>
                  <p className={`mt-1 text-sm ${T.muted}`}>{settings.tagline}</p>
                  <p className={`mt-3 text-xs ${T.muted} px-4`}>{settings.bio}</p>
                  <div className="flex items-center justify-center gap-1.5 mt-3">
                    <p className={`text-[10px] flex items-center gap-1.5 ${T.muted}`}>
                      <Phone className="h-3 w-3" />
                      Phone available after booking
                    </p>
                  </div>
                  <div className="flex items-center justify-center gap-3 mt-3">
                    {settings.instagram && (
                      <a href={formatSocialLink(settings.instagram, "ig")} target="_blank" rel="noopener noreferrer" className={`p-2 rounded-full border ${T.socialChip} hover:opacity-80 transition-opacity`}>
                        <Instagram className="h-4 w-4" />
                      </a>
                    )}
                    {settings.facebook && (
                      <a href={formatSocialLink(settings.facebook, "fb")} target="_blank" rel="noopener noreferrer" className={`p-2 rounded-full border ${T.socialChip} hover:opacity-80 transition-opacity`}>
                        <Facebook className="h-4 w-4" />
                      </a>
                    )}
                    {settings.twitter && (
                      <a href={formatSocialLink(settings.twitter, "tw")} target="_blank" rel="noopener noreferrer" className={`p-2 rounded-full border ${T.socialChip} hover:opacity-80 transition-opacity`}>
                        <Twitter className="h-4 w-4" />
                      </a>
                    )}
                    {settings.youtube && (
                      <a href={formatSocialLink(settings.youtube, "yt")} target="_blank" rel="noopener noreferrer" className={`p-2 rounded-full border ${T.socialChip} hover:opacity-80 transition-opacity`}>
                        <Youtube className="h-4 w-4" />
                      </a>
                    )}
                    {settings.email && (
                      <a href={formatSocialLink(settings.email, "email")} className={`p-2 rounded-full border ${T.socialChip} hover:opacity-80 transition-opacity`}>
                        <Mail className="h-4 w-4" />
                      </a>
                    )}
                    {settings.website && (
                      <a href={formatSocialLink(settings.website, "web")} target="_blank" rel="noopener noreferrer" className={`p-2 rounded-full border ${T.socialChip} hover:opacity-80 transition-opacity`}>
                        <Globe className="h-4 w-4" />
                      </a>
                    )}
                  </div>
                </div>

                {/* Listings */}
                <div className="space-y-2">
                  {listings.map((listing) => (
                    <button
                      key={`${listing.type}-${listing.id}`}
                      onClick={() => setSelectedListing(listing)}
                      className="w-full text-left"
                    >
                      <div className={`p-2 border rounded-2xl relative cursor-pointer transition-all active:scale-[0.98] hover:opacity-95 ${T.card}`}>
                        <span
                          className="absolute top-2 right-2 inline-flex items-center justify-center rounded-full border-none p-1.5 shadow-sm"
                          style={{ backgroundColor: "#e5f76e", color: "#000" }}
                        >
                          <ArrowUpRight className="h-3.5 w-3.5" />
                        </span>
                        <div className="flex gap-2 pr-8">
                          <div className="h-16 w-16 rounded-xl overflow-hidden bg-white/10 shrink-0">
                            {listing.images?.[0] && <img src={listing.images[0]} alt={listing.title} className="h-full w-full object-cover" />}
                          </div>
                          <div className="flex-1 min-w-0 flex flex-col justify-center">
                            <p className="font-semibold text-sm leading-snug truncate">{listing.title}</p>
                            <p className={`text-[10px] truncate ${T.muted}`}>{listing.location}</p>
                            <div className="mt-1 flex flex-col">
                              <div className="flex items-center gap-1.5">
                                <p className="text-sm font-bold">{formatPrice(listing.discountedPrice)}</p>
                                {listing.hostDiscountPercent > 0 && (
                                  <p className={`text-[10px] font-bold ${T.discount}`}>−{listing.hostDiscountPercent}%</p>
                                )}
                              </div>
                              {listing.hostDiscountPercent > 0 && (
                                <p className={`text-[10px] line-through ${T.muted}`}>{formatPrice(listing.price)}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* ── Fixed Footer at the absolute bottom ── */}
            <div className={`pt-2 pb-4 text-center border-t ${T.footer} ${T.bg} z-0 shrink-0`}>
              <div className="flex items-center justify-center gap-1.5">
                <span className="text-xs">Powered by</span>
                <a href="/" className="hover:opacity-80 transition-opacity">
                  <img src={logo} alt="Xplorwing" className="h-4 dark:hidden" />
                  <img src={logoLight} alt="Xplorwing" className="h-4 hidden dark:block" />
                </a>
              </div>
              <p className="text-[10px] opacity-60">
                &copy; {new Date().getFullYear()} WINGSNNESTS ECO SOLUTIONS PVT LTD. All rights reserved.
              </p>
            </div>

          </div>
        </div>
      </div>
    </>
  );
}
