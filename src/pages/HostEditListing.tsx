import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, Minus, Plus, Save, Ticket, X, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { createDiscountConfig, generateCouponCode, parseListingDiscountConfig } from "@/lib/discounts";
import { parseRichAmenities } from "@/lib/listing-helpers";
import type { RichAmenities } from "@/lib/listing-helpers";
import { toast } from "sonner";
import { ListingImageUploader } from "@/components/dashboard/ListingImageUploader";

type Section = "stays" | "hotels" | "resorts" | "cars" | "bikes" | "experiences" | "cabs";

const tableMap: Record<Section, string> = {
  stays: "stays",
  hotels: "hotels",
  resorts: "resorts",
  cars: "cars",
  bikes: "bikes",
  experiences: "experiences",
  cabs: "cars",
};

const priceFieldMap: Record<Section, "price_per_night" | "price_per_day" | "price_per_person"> = {
  stays: "price_per_night",
  hotels: "price_per_night",
  resorts: "price_per_night",
  cars: "price_per_day",
  bikes: "price_per_day",
  experiences: "price_per_person",
  cabs: "price_per_day",
};

const extraSelectMap: Record<Section, string> = {
  stays:
    "max_guests,bedrooms,bathrooms,property_type,check_in_time,check_out_time,cancellation_policy,amenities",
  hotels:
    "max_guests,bedrooms,bathrooms,property_type,check_in_time,check_out_time,cancellation_policy,amenities",
  resorts:
    "max_guests,bedrooms,bathrooms,property_type,check_in_time,check_out_time,cancellation_policy,amenities",
  cars: "brand,model,year,fuel_type,transmission,vehicle_type,seating_capacity,mileage_limit",
  cabs: "brand,model,year,fuel_type,transmission,vehicle_type,seating_capacity,mileage_limit",
  bikes: "brand,model,year,engine_capacity,vehicle_type,mileage_limit,helmet_included",
  experiences: "category,duration,group_size,inclusions,exclusions",
};

const propertyTypes = ["Villa", "Apartment", "Cottage", "Homestay", "Farmhouse", "Treehouse", "Houseboat", "Hotel", "Boutique Hotel", "Business Hotel", "Suite Hotel", "Heritage Hotel", "Resort", "Beach Resort", "Mountain Resort", "Spa Resort", "Eco Resort"];
const bedTypes = ["King", "Queen", "Double", "Twin", "Single", "Bunk", "Sofa Bed"];

const STANDARD_AMENITIES = [
  { key: "wifi" as const, label: "WiFi" },
  { key: "ac" as const, label: "Air Conditioning" },
  { key: "tv" as const, label: "TV" },
  { key: "kitchen" as const, label: "Kitchen" },
  { key: "parking" as const, label: "Free Parking" },
  { key: "pool" as const, label: "Swimming Pool" },
  { key: "petFriendly" as const, label: "Pet Friendly" },
  { key: "dedicatedWorkspace" as const, label: "Dedicated Workspace" },
  { key: "selfCheckIn" as const, label: "Self Check-in" },
  { key: "freeCancellation" as const, label: "Free Cancellation" },
  { key: "breakfast" as const, label: "Breakfast Included" },
  { key: "gym" as const, label: "Gym / Fitness Center" },
] as const;

type AmenityKey = (typeof STANDARD_AMENITIES)[number]["key"];
const amenityFormKey = (k: AmenityKey) =>
  `amenity${k.charAt(0).toUpperCase()}${k.slice(1)}` as keyof typeof emptyExtendedForm;

const emptyBedroom = () => ({ name: "", bedType: "King", count: "1" });
const emptyCoupon = () => ({ code: "", type: "percent" as const, value: "" });

