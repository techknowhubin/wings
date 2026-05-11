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

type ListingTypeOption = "stays" | "hotels" | "resorts" | "cars" | "bikes" | "experiences";

interface HostCoupon {
  id: string;
  code: string;
  discount_percent: number;
  listing_types: ListingTypeOption[];
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  usage_limit: number | null;
  used_count: number;
  one_time_per_user: boolean;
}

const listingTypeOptions: ListingTypeOption[] = ["stays", "hotels", "resorts", "cars", "bikes", "experiences"];

export default function HostCoupons() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [coupons, setCoupons] = useState<HostCoupon[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [form, setForm] = useState({
    code: "",
    discount_percent: "",
    listing_types: [] as ListingTypeOption[],
    is_active: true,
    starts_at: "",
    ends_at: "",
    usage_limit: "",
    one_time_per_user: false,
  });

  const loadCoupons = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("host_coupons" as any)
      .select("id,code,discount_percent,listing_types,is_active,starts_at,ends_at,usage_limit,used_count,one_time_per_user")
      .eq("host_id", user.id)
      .order("created_at", { ascending: false });
    setLoading(false);
    if (error) {
      toast.error("Failed to load coupons.");
      return;
    }
    setCoupons((data ?? []) as HostCoupon[]);
  };

  useEffect(() => {
    void loadCoupons();
  }, [user]);

  const resetForm = () => {
    setForm({
      code: "",
      discount_percent: "",
      listing_types: [],
      is_active: true,
      starts_at: "",
      ends_at: "",
      usage_limit: "",
      one_time_per_user: false,
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
    const discountPercent = Number(form.discount_percent);

    if (!code) return toast.error("Coupon code is required.");
    if (!Number.isFinite(discountPercent) || discountPercent < 1 || discountPercent > 90) {
      return toast.error("Discount must be between 1 and 90.");
    }
    if (form.listing_types.length === 0) {
      return toast.error("Select at least one listing type.");
    }

    setSaving(true);
    const payload = {
      host_id: user.id,
      code,
      discount_percent: Math.round(discountPercent),
      listing_types: form.listing_types,
      is_active: form.is_active,
      starts_at: form.starts_at ? new Date(form.starts_at).toISOString() : null,
      ends_at: form.ends_at ? new Date(form.ends_at).toISOString() : null,
      usage_limit: form.usage_limit ? Number(form.usage_limit) : null,
      one_time_per_user: form.one_time_per_user,
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
      discount_percent: String(coupon.discount_percent),
      listing_types: coupon.listing_types ?? [],
      is_active: coupon.is_active,
      starts_at: coupon.starts_at ? coupon.starts_at.slice(0, 16) : "",
      ends_at: coupon.ends_at ? coupon.ends_at.slice(0, 16) : "",
      usage_limit: coupon.usage_limit ? String(coupon.usage_limit) : "",
      one_time_per_user: Boolean(coupon.one_time_per_user),
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
              <Label>Discount (%)</Label>
              <Input type="number" min={1} max={90} value={form.discount_percent} onChange={(e) => setForm((p) => ({ ...p, discount_percent: e.target.value }))} placeholder="20" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Valid From</Label>
              <Input type="datetime-local" value={form.starts_at} onChange={(e) => setForm((p) => ({ ...p, starts_at: e.target.value }))} />
            </div>
            <div>
              <Label>Valid Until</Label>
              <Input type="datetime-local" value={form.ends_at} onChange={(e) => setForm((p) => ({ ...p, ends_at: e.target.value }))} />
            </div>
            <div>
              <Label>Usage Limit (optional)</Label>
              <Input type="number" min={1} value={form.usage_limit} onChange={(e) => setForm((p) => ({ ...p, usage_limit: e.target.value }))} placeholder="e.g. 100" />
            </div>
          </div>

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

          <div className="flex items-center justify-between">
            <Label>Active</Label>
            <Switch checked={form.is_active} onCheckedChange={(v) => setForm((p) => ({ ...p, is_active: v }))} />
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
          {coupons.map((coupon) => (
            <div key={coupon.id} className="rounded-lg border border-border p-3 flex items-center justify-between gap-3">
              <div>
                <p className="font-semibold">{coupon.code} - {coupon.discount_percent}%</p>
                <p className="text-xs text-muted-foreground">Types: {coupon.listing_types.join(", ") || "-"}</p>
                <p className="text-xs text-muted-foreground">Status: {coupon.is_active ? "Active" : "Inactive"}</p>
                <p className="text-xs text-muted-foreground">
                  Validity: {coupon.starts_at ? new Date(coupon.starts_at).toLocaleString() : "Any time"} - {coupon.ends_at ? new Date(coupon.ends_at).toLocaleString() : "No end"}
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
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
