import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, ImagePlus, Minus, Plus, Save, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { createDiscountConfig, parseListingDiscountConfig } from "@/lib/discounts";
import { toast } from "sonner";

type Section = "stays" | "hotels" | "resorts" | "cars" | "bikes" | "experiences";

const tableMap: Record<Section, string> = {
  stays: "stays",
  hotels: "hotels",
  resorts: "resorts",
  cars: "cars",
  bikes: "bikes",
  experiences: "experiences",
};

const priceFieldMap: Record<Section, "price_per_night" | "price_per_day" | "price_per_person"> = {
  stays: "price_per_night",
  hotels: "price_per_night",
  resorts: "price_per_night",
  cars: "price_per_day",
  bikes: "price_per_day",
  experiences: "price_per_person",
};

const extraSelectMap: Record<Section, string> = {
  stays:
    "max_guests,bedrooms,bathrooms,property_type,check_in_time,check_out_time,cancellation_policy",
  hotels:
    "max_guests,bedrooms,bathrooms,property_type,check_in_time,check_out_time,cancellation_policy",
  resorts:
    "max_guests,bedrooms,bathrooms,property_type,check_in_time,check_out_time,cancellation_policy",
  cars: "brand,model,year,fuel_type,transmission,vehicle_type,seating_capacity,mileage_limit",
  bikes: "brand,model,year,engine_capacity,vehicle_type,mileage_limit,helmet_included",
  experiences: "category,duration,group_size,inclusions,exclusions",
};

const propertyTypes = ["Villa", "Apartment", "Cottage", "Homestay", "Farmhouse", "Treehouse", "Houseboat", "Hotel", "Boutique Hotel", "Business Hotel", "Suite Hotel", "Heritage Hotel", "Resort", "Beach Resort", "Mountain Resort", "Spa Resort", "Eco Resort"];
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
    imageInput: "",
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
      }));
      setIsLoading(false);
    };

    void loadListing();
  }, [listingId, navigate, section, user]);

  const set = (key: string, value: string | boolean | string[]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleAddImage = () => {
    const next = form.imageInput.trim();
    if (!next) return;
    setForm((prev) => ({ ...prev, images: [...prev.images, next], imageInput: "" }));
  };

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
      const discountConfig = createDiscountConfig(Number(form.hostDiscountPercent || 0), []);

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
      };

      if (section === "stays" || section === "hotels" || section === "resorts") {
        payload.max_guests = form.max_guests ? Number(form.max_guests) : null;
        payload.bedrooms = form.bedrooms ? Number(form.bedrooms) : null;
        payload.bathrooms = form.bathrooms ? Number(form.bathrooms) : null;
        payload.property_type = form.property_type || null;
        payload.check_in_time = form.check_in_time || null;
        payload.check_out_time = form.check_out_time || null;
        payload.cancellation_policy = form.cancellation_policy || null;
      }

      if (section === "cars") {
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

          {section === "cars" && (
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

          <Card>
            <CardHeader><CardTitle>Images</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input value={form.imageInput} onChange={(e) => set("imageInput", e.target.value)} placeholder="Paste image URL..." className="flex-1" />
                <Button type="button" variant="outline" onClick={handleAddImage}><ImagePlus className="h-4 w-4 mr-1" />Add</Button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {form.images.map((img, i) => (
                  <div key={i} className="relative group rounded-lg overflow-hidden border border-border aspect-video">
                    <img src={img} alt="" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => set("images", form.images.filter((_, index) => index !== i))}
                      className="absolute top-1 right-1 h-6 w-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Pricing & Settings</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Price *</Label>
                <Input type="number" value={form.price} onChange={(e) => set("price", e.target.value)} />
              </div>
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
              <div>
                <Label>Host Discount (%)</Label>
                <Input
                  type="number"
                  min={0}
                  max={90}
                  value={form.hostDiscountPercent}
                  onChange={(e) => set("hostDiscountPercent", e.target.value)}
                />
              </div>
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
