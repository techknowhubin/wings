import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Tag, Users, Plus, Search, Check, Loader2,
  Copy, Edit, Trash2, PowerOff, Power, Activity, MoreHorizontal,
  Calendar as CalendarIcon, Download, Clock
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format, isPast } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

type VIPCoupon = any;

export default function HubCoupons() {
  const { uuid } = useParams<{ uuid: string }>();
  const [coupons, setCoupons] = useState<VIPCoupon[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const [hubId, setHubId] = useState<string | null>(null);

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

  useEffect(() => {
    if (uuid) loadHubAndCoupons();
  }, [uuid]);

  const loadHubAndCoupons = async () => {
    setLoading(true);
    const { data: hub } = await supabase.from('hubs').select('id').eq('uuid', uuid).single();
    if (hub) {
      setHubId(hub.id);
      await loadCoupons(hub.id);
    }
    setLoading(false);
  };

  const loadCoupons = async (hId: string) => {
    const { data, error } = await supabase
      .from('host_coupons' as any)
      .select('*, assignments:host_coupon_assignments(user_id, profiles(full_name, email, phone))')
      .eq('host_id', hId)
      .order('created_at', { ascending: false });
    
    if (error) {
      // If assignment table doesn't exist yet, fallback gracefully
      const { data: fallbackData } = await supabase
        .from('host_coupons' as any)
        .select('*')
        .eq('host_id', hId)
        .order('created_at', { ascending: false });
      if (fallbackData) setCoupons(fallbackData.map((c: any) => ({ ...c, assignments: [] })));
    } else if (data) {
      setCoupons(data);
    }
  };

  // Live User Search (Debounced) & Auto-load on open
  useEffect(() => {
    const fetchUsers = async () => {
      setIsSearching(true);
      
      const { data, error } = await supabase.rpc('get_hub_travellers');
      let results = data || [];
      
      if (searchQuery.trim()) {
        const sq = searchQuery.toLowerCase();
        results = results.filter((t: any) => 
          t.full_name?.toLowerCase().includes(sq) ||
          t.email?.toLowerCase().includes(sq) ||
          t.phone?.includes(searchQuery)
        );
      }
      
      setSearchResults(results.slice(0, 50));
      setIsSearching(false);
    };

    if (openUserSearch) {
      const delayDebounceFn = setTimeout(fetchUsers, searchQuery.trim() ? 300 : 0);
      return () => clearTimeout(delayDebounceFn);
    }
  }, [searchQuery, openUserSearch]);

  const handleToggleUser = (user: any) => {
    setSelectedUsers(prev => {
      if (prev.find(u => u.id === user.id)) {
        return prev.filter(u => u.id !== user.id);
      }
      return [...prev, user];
    });
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingId(null);
    setCode("");
    setDiscountValue("");
    setDiscountType("flat");
    setMaxDiscount("");
    setMinBookingAmount("");
    setUsageType("single");
    setUsageLimit("");
    setExpiresAt(undefined);
    setSelectedUsers([]);
    setSearchQuery("");
  };

  const handleCreateOrUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code) return toast({ title: "Validation Error", description: "Coupon code is required.", variant: "destructive" });
    if (!expiresAt) return toast({ title: "Validation Error", description: "Please select an expiry date.", variant: "destructive" });
    if (selectedUsers.length === 0) return toast({ title: "Validation Error", description: "Please assign the coupon to at least one traveller.", variant: "destructive" });
    if (!hubId) return toast({ title: "Error", description: "Hub ID not loaded", variant: "destructive" });

    let finalLimit = null;
    if (usageType === 'single') finalLimit = 1;
    else if (usageType === 'multi' && usageLimit) finalLimit = Number(usageLimit);

    const payload: any = {
      code: code.toUpperCase(),
      host_id: hubId,
      is_platform_offer: false,
      is_active: true,
      discount_value: discountType === "flat" ? Number(discountValue) : 0,
      discount_percent: discountType === "percent" ? Number(discountValue) : 0,
      usage_limit: finalLimit,
      expires_at: expiresAt ? expiresAt.toISOString() : null,
      // The new fields (might fail if migration not applied, so we ignore error gracefully later)
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

      // Handle assignments if migration is present
      if (couponId) {
        // Clear old assignments first
        await supabase.from('host_coupon_assignments' as any).delete().eq('coupon_id', couponId);
        
        // Insert new assignments
        if (selectedUsers.length > 0) {
          const assignments = selectedUsers.map(u => ({
            coupon_id: couponId,
            user_id: u.id
          }));
          const { error: assignError } = await supabase.from('host_coupon_assignments' as any).insert(assignments);
          if (assignError) {
            console.error("Assignment failed (migration might not be applied):", assignError);
            toast({ title: "Assignments failed", description: "The coupon was saved but assignments failed. Did you run the SQL migration?", variant: "destructive" });
          } else {
            console.log("Coupon Assignment Records Saved:", assignments);
          }
        }
      }

      resetForm();
      loadCoupons(hubId);
    } catch (err: any) {
      toast({ title: "Failed to save coupon", description: err.message, variant: "destructive" });
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase.from('host_coupons' as any).update({ is_active: !currentStatus }).eq('id', id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else {
      toast({ title: `Coupon ${!currentStatus ? 'Activated' : 'Disabled'}` });
      if (hubId) loadCoupons(hubId);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this coupon? This cannot be undone.")) return;
    const { error } = await supabase.from('host_coupons' as any).delete().eq('id', id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Coupon deleted successfully" });
      if (hubId) loadCoupons(hubId);
    }
  };

  const handleDuplicate = (coupon: any) => {
    setCode(coupon.code + "_COPY");
    setDiscountType(coupon.discount_percent ? "percent" : "flat");
    setDiscountValue(coupon.discount_percent ? String(coupon.discount_percent) : String(coupon.discount_value));
    setMaxDiscount(coupon.max_discount ? String(coupon.max_discount) : "");
    setMinBookingAmount(coupon.min_booking_amount ? String(coupon.min_booking_amount) : "");
    setUsageType(coupon.usage_limit === 1 ? "single" : coupon.usage_limit === null ? "unlimited" : "multi");
    setUsageLimit(coupon.usage_limit ? String(coupon.usage_limit) : "");
    setExpiresAt(coupon.expires_at ? new Date(coupon.expires_at) : undefined);
    
    if (coupon.assignments && coupon.assignments.length > 0) {
      setSelectedUsers(coupon.assignments.map((a: any) => ({
        id: a.user_id,
        full_name: a.profiles?.full_name,
        email: a.profiles?.email,
        phone: a.profiles?.phone
      })));
    } else {
      setSelectedUsers([]);
    }
    setEditingId(null);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleEdit = (coupon: any) => {
    setCode(coupon.code);
    setDiscountType(coupon.discount_percent ? "percent" : "flat");
    setDiscountValue(coupon.discount_percent ? String(coupon.discount_percent) : String(coupon.discount_value));
    setMaxDiscount(coupon.max_discount ? String(coupon.max_discount) : "");
    setMinBookingAmount(coupon.min_booking_amount ? String(coupon.min_booking_amount) : "");
    setUsageType(coupon.usage_limit === 1 ? "single" : coupon.usage_limit === null ? "unlimited" : "multi");
    setUsageLimit(coupon.usage_limit ? String(coupon.usage_limit) : "");
    setExpiresAt(coupon.expires_at ? new Date(coupon.expires_at) : undefined);
    
    if (coupon.assignments && coupon.assignments.length > 0) {
      setSelectedUsers(coupon.assignments.map((a: any) => ({
        id: a.user_id,
        full_name: a.profiles?.full_name,
        email: a.profiles?.email,
        phone: a.profiles?.phone
      })));
    } else {
      setSelectedUsers([]);
    }
    setEditingId(coupon.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Analytics Calculations
  const totalCoupons = coupons.length;
  const activeCoupons = coupons.filter(c => c.is_active && (!c.expires_at || !isPast(new Date(c.expires_at)))).length;
  const expiredCoupons = coupons.filter(c => c.expires_at && isPast(new Date(c.expires_at))).length;
  const globalCoupons = coupons.filter(c => !c.assignments || c.assignments.length === 0).length;
  const userAssignedCoupons = totalCoupons - globalCoupons;
  const totalRedeemed = coupons.reduce((sum, c) => sum + (c.used_count || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-foreground">VIP Coupons</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage discounts, offers, and VIP user assignments.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="rounded-xl bg-background" onClick={() => loadHubAndCoupons()}>
            Refresh
          </Button>
          <Button onClick={() => setShowForm(!showForm)} className="rounded-xl gap-2">
            <Plus className="h-4 w-4" /> Create VIP Coupon
          </Button>
        </div>
      </div>

      {/* Analytics Dashboard */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
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
            <p className="text-xs font-semibold text-blue-600 uppercase mb-1">Global</p>
            <p className="text-2xl font-black text-blue-600">{globalCoupons}</p>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-purple-500/5 border-purple-500/20">
          <CardContent className="p-4">
            <p className="text-xs font-semibold text-purple-600 uppercase mb-1">User Assigned</p>
            <p className="text-2xl font-black text-purple-600">{userAssignedCoupons}</p>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-amber-500/5 border-amber-500/20">
          <CardContent className="p-4">
            <p className="text-xs font-semibold text-amber-600 uppercase mb-1">Total Redeemed</p>
            <p className="text-2xl font-black text-amber-600">{totalRedeemed}</p>
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
              
              {/* Discount Basics */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>Coupon Code</Label>
                  <Input value={code} onChange={e => setCode(e.target.value)} placeholder="e.g. SUMMER50" required className="uppercase font-mono font-bold text-primary" />
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

              {/* Advanced Settings */}
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

                <div className="space-y-2 md:col-span-1">
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
                <p className="text-xs text-muted-foreground mb-3">Please assign the coupon to specific travellers. Global coupons are disabled.</p>
                
                <Popover open={openUserSearch} onOpenChange={setOpenUserSearch}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" role="combobox" aria-expanded={openUserSearch} className="w-full justify-between font-normal h-auto py-2.5">
                      {selectedUsers.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5 items-center">
                          <Badge variant="secondary" className="bg-emerald-100 text-emerald-800">{selectedUsers.length} Travellers Selected</Badge>
                          <span className="text-xs text-muted-foreground">Click to add more or modify</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground flex items-center gap-2"><Search className="h-4 w-4" /> Search and select specific travellers...</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[calc(100vw-2rem)] sm:w-[400px] p-0 max-w-[95vw]" align="start" sideOffset={8}>
                    <div className="flex items-center border-b px-3 bg-muted/20">
                      <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                      <Input 
                        placeholder="Type a name, email or mobile..." 
                        value={searchQuery} 
                        onChange={(e) => setSearchQuery(e.target.value)} 
                        className="flex-1 border-0 bg-transparent py-3 focus-visible:ring-0 shadow-none" 
                      />
                    </div>
                    <div className="max-h-[300px] overflow-y-auto p-1">
                      {isSearching ? (
                        <div className="flex items-center justify-center py-6 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading travellers...</div>
                      ) : searchResults.length === 0 ? (
                        <div className="py-6 text-center text-sm text-muted-foreground">No travellers found.</div>
                      ) : (
                        searchResults.map((user) => {
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
                                <div className="text-xs font-medium opacity-80 mt-0.5">{user.phone || "No Mobile Number"}</div>
                                <div className="text-xs font-medium opacity-70">{user.email || "No Email Address"}</div>
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

                {/* Selected Users Chips */}
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
          <div>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Tag className="h-4 w-4 text-emerald-600" /> VIP Coupon Directory
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto min-w-0 w-full">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/10">
                  <TableHead className="text-xs font-semibold whitespace-nowrap">Coupon Code</TableHead>
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
                  <TableRow><TableCell colSpan={8} className="text-center py-12"><Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" /></TableCell></TableRow>
                ) : coupons.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-12">
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
                          <span className="font-semibold text-sm">
                            {c.discount_percent ? `${c.discount_percent}% OFF` : `₹${c.discount_value} OFF`}
                          </span>
                          {c.max_discount && <p className="text-[10px] text-muted-foreground mt-0.5">Upto ₹{c.max_discount}</p>}
                        </TableCell>
                        <TableCell>
                          {c.assignments && c.assignments.length > 0 ? (
                            <div className="flex items-center gap-1.5 cursor-pointer hover:underline text-blue-600 font-semibold text-xs">
                              <Users className="h-3.5 w-3.5" /> {c.assignments.length} Travellers
                            </div>
                          ) : (
                            <Badge variant="secondary" className="text-[10px] bg-muted font-medium text-muted-foreground hover:bg-muted">Global</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Activity className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-xs font-medium">{c.used_count || 0} / {c.usage_limit ? c.usage_limit : '∞'}</span>
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
