import { useEffect, useState } from "react";
import { Plus, Trash2, Pencil, Check } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type ListingTypeOption = "stays" | "hotels" | "resorts" | "cars" | "bikes" | "experiences";

interface HostCoupon {
  id: string;
  code: string;
  discount_percent: number | null;
  discount_type: "percentage" | "flat";
  discount_value: number;
  listing_types: ListingTypeOption[];
  is_active: boolean;
  is_enabled: boolean;
  starts_at: string | null;
  ends_at: string | null;
  expires_at: string | null;
  usage_limit: number | null;
  used_count: number;
  one_time_per_user: boolean;
  listing_id: string | null;
  listing_type: string | null;
}

interface HostListing {
  id: string;
  title: string;
  type: string;
}

const listingTypeOptions: ListingTypeOption[] = ["stays", "hotels", "resorts", "cars", "bikes", "experiences"];

export default function HostCoupons() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [coupons, setCoupons] = useState<HostCoupon[]>([]);
  const [hostListings, setHostListings] = useState<HostListing[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [form, setForm] = useState({
    code: "",
    discount_type: "percentage" as "percentage" | "flat",
    discount_value: "",
    listing_types: [] as ListingTypeOption[],
    is_enabled: true,
    starts_at: "",
    expires_at: "",
    usage_limit: "",
    one_time_per_user: false,
    listing_id: "global",
  });

  const loadCoupons = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("host_coupons" as any)
      .select("id,code,discount_percent,discount_type,discount_value,listing_types,is_active,is_enabled,starts_at,ends_at,expires_at,usage_limit,used_count,one_time_per_user,listing_id,listing_type")
      .eq("host_id", user.id)
      .order("created_at", { ascending: false });
    setLoading(false);
    if (error) {
      toast.error("Failed to load coupons.");
      return;
    }
    setCoupons((data ?? []) as HostCoupon[]);
  };

  const loadHostListings = async () => {
    if (!user) return;
    try {
      const tables = ["stays", "hotels", "resorts", "cars", "bikes", "experiences"];
      const queries = tables.map(async (table) => {
        const { data, error } = await supabase
          .from(table as any)
          .select("id, title")
          .eq("host_id", user.id)
          .eq("availability_status", true);
        if (error) {
          console.error(`Error loading listings for ${table}:`, error);
          return [];
        }
        return (data || []).map((item: any) => ({
          id: String(item.id),
          title: String(item.title),
          type: table,
        }));
      });
      const results = await Promise.all(queries);
      setHostListings(results.flat());
    } catch (err) {
      console.error("Error loading host listings:", err);
    }
  };

  useEffect(() => {
    void loadCoupons();
    void loadHostListings();
  }, [user]);

  const resetForm = () => {
    setForm({
      code: "",
      discount_type: "percentage",
      discount_value: "",
      listing_types: [],
      is_enabled: true,
      starts_at: "",
      expires_at: "",
      usage_limit: "",
      one_time_per_user: false,
      listing_id: "global",
    });
    setEditingId(null);
  };

  const toggleListingType = (type: ListingTypeOption) => {
    setForm((prev) => ({
      ...prev,
      listing_types: prev.listing_types.includes(type)
        ? prev.listing_types.filter((item) => item !== type)
        : [...prev.listing_types, type],
    }));
  };

  const handleSave = async () => {
    if (!user) return;
    const code = form.code.trim().toUpperCase();
    const discountValue = Number(form.discount_value);

    if (!code) return toast.error("Coupon code is required.");
    if (!Number.isFinite(discountValue) || discountValue <= 0) {
      return toast.error("Discount value must be a positive number.");
    }
    if (form.discount_type === "percentage" && discountValue > 90) {
      return toast.error("Percentage discount cannot exceed 90%.");
    }

    let selectedListingId: string | null = null;
    let selectedListingType: string | null = null;
    let finalListingTypes = [...form.listing_types];

    if (form.listing_id !== "global") {
      const match = hostListings.find((l) => l.id === form.listing_id);
      if (match) {
        selectedListingId = match.id;
        selectedListingType = match.type;
        finalListingTypes = [match.type as ListingTypeOption];
      }
    } else {
      if (finalListingTypes.length === 0) {
        return toast.error("Select at least one listing type.");
      }
    }

    setSaving(true);
    const payload = {
      host_id: user.id,
      code,
      discount_type: form.discount_type,
      discount_value: discountValue,
      discount_percent: form.discount_type === "percentage" ? Math.round(discountValue) : null,
      listing_types: finalListingTypes,
      is_enabled: form.is_enabled,
      is_active: form.is_enabled,
      starts_at: form.starts_at ? new Date(form.starts_at).toISOString() : null,
      ends_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
      expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
      usage_limit: form.usage_limit ? Number(form.usage_limit) : null,
      one_time_per_user: form.one_time_per_user,
      listing_id: selectedListingId,
      listing_type: selectedListingType,
    };

    const query = editingId
      ? supabase.from("host_coupons" as any).update(payload).eq("id", editingId).eq("host_id", user.id)
      : supabase.from("host_coupons" as any).insert(payload);

    const { error } = await query;
    setSaving(false);
    if (error) {
      toast.error(error.message || "Failed to save coupon.");
      return;
    }

    toast.success(editingId ? "Coupon updated." : "Coupon created.");
    resetForm();
    void loadCoupons();
  };

  const handleDelete = async (id: string) => {
    if (!user) return;
    const { error } = await supabase.from("host_coupons" as any).delete().eq("id", id).eq("host_id", user.id);
    if (error) {
      toast.error("Failed to delete coupon.");
      return;
    }
    toast.success("Coupon deleted.");
    void loadCoupons();
  };

  const startEdit = (coupon: HostCoupon) => {
    setEditingId(coupon.id);
    setForm({
      code: coupon.code,
      discount_type: coupon.discount_type || "percentage",
      discount_value: String(coupon.discount_value || coupon.discount_percent || ""),
      listing_types: coupon.listing_types ?? [],
      is_enabled: coupon.is_enabled ?? coupon.is_active,
      starts_at: coupon.starts_at ? coupon.starts_at.slice(0, 16) : "",
      expires_at: coupon.expires_at ? coupon.expires_at.slice(0, 16) : coupon.ends_at ? coupon.ends_at.slice(0, 16) : "",
      usage_limit: coupon.usage_limit ? String(coupon.usage_limit) : "",
      one_time_per_user: Boolean(coupon.one_time_per_user),
      listing_id: coupon.listing_id || "global",
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Coupon Codes</h1>
        <p className="text-muted-foreground mt-1">Create and manage host-level coupons by listing type.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{editingId ? "Edit Coupon" : "Create Coupon"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Coupon Code</Label>
              <Input value={form.code} onChange={(e) => setForm((p) => ({ ...p, code: e.target.value.toUpperCase() }))} placeholder="SUMMER20" />
            </div>
            <div>
              <Label>Applicable Listing</Label>
              <Select value={form.listing_id} onValueChange={(v) => setForm((p) => ({ ...p, listing_id: v }))}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a listing (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="global">Global (All Listings)</SelectItem>
                  {hostListings.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      <span className="capitalize font-semibold text-muted-foreground mr-1">[{l.type}]</span> {l.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Discount Type</Label>
              <Select value={form.discount_type} onValueChange={(v: "percentage" | "flat") => setForm((p) => ({ ...p, discount_type: v }))}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Discount Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">Percentage (%)</SelectItem>
                  <SelectItem value="flat">Flat Amount (INR)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Discount Value ({form.discount_type === "percentage" ? "%" : "INR"})</Label>
              <Input type="number" min={1} value={form.discount_value} onChange={(e) => setForm((p) => ({ ...p, discount_value: e.target.value }))} placeholder={form.discount_type === "percentage" ? "20" : "200"} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Valid From</Label>
              <Input type="datetime-local" value={form.starts_at} onChange={(e) => setForm((p) => ({ ...p, starts_at: e.target.value }))} />
            </div>
            <div>
              <Label>Valid Until</Label>
              <Input type="datetime-local" value={form.expires_at} onChange={(e) => setForm((p) => ({ ...p, expires_at: e.target.value }))} />
            </div>
            <div>
              <Label>Usage Limit (optional)</Label>
              <Input type="number" min={1} value={form.usage_limit} onChange={(e) => setForm((p) => ({ ...p, usage_limit: e.target.value }))} placeholder="e.g. 100" />
            </div>
          </div>

          {form.listing_id === "global" ? (
            <div>
              <Label className="mb-2 block">Applicable Listing Types</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {listingTypeOptions.map((type) => {
                  const selected = form.listing_types.includes(type);
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => toggleListingType(type)}
                      className={`rounded-lg border px-3 py-2 text-sm text-left ${selected ? "border-primary bg-primary/10 text-primary" : "border-border"}`}
                    >
                      {type}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="text-xs text-muted-foreground p-3 bg-muted/30 rounded-lg">
              Applicable listing type is automatically set based on the selected listing.
            </div>
          )}

          <div className="flex items-center justify-between">
            <Label>Enable (Active)</Label>
            <Switch checked={form.is_enabled} onCheckedChange={(v) => setForm((p) => ({ ...p, is_enabled: v }))} />
          </div>
          <div className="flex items-center justify-between">
            <Label>One-time per user</Label>
            <Switch checked={form.one_time_per_user} onCheckedChange={(v) => setForm((p) => ({ ...p, one_time_per_user: v }))} />
          </div>

          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={saving}>
              {editingId ? <Check className="h-4 w-4 mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
              {editingId ? "Update Coupon" : "Create Coupon"}
            </Button>
            {editingId ? (
              <Button variant="outline" onClick={resetForm}>Cancel</Button>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Existing Coupons</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? <p className="text-sm text-muted-foreground">Loading coupons...</p> : null}
          {!loading && coupons.length === 0 ? <p className="text-sm text-muted-foreground">No coupons created yet.</p> : null}
          {coupons.map((coupon) => {
            const attachedListing = hostListings.find((l) => l.id === coupon.listing_id);
            const isCouponEnabled = coupon.is_enabled ?? coupon.is_active;
            return (
              <div key={coupon.id} className="rounded-lg border border-border p-3 flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold">
                    {coupon.code} - {coupon.discount_type === "flat" ? "₹" : ""}{coupon.discount_value || coupon.discount_percent}{coupon.discount_type === "percentage" || !coupon.discount_type ? "%" : ""} off
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Scope: {coupon.listing_id ? (
                      <span className="text-primary font-medium">
                        Valid only for [{attachedListing?.type || coupon.listing_type}] {attachedListing?.title || `Listing (ID: ${coupon.listing_id.substring(0,8)})`}
                      </span>
                    ) : (
                      <span>Global (Types: {coupon.listing_types.join(", ") || "-"})</span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">Status: {isCouponEnabled ? "Enabled" : "Disabled"}</p>
                  <p className="text-xs text-muted-foreground">
                    Validity: {coupon.starts_at ? new Date(coupon.starts_at).toLocaleString() : "Any time"} - {coupon.expires_at || coupon.ends_at ? new Date(coupon.expires_at || coupon.ends_at!).toLocaleString() : "No end"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Usage: {coupon.used_count}{coupon.usage_limit ? ` / ${coupon.usage_limit}` : " (unlimited)"} | One-time/user: {coupon.one_time_per_user ? "Yes" : "No"}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button size="icon" variant="outline" onClick={() => startEdit(coupon)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="outline" onClick={() => handleDelete(coupon.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
