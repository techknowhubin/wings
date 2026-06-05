import { useEffect, useState } from "react";
import { Plus, Trash2, Pencil, Check, Tag } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type ListingTypeOption = "stays" | "hotels" | "resorts" | "cars" | "bikes" | "experiences";

interface HostCoupon {
  id: string;
  code: string;
  discount_percent: number;
  discount_type: string | null;
  discount_value: number | null;
  listing_types: ListingTypeOption[];
  is_active: boolean;
  is_enabled: boolean | null;
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

// ─── Resolve display value from DB row (handles all legacy + new formats) ─────
function resolveCouponDisplay(coupon: HostCoupon): { label: string; isFlat: boolean; value: number } {
  const dtype = coupon.discount_type;
  const dvalue = Number(coupon.discount_value ?? 0);
  const dpercent = Number(coupon.discount_percent ?? 0);

  // Explicit flat type with a real value
  if (dtype === "flat" && dvalue > 0) {
    return { label: `₹${dvalue.toFixed(0)} OFF`, isFlat: true, value: dvalue };
  }

  // Explicit percentage type
  if (dtype === "percentage" || dtype === "percent") {
    const pct = dpercent > 0 ? dpercent : dvalue;
    return { label: `${pct}% OFF`, isFlat: false, value: pct };
  }

  // Legacy: no discount_type column — infer from values
  // If discount_percent > 0 it was a percentage coupon
  if (dpercent > 0) {
    return { label: `${dpercent}% OFF`, isFlat: false, value: dpercent };
  }
  // If discount_value > 0 but discount_percent = 0, it's flat
  if (dvalue > 0) {
    return { label: `₹${dvalue.toFixed(0)} OFF`, isFlat: true, value: dvalue };
  }

  // Fallback — should never reach here for valid coupons
  return { label: "— OFF", isFlat: false, value: 0 };
}

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
    if (error) { toast.error("Failed to load coupons."); return; }
    setCoupons((data ?? []) as HostCoupon[]);
  };

  const loadHostListings = async () => {
    if (!user) return;
    try {
      const tables = ["stays", "hotels", "resorts", "cars", "bikes", "experiences"];
      const results = await Promise.all(
        tables.map(async (table) => {
          const { data } = await supabase.from(table as any).select("id, title").eq("host_id", user.id).eq("availability_status", true);
          return (data || []).map((item: any) => ({ id: String(item.id), title: String(item.title), type: table }));
        })
      );
      setHostListings(results.flat());
    } catch (err) {
      console.error("Error loading host listings:", err);
    }
  };

  useEffect(() => { void loadCoupons(); void loadHostListings(); }, [user]);

  const resetForm = () => {
    setForm({ code: "", discount_type: "percentage", discount_value: "", listing_types: [], is_enabled: true, starts_at: "", expires_at: "", usage_limit: "", one_time_per_user: false, listing_id: "global" });
    setEditingId(null);
  };

  const toggleListingType = (type: ListingTypeOption) => {
    setForm((prev) => ({
      ...prev,
      listing_types: prev.listing_types.includes(type)
        ? prev.listing_types.filter((t) => t !== type)
        : [...prev.listing_types, type],
    }));
  };

  const handleSave = async () => {
    if (!user) return;
    const code = form.code.trim().toUpperCase();
    const discountValue = Number(form.discount_value);

    if (!code) return toast.error("Coupon code is required.");
    if (!Number.isFinite(discountValue) || discountValue <= 0) return toast.error("Discount value must be a positive number.");
    if (form.discount_type === "percentage" && discountValue > 90) return toast.error("Percentage discount cannot exceed 90%.");

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
    } else if (finalListingTypes.length === 0) {
      return toast.error("Select at least one listing type.");
    }

    // Build payload — store values in BOTH columns for maximum compatibility:
    // discount_type   → "flat" | "percentage"
    // discount_value  → actual amount (flat ₹ OR percent number)
    // discount_percent → percent number for percentage; 0 for flat (avoids NOT NULL issues)
    const isFlat = form.discount_type === "flat";
    const payload = {
      host_id: user.id,
      code,
      discount_type: form.discount_type,
      discount_value: discountValue,
      discount_percent: isFlat ? 0 : Math.round(discountValue),
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

    console.log("[Coupon save] payload:", payload);
    setSaving(true);
    const query = editingId
      ? supabase.from("host_coupons" as any).update(payload).eq("id", editingId).eq("host_id", user.id)
      : supabase.from("host_coupons" as any).insert(payload);

    const { error } = await query;
    setSaving(false);
    if (error) {
      console.error("[Coupon save error]", error);
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
    if (error) { toast.error("Failed to delete coupon."); return; }
    toast.success("Coupon deleted.");
    void loadCoupons();
  };

  const startEdit = (coupon: HostCoupon) => {
    const resolved = resolveCouponDisplay(coupon);
    setEditingId(coupon.id);
    setForm({
      code: coupon.code,
      discount_type: resolved.isFlat ? "flat" : "percentage",
      discount_value: String(resolved.value),
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

      {/* Create / Edit Form */}
      <Card>
        <CardHeader>
          <CardTitle>{editingId ? "Edit Coupon" : "Create Coupon"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Coupon Code</Label>
              <Input
                value={form.code}
                onChange={(e) => setForm((p) => ({ ...p, code: e.target.value.toUpperCase() }))}
                placeholder="SUMMER20"
              />
            </div>
            <div>
              <Label>Applicable Listing</Label>
              <Select value={form.listing_id} onValueChange={(v) => setForm((p) => ({ ...p, listing_id: v }))}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Select a listing (optional)" /></SelectTrigger>
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
              <Select
                value={form.discount_type}
                onValueChange={(v: "percentage" | "flat") => setForm((p) => ({ ...p, discount_type: v, discount_value: "" }))}
              >
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">Percentage (% OFF)</SelectItem>
                  <SelectItem value="flat">Flat Amount (₹ OFF)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>
                Discount Value&nbsp;
                <span className="text-muted-foreground font-normal">
                  ({form.discount_type === "percentage" ? "e.g. 20 for 20% off" : "e.g. 100 for ₹100 off"})
                </span>
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium">
                  {form.discount_type === "percentage" ? "%" : "₹"}
                </span>
                <Input
                  type="number"
                  min={1}
                  className="pl-8"
                  value={form.discount_value}
                  onChange={(e) => setForm((p) => ({ ...p, discount_value: e.target.value }))}
                  placeholder={form.discount_type === "percentage" ? "20" : "100"}
                />
              </div>
              {/* Live preview */}
              {form.discount_value && Number(form.discount_value) > 0 && (
                <p className="text-xs text-green-600 font-semibold mt-1">
                  Preview: {form.discount_type === "flat" ? `₹${form.discount_value} OFF` : `${form.discount_value}% OFF`}
                </p>
              )}
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
                      className={`rounded-lg border px-3 py-2 text-sm text-left capitalize transition-colors ${selected ? "border-primary bg-primary/10 text-primary font-medium" : "border-border text-muted-foreground hover:border-primary/50"}`}
                    >
                      {type}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground p-3 bg-muted/30 rounded-lg">
              Applicable listing type is automatically set based on the selected listing.
            </p>
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
              {saving ? "Saving…" : editingId ? "Update Coupon" : "Create Coupon"}
            </Button>
            {editingId && <Button variant="outline" onClick={resetForm}>Cancel</Button>}
          </div>
        </CardContent>
      </Card>

      {/* Existing Coupons */}
      <Card>
        <CardHeader>
          <CardTitle>Existing Coupons</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading && <p className="text-sm text-muted-foreground">Loading coupons…</p>}
          {!loading && coupons.length === 0 && <p className="text-sm text-muted-foreground">No coupons created yet.</p>}
          {coupons.map((coupon) => {
            const { label: discountLabel, isFlat } = resolveCouponDisplay(coupon);
            const attachedListing = hostListings.find((l) => l.id === coupon.listing_id);
            const isEnabled = coupon.is_enabled ?? coupon.is_active;
            return (
              <div key={coupon.id} className="rounded-xl border border-border p-4 flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 min-w-0">
                  <div className={`mt-0.5 p-2 rounded-lg shrink-0 ${isFlat ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"}`}>
                    <Tag className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-foreground font-mono">{coupon.code}</p>
                      <Badge className={`text-xs font-bold ${isFlat ? "bg-green-100 text-green-800 border-green-200" : "bg-blue-100 text-blue-800 border-blue-200"}`} variant="outline">
                        {discountLabel}
                      </Badge>
                      <Badge variant="outline" className={isEnabled ? "bg-green-50 text-green-700 border-green-200 text-[10px]" : "bg-gray-100 text-gray-500 text-[10px]"}>
                        {isEnabled ? "Active" : "Disabled"}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {coupon.listing_id
                        ? <>For: <span className="text-primary font-medium capitalize">[{attachedListing?.type || coupon.listing_type}] {attachedListing?.title || `Listing …${coupon.listing_id.slice(-6)}`}</span></>
                        : <>Types: {coupon.listing_types?.join(", ") || "All"}</>}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Valid: {coupon.starts_at ? new Date(coupon.starts_at).toLocaleDateString() : "Any time"} → {coupon.expires_at || coupon.ends_at ? new Date((coupon.expires_at || coupon.ends_at)!).toLocaleDateString() : "No end"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Used: {coupon.used_count}{coupon.usage_limit ? ` / ${coupon.usage_limit}` : " (unlimited)"} · One-time/user: {coupon.one_time_per_user ? "Yes" : "No"}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button size="icon" variant="outline" onClick={() => startEdit(coupon)}><Pencil className="h-4 w-4" /></Button>
                  <Button size="icon" variant="outline" className="text-red-500 hover:bg-red-50" onClick={() => handleDelete(coupon.id)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