const emptyExtendedForm = {
  shortDescription: "",
  state: "",
  city: "",
  fullAddress: "",
  propertySize: "",
  beds: "",
  houseRules: "",
  healthSafety: "",
  weeklyPrice: "",
  monthlyPrice: "",
  cleaningFee: "",
  securityDeposit: "",
  roomImages: [] as string[],
  bedroomDetails: [emptyBedroom()] as Array<{ name: string; bedType: string; count: string }>,
  coupons: [] as Array<{ code: string; type: "percent" | "flat"; value: string }>,
  amenityWifi: false,
  amenityAc: false,
  amenityTv: false,
  amenityKitchen: false,
  amenityParking: false,
  amenityPool: false,
  amenityPetFriendly: false,
  amenityDedicatedWorkspace: false,
  amenitySelfCheckIn: false,
  amenityFreeCancellation: false,
  amenityBreakfast: false,
  amenityGym: false,
  customAmenities: [] as string[],
  amenityInput: "",
};
const fuelTypes = ["Petrol", "Diesel", "Electric", "Hybrid", "CNG"];
const transmissionTypes = ["Manual", "Automatic"];
const vehicleTypes = ["Sedan", "SUV", "Hatchback", "MUV", "Luxury", "Convertible"];
const bikeTypes = ["Sport", "Cruiser", "Adventure", "Scooter", "Commuter", "Electric"];
const categories = ["Adventure", "Cultural", "Food & Drink", "Nature", "Wellness", "Photography", "Water Sports", "Trekking", "Wildlife"];

