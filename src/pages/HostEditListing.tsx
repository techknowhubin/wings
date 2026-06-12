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
  { key: "kitchen" as const, label: "Kitchen / Restaurant" },
  { key: "parking" as const, label: "Free Parking" },
  { key: "pool" as const, label: "Swimming Pool" },
  { key: "petFriendly" as const, label: "Pet Friendly" },
  { key: "dedicatedWorkspace" as const, label: "Workspace" },
  { key: "selfCheckIn" as const, label: "Self Check-in" },
  { key: "freeCancellation" as const, label: "Free Cancellation" },
  { key: "breakfast" as const, label: "Breakfast Included" },
  { key: "gym" as const, label: "Gym / Fitness Center" },
] as const;

type AmenityKey = (typeof STANDARD_AMENITIES)[number]["key"];
const amenityFormKey = (k: AmenityKey) =>
  `amenity${k.charAt(0).toUpperCase()}${k.slice(1)}` as keyof typeof emptyExtendedForm;

const emptyBedroom = () => ({
  name: "",
  bedType: "King",
  count: "1",
  description: "",
  photos: [] as string[],
  sizeSqFt: "",
  bathrooms: "1",
  occupancyCapacity: "2",
  amenities: [] as string[],
  amenityInput: "",
});

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
  bedroomDetails: [] as Array<{
    name: string;
    bedType: string;
    count: string;
    description: string;
    photos: string[];
    sizeSqFt: string;
    bathrooms: string;
    occupancyCapacity: string;
    amenities: string[];
    amenityInput: string;
  }>,
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

  // New premium fields
  propertyCategory: "Premium",
  googleMapsUrl: "",
  videos: [] as string[],
  videoInput: "",
  virtualTourUrl: "",

  // Room plans
  planRoomOnly: true,
  planFreeBreakfast: false,
  planHalfBoard: false,
  planAllInclusive: false,
  customPlans: [] as string[],
  customPlanInput: "",

  // Pricing additions
  originalPrice: "",
  discountedPrice: "",
  dailyPrice: "",
  taxesAndFees: "",
  offerPercentage: "",
  bookAtZero: false,

  // Detailed policies
  policySmokingAllowed: false,
  policyPetAllowed: false,
  policyChildAllowed: true,
  policyChildDescription: "",

  // Nearby Info
  nearbyRestaurants: [] as string[],
  nearbyAttractions: [] as string[],
  nearbyTransport: [] as string[],
  nearbyHospitals: [] as string[],
  nearbyShopping: [] as string[],
  nearbyRestaurantsInput: "",
  nearbyAttractionsInput: "",
  nearbyTransportInput: "",
  nearbyHospitalsInput: "",
  nearbyShoppingInput: "",

  // Host Info
  hostName: "",
  hostPhoto: "",
  hostDescription: "",
  hostIsSuperhost: false,
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
  const [originalData, setOriginalData] = useState<any>(null);
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
    discount7: "",
    discount14: "",
    discount30: "",
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
         .select(`id,title,description,location,availability_status,images,discounts,approval_status,long_stay_discount_7,long_stay_discount_14,long_stay_discount_30,${priceField},${extraFields}`)
         .eq("id", listingId)
         .eq("host_id", user.id)
         .maybeSingle();

      if (error || !data) {
        toast.error("Could not load listing for editing.");
        navigate(`/host/${section ?? "dashboard"}`);
        return;
      }

      setOriginalData(data);
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
        discount7: String((data as any).long_stay_discount_7 || ""),
        discount14: String((data as any).long_stay_discount_14 || ""),
        discount30: String((data as any).long_stay_discount_30 || ""),
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
          description: b.description ?? "",
          photos: b.photos ?? [],
          sizeSqFt: b.sizeSqFt ? String(b.sizeSqFt) : "",
          bathrooms: b.bathrooms ? String(b.bathrooms) : "1",
          occupancyCapacity: b.occupancyCapacity ? String(b.occupancyCapacity) : "2",
          amenities: b.amenities ?? [],
          amenityInput: "",
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

        // Premium fields
        propertyCategory: richAmenities.propertyCategory ?? "Premium",
        googleMapsUrl: richAmenities.googleMapsUrl ?? "",
        videos: richAmenities.videos ?? [],
        virtualTourUrl: richAmenities.virtualTourUrl ?? "",

        // Room plans
        planRoomOnly: richAmenities.roomPlans?.roomOnly !== false,
        planFreeBreakfast: !!richAmenities.roomPlans?.freeBreakfast,
        planHalfBoard: !!richAmenities.roomPlans?.halfBoard,
        planAllInclusive: !!richAmenities.roomPlans?.allInclusive,
        customPlans: richAmenities.roomPlans?.customPlans ?? [],

        // Pricing additions
        originalPrice: richAmenities.originalPrice ? String(richAmenities.originalPrice) : "",
        discountedPrice: richAmenities.discountedPrice ? String(richAmenities.discountedPrice) : "",
        dailyPrice: richAmenities.dailyPrice ? String(richAmenities.dailyPrice) : "",
        taxesAndFees: richAmenities.taxesAndFees ? String(richAmenities.taxesAndFees) : "",
        offerPercentage: richAmenities.offerPercentage ? String(richAmenities.offerPercentage) : "",
        bookAtZero: !!richAmenities.bookAtZero,

        // Policies
        policySmokingAllowed: !!richAmenities.policySmokingAllowed,
        policyPetAllowed: !!richAmenities.policyPetAllowed,
        policyChildAllowed: richAmenities.policyChildAllowed !== false,
        policyChildDescription: richAmenities.policyChildDescription ?? "",

        // Nearby Info
        nearbyRestaurants: richAmenities.nearbyInfo?.restaurants ?? [],
        nearbyAttractions: richAmenities.nearbyInfo?.attractions ?? [],
        nearbyTransport: richAmenities.nearbyInfo?.transport ?? [],
        nearbyHospitals: richAmenities.nearbyInfo?.hospitals ?? [],
        nearbyShopping: richAmenities.nearbyInfo?.shopping ?? [],

        // Host Info
        hostName: richAmenities.hostInfo?.name ?? "",
        hostPhoto: richAmenities.hostInfo?.photo ?? "",
        hostDescription: richAmenities.hostInfo?.description ?? "",
        hostIsSuperhost: !!richAmenities.hostInfo?.isSuperhost,
      }));
      setIsLoading(false);
    };

    void loadListing();
  }, [listingId, navigate, section, user]);

  const set = (key: string, value: any) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const updateBedroom = (i: number, field: string, value: any) =>
    setForm(p => ({
      ...p,
      bedroomDetails: p.bedroomDetails.map((b, idx) => idx === i ? { ...b, [field]: value } : b),
    }));

  const updateCoupon = (i: number, field: string, value: string) =>
    setForm(p => ({
      ...p,
      coupons: p.coupons.map((c, idx) => idx === i ? { ...c, [field]: value } : c),
    }));

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

      // Determine major change status by comparing with originalData
      let isMajorChange = false;
      if (originalData) {
        if (form.title !== (originalData.title ?? "") ||
            form.description !== (originalData.description ?? "") ||
            form.location !== (originalData.location ?? "")) {
          isMajorChange = true;
        }

        if (section === "stays" || section === "hotels" || section === "resorts") {
          const origMaxGuests = originalData.max_guests ? String(originalData.max_guests) : "";
          const origBedrooms = originalData.bedrooms ? String(originalData.bedrooms) : "";
          const origBathrooms = originalData.bathrooms ? String(originalData.bathrooms) : "";
          const origPropType = originalData.property_type ?? "";
          const origCheckIn = originalData.check_in_time ?? "";
          const origCheckOut = originalData.check_out_time ?? "";
          const origCancelPolicy = originalData.cancellation_policy ?? "moderate";

          if (form.max_guests !== origMaxGuests ||
              form.bedrooms !== origBedrooms ||
              form.bathrooms !== origBathrooms ||
              form.property_type !== origPropType ||
              form.check_in_time !== origCheckIn ||
              form.check_out_time !== origCheckOut ||
              form.cancellation_policy !== origCancelPolicy) {
            isMajorChange = true;
          }

          const origAmenities = parseRichAmenities(originalData.amenities);
          const origWifi = !!origAmenities.wifi;
          const origAc = !!origAmenities.ac;
          const origTv = !!origAmenities.tv;
          const origKitchen = !!origAmenities.kitchen;
          const origParking = !!origAmenities.parking;
          const origPool = !!origAmenities.pool;
          const origPetFriendly = !!origAmenities.petFriendly;
          const origWorkspace = !!origAmenities.dedicatedWorkspace;
          const origSelfCheckIn = !!origAmenities.selfCheckIn;
          const origFreeCancel = !!origAmenities.freeCancellation;
          const origBreakfast = !!origAmenities.breakfast;
          const origGym = !!origAmenities.gym;
          const origCustom = origAmenities.custom ?? [];
          const origShortDesc = origAmenities.shortDescription ?? "";
          const origState = origAmenities.state ?? "";
          const origCity = origAmenities.city ?? "";
          const origFullAddress = origAmenities.fullAddress ?? "";
          const origPropSize = origAmenities.propertySize ?? "";
          const origBeds = origAmenities.beds ? String(origAmenities.beds) : "";
          const origHouseRules = origAmenities.houseRules ?? "";
          const origHealthSafety = origAmenities.healthSafety ?? "";

          // Premium fields comparison
          const origPropCategory = origAmenities.propertyCategory ?? "Premium";
          const origGoogleMapsUrl = origAmenities.googleMapsUrl ?? "";
          const origVirtualTourUrl = origAmenities.virtualTourUrl ?? "";

          const origSmoking = !!origAmenities.policySmokingAllowed;
          const origPet = !!origAmenities.policyPetAllowed;
          const origChild = origAmenities.policyChildAllowed !== false;
          const origChildDesc = origAmenities.policyChildDescription ?? "";

          const origNearby = origAmenities.nearbyInfo ?? {};
          const currentNearby = {
            restaurants: form.nearbyRestaurants.length > 0 ? form.nearbyRestaurants : undefined,
            attractions: form.nearbyAttractions.length > 0 ? form.nearbyAttractions : undefined,
            transport: form.nearbyTransport.length > 0 ? form.nearbyTransport : undefined,
            hospitals: form.nearbyHospitals.length > 0 ? form.nearbyHospitals : undefined,
            shopping: form.nearbyShopping.length > 0 ? form.nearbyShopping : undefined,
          };

          const origHost = origAmenities.hostInfo ?? {};
          const currentHost = {
            name: form.hostName || undefined,
            photo: form.hostPhoto || undefined,
            description: form.hostDescription || undefined,
            isSuperhost: form.hostIsSuperhost,
          };

          const origPlans = origAmenities.roomPlans ?? {};
          const currentPlans = {
            roomOnly: form.planRoomOnly,
            freeBreakfast: form.planFreeBreakfast,
            halfBoard: form.planHalfBoard,
            allInclusive: form.planAllInclusive,
            customPlans: form.customPlans.length > 0 ? form.customPlans : undefined,
          };

          if (form.amenityWifi !== origWifi ||
              form.amenityAc !== origAc ||
              form.amenityTv !== origTv ||
              form.amenityKitchen !== origKitchen ||
              form.amenityParking !== origParking ||
              form.amenityPool !== origPool ||
              form.amenityPetFriendly !== origPetFriendly ||
              form.amenityDedicatedWorkspace !== origWorkspace ||
              form.amenitySelfCheckIn !== origSelfCheckIn ||
              form.amenityFreeCancellation !== origFreeCancel ||
              form.amenityBreakfast !== origBreakfast ||
              form.amenityGym !== origGym ||
              form.shortDescription !== origShortDesc ||
              form.state !== origState ||
              form.city !== origCity ||
              form.fullAddress !== origFullAddress ||
              form.propertySize !== origPropSize ||
              form.beds !== origBeds ||
              form.houseRules !== origHouseRules ||
              form.healthSafety !== origHealthSafety ||
              form.propertyCategory !== origPropCategory ||
              form.googleMapsUrl !== origGoogleMapsUrl ||
              form.virtualTourUrl !== origVirtualTourUrl ||
              form.policySmokingAllowed !== origSmoking ||
              form.policyPetAllowed !== origPet ||
              form.policyChildAllowed !== origChild ||
              form.policyChildDescription !== origChildDesc ||
              JSON.stringify(currentNearby) !== JSON.stringify(origNearby) ||
              JSON.stringify(currentHost) !== JSON.stringify(origHost) ||
              JSON.stringify(currentPlans) !== JSON.stringify(origPlans)) {
            isMajorChange = true;
          }

          if (JSON.stringify(form.customAmenities.slice().sort()) !== JSON.stringify(origCustom.slice().sort())) {
            isMajorChange = true;
          }

          const origRooms = origAmenities.bedroomDetails?.map(b => ({
            name: b.name,
            bedType: b.bedType,
            count: String(b.count),
            description: b.description ?? "",
            photos: b.photos ?? [],
            sizeSqFt: b.sizeSqFt ? String(b.sizeSqFt) : "",
            bathrooms: b.bathrooms ? String(b.bathrooms) : "1",
            occupancyCapacity: b.occupancyCapacity ? String(b.occupancyCapacity) : "2",
            amenities: b.amenities ?? [],
          })) ?? [];
          const validRooms = form.bedroomDetails.filter(b => b.name.trim() || Number(b.count) > 0);
          const currentRooms = validRooms.map(b => ({
            name: b.name,
            bedType: b.bedType,
            count: String(b.count),
            description: b.description || "",
            photos: b.photos || [],
            sizeSqFt: b.sizeSqFt ? String(b.sizeSqFt) : "",
            bathrooms: b.bathrooms ? String(b.bathrooms) : "1",
            occupancyCapacity: b.occupancyCapacity ? String(b.occupancyCapacity) : "2",
            amenities: b.amenities || [],
          }));
          if (JSON.stringify(currentRooms) !== JSON.stringify(origRooms)) {
            isMajorChange = true;
          }
        }

        if (section === "cars" || section === "cabs") {
          if (form.brand !== (originalData.brand ?? "") ||
              form.model !== (originalData.model ?? "") ||
              form.year !== (originalData.year ? String(originalData.year) : "") ||
              form.fuel_type !== (originalData.fuel_type ?? "") ||
              form.transmission !== (originalData.transmission ?? "") ||
              form.vehicle_type !== (originalData.vehicle_type ?? "") ||
              form.seating_capacity !== (originalData.seating_capacity ? String(originalData.seating_capacity) : "") ||
              form.mileage_limit !== (originalData.mileage_limit ? String(originalData.mileage_limit) : "")) {
            isMajorChange = true;
          }
        }

        if (section === "bikes") {
          if (form.brand !== (originalData.brand ?? "") ||
              form.model !== (originalData.model ?? "") ||
              form.year !== (originalData.year ? String(originalData.year) : "") ||
              form.engine_capacity !== (originalData.engine_capacity ? String(originalData.engine_capacity) : "") ||
              form.vehicle_type !== (originalData.vehicle_type ?? "") ||
              form.mileage_limit !== (originalData.mileage_limit ? String(originalData.mileage_limit) : "") ||
              form.helmet_included !== Boolean(originalData.helmet_included ?? true)) {
            isMajorChange = true;
          }
        }

        if (section === "experiences") {
          if (form.category !== (originalData.category ?? "") ||
              form.duration !== (originalData.duration ?? "") ||
              form.group_size !== (originalData.group_size ? String(originalData.group_size) : "") ||
              JSON.stringify(form.inclusions.filter(i => i.trim())) !== JSON.stringify(originalData.inclusions ?? []) ||
              JSON.stringify(form.exclusions.filter(e => e.trim())) !== JSON.stringify(originalData.exclusions ?? [])) {
            isMajorChange = true;
          }
        }
      }

      // Read rules from settings
      const isApproved = originalData?.approval_status === "approved";
      const reviewMinor = localStorage.getItem("review_minor_changes") === "true";
      const reviewMajor = localStorage.getItem("review_major_changes") !== "false"; // default true

      let triggerPending = false;
      if (!isApproved) {
        triggerPending = true;
      } else {
        if (isMajorChange && reviewMajor) {
          triggerPending = true;
        } else if (!isMajorChange && reviewMinor) {
          triggerPending = true;
        }
      }

        const d7 = form.discount7 ? Number(form.discount7) : 0;
        // Ensure 14-day >= 7-day and 30-day >= 14-day to satisfy DB check constraint
        const d14Raw = form.discount14 ? Number(form.discount14) : 0;
        const d30Raw = form.discount30 ? Number(form.discount30) : 0;
        const d14 = Math.max(d14Raw, d7);
        const d30 = Math.max(d30Raw, d14);

        const payload: Record<string, unknown> = {
          title: form.title,
          description: form.description || null,
          location: form.location,
          [priceField]: Number(form.price),
          availability_status: form.availability_status,
          images: form.images.length > 0 ? form.images : null,
          long_stay_discount_7: d7,
          long_stay_discount_14: d14,
          long_stay_discount_30: d30,
          discounts:
            discountConfig.hostDiscountPercent > 0 || discountConfig.coupons.length > 0
              ? discountConfig
              : null,
        };

      if (triggerPending) {
        payload.approval_status = 'pending';
        payload.rejection_reason = null;
        payload.marketplace_requested = true;
        payload.marketplace_visible = false;
        payload.submitted_for_review_at = new Date().toISOString();
      }

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
          description: b.description || undefined,
          photos: b.photos.length > 0 ? b.photos : undefined,
          sizeSqFt: b.sizeSqFt ? Number(b.sizeSqFt) : undefined,
          bathrooms: b.bathrooms ? Number(b.bathrooms) : undefined,
          occupancyCapacity: b.occupancyCapacity ? Number(b.occupancyCapacity) : undefined,
          amenities: b.amenities.length > 0 ? b.amenities : undefined,
        }));
        if (form.roomImages.length) richAmenities.roomImages = form.roomImages;
        if (form.weeklyPrice) richAmenities.weeklyPrice = Number(form.weeklyPrice);
        if (form.monthlyPrice) richAmenities.monthlyPrice = Number(form.monthlyPrice);
        if (form.cleaningFee) richAmenities.cleaningFee = Number(form.cleaningFee);
        if (form.securityDeposit) richAmenities.securityDeposit = Number(form.securityDeposit);

        // Premium fields
        if (form.propertyCategory) richAmenities.propertyCategory = form.propertyCategory;
        if (form.googleMapsUrl) richAmenities.googleMapsUrl = form.googleMapsUrl;
        if (form.videos.length) richAmenities.videos = form.videos;
        if (form.virtualTourUrl) richAmenities.virtualTourUrl = form.virtualTourUrl;

        // Room plans
        richAmenities.roomPlans = {
          roomOnly: form.planRoomOnly,
          freeBreakfast: form.planFreeBreakfast,
          halfBoard: form.planHalfBoard,
          allInclusive: form.planAllInclusive,
          customPlans: form.customPlans.length > 0 ? form.customPlans : undefined,
        };

        // Detailed pricing additions
        if (form.originalPrice) richAmenities.originalPrice = Number(form.originalPrice);
        if (form.discountedPrice) richAmenities.discountedPrice = Number(form.discountedPrice);
        if (form.dailyPrice) richAmenities.dailyPrice = Number(form.dailyPrice);
        if (form.taxesAndFees) richAmenities.taxesAndFees = Number(form.taxesAndFees);
        if (form.offerPercentage) richAmenities.offerPercentage = Number(form.offerPercentage);
        richAmenities.bookAtZero = form.bookAtZero;

        // Policies
        richAmenities.policySmokingAllowed = form.policySmokingAllowed;
        richAmenities.policyPetAllowed = form.policyPetAllowed;
        richAmenities.policyChildAllowed = form.policyChildAllowed;
        if (form.policyChildDescription) richAmenities.policyChildDescription = form.policyChildDescription;

        // Nearby Info
        richAmenities.nearbyInfo = {
          restaurants: form.nearbyRestaurants.length > 0 ? form.nearbyRestaurants : undefined,
          attractions: form.nearbyAttractions.length > 0 ? form.nearbyAttractions : undefined,
          transport: form.nearbyTransport.length > 0 ? form.nearbyTransport : undefined,
          hospitals: form.nearbyHospitals.length > 0 ? form.nearbyHospitals : undefined,
          shopping: form.nearbyShopping.length > 0 ? form.nearbyShopping : undefined,
        };

        // Host Info
        richAmenities.hostInfo = {
          name: form.hostName || undefined,
          photo: form.hostPhoto || undefined,
          description: form.hostDescription || undefined,
          isSuperhost: form.hostIsSuperhost,
        };

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
      if (triggerPending && isApproved) {
        toast.success(`${sectionLabel} updated. Changes require admin approval before going live.`);
      } else {
        toast.success(`${sectionLabel} updated successfully.`);
      }
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
              
              {(section === "stays" || section === "hotels" || section === "resorts") && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Property Category</Label>
                    <Select value={form.propertyCategory} onValueChange={v => set('propertyCategory', v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {['Budget', 'Luxury', 'Premium', 'Heritage', 'Standard'].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
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
                      <SelectContent>
                        {propertyTypes.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
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
                  <div>
                    <Label>Google Maps Link</Label>
                    <Input value={form.googleMapsUrl} onChange={e => set("googleMapsUrl", e.target.value)} placeholder="https://maps.google.com/?q=..." />
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

              {/* Videos & Virtual Tour */}
              <Card>
                <CardHeader><CardTitle>Videos & Virtual Tours</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="virtualTourUrl">Virtual Tour URL</Label>
                    <Input
                      id="virtualTourUrl"
                      value={form.virtualTourUrl}
                      onChange={e => set("virtualTourUrl", e.target.value)}
                      placeholder="https://my.matterport.com/show/?m=..."
                    />
                  </div>
                  <div>
                    <Label>Video Links</Label>
                    <div className="flex gap-2 mt-1">
                      <Input
                        value={form.videoInput}
                        onChange={e => set("videoInput", e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            const val = form.videoInput.trim();
                            if (val && !form.videos.includes(val)) {
                              setForm(p => ({ ...p, videos: [...p.videos, val], videoInput: '' }));
                            }
                          }
                        }}
                        placeholder="https://youtube.com/watch?v=... or MP4 URL"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          const val = form.videoInput.trim();
                          if (val && !form.videos.includes(val)) {
                            setForm(p => ({ ...p, videos: [...p.videos, val], videoInput: '' }));
                          }
                        }}
                        className="shrink-0"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    {form.videos.length > 0 && (
                      <div className="space-y-2 mt-2">
                        {form.videos.map((vid, idx) => (
                          <div key={idx} className="flex items-center justify-between bg-secondary/50 rounded px-3 py-1.5 text-xs">
                            <span className="truncate flex-1 mr-2">{vid}</span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-muted-foreground hover:text-destructive shrink-0"
                              onClick={() => setForm(p => ({ ...p, videos: p.videos.filter((_, i) => i !== idx) }))}
                            >
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
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
                  <CardTitle>Room Options & Details</CardTitle>
                  <Button type="button" variant="outline" size="sm" onClick={() => setForm(p => ({ ...p, bedroomDetails: [...p.bedroomDetails, emptyBedroom()] }))}>
                    <Plus className="h-3.5 w-3.5 mr-1" /> Add Room Option
                  </Button>
                </CardHeader>
                <CardContent className="space-y-3">
                  {form.bedroomDetails.map((b, i) => (
                    <div key={i} className="p-4 rounded-lg border border-border space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold">Room Option #{i + 1}</span>
                        {form.bedroomDetails.length > 1 && (
                          <Button type="button" variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10" onClick={() => setForm(p => ({ ...p, bedroomDetails: p.bedroomDetails.filter((_, idx) => idx !== i) }))}>
                            Remove Room
                          </Button>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs">Room Name / Type</Label>
                          <Input value={b.name} onChange={e => updateBedroom(i, 'name', e.target.value)} placeholder="e.g. Deluxe Suite" className="h-8 text-sm" />
                        </div>
                        <div>
                          <Label className="text-xs">Room Description</Label>
                          <Input value={b.description} onChange={e => updateBedroom(i, 'description', e.target.value)} placeholder="e.g. Spacious suite" className="h-8 text-sm" />
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <Label className="text-xs">Bed Type</Label>
                          <Select value={b.bedType} onValueChange={v => updateBedroom(i, 'bedType', v)}>
                            <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                            <SelectContent>{bedTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs">Number of Beds</Label>
                          <Input type="number" min={1} value={b.count} onChange={e => updateBedroom(i, 'count', e.target.value)} className="h-8 text-sm" />
                        </div>
                        <div>
                          <Label className="text-xs">Number of Bathrooms</Label>
                          <Input type="number" min={0} value={b.bathrooms} onChange={e => updateBedroom(i, 'bathrooms', e.target.value)} className="h-8 text-sm" />
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <Label className="text-xs">Room Size (sq ft)</Label>
                          <Input type="number" min={1} value={b.sizeSqFt} onChange={e => updateBedroom(i, 'sizeSqFt', e.target.value)} placeholder="e.g. 450" className="h-8 text-sm" />
                        </div>
                        <div>
                          <Label className="text-xs">Occupancy Capacity</Label>
                          <Input type="number" min={1} value={b.occupancyCapacity} onChange={e => updateBedroom(i, 'occupancyCapacity', e.target.value)} className="h-8 text-sm" />
                        </div>
                        <div>
                          <Label className="text-xs">Room Amenities</Label>
                          <div className="flex gap-1 mt-1">
                            <Input
                              value={b.amenityInput}
                              onChange={e => updateBedroom(i, 'amenityInput', e.target.value)}
                              placeholder="e.g. Mini-fridge, Balcony"
                              className="h-8 text-sm"
                              onKeyDown={e => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  const val = b.amenityInput.trim();
                                  if (val && !b.amenities.includes(val)) {
                                    setForm(p => ({
                                      ...p,
                                      bedroomDetails: p.bedroomDetails.map((rm, idx) =>
                                        idx === i ? { ...rm, amenities: [...rm.amenities, val], amenityInput: '' } : rm
                                      )
                                    }));
                                  }
                                }
                              }}
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const val = b.amenityInput.trim();
                                if (val && !b.amenities.includes(val)) {
                                  setForm(p => ({
                                    ...p,
                                    bedroomDetails: p.bedroomDetails.map((rm, idx) =>
                                      idx === i ? { ...rm, amenities: [...rm.amenities, val], amenityInput: '' } : rm
                                    )
                                  }));
                                }
                              }}
                              className="h-8 px-2"
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                          {b.amenities && b.amenities.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {b.amenities.map((amenity, idx) => (
                                <span key={idx} className="inline-flex items-center bg-secondary/80 text-[10px] rounded px-1.5 py-0.5">
                                  {amenity}
                                  <button
                                    type="button"
                                    className="ml-1 text-muted-foreground hover:text-destructive"
                                    onClick={() => setForm(p => ({
                                      ...p,
                                      bedroomDetails: p.bedroomDetails.map((rm, idx2) =>
                                        idx2 === i ? { ...rm, amenities: rm.amenities.filter((_, aIdx) => aIdx !== idx) } : rm
                                      )
                                    }))}
                                  >
                                    &times;
                                  </button>
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs">Room Photo URLs (one per line)</Label>
                        <Textarea
                          value={b.photos.join('\n')}
                          onChange={e => updateBedroom(i, 'photos', e.target.value.split('\n').filter(Boolean))}
                          placeholder="https://images.unsplash.com/...&#10;https://images.unsplash.com/..."
                          rows={2}
                          className="text-xs"
                        />
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Policies */}
              <Card>
                <CardHeader><CardTitle>Policies</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="checkin">Check-in Time</Label>
                      <Input id="checkin" type="time" value={form.check_in_time} onChange={e => set("check_in_time", e.target.value)} />
                    </div>
                    <div>
                      <Label htmlFor="checkout">Check-out Time</Label>
                      <Input id="checkout" type="time" value={form.check_out_time} onChange={e => set("check_out_time", e.target.value)} />
                    </div>
                  </div>
                  <div>
                    <Label>Cancellation Policy</Label>
                    <Select value={form.cancellation_policy} onValueChange={v => set('cancellation_policy', v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="flexible">Flexible — free cancellation up to 24 hrs</SelectItem>
                        <SelectItem value="moderate">Moderate — free cancellation up to 5 days</SelectItem>
                        <SelectItem value="strict">Strict — no refunds after 48 hrs</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-3 gap-2 py-2 border-y border-border">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <Checkbox checked={form.policySmokingAllowed} onCheckedChange={v => set('policySmokingAllowed', !!v)} />
                      <span className="text-xs">Smoking Allowed</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <Checkbox checked={form.policyPetAllowed} onCheckedChange={v => set('policyPetAllowed', !!v)} />
                      <span className="text-xs">Pets Allowed</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <Checkbox checked={form.policyChildAllowed} onCheckedChange={v => set('policyChildAllowed', !!v)} />
                      <span className="text-xs">Children Allowed</span>
                    </label>
                  </div>

                  <div>
                    <Label htmlFor="policyChildDescription">Child Policy Details</Label>
                    <Input id="policyChildDescription" value={form.policyChildDescription} onChange={e => set('policyChildDescription', e.target.value)} placeholder="e.g. Free stay for children below 5 years" />
                  </div>

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

              {/* Nearby Attractions & Services */}
              <Card>
                <CardHeader><CardTitle>Nearby Attractions & Services</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  {/* Nearby Restaurants */}
                  <div>
                    <Label className="text-xs font-semibold">Restaurants & Cafes</Label>
                    <div className="flex gap-2 mt-1">
                      <Input
                        value={form.nearbyRestaurantsInput}
                        onChange={e => set('nearbyRestaurantsInput', e.target.value)}
                        placeholder="e.g. Cafe Live (0.5 km)"
                        className="h-8 text-sm"
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            const val = form.nearbyRestaurantsInput.trim();
                            if (val && !form.nearbyRestaurants.includes(val)) {
                              setForm(p => ({ ...p, nearbyRestaurants: [...p.nearbyRestaurants, val], nearbyRestaurantsInput: '' }));
                            }
                          }
                        }}
                      />
                      <Button type="button" variant="outline" size="sm" onClick={() => {
                        const val = form.nearbyRestaurantsInput.trim();
                        if (val && !form.nearbyRestaurants.includes(val)) {
                          setForm(p => ({ ...p, nearbyRestaurants: [...p.nearbyRestaurants, val], nearbyRestaurantsInput: '' }));
                        }
                      }} className="h-8">Add</Button>
                    </div>
                    {form.nearbyRestaurants.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {form.nearbyRestaurants.map((item, idx) => (
                          <span key={idx} className="inline-flex items-center gap-1 bg-secondary text-xs rounded-full px-2.5 py-0.5">
                            {item}
                            <button type="button" onClick={() => setForm(p => ({ ...p, nearbyRestaurants: p.nearbyRestaurants.filter((_, i) => i !== idx) }))} className="text-muted-foreground hover:text-destructive ml-1">&times;</button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Nearby Attractions */}
                  <div>
                    <Label className="text-xs font-semibold">Attractions</Label>
                    <div className="flex gap-2 mt-1">
                      <Input
                        value={form.nearbyAttractionsInput}
                        onChange={e => set('nearbyAttractionsInput', e.target.value)}
                        placeholder="e.g. Mall Road (2 km)"
                        className="h-8 text-sm"
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            const val = form.nearbyAttractionsInput.trim();
                            if (val && !form.nearbyAttractions.includes(val)) {
                              setForm(p => ({ ...p, nearbyAttractions: [...p.nearbyAttractions, val], nearbyAttractionsInput: '' }));
                            }
                          }
                        }}
                      />
                      <Button type="button" variant="outline" size="sm" onClick={() => {
                        const val = form.nearbyAttractionsInput.trim();
                        if (val && !form.nearbyAttractions.includes(val)) {
                          setForm(p => ({ ...p, nearbyAttractions: [...p.nearbyAttractions, val], nearbyAttractionsInput: '' }));
                        }
                      }} className="h-8">Add</Button>
                    </div>
                    {form.nearbyAttractions.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {form.nearbyAttractions.map((item, idx) => (
                          <span key={idx} className="inline-flex items-center gap-1 bg-secondary text-xs rounded-full px-2.5 py-0.5">
                            {item}
                            <button type="button" onClick={() => setForm(p => ({ ...p, nearbyAttractions: p.nearbyAttractions.filter((_, i) => i !== idx) }))} className="text-muted-foreground hover:text-destructive ml-1">&times;</button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Nearby Transport */}
                  <div>
                    <Label className="text-xs font-semibold">Transport Stations</Label>
                    <div className="flex gap-2 mt-1">
                      <Input
                        value={form.nearbyTransportInput}
                        onChange={e => set('nearbyTransportInput', e.target.value)}
                        placeholder="e.g. Bus Stand (1.8 km)"
                        className="h-8 text-sm"
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            const val = form.nearbyTransportInput.trim();
                            if (val && !form.nearbyTransport.includes(val)) {
                              setForm(p => ({ ...p, nearbyTransport: [...p.nearbyTransport, val], nearbyTransportInput: '' }));
                            }
                          }
                        }}
                      />
                      <Button type="button" variant="outline" size="sm" onClick={() => {
                        const val = form.nearbyTransportInput.trim();
                        if (val && !form.nearbyTransport.includes(val)) {
                          setForm(p => ({ ...p, nearbyTransport: [...p.nearbyTransport, val], nearbyTransportInput: '' }));
                        }
                      }} className="h-8">Add</Button>
                    </div>
                    {form.nearbyTransport.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {form.nearbyTransport.map((item, idx) => (
                          <span key={idx} className="inline-flex items-center gap-1 bg-secondary text-xs rounded-full px-2.5 py-0.5">
                            {item}
                            <button type="button" onClick={() => setForm(p => ({ ...p, nearbyTransport: p.nearbyTransport.filter((_, i) => i !== idx) }))} className="text-muted-foreground hover:text-destructive ml-1">&times;</button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Nearby Hospitals */}
                  <div>
                    <Label className="text-xs font-semibold">Hospitals & Medical Care</Label>
                    <div className="flex gap-2 mt-1">
                      <Input
                        value={form.nearbyHospitalsInput}
                        onChange={e => set('nearbyHospitalsInput', e.target.value)}
                        placeholder="e.g. City Hospital (3.5 km)"
                        className="h-8 text-sm"
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            const val = form.nearbyHospitalsInput.trim();
                            if (val && !form.nearbyHospitals.includes(val)) {
                              setForm(p => ({ ...p, nearbyHospitals: [...p.nearbyHospitals, val], nearbyHospitalsInput: '' }));
                            }
                          }
                        }}
                      />
                      <Button type="button" variant="outline" size="sm" onClick={() => {
                        const val = form.nearbyHospitalsInput.trim();
                        if (val && !form.nearbyHospitals.includes(val)) {
                          setForm(p => ({ ...p, nearbyHospitals: [...p.nearbyHospitals, val], nearbyHospitalsInput: '' }));
                        }
                      }} className="h-8">Add</Button>
                    </div>
                    {form.nearbyHospitals.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {form.nearbyHospitals.map((item, idx) => (
                          <span key={idx} className="inline-flex items-center gap-1 bg-secondary text-xs rounded-full px-2.5 py-0.5">
                            {item}
                            <button type="button" onClick={() => setForm(p => ({ ...p, nearbyHospitals: p.nearbyHospitals.filter((_, i) => i !== idx) }))} className="text-muted-foreground hover:text-destructive ml-1">&times;</button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Host Information */}
              <Card>
                <CardHeader><CardTitle>Host Information</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="hostName">Host Display Name</Label>
                      <Input id="hostName" value={form.hostName} onChange={e => set('hostName', e.target.value)} placeholder="e.g. John Doe" />
                    </div>
                    <div>
                      <Label htmlFor="hostPhoto">Host Photo URL</Label>
                      <Input id="hostPhoto" value={form.hostPhoto} onChange={e => set('hostPhoto', e.target.value)} placeholder="https://..." />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox id="hostIsSuperhost" checked={form.hostIsSuperhost} onCheckedChange={v => set('hostIsSuperhost', !!v)} />
                    <Label htmlFor="hostIsSuperhost" className="text-xs font-semibold cursor-pointer">Mark as Superhost</Label>
                  </div>
                  <div>
                    <Label htmlFor="hostDescription">Host Description</Label>
                    <Textarea id="hostDescription" value={form.hostDescription} onChange={e => set('hostDescription', e.target.value)} placeholder="A short bio..." rows={3} />
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
          {(section === "stays" || section === "hotels" || section === "resorts") && (
            <Card>
              <CardHeader><CardTitle>Room Plans Selection</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox checked={form.planRoomOnly} onCheckedChange={v => set('planRoomOnly', !!v)} />
                  <span className="text-sm">Room Only</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox checked={form.planFreeBreakfast} onCheckedChange={v => set('planFreeBreakfast', !!v)} />
                  <span className="text-sm">Free Breakfast</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox checked={form.planHalfBoard} onCheckedChange={v => set('planHalfBoard', !!v)} />
                  <span className="text-sm">Half Board (Breakfast + Dinner)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox checked={form.planAllInclusive} onCheckedChange={v => set('planAllInclusive', !!v)} />
                  <span className="text-sm">All Inclusive</span>
                </label>

                <div className="pt-2 border-t border-border">
                  <Label className="text-xs">Custom Meal / Room Plans</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      value={form.customPlanInput}
                      onChange={e => set('customPlanInput', e.target.value)}
                      placeholder="e.g. Spa package"
                      className="h-8 text-sm"
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          const val = form.customPlanInput.trim();
                          if (val && !form.customPlans.includes(val)) {
                            setForm(p => ({ ...p, customPlans: [...p.customPlans, val], customPlanInput: '' }));
                          }
                        }
                      }}
                    />
                    <Button type="button" variant="outline" size="sm" onClick={() => {
                      const val = form.customPlanInput.trim();
                      if (val && !form.customPlans.includes(val)) {
                        setForm(p => ({ ...p, customPlans: [...p.customPlans, val], customPlanInput: '' }));
                      }
                    }} className="h-8">Add</Button>
                  </div>
                  {form.customPlans.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {form.customPlans.map((item, idx) => (
                        <span key={idx} className="inline-flex items-center gap-1 bg-secondary text-xs rounded-full px-2 py-0.5">
                          {item}
                          <button type="button" onClick={() => setForm(p => ({ ...p, customPlans: p.customPlans.filter((_, i) => i !== idx) }))} className="text-muted-foreground hover:text-destructive ml-1">&times;</button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader><CardTitle>Pricing (₹)</CardTitle></CardHeader>
            <CardContent>
              <div>
                <Label>Price per {section === "stays" || section === "hotels" || section === "resorts" ? "Night" : section === "experiences" ? "Person" : "Day"} *</Label>
                <Input type="number" value={form.price} onChange={(e) => set("price", e.target.value)} placeholder="e.g. 2500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Long Stay Pricing Rules</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>7+ Days Discount (%)</Label>
                <Input type="number" min={0} max={90} value={form.discount7} onChange={(e) => set("discount7", e.target.value)} placeholder="e.g. 20" />
              </div>
              <div>
                <Label>14+ Days Discount (%)</Label>
                <Input type="number" min={0} max={90} value={form.discount14} onChange={(e) => set("discount14", e.target.value)} placeholder="e.g. 25" />
                {form.discount14 && form.discount7 && Number(form.discount14) < Number(form.discount7) && (
                  <p className="text-xs text-destructive mt-1">⚠ Must be ≥ 7-day discount ({form.discount7}%). Will be auto-corrected on save.</p>
                )}
              </div>
              <div>
                <Label>30+ Days Discount (%)</Label>
                <Input type="number" min={0} max={90} value={form.discount30} onChange={(e) => set("discount30", e.target.value)} placeholder="e.g. 30" />
                {form.discount30 && form.discount14 && Number(form.discount30) < Number(form.discount14) && (
                  <p className="text-xs text-destructive mt-1">⚠ Must be ≥ 14-day discount ({form.discount14}%). Will be auto-corrected on save.</p>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Each tier discount must be ≥ the previous (30-day ≥ 14-day ≥ 7-day). Values are auto-corrected on save.
              </p>
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
