import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Tag, Users, Plus, Search, Check, Loader2 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";

export default function AdminCoupons() {
  const [coupons, setCoupons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Form State
  const [showForm, setShowForm] = useState(false);
  const [code, setCode] = useState("");
  const [discountValue, setDiscountValue] = useState("");
  const [discountType, setDiscountType] = useState<"flat" | "percent">("flat");
  const [usageLimit, setUsageLimit] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  
  // User Search State
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [openUserSearch, setOpenUserSearch] = useState(false);

  useEffect(() => {
    loadCoupons();
  }, []);

  const loadCoupons = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('host_coupons' as any)
      .select('*, hub:hubs(business_name, owner_name), assignments:host_coupon_assignments(user_id, profiles(full_name))')
      .order('created_at', { ascending: false });
    
    if (data) {
      setCoupons(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (!searchQuery.trim()) {
        setSearchResults([]);
        return;
      }
      setIsSearching(true);
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, email, phone')
        .or(`full_name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%,phone.ilike.%${searchQuery}%`)
        .limit(5);
      
      setSearchResults(data || []);
      setIsSearching(false);
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code) return toast({ title: "Code required", variant: "destructive" });

    const payload: any = {
      code: code.toUpperCase(),
      is_platform_offer: true,
      is_active: true,
      discount_value: discountType === "flat" ? Number(discountValue) : null,
      discount_percent: discountType === "percent" ? Number(discountValue) : null,
      target_user_id: selectedUser?.id || null,
      target_email: selectedUser?.email || null,
      target_phone: selectedUser?.phone || null,
      usage_limit: usageLimit ? Number(usageLimit) : null,
      expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
    };

    const { error } = await supabase.from('host_coupons' as any).insert(payload);
    if (error) {
      toast({ title: "Failed to create", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "VIP Coupon Created" });
      setShowForm(false);
      setCode("");
      setDiscountValue("");
      setSelectedUser(null);
      setSearchQuery("");
      setUsageLimit("");
      setExpiresAt("");
      loadCoupons();
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase.from('host_coupons' as any).update({ is_active: !currentStatus }).eq('id', id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Status updated" });
      loadCoupons();
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4 text-center">
            <p className="text-xs text-blue-600 font-semibold mb-1">Total Coupons</p>
            <p className="text-2xl font-black text-blue-900">{coupons.length}</p>
          </CardContent>
        </Card>
        <Card className="bg-emerald-50 border-emerald-200">
          <CardContent className="p-4 text-center">
            <p className="text-xs text-emerald-600 font-semibold mb-1">Active</p>
            <p className="text-2xl font-black text-emerald-900">{coupons.filter(c => c.is_active && (!c.expires_at || new Date(c.expires_at) > new Date())).length}</p>
          </CardContent>
        </Card>
        <Card className="bg-rose-50 border-rose-200">
          <CardContent className="p-4 text-center">
            <p className="text-xs text-rose-600 font-semibold mb-1">Expired/Inactive</p>
            <p className="text-2xl font-black text-rose-900">{coupons.filter(c => !c.is_active || (c.expires_at && new Date(c.expires_at) < new Date())).length}</p>
          </CardContent>
        </Card>
        <Card className="bg-purple-50 border-purple-200">
          <CardContent className="p-4 text-center">
            <p className="text-xs text-purple-600 font-semibold mb-1">Total Redeemed</p>
            <p className="text-2xl font-black text-purple-900">{coupons.reduce((sum, c) => sum + (c.used_count || 0), 0)}</p>
          </CardContent>
        </Card>
        <Card className="bg-amber-50 border-amber-200">
          <CardContent className="p-4 text-center">
            <p className="text-xs text-amber-600 font-semibold mb-1">By Hubs</p>
            <p className="text-2xl font-black text-amber-900">{coupons.filter(c => !c.is_platform_offer).length}</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-foreground">VIP Coupon Management</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage all global and Hub Partner VIP coupons.</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} className="rounded-xl gap-2">
          <Plus className="h-4 w-4" /> Create Platform Coupon
        </Button>
      </div>

      {showForm && (
        <Card className="border-border/50 border-emerald-500/30 shadow-md">
          <CardHeader>
            <CardTitle className="text-lg">Create New VIP Coupon</CardTitle>
            <CardDescription>Create a global coupon or assign it to a specific user.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Coupon Code</Label>
                  <Input value={code} onChange={e => setCode(e.target.value)} placeholder="e.g. VIP1000" required className="uppercase font-mono font-bold text-emerald-600" />
                </div>
                <div className="space-y-2">
                  <Label>Discount ({discountType === "flat" ? "₹" : "%"})</Label>
                  <div className="flex gap-2">
                    <Input type="number" value={discountValue} onChange={e => setDiscountValue(e.target.value)} placeholder="e.g. 1000" required />
                    <Button type="button" variant="outline" onClick={() => setDiscountType(t => t === 'flat' ? 'percent' : 'flat')}>
                      Switch to {discountType === 'flat' ? '%' : '₹'}
                    </Button>
                  </div>
                </div>
                
                <div className="space-y-2 md:col-span-2">
                  <Label>Assign to specific user (Optional)</Label>
                  <Popover open={openUserSearch} onOpenChange={setOpenUserSearch}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" role="combobox" aria-expanded={openUserSearch} className="w-full justify-between font-normal h-auto py-2.5">
                        {selectedUser ? (
                          <div className="flex flex-col items-start text-left">
                            <span className="font-semibold text-sm">{selectedUser.full_name}</span>
                            <span className="text-xs text-muted-foreground">{selectedUser.email} • {selectedUser.phone}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">Search by Name, Email, or Phone...</span>
                        )}
                        <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[400px] p-0" align="start">
                      <div className="flex items-center border-b px-3">
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
                          <div className="flex items-center justify-center py-6 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin mr-2" /> Searching...</div>
                        ) : searchResults.length === 0 && searchQuery ? (
                          <div className="py-6 text-center text-sm text-muted-foreground">No users found.</div>
                        ) : (
                          searchResults.map((user) => (
                            <div 
                              key={user.id}
                              onClick={() => {
                                setSelectedUser(user);
                                setOpenUserSearch(false);
                              }}
                              className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
                            >
                              <div className="flex flex-col flex-1">
                                <span className="font-medium">{user.full_name || 'Guest User'}</span>
                                <span className="text-xs text-muted-foreground">{user.email || 'No email'} • {user.phone || 'No phone'}</span>
                              </div>
                              {selectedUser?.id === user.id && <Check className="h-4 w-4 ml-2 text-emerald-600" />}
                            </div>
                          ))
                        )}
                        <div 
                           onClick={() => { setSelectedUser(null); setOpenUserSearch(false); setSearchQuery(""); }}
                           className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-2 text-sm outline-none hover:bg-destructive/10 text-destructive mt-1 border-t"
                        >
                          Clear Selection (Make Global)
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label>Usage Limit (Optional)</Label>
                  <Input type="number" value={usageLimit} onChange={e => setUsageLimit(e.target.value)} placeholder="e.g. 1" />
                </div>
                <div className="space-y-2">
                  <Label>Expiry Date (Optional)</Label>
                  <Input type="datetime-local" value={expiresAt} onChange={e => setExpiresAt(e.target.value)} />
                </div>
              </div>
              <Button type="submit" className="w-full">Create VIP Coupon</Button>
            </form>
          </CardContent>
        </Card>
      )}

      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <Tag className="h-4 w-4 text-emerald-600" /> VIP Coupon Directory
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/10">
                <TableHead className="text-xs font-semibold">Code</TableHead>
                <TableHead className="text-xs font-semibold">Creator</TableHead>
                <TableHead className="text-xs font-semibold">Discount</TableHead>
                <TableHead className="text-xs font-semibold">Assigned Travellers</TableHead>
                <TableHead className="text-xs font-semibold">Usage Limit</TableHead>
                <TableHead className="text-xs font-semibold">Expiry</TableHead>
                <TableHead className="text-xs font-semibold">Status</TableHead>
                <TableHead className="text-xs font-semibold">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" /></TableCell></TableRow>
              ) : coupons.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    No platform coupons found.
                  </TableCell>
                </TableRow>
              ) : (
                coupons.map(c => (
                  <TableRow key={c.id}>
                    <TableCell className="font-mono text-sm font-bold text-emerald-600">{c.code}</TableCell>
                    <TableCell>
                      {c.is_platform_offer ? (
                        <Badge variant="secondary" className="bg-blue-100 text-blue-800 border-blue-200 text-[10px]">Platform Admin</Badge>
                      ) : (
                        <div className="flex flex-col">
                          <span className="text-xs font-semibold">{c.hub?.business_name || 'Unknown Hub'}</span>
                          <span className="text-[10px] text-muted-foreground">{c.hub?.owner_name}</span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-semibold text-sm">{c.discount_percent ? `${c.discount_percent}% OFF` : `₹${c.discount_value} OFF`}</TableCell>
                    <TableCell>
                      {c.assignments && c.assignments.length > 0 ? (
                        <div className="flex flex-col gap-0.5">
                          <Badge variant="outline" className="text-[10px] w-fit mb-1">{c.assignments.length} Traveller(s)</Badge>
                          <span className="text-[10px] text-muted-foreground line-clamp-1">
                            {c.assignments.map((a: any) => a.profiles?.full_name).filter(Boolean).join(", ")}
                          </span>
                        </div>
                      ) : c.target_user_id ? (
                        <div className="flex flex-col">
                          <span className="text-xs font-semibold text-blue-600">Legacy Assignment</span>
                        </div>
                      ) : (
                        <Badge variant="secondary" className="text-[10px] font-medium bg-gray-100">Global</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-xs">{c.usage_limit ? `${c.used_count || 0} / ${c.usage_limit}` : 'Unlimited'}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {c.expires_at ? format(new Date(c.expires_at), 'dd MMM yyyy') : "No Expiry"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={c.is_active ? "default" : "destructive"} className="text-[10px]">
                        {c.is_active ? "Active" : "Disabled"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm" onClick={() => handleToggleStatus(c.id, c.is_active)} className="h-8 text-xs">
                        {c.is_active ? "Disable" : "Enable"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
