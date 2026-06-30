import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Tag, Plus, Search, Check, Loader2,
  Copy, Edit, Trash2, PowerOff, Power, Activity, MoreHorizontal,
  Calendar as CalendarIcon, Clock, Users
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format, isPast } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

export default function AdminCoupons() {
  const [coupons, setCoupons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Form State
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [code, setCode] = useState("");
  const [discountValue, setDiscountValue] = useState("");
  const [discountType, setDiscountType] = useState<"flat" | "percent">("flat");
  const [maxDiscount, setMaxDiscount] = useState("");
  const [minBookingAmount, setMinBookingAmount] = useState("");

  const [usageType, setUsageType] = useState<"single" | "multi" | "unlimited">("single");
  const [usageLimit, setUsageLimit] = useState("");
  const [expiresAt, setExpiresAt] = useState<Date | undefined>(undefined);

  // Multi-User Search State
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<any[]>([]);
  const [openUserSearch, setOpenUserSearch] = useState(false);

  useEffect(() => { loadCoupons(); }, []);

  const loadCoupons = async () => {
    setLoading(true);

    // host_coupons has no FK to hubs, and profiles has no email column —
    // use a clean select then enrich creator names via a second profiles query
    const { data, error } = await supabase
      .from('host_coupons' as any)
      .select('*, assignments:host_coupon_assignments(user_id)')
      .order('created_at', { ascending: false });

    if (error || !data) {
      console.error('loadCoupons error:', error);
      setLoading(false);
      return;
    }

    if (data.length === 0) {
      setCoupons([]);
      setLoading(false);
      return;
    }

    // Fetch creator names from profiles by host_id
    const hostIds = [...new Set((data as any[]).map((c: any) => c.host_id).filter(Boolean))];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, phone')
      .in('id', hostIds);

    const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));
    setCoupons((data as any[]).map((c: any) => ({
      ...c,
      creatorProfile: profileMap.get(c.host_id) || null,
    })));
    setLoading(false);
  };

  // Live user search — auto-loads all users on open, then filters
  useEffect(() => {
    const fetchUsers = async () => {
      setIsSearching(true);
      // profiles table does not expose email — search by full_name and phone only
      let query = supabase.from('profiles').select('id, full_name, phone').limit(50);
      if (searchQuery.trim()) {
        query = query.or(`full_name.ilike.%${searchQuery}%,phone.ilike.%${searchQuery}%`);
      }
      const { data } = await query;
      setSearchResults(data || []);
      setIsSearching(false);
    };

    if (openUserSearch) {
      const timer = setTimeout(fetchUsers, searchQuery.trim() ? 300 : 0);
      return () => clearTimeout(timer);
    }
  }, [searchQuery, openUserSearch]);

  const handleToggleUser = (user: any) => {
    setSelectedUsers(prev =>
      prev.find(u => u.id === user.id) ? prev.filter(u => u.id !== user.id) : [...prev, user]
    );
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingId(null);
    setCode(""); setDiscountValue(""); setDiscountType("flat");
    setMaxDiscount(""); setMinBookingAmount("");
    setUsageType("single"); setUsageLimit("");
    setExpiresAt(undefined);
    setSelectedUsers([]); setSearchQuery("");
  };

  const handleCreateOrUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code) return toast({ title: "Validation Error", description: "Coupon code is required.", variant: "destructive" });
    if (!expiresAt) return toast({ title: "Validation Error", description: "Please select an expiry date.", variant: "destructive" });
    if (selectedUsers.length === 0) return toast({ title: "Validation Error", description: "Please assign the coupon to at least one traveller.", variant: "destructive" });

    let finalLimit: number | null = null;
    if (usageType === 'single') finalLimit = 1;
    else if (usageType === 'multi' && usageLimit) finalLimit = Number(usageLimit);

    const payload: any = {
      code: code.toUpperCase(),
      is_platform_offer: true,
      is_active: true,
      is_enabled: true,
      discount_type: discountType === "flat" ? "flat" : "percentage",
      discount_value: discountType === "flat" ? Number(discountValue) : 0,
      discount_percent: discountType === "percent" ? Number(discountValue) : 0,
      usage_limit: finalLimit,
      expires_at: expiresAt ? expiresAt.toISOString() : null,
      max_discount: discountType === "percent" && maxDiscount ? Number(maxDiscount) : null,
      min_booking_amount: minBookingAmount ? Number(minBookingAmount) : 0,
      target_user_id: selectedUsers.length === 1 ? selectedUsers[0].id : null,
      target_email: selectedUsers.length === 1 ? selectedUsers[0].email : null,
      target_phone: selectedUsers.length === 1 ? selectedUsers[0].phone : null,
    };

    try {
      let couponId = editingId;

      if (editingId) {
        const { error } = await supabase.from('host_coupons' as any).update(payload).eq('id', editingId);
        if (error) throw error;
        toast({ title: "VIP Coupon Updated" });
      } else {
        const { data, error } = await supabase.from('host_coupons' as any).insert(payload).select().single();
        if (error) throw error;
        couponId = data.id;
        toast({ title: "VIP Coupon Created" });
      }

      if (couponId) {
        await supabase.from('host_coupon_assignments' as any).delete().eq('coupon_id', couponId);
        if (selectedUsers.length > 0) {
          const assignments = selectedUsers.map(u => ({ coupon_id: couponId, user_id: u.id }));
          const { error: assignError } = await supabase.from('host_coupon_assignments' as any).insert(assignments);
          if (assignError) {
            console.error("Assignment failed:", assignError);
            toast({ title: "Assignments failed", description: "The coupon was saved but user assignments failed.", variant: "destructive" });
          }
        }
      }

      resetForm();
      loadCoupons();
    } catch (err: any) {
      let msg = err.message;
      if (err.code === "23505") msg = "A coupon with this code already exists. Use a unique code.";
      toast({ title: "Failed to save coupon", description: msg, variant: "destructive" });
    }
  };

  const handleToggleStatus = async (id: string, current: boolean) => {
    const { error } = await supabase.from('host_coupons' as any)
      .update({ is_active: !current, is_enabled: !current }).eq('id', id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: `Coupon ${!current ? 'Activated' : 'Disabled'}` }); loadCoupons(); }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this coupon? This cannot be undone.")) return;
    const { error } = await supabase.from('host_coupons' as any).delete().eq('id', id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Coupon deleted" }); loadCoupons(); }
  };

  const handleEdit = (c: any) => {
    setCode(c.code);
    setDiscountType(c.discount_percent ? "percent" : "flat");
    setDiscountValue(c.discount_percent ? String(c.discount_percent) : String(c.discount_value));
    setMaxDiscount(c.max_discount ? String(c.max_discount) : "");
    setMinBookingAmount(c.min_booking_amount ? String(c.min_booking_amount) : "");
    setUsageType(c.usage_limit === 1 ? "single" : c.usage_limit === null ? "unlimited" : "multi");
    setUsageLimit(c.usage_limit ? String(c.usage_limit) : "");
    setExpiresAt(c.expires_at ? new Date(c.expires_at) : undefined);
    if (c.assignments?.length > 0) {
      setSelectedUsers(c.assignments.map((a: any) => ({
        id: a.user_id, full_name: a.profiles?.full_name, email: a.profiles?.email, phone: a.profiles?.phone,
      })));
    } else { setSelectedUsers([]); }
    setEditingId(c.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDuplicate = (c: any) => {
    setCode(c.code + "_COPY");
    setDiscountType(c.discount_percent ? "percent" : "flat");
    setDiscountValue(c.discount_percent ? String(c.discount_percent) : String(c.discount_value));
    setMaxDiscount(c.max_discount ? String(c.max_discount) : "");
    setMinBookingAmount(c.min_booking_amount ? String(c.min_booking_amount) : "");
    setUsageType(c.usage_limit === 1 ? "single" : c.usage_limit === null ? "unlimited" : "multi");
    setUsageLimit(c.usage_limit ? String(c.usage_limit) : "");
    setExpiresAt(c.expires_at ? new Date(c.expires_at) : undefined);
    if (c.assignments?.length > 0) {
      setSelectedUsers(c.assignments.map((a: any) => ({
        id: a.user_id, full_name: a.profiles?.full_name, email: a.profiles?.email, phone: a.profiles?.phone,
      })));
    } else { setSelectedUsers([]); }
    setEditingId(null);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Analytics
  const totalCoupons = coupons.length;
  const activeCoupons = coupons.filter(c => c.is_active && (!c.expires_at || !isPast(new Date(c.expires_at)))).length;
  const expiredCoupons = coupons.filter(c => c.expires_at && isPast(new Date(c.expires_at))).length;
  const platformCoupons = coupons.filter(c => c.is_platform_offer).length;
  const hubCoupons = coupons.filter(c => !c.is_platform_offer).length;
  const userAssignedCoupons = coupons.filter(c => c.assignments?.length > 0).length;
  const totalRedeemed = coupons.reduce((sum, c) => sum + (c.used_count || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-foreground">VIP Coupon Management</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage all global and Hub Partner VIP coupons.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="rounded-xl bg-background" onClick={loadCoupons}>Refresh</Button>
          <Button onClick={() => setShowForm(!showForm)} className="rounded-xl gap-2">
            <Plus className="h-4 w-4" /> Create Platform Coupon
          </Button>
        </div>
      </div>

      {/* Analytics */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        <Card className="border-border/50 bg-card">
          <CardContent className="p-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Total</p>
            <p className="text-2xl font-black">{totalCoupons}</p>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-emerald-500/5 border-emerald-500/20">
          <CardContent className="p-4">
            <p className="text-xs font-semibold text-emerald-600 uppercase mb-1">Active</p>
            <p className="text-2xl font-black text-emerald-600">{activeCoupons}</p>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-destructive/5 border-destructive/20">
          <CardContent className="p-4">
            <p className="text-xs font-semibold text-destructive uppercase mb-1">Expired</p>
            <p className="text-2xl font-black text-destructive">{expiredCoupons}</p>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-blue-500/5 border-blue-500/20">
          <CardContent className="p-4">
            <p className="text-xs font-semibold text-blue-600 uppercase mb-1">Platform</p>
            <p className="text-2xl font-black text-blue-600">{platformCoupons}</p>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-amber-500/5 border-amber-500/20">
          <CardContent className="p-4">
            <p className="text-xs font-semibold text-amber-600 uppercase mb-1">By Hubs</p>
            <p className="text-2xl font-black text-amber-600">{hubCoupons}</p>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-purple-500/5 border-purple-500/20">
          <CardContent className="p-4">
            <p className="text-xs font-semibold text-purple-600 uppercase mb-1">User Assigned</p>
            <p className="text-2xl font-black text-purple-600">{userAssignedCoupons}</p>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-rose-500/5 border-rose-500/20">
          <CardContent className="p-4">
            <p className="text-xs font-semibold text-rose-600 uppercase mb-1">Redeemed</p>
            <p className="text-2xl font-black text-rose-600">{totalRedeemed}</p>
          </CardContent>
        </Card>
      </div>

      {showForm && (
        <Card className="border-border/50 border-emerald-500/30 shadow-md">
          <CardHeader className="border-b border-border/50 bg-muted/20 pb-4">
            <CardTitle className="text-lg">{editingId ? 'Edit VIP Coupon' : 'Create New VIP Coupon'}</CardTitle>
            <CardDescription>Configure discount settings and assign to specific travellers.</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleCreateOrUpdate} className="space-y-6">

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>Coupon Code</Label>
                  <Input value={code} onChange={e => setCode(e.target.value)} placeholder="e.g. VIP1000" required className="uppercase font-mono font-bold text-foreground" />
                </div>
                <div className="space-y-2">
                  <Label>Discount Type</Label>
                  <Select value={discountType} onValueChange={(v: "flat" | "percent") => setDiscountType(v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="flat">Fixed Amount (₹)</SelectItem>
                      <SelectItem value="percent">Percentage (%)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Discount Value {discountType === "flat" ? "(₹)" : "(%)"}</Label>
                  <Input type="number" min="0" value={discountValue} onChange={e => setDiscountValue(e.target.value)} placeholder={discountType === "flat" ? "e.g. 500" : "e.g. 20"} required />
                </div>
                {discountType === "percent" && (
                  <div className="space-y-2">
                    <Label>Max Discount (₹) <span className="text-muted-foreground font-normal text-xs">(Optional)</span></Label>
                    <Input type="number" min="0" value={maxDiscount} onChange={e => setMaxDiscount(e.target.value)} placeholder="e.g. 1000" />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted/20 rounded-xl border border-border/50">
                <div className="space-y-2">
                  <Label>Minimum Booking Amount (₹)</Label>
                  <Input type="number" min="0" value={minBookingAmount} onChange={e => setMinBookingAmount(e.target.value)} placeholder="e.g. 2000" />
                </div>
                <div className="space-y-2">
                  <Label>Usage Type</Label>
                  <Select value={usageType} onValueChange={(v: "single" | "multi" | "unlimited") => setUsageType(v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="single">Single Use (1 time)</SelectItem>
                      <SelectItem value="multi">Multiple Uses</SelectItem>
                      <SelectItem value="unlimited">Unlimited Uses</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {usageType === "multi" && (
                  <div className="space-y-2">
                    <Label>Max Uses per Code</Label>
                    <Input type="number" min="2" value={usageLimit} onChange={e => setUsageLimit(e.target.value)} placeholder="e.g. 5" required />
                  </div>
                )}
                <div className="space-y-2">
                  <Label>Expiry Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !expiresAt && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {expiresAt ? format(expiresAt, "PPP") : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar mode="single" selected={expiresAt} onSelect={setExpiresAt} initialFocus required />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {/* Multi-User Assignment */}
              <div className="space-y-2 border border-border/50 rounded-xl p-4">
                <Label className="text-base font-semibold">Traveller Assignment</Label>
                <p className="text-xs text-muted-foreground mb-3">Assign the coupon to specific travellers. Global coupons are not supported.</p>

                <Popover open={openUserSearch} onOpenChange={setOpenUserSearch}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" role="combobox" aria-expanded={openUserSearch} className="w-full justify-between font-normal h-auto py-2.5 bg-background text-foreground border-border hover:bg-muted">
                      {selectedUsers.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5 items-center">
                          <Badge variant="secondary" className="bg-emerald-100 text-emerald-800">{selectedUsers.length} Travellers Selected</Badge>
                          <span className="text-xs text-muted-foreground">Click to add more or modify</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground flex items-center gap-2"><Search className="h-4 w-4" /> Search and select travellers...</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[calc(100vw-2rem)] sm:w-[400px] p-0 max-w-[95vw]" align="start" sideOffset={8}>
                    <div className="flex items-center border-b px-3 bg-muted/20">
                      <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                      <Input
                        placeholder="Type a name, email or mobile..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="flex-1 border-0 bg-transparent py-3 focus-visible:ring-0 shadow-none"
                      />
                    </div>
                    <div className="max-h-[300px] overflow-y-auto p-1">
                      {isSearching ? (
                        <div className="flex items-center justify-center py-6 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading...</div>
                      ) : searchResults.length === 0 ? (
                        <div className="py-6 text-center text-sm text-muted-foreground">No travellers found.</div>
                      ) : (
                        searchResults.map(user => {
                          const isSelected = selectedUsers.some(u => u.id === user.id);
                          return (
                            <div
                              key={user.id}
                              onClick={() => handleToggleUser(user)}
                              className={cn(
                                "relative flex cursor-pointer select-none items-center rounded-sm px-2 py-2 text-sm outline-none transition-colors",
                                isSelected ? "bg-emerald-50 text-emerald-900" : "hover:bg-accent hover:text-accent-foreground"
                              )}
                            >
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-bold">{user.full_name || "Unknown Traveller"}</div>
                                <div className="text-xs font-medium opacity-80 mt-0.5">{user.phone || "No phone"}</div>
                              </div>
                              <div className={cn("h-4 w-4 border rounded-sm flex items-center justify-center transition-colors", isSelected ? "bg-emerald-600 border-emerald-600" : "border-muted-foreground/30")}>
                                {isSelected && <Check className="h-3 w-3 text-white" />}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </PopoverContent>
                </Popover>

                {selectedUsers.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3 p-3 bg-muted/10 rounded-lg border border-border/30 max-h-40 overflow-y-auto">
                    {selectedUsers.map(user => (
                      <Badge key={user.id} variant="outline" className="flex items-center gap-1.5 py-1 px-2 bg-card">
                        <span className="truncate max-w-[120px]">{user.full_name || user.phone}</span>
                        <button type="button" onClick={() => handleToggleUser(user)} className="text-muted-foreground hover:text-destructive rounded-full p-0.5">
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                    <Button type="button" variant="ghost" size="sm" className="h-6 text-[10px]" onClick={() => setSelectedUsers([])}>Clear All</Button>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3 justify-end border-t border-border/50 pt-4">
                <Button type="button" variant="ghost" onClick={resetForm}>Cancel</Button>
                <Button type="submit" className="px-8">{editingId ? 'Update Coupon' : 'Create VIP Coupon'}</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Directory Table */}
      <Card className="border-border/50">
        <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-border/50">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <Tag className="h-4 w-4 text-emerald-600" /> VIP Coupon Directory
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto min-w-0 w-full">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/10">
                  <TableHead className="text-xs font-semibold whitespace-nowrap">Coupon Code</TableHead>
                  <TableHead className="text-xs font-semibold whitespace-nowrap">Creator</TableHead>
                  <TableHead className="text-xs font-semibold whitespace-nowrap">Discount</TableHead>
                  <TableHead className="text-xs font-semibold whitespace-nowrap">Assignment</TableHead>
                  <TableHead className="text-xs font-semibold whitespace-nowrap">Usage Limit</TableHead>
                  <TableHead className="text-xs font-semibold whitespace-nowrap">Conditions</TableHead>
                  <TableHead className="text-xs font-semibold whitespace-nowrap">Expiry</TableHead>
                  <TableHead className="text-xs font-semibold whitespace-nowrap">Status</TableHead>
                  <TableHead className="text-xs font-semibold whitespace-nowrap text-right pr-6">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={9} className="text-center py-12"><Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" /></TableCell></TableRow>
                ) : coupons.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-muted-foreground py-12">
                      <Tag className="h-8 w-8 mx-auto mb-3 opacity-20" />
                      <p>No VIP coupons found.</p>
                      <Button variant="link" onClick={() => setShowForm(true)}>Create one now</Button>
                    </TableCell>
                  </TableRow>
                ) : (
                  coupons.map(c => {
                    const isExp = c.expires_at && isPast(new Date(c.expires_at));
                    return (
                      <TableRow key={c.id} className="group hover:bg-muted/30 transition-colors">
                        <TableCell className="font-mono text-sm font-black text-emerald-700 tracking-wide">{c.code}</TableCell>
                        <TableCell>
                          {c.is_platform_offer ? (
                            <Badge variant="secondary" className="bg-blue-100 text-blue-800 border-blue-200 text-[10px]">Platform Admin</Badge>
                          ) : (
                            <div className="flex flex-col">
                              <span className="text-xs font-semibold">{c.creatorProfile?.full_name || 'Hub Partner'}</span>
                              <span className="text-[10px] text-muted-foreground">{c.creatorProfile?.phone || ''}</span>
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="font-semibold text-sm">
                            {c.discount_percent ? `${c.discount_percent}% OFF` : `₹${c.discount_value} OFF`}
                          </span>
                          {c.max_discount && <p className="text-[10px] text-muted-foreground mt-0.5">Upto ₹{c.max_discount}</p>}
                        </TableCell>
                        <TableCell>
                          {c.assignments && c.assignments.length > 0 ? (
                            <div className="flex items-center gap-1.5 text-blue-600 font-semibold text-xs">
                              <Users className="h-3.5 w-3.5" /> {c.assignments.length} Travellers
                            </div>
                          ) : (
                            <Badge variant="secondary" className="text-[10px] bg-muted font-medium text-muted-foreground">Global</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Activity className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-xs font-medium">{c.used_count || 0} / {c.usage_limit ?? '∞'}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-xs text-muted-foreground font-medium">
                            {c.min_booking_amount ? `Min. ₹${c.min_booking_amount}` : 'No Minimum'}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs">
                          {c.expires_at ? (
                            <span className={cn("font-medium flex items-center gap-1", isExp ? "text-destructive" : "text-muted-foreground")}>
                              <Clock className="h-3 w-3" /> {format(new Date(c.expires_at), 'dd MMM yy')}
                            </span>
                          ) : <span className="text-muted-foreground">Never</span>}
                        </TableCell>
                        <TableCell>
                          <Badge variant={isExp ? "destructive" : c.is_active ? "default" : "secondary"} className="text-[10px]">
                            {isExp ? "Expired" : c.is_active ? "Active" : "Disabled"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right pr-4">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuLabel className="text-xs text-muted-foreground uppercase">Actions</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleEdit(c)}>
                                <Edit className="h-4 w-4 mr-2" /> Edit Coupon
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleDuplicate(c)}>
                                <Copy className="h-4 w-4 mr-2" /> Duplicate
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleToggleStatus(c.id, c.is_active)}>
                                {c.is_active ? <PowerOff className="h-4 w-4 mr-2 text-amber-600" /> : <Power className="h-4 w-4 mr-2 text-emerald-600" />}
                                {c.is_active ? "Disable" : "Enable"}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleDelete(c.id)} className="text-destructive focus:text-destructive">
                                <Trash2 className="h-4 w-4 mr-2" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