export default function HostEditListing() {
  const navigate = useNavigate();
  const { section } = useParams<{ section: Section }>();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const listingId = searchParams.get("id");

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    location: "",
    price: "",
    availability_status: true,
    images: [] as string[],
    hostDiscountPercent: "",
    max_guests: "",
    bedrooms: "",
    bathrooms: "",
    property_type: "",
    check_in_time: "",
    check_out_time: "",
    cancellation_policy: "moderate",
    brand: "",
    model: "",
    year: "",
    fuel_type: "",
    transmission: "",
    vehicle_type: "",
    seating_capacity: "",
    mileage_limit: "",
    engine_capacity: "",
    helmet_included: true,
    category: "",
    duration: "",
    group_size: "",
    inclusions: [""] as string[],
    exclusions: [""] as string[],
    amenities: [] as string[],
    amenityInput: "",
    // Extended stay/hotel/resort fields
    ...emptyExtendedForm,
  });

  const sectionLabel = useMemo(
    () => (section ? section.charAt(0).toUpperCase() + section.slice(1, -1) : "Listing"),
    [section],
  );

  useEffect(() => {
    const loadListing = async () => {
      if (!user || !section || !listingId || !(section in tableMap)) {
        setIsLoading(false);
        return;
      }

      const table = tableMap[section as Section];
      const priceField = priceFieldMap[section as Section];
      const extraFields = extraSelectMap[section as Section];
      const { data, error } = await supabase
        .from(table as any)
        .select(`id,title,description,location,availability_status,images,discounts,${priceField},${extraFields}`)
        .eq("id", listingId)
        .eq("host_id", user.id)
        .maybeSingle();

      if (error || !data) {
        toast.error("Could not load listing for editing.");
        navigate(`/host/${section ?? "dashboard"}`);
        return;
      }

      const discountConfig = parseListingDiscountConfig((data as any).discounts);
      const richAmenities = parseRichAmenities((data as any).amenities);

      setForm((prev) => ({
        ...prev,
        title: (data as any).title ?? "",
        description: (data as any).description ?? "",
        location: (data as any).location ?? "",
        price: String((data as any)[priceField] ?? ""),
        availability_status: Boolean((data as any).availability_status),
        images: Array.isArray((data as any).images) ? ((data as any).images as string[]) : [],
        hostDiscountPercent:
          discountConfig.hostDiscountPercent > 0 ? String(discountConfig.hostDiscountPercent) : "",
        max_guests: String((data as any).max_guests ?? ""),
        bedrooms: String((data as any).bedrooms ?? ""),
        bathrooms: String((data as any).bathrooms ?? ""),
        property_type: (data as any).property_type ?? "",
        check_in_time: (data as any).check_in_time ?? "",
        check_out_time: (data as any).check_out_time ?? "",
        cancellation_policy: (data as any).cancellation_policy ?? "moderate",
        brand: (data as any).brand ?? "",
        model: (data as any).model ?? "",
        year: String((data as any).year ?? ""),
        fuel_type: (data as any).fuel_type ?? "",
        transmission: (data as any).transmission ?? "",
        vehicle_type: (data as any).vehicle_type ?? "",
        seating_capacity: String((data as any).seating_capacity ?? ""),
        mileage_limit: String((data as any).mileage_limit ?? ""),
        engine_capacity: String((data as any).engine_capacity ?? ""),
        helmet_included: Boolean((data as any).helmet_included ?? true),
        category: (data as any).category ?? "",
        duration: (data as any).duration ?? "",
        group_size: String((data as any).group_size ?? ""),
        inclusions:
          Array.isArray((data as any).inclusions) && (data as any).inclusions.length
            ? ((data as any).inclusions as string[])
            : [""],
        exclusions:
          Array.isArray((data as any).exclusions) && (data as any).exclusions.length
            ? ((data as any).exclusions as string[])
            : [""],
        amenities: richAmenities.custom ?? [],
        // Extended fields from rich amenities
        shortDescription: richAmenities.shortDescription ?? "",
        state: richAmenities.state ?? "",
        city: richAmenities.city ?? "",
        fullAddress: richAmenities.fullAddress ?? "",
        propertySize: richAmenities.propertySize ?? "",
        beds: richAmenities.beds ? String(richAmenities.beds) : "",
        houseRules: richAmenities.houseRules ?? "",
        healthSafety: richAmenities.healthSafety ?? "",
        weeklyPrice: richAmenities.weeklyPrice ? String(richAmenities.weeklyPrice) : "",
        monthlyPrice: richAmenities.monthlyPrice ? String(richAmenities.monthlyPrice) : "",
        cleaningFee: richAmenities.cleaningFee ? String(richAmenities.cleaningFee) : "",
        securityDeposit: richAmenities.securityDeposit ? String(richAmenities.securityDeposit) : "",
        roomImages: richAmenities.roomImages ?? [],
        bedroomDetails: richAmenities.bedroomDetails?.map(b => ({
          name: b.name,
          bedType: b.bedType,
          count: String(b.count),
        })) ?? [emptyBedroom()],
        coupons: discountConfig.coupons.map(c => ({
          code: c.code,
          type: c.type,
          value: String(c.value),
        })),
        customAmenities: richAmenities.custom ?? [],
        // Boolean amenity flags
        amenityWifi: !!richAmenities.wifi,
        amenityAc: !!richAmenities.ac,
        amenityTv: !!richAmenities.tv,
        amenityKitchen: !!richAmenities.kitchen,
        amenityParking: !!richAmenities.parking,
        amenityPool: !!richAmenities.pool,
        amenityPetFriendly: !!richAmenities.petFriendly,
        amenityDedicatedWorkspace: !!richAmenities.dedicatedWorkspace,
        amenitySelfCheckIn: !!richAmenities.selfCheckIn,
        amenityFreeCancellation: !!richAmenities.freeCancellation,
        amenityBreakfast: !!richAmenities.breakfast,
        amenityGym: !!richAmenities.gym,
      }));
      setIsLoading(false);
    };

    void loadListing();
  }, [listingId, navigate, section, user]);

  const set = (key: string, value: string | boolean | string[]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !section || !listingId || !(section in tableMap)) return;
    if (!form.title || !form.location || !form.price) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsSaving(true);
    try {
      const table = tableMap[section as Section];
      const priceField = priceFieldMap[section as Section];
      const validCoupons = form.coupons
        .filter(c => c.code.trim() && c.value)
        .map(c => ({ code: c.code, type: c.type, value: Number(c.value) }));
      const discountConfig = createDiscountConfig(Number(form.hostDiscountPercent || 0), validCoupons);

      const payload: Record<string, unknown> = {
        title: form.title,
        description: form.description || null,
        location: form.location,
        [priceField]: Number(form.price),
        availability_status: form.availability_status,
        images: form.images.length > 0 ? form.images : null,
        discounts:
          discountConfig.hostDiscountPercent > 0 || discountConfig.coupons.length > 0
            ? discountConfig
            : null,
        approval_status: 'pending',
        rejection_reason: null,
        marketplace_requested: true,
        marketplace_visible: false,
        submitted_for_review_at: new Date().toISOString(),
      };

      if (section === "stays" || section === "hotels" || section === "resorts") {
        payload.max_guests = form.max_guests ? Number(form.max_guests) : null;
        payload.bedrooms = form.bedrooms ? Number(form.bedrooms) : null;
        payload.bathrooms = form.bathrooms ? Number(form.bathrooms) : null;
        payload.property_type = form.property_type || null;
        payload.check_in_time = form.check_in_time || null;
        payload.check_out_time = form.check_out_time || null;
        payload.cancellation_policy = form.cancellation_policy || null;

        // Build rich amenities object
        const richAmenities: RichAmenities = {};
        if (form.amenityWifi) richAmenities.wifi = true;
        if (form.amenityAc) richAmenities.ac = true;
        if (form.amenityTv) richAmenities.tv = true;
        if (form.amenityKitchen) richAmenities.kitchen = true;
        if (form.amenityParking) richAmenities.parking = true;
        if (form.amenityPool) richAmenities.pool = true;
        if (form.amenityPetFriendly) richAmenities.petFriendly = true;
        if (form.amenityDedicatedWorkspace) richAmenities.dedicatedWorkspace = true;
        if (form.amenitySelfCheckIn) richAmenities.selfCheckIn = true;
        if (form.amenityFreeCancellation) richAmenities.freeCancellation = true;
        if (form.amenityBreakfast) richAmenities.breakfast = true;
        if (form.amenityGym) richAmenities.gym = true;
        if (form.customAmenities.length) richAmenities.custom = form.customAmenities;
        if (form.shortDescription) richAmenities.shortDescription = form.shortDescription;
        if (form.state) richAmenities.state = form.state;
        if (form.city) richAmenities.city = form.city;
        if (form.fullAddress) richAmenities.fullAddress = form.fullAddress;
        if (form.propertySize) richAmenities.propertySize = form.propertySize;
        if (form.beds) richAmenities.beds = Number(form.beds);
        if (form.houseRules) richAmenities.houseRules = form.houseRules;
        if (form.healthSafety) richAmenities.healthSafety = form.healthSafety;
        const validRooms = form.bedroomDetails.filter(b => b.name.trim() || Number(b.count) > 0);
        if (validRooms.length) richAmenities.bedroomDetails = validRooms.map(b => ({
          name: b.name,
          bedType: b.bedType,
          count: Number(b.count) || 1,
        }));
        if (form.roomImages.length) richAmenities.roomImages = form.roomImages;
        if (form.weeklyPrice) richAmenities.weeklyPrice = Number(form.weeklyPrice);
        if (form.monthlyPrice) richAmenities.monthlyPrice = Number(form.monthlyPrice);
        if (form.cleaningFee) richAmenities.cleaningFee = Number(form.cleaningFee);
        if (form.securityDeposit) richAmenities.securityDeposit = Number(form.securityDeposit);

        payload.amenities = Object.keys(richAmenities).length > 0 ? richAmenities : null;
      }

      if (section === "cars" || section === "cabs") {
        payload.brand = form.brand || null;
        payload.model = form.model || null;
        payload.year = form.year ? Number(form.year) : null;
        payload.fuel_type = form.fuel_type || null;
        payload.transmission = form.transmission || null;
        payload.vehicle_type = form.vehicle_type || null;
        payload.seating_capacity = form.seating_capacity ? Number(form.seating_capacity) : null;
        payload.mileage_limit = form.mileage_limit ? Number(form.mileage_limit) : null;
      }

      if (section === "bikes") {
        payload.brand = form.brand || null;
        payload.model = form.model || null;
        payload.year = form.year ? Number(form.year) : null;
        payload.engine_capacity = form.engine_capacity ? Number(form.engine_capacity) : null;
        payload.vehicle_type = form.vehicle_type || null;
        payload.mileage_limit = form.mileage_limit ? Number(form.mileage_limit) : null;
        payload.helmet_included = form.helmet_included;
      }

      if (section === "experiences") {
        payload.category = form.category || null;
        payload.duration = form.duration || null;
        payload.group_size = form.group_size ? Number(form.group_size) : null;
        payload.inclusions = form.inclusions.filter((item) => item.trim()) || null;
        payload.exclusions = form.exclusions.filter((item) => item.trim()) || null;
      }

      const { error } = await supabase
        .from(table as any)
        .update(payload)
        .eq("id", listingId)
        .eq("host_id", user.id);

      if (error) throw error;
      toast.success(`${sectionLabel} listing updated.`);
      navigate(`/host/${section}`);
    } catch (error: any) {
      toast.error(error?.message || "Failed to update listing");
    } finally {
      setIsSaving(false);
    }
  };

  if (!section || !(section in tableMap) || !listingId) {
    return <div className="text-sm text-muted-foreground">Invalid listing edit request.</div>;
  }

  const updateListItem = (key: "inclusions" | "exclusions", index: number, value: string) => {
    setForm((prev) => ({ ...prev, [key]: prev[key].map((item, i) => (i === index ? value : item)) }));
  };
  const addListItem = (key: "inclusions" | "exclusions") => {
    setForm((prev) => ({ ...prev, [key]: [...prev[key], ""] }));
  };
  const removeListItem = (key: "inclusions" | "exclusions", index: number) => {
    setForm((prev) => ({ ...prev, [key]: prev[key].filter((_, i) => i !== index) }));
  };

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Loading listing...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/host/${section}`)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Edit {sectionLabel}</h1>
          <p className="text-muted-foreground">Update your listing details and pricing</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader><CardTitle>Basic Information</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div><Label>Title *</Label><Input value={form.title} onChange={(e) => set("title", e.target.value)} /></div>
              <div><Label>Description</Label><Textarea rows={4} value={form.description} onChange={(e) => set("description", e.target.value)} /></div>
              <div><Label>Location *</Label><Input value={form.location} onChange={(e) => set("location", e.target.value)} /></div>
            </CardContent>
          </Card>

          {(section === "stays" || section === "hotels" || section === "resorts") && (
            <>
              <Card>
                <CardHeader><CardTitle>Property Details</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div><Label>Max Guests</Label><Input type="number" value={form.max_guests} onChange={(e) => set("max_guests", e.target.value)} /></div>
                  <div><Label>Bedrooms</Label><Input type="number" value={form.bedrooms} onChange={(e) => set("bedrooms", e.target.value)} /></div>
                  <div><Label>Bathrooms</Label><Input type="number" value={form.bathrooms} onChange={(e) => set("bathrooms", e.target.value)} /></div>
                  <div>
                    <Label>Property Type</Label>
                    <Select value={form.property_type} onValueChange={(v) => set("property_type", v)}>
                      <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                      <SelectContent>{propertyTypes.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle>Check-in/out</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div><Label>Check-in</Label><Input type="time" value={form.check_in_time} onChange={(e) => set("check_in_time", e.target.value)} /></div>
                  <div><Label>Check-out</Label><Input type="time" value={form.check_out_time} onChange={(e) => set("check_out_time", e.target.value)} /></div>
                  <div>
                    <Label>Cancellation Policy</Label>
                    <Select value={form.cancellation_policy} onValueChange={(v) => set("cancellation_policy", v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="flexible">Flexible</SelectItem>
                        <SelectItem value="moderate">Moderate</SelectItem>
                        <SelectItem value="strict">Strict</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {(section === "cars" || section === "cabs") && (
            <Card>
              <CardHeader><CardTitle>Vehicle Details</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div><Label>Brand</Label><Input value={form.brand} onChange={(e) => set("brand", e.target.value)} /></div>
                <div><Label>Model</Label><Input value={form.model} onChange={(e) => set("model", e.target.value)} /></div>
                <div><Label>Year</Label><Input type="number" value={form.year} onChange={(e) => set("year", e.target.value)} /></div>
                <div>
                  <Label>Fuel Type</Label>
                  <Select value={form.fuel_type} onValueChange={(v) => set("fuel_type", v)}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{fuelTypes.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Transmission</Label>
                  <Select value={form.transmission} onValueChange={(v) => set("transmission", v)}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{transmissionTypes.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Vehicle Type</Label>
                  <Select value={form.vehicle_type} onValueChange={(v) => set("vehicle_type", v)}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{vehicleTypes.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Seats</Label><Input type="number" value={form.seating_capacity} onChange={(e) => set("seating_capacity", e.target.value)} /></div>
                <div><Label>Mileage Limit (km)</Label><Input type="number" value={form.mileage_limit} onChange={(e) => set("mileage_limit", e.target.value)} /></div>
              </CardContent>
            </Card>
          )}

          {section === "bikes" && (
            <Card>
              <CardHeader><CardTitle>Bike Details</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div><Label>Brand</Label><Input value={form.brand} onChange={(e) => set("brand", e.target.value)} /></div>
                <div><Label>Model</Label><Input value={form.model} onChange={(e) => set("model", e.target.value)} /></div>
                <div><Label>Year</Label><Input type="number" value={form.year} onChange={(e) => set("year", e.target.value)} /></div>
                <div><Label>Engine (cc)</Label><Input type="number" value={form.engine_capacity} onChange={(e) => set("engine_capacity", e.target.value)} /></div>
                <div>
                  <Label>Bike Type</Label>
                  <Select value={form.vehicle_type} onValueChange={(v) => set("vehicle_type", v)}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{bikeTypes.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Mileage Limit (km)</Label><Input type="number" value={form.mileage_limit} onChange={(e) => set("mileage_limit", e.target.value)} /></div>
              </CardContent>
            </Card>
          )}

          {section === "experiences" && (
            <>
              <Card>
                <CardHeader><CardTitle>Experience Details</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label>Category</Label>
                    <Select value={form.category} onValueChange={(v) => set("category", v)}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>{categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label>Duration</Label><Input value={form.duration} onChange={(e) => set("duration", e.target.value)} /></div>
                  <div><Label>Group Size</Label><Input type="number" value={form.group_size} onChange={(e) => set("group_size", e.target.value)} /></div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle>Inclusions</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {form.inclusions.map((item, i) => (
                    <div key={i} className="flex gap-2">
                      <Input value={item} onChange={(e) => updateListItem("inclusions", i, e.target.value)} className="flex-1" />
                      {form.inclusions.length > 1 && <Button type="button" variant="ghost" size="icon" onClick={() => removeListItem("inclusions", i)}><Minus className="h-4 w-4" /></Button>}
                    </div>
                  ))}
                  <Button type="button" variant="outline" size="sm" onClick={() => addListItem("inclusions")}><Plus className="h-3 w-3 mr-1" />Add inclusion</Button>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle>Exclusions</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {form.exclusions.map((item, i) => (
                    <div key={i} className="flex gap-2">
                      <Input value={item} onChange={(e) => updateListItem("exclusions", i, e.target.value)} className="flex-1" />
                      {form.exclusions.length > 1 && <Button type="button" variant="ghost" size="icon" onClick={() => removeListItem("exclusions", i)}><Minus className="h-4 w-4" /></Button>}
                    </div>
                  ))}
                  <Button type="button" variant="outline" size="sm" onClick={() => addListItem("exclusions")}><Plus className="h-3 w-3 mr-1" />Add exclusion</Button>
                </CardContent>
              </Card>
            </>
          )}

          {(section === "stays" || section === "hotels" || section === "resorts") && (
            <>
              {/* Extended Location */}
              <Card>
                <CardHeader><CardTitle>Location Details</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Short Description</Label>
                    <Input value={form.shortDescription} onChange={e => set("shortDescription", e.target.value)} placeholder="One-line summary for listing cards" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>State</Label>
                      <Input value={form.state} onChange={e => set("state", e.target.value)} placeholder="e.g. Himachal Pradesh" />
                    </div>
                    <div>
                      <Label>City</Label>
                      <Input value={form.city} onChange={e => set("city", e.target.value)} placeholder="e.g. Manali" />
                    </div>
                  </div>
                  <div>
                    <Label>Full Address</Label>
                    <Input value={form.fullAddress} onChange={e => set("fullAddress", e.target.value)} placeholder="Street, Area, PIN code" />
                  </div>
                </CardContent>
              </Card>

              {/* Extended Property Details */}
              <Card>
                <CardHeader><CardTitle>Additional Property Details</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Beds (total)</Label>
                    <Input type="number" min={0} value={form.beds} onChange={e => set("beds", e.target.value)} placeholder="3" />
                  </div>
                  <div>
                    <Label>Property Size</Label>
                    <Input value={form.propertySize} onChange={e => set("propertySize", e.target.value)} placeholder="e.g. 1200 sq ft" />
                  </div>
                </CardContent>
              </Card>

              {/* Room Images */}
              <Card>
                <CardHeader><CardTitle>Room Photos</CardTitle></CardHeader>
                <CardContent>
                  <ListingImageUploader
                    images={form.roomImages}
                    onImagesChange={v => setForm(p => ({ ...p, roomImages: v }))}
                    label="Click to upload room / interior photos"
                    showFeaturedBadge={false}
                  />
                </CardContent>
              </Card>

              {/* Amenities */}
              <Card>
                <CardHeader><CardTitle>Amenities</CardTitle></CardHeader>
                <CardContent className="space-y-5">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {STANDARD_AMENITIES.map(({ key, label }) => (
                      <label key={key} className="flex items-center gap-2 cursor-pointer select-none">
                        <Checkbox
                          checked={form[amenityFormKey(key)] as boolean}
                          onCheckedChange={checked => setForm(p => ({ ...p, [amenityFormKey(key)]: Boolean(checked) }))}
                        />
                        <span className="text-sm">{label}</span>
                      </label>
                    ))}
                  </div>
                  <div>
                    <Label>Custom Amenities</Label>
                    <div className="flex gap-2 mt-1">
                      <Input
                        value={form.amenityInput}
                        onChange={e => setForm(p => ({ ...p, amenityInput: e.target.value }))}
                        onKeyDown={e => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            const val = form.amenityInput.trim();
                            if (val && !form.customAmenities.includes(val)) {
                              setForm(p => ({ ...p, customAmenities: [...p.customAmenities, val], amenityInput: "" }));
                            }
                          }
                        }}
                        placeholder="e.g. Bonfire area, Telescope"
                      />
                      <Button type="button" variant="outline" onClick={() => {
                        const val = form.amenityInput.trim();
                        if (val && !form.customAmenities.includes(val)) {
                          setForm(p => ({ ...p, customAmenities: [...p.customAmenities, val], amenityInput: "" }));
                        }
                      }}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    {form.customAmenities.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {form.customAmenities.map((a, i) => (
                          <span key={i} className="inline-flex items-center gap-1 bg-secondary text-foreground rounded-full px-3 py-1 text-sm">
                            {a}
                            <button type="button" onClick={() => setForm(p => ({ ...p, customAmenities: p.customAmenities.filter((_, idx) => idx !== i) }))} className="text-muted-foreground hover:text-destructive ml-0.5">
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Sleeping Arrangements */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Where You'll Sleep</CardTitle>
                  <Button type="button" variant="outline" size="sm" onClick={() => setForm(p => ({ ...p, bedroomDetails: [...p.bedroomDetails, emptyBedroom()] }))}>
                    <Plus className="h-3.5 w-3.5 mr-1" /> Add Bedroom
                  </Button>
                </CardHeader>
                <CardContent className="space-y-3">
                  {form.bedroomDetails.map((b, i) => (
                    <div key={i} className="grid grid-cols-3 gap-3 p-3 rounded-lg border border-border">
                      <div>
                        <Label className="text-xs">Room Name</Label>
                        <Input value={b.name} onChange={e => setForm(p => ({ ...p, bedroomDetails: p.bedroomDetails.map((bd, idx) => idx === i ? { ...bd, name: e.target.value } : bd) }))} placeholder={`Bedroom ${i + 1}`} className="mt-1 h-8 text-sm" />
                      </div>
                      <div>
                        <Label className="text-xs">Bed Type</Label>
                        <Select value={b.bedType} onValueChange={v => setForm(p => ({ ...p, bedroomDetails: p.bedroomDetails.map((bd, idx) => idx === i ? { ...bd, bedType: v } : bd) }))}>
                          <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue /></SelectTrigger>
                          <SelectContent>{bedTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-end gap-2">
                        <div className="flex-1">
                          <Label className="text-xs">Beds</Label>
                          <Input type="number" min={1} value={b.count} onChange={e => setForm(p => ({ ...p, bedroomDetails: p.bedroomDetails.map((bd, idx) => idx === i ? { ...bd, count: e.target.value } : bd) }))} className="mt-1 h-8 text-sm" />
                        </div>
                        {form.bedroomDetails.length > 1 && (
                          <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => setForm(p => ({ ...p, bedroomDetails: p.bedroomDetails.filter((_, idx) => idx !== i) }))}>
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* House Rules & Safety */}
              <Card>
                <CardHeader><CardTitle>Policies</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>House Rules</Label>
                    <Textarea value={form.houseRules} onChange={e => set("houseRules", e.target.value)} placeholder="No smoking, no parties, quiet hours after 10 PM..." rows={3} />
                  </div>
                  <div>
                    <Label>Health & Safety</Label>
                    <Textarea value={form.healthSafety} onChange={e => set("healthSafety", e.target.value)} placeholder="Smoke alarm installed, CO detector, first aid kit..." rows={3} />
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          <Card>
            <CardHeader><CardTitle>Photos</CardTitle></CardHeader>
            <CardContent>
              <ListingImageUploader
                images={form.images}
                onImagesChange={(images) => setForm(p => ({ ...p, images }))}
                label="Click to upload property photos"
              />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Pricing (₹)</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Price *</Label>
                <Input type="number" value={form.price} onChange={(e) => set("price", e.target.value)} />
              </div>
              {(section === "stays" || section === "hotels" || section === "resorts") && (
                <>
                  <div>
                    <Label>Weekly Price</Label>
                    <Input type="number" min={1} value={form.weeklyPrice} onChange={e => set("weeklyPrice", e.target.value)} placeholder="Auto-calculated if blank" />
                  </div>
                  <div>
                    <Label>Monthly Price</Label>
                    <Input type="number" min={1} value={form.monthlyPrice} onChange={e => set("monthlyPrice", e.target.value)} placeholder="Auto-calculated if blank" />
                  </div>
                  <div>
                    <Label>Cleaning Fee</Label>
                    <Input type="number" min={0} value={form.cleaningFee} onChange={e => set("cleaningFee", e.target.value)} placeholder="0" />
                  </div>
                  <div>
                    <Label>Security Deposit</Label>
                    <Input type="number" min={0} value={form.securityDeposit} onChange={e => set("securityDeposit", e.target.value)} placeholder="0" />
                  </div>
                </>
              )}
              <div>
                <Label>Host Discount (%)</Label>
                <Input type="number" min={0} max={90} value={form.hostDiscountPercent} onChange={(e) => set("hostDiscountPercent", e.target.value)} />
              </div>
            </CardContent>
          </Card>

          {/* Coupons */}
          {(section === "stays" || section === "hotels" || section === "resorts") && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Ticket className="h-4 w-4" /> Coupons
                </CardTitle>
                <Button type="button" variant="outline" size="sm" onClick={() => setForm(p => ({ ...p, coupons: [...p.coupons, emptyCoupon()] }))}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                {form.coupons.length === 0 && (
                  <p className="text-xs text-muted-foreground">No coupons yet.</p>
                )}
                {form.coupons.map((c, i) => (
                  <div key={i} className="p-3 rounded-lg border border-border space-y-2">
                    <div className="flex gap-2">
                      <Input
                        value={c.code}
                        onChange={e => setForm(p => ({ ...p, coupons: p.coupons.map((cp, idx) => idx === i ? { ...cp, code: e.target.value.toUpperCase() } : cp) }))}
                        placeholder="SAVE20"
                        className="uppercase flex-1 h-8 text-sm"
                      />
                      <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" title="Generate code"
                        onClick={() => setForm(p => ({ ...p, coupons: p.coupons.map((cp, idx) => idx === i ? { ...cp, code: generateCouponCode() } : cp) }))}>
                        <RefreshCw className="h-3.5 w-3.5" />
                      </Button>
                      <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0"
                        onClick={() => setForm(p => ({ ...p, coupons: p.coupons.filter((_, idx) => idx !== i) }))}>
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Select value={c.type} onValueChange={v => setForm(p => ({ ...p, coupons: p.coupons.map((cp, idx) => idx === i ? { ...cp, type: v as "percent" | "flat" } : cp) }))}>
                        <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="percent">% Off</SelectItem>
                          <SelectItem value="flat">₹ Flat Off</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        type="number" min={1}
                        value={c.value}
                        onChange={e => setForm(p => ({ ...p, coupons: p.coupons.map((cp, idx) => idx === i ? { ...cp, value: e.target.value } : cp) }))}
                        placeholder={c.type === "percent" ? "20" : "500"}
                        className="h-8 text-sm"
                      />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader><CardTitle>Settings</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Available for booking</Label>
                <Switch checked={form.availability_status} onCheckedChange={(v) => set("availability_status", v)} />
              </div>
              {section === "bikes" && (
                <div className="flex items-center justify-between">
                  <Label>Helmet included</Label>
                  <Switch checked={form.helmet_included} onCheckedChange={(v) => set("helmet_included", v)} />
                </div>
              )}
            </CardContent>
          </Card>

          <Button type="submit" className="w-full" disabled={isSaving}>
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </form>
    </div>
  );
}
