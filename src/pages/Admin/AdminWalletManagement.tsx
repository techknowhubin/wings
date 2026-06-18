import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Loader2, Save, Gift, History, Users, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { INR } from "@/lib/utils";

export default function AdminWalletManagement() {
  const [activeTab, setActiveTab] = useState("settings");

  // Wallet Settings Form State
  const [settings, setSettings] = useState({
    signup_bonus: 1000,
    referral_bonus: 500,
    expiry_days: 90,
    max_redemption_percentage: 10,
    program_enabled: true,
  });
  const [savingSettings, setSavingSettings] = useState(false);

  // User Ledger Management State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [adjustAmount, setAdjustAmount] = useState("");
  const [adjustType, setAdjustType] = useState<"admin_credit" | "admin_deduction">("admin_credit");
  const [adjusting, setAdjusting] = useState(false);

  // Fetch Wallet Settings
  const { data: serverSettings, isLoading: settingsLoading, refetch: refetchSettings } = useQuery({
    queryKey: ["admin-wallet-settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("wallet_settings").select("*").maybeSingle();
      if (error && error.code !== "PGRST116") throw error;
      return data;
    },
  });

  useEffect(() => {
    if (serverSettings) {
      setSettings({
        signup_bonus: Number(serverSettings.signup_bonus),
        referral_bonus: Number(serverSettings.referral_bonus),
        expiry_days: Number(serverSettings.expiry_days),
        max_redemption_percentage: Number(serverSettings.max_redemption_percentage),
        program_enabled: Boolean(serverSettings.program_enabled),
      });
    }
  }, [serverSettings]);

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      if (serverSettings?.id) {
        await supabase.from("wallet_settings").update(settings).eq("id", serverSettings.id);
      } else {
        await supabase.from("wallet_settings").insert([settings]);
      }
      toast.success("Settings saved successfully.");
      refetchSettings();
    } catch (err: any) {
      toast.error(err.message || "Failed to save settings.");
    } finally {
      setSavingSettings(false);
    }
  };

  // Search Users
  const { data: searchResults, isLoading: searching } = useQuery({
    queryKey: ["admin-user-search", searchQuery],
    queryFn: async () => {
      if (!searchQuery.trim() || searchQuery.length < 3) return [];
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, display_name, email, phone")
        .or(`full_name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%,phone.ilike.%${searchQuery}%`)
        .limit(10);
      if (error) throw error;
      return data || [];
    },
    enabled: searchQuery.length >= 3,
  });

  // Fetch Selected User Wallet
  const { data: userWallet, isLoading: walletLoading, refetch: refetchWallet } = useQuery({
    queryKey: ["admin-user-wallet", selectedUser?.id],
    queryFn: async () => {
      if (!selectedUser) return null;
      const { data, error } = await supabase.from("wallets").select("*").eq("user_id", selectedUser.id).maybeSingle();
      if (error && error.code !== "PGRST116") throw error;
      return data;
    },
    enabled: !!selectedUser,
  });

  // Fetch Selected User Transactions
  const { data: userTransactions, isLoading: txLoading, refetch: refetchTx } = useQuery({
    queryKey: ["admin-user-wallet-tx", userWallet?.id],
    queryFn: async () => {
      if (!userWallet?.id) return [];
      const { data, error } = await supabase
        .from("wallet_transactions")
        .select("*")
        .eq("wallet_id", userWallet.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!userWallet?.id,
  });

  const handleAdjustBalance = async () => {
    if (!selectedUser || !adjustAmount || isNaN(Number(adjustAmount))) {
      toast.error("Invalid adjustment details.");
      return;
    }
    const amount = Number(adjustAmount);
    if (amount <= 0) {
      toast.error("Amount must be greater than 0.");
      return;
    }
    setAdjusting(true);
    try {
      const finalAmount = adjustType === "admin_credit" ? amount : -amount;
      const { error } = await supabase.rpc("process_wallet_transaction", {
        p_user_id: selectedUser.id,
        p_type: adjustType,
        p_amount: finalAmount,
        p_source: "admin_dashboard",
      });
      if (error) throw error;
      toast.success("Wallet balance adjusted successfully.");
      setAdjustAmount("");
      refetchWallet();
      refetchTx();
    } catch (err: any) {
      toast.error(err.message || "Failed to adjust balance.");
    } finally {
      setAdjusting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Wing Credits Management</h1>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-background border border-border h-12 w-full justify-start overflow-x-auto rounded-xl">
          <TabsTrigger value="settings" className="rounded-lg">Settings</TabsTrigger>
          <TabsTrigger value="users" className="rounded-lg">User Wallets & Ledgers</TabsTrigger>
        </TabsList>

        <TabsContent value="settings" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Program Configuration</CardTitle>
              <CardDescription>Configure rules and rewards for Wing Credits.</CardDescription>
            </CardHeader>
            <CardContent>
              {settingsLoading ? (
                <div className="flex items-center justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl">
                  <div className="space-y-2 col-span-full">
                    <Label className="flex items-center justify-between p-4 border border-border rounded-xl bg-muted/20">
                      <div>
                        <p className="font-semibold text-foreground">Enable Program</p>
                        <p className="text-sm text-muted-foreground font-normal">Turn the entire Wing Credits ecosystem on or off.</p>
                      </div>
                      <Switch 
                        checked={settings.program_enabled} 
                        onCheckedChange={(v) => setSettings({ ...settings, program_enabled: v })} 
                      />
                    </Label>
                  </div>

                  <div className="space-y-2">
                    <Label>Sign-Up Bonus (₹)</Label>
                    <Input 
                      type="number" 
                      value={settings.signup_bonus} 
                      onChange={(e) => setSettings({ ...settings, signup_bonus: Number(e.target.value) })} 
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Referral Bonus (₹)</Label>
                    <Input 
                      type="number" 
                      value={settings.referral_bonus} 
                      onChange={(e) => setSettings({ ...settings, referral_bonus: Number(e.target.value) })} 
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Credit Expiry (Days)</Label>
                    <Input 
                      type="number" 
                      value={settings.expiry_days} 
                      onChange={(e) => setSettings({ ...settings, expiry_days: Number(e.target.value) })} 
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Max Redemption per Booking (%)</Label>
                    <Input 
                      type="number" 
                      value={settings.max_redemption_percentage} 
                      onChange={(e) => setSettings({ ...settings, max_redemption_percentage: Number(e.target.value) })} 
                    />
                  </div>

                  <div className="col-span-full pt-4">
                    <Button onClick={handleSaveSettings} disabled={savingSettings}>
                      {savingSettings ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                      Save Configuration
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Search Panel */}
            <Card className="lg:col-span-1 h-fit">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2"><Users className="h-5 w-5 text-primary" /> Search User</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input 
                  placeholder="Search by name, email or phone (min 3 chars)" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                
                {searching && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground mx-auto" />}
                
                <div className="divide-y divide-border border border-border rounded-xl overflow-hidden max-h-96 overflow-y-auto">
                  {searchResults?.map((u: any) => (
                    <button
                      key={u.id}
                      onClick={() => setSelectedUser(u)}
                      className={`w-full text-left p-3 text-sm transition-colors ${selectedUser?.id === u.id ? "bg-primary/10 text-primary" : "hover:bg-muted"}`}
                    >
                      <p className="font-semibold truncate">{u.full_name || u.display_name || "Unknown"}</p>
                      <p className="text-xs text-muted-foreground truncate">{u.email || u.phone}</p>
                    </button>
                  ))}
                  {searchQuery.length >= 3 && searchResults?.length === 0 && !searching && (
                    <p className="p-4 text-center text-xs text-muted-foreground">No users found.</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Ledger & Controls Panel */}
            <div className="lg:col-span-2 space-y-6">
              {!selectedUser ? (
                <Card>
                  <CardContent className="p-12 text-center text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-4 opacity-20" />
                    <p>Select a user to view and manage their wallet</p>
                  </CardContent>
                </Card>
              ) : (
                <>
                  <Card>
                    <CardHeader className="pb-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle>{selectedUser.full_name || selectedUser.display_name}</CardTitle>
                          <CardDescription>{selectedUser.email || selectedUser.phone}</CardDescription>
                        </div>
                        <Button variant="outline" size="icon" onClick={() => { refetchWallet(); refetchTx(); }}>
                          <RefreshCw className={`h-4 w-4 ${walletLoading || txLoading ? "animate-spin" : ""}`} />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {walletLoading ? (
                        <div className="py-8 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" /></div>
                      ) : !userWallet ? (
                        <div className="py-4 text-center">
                          <p className="text-muted-foreground text-sm mb-4">This user does not have a wallet yet.</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-3 gap-4 mb-6">
                          <div className="p-4 rounded-xl bg-primary/10 border border-primary/20">
                            <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-1">Balance</p>
                            <p className="text-2xl font-bold text-primary">{INR(userWallet.balance)}</p>
                          </div>
                          <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20">
                            <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-1">Lifetime Earned</p>
                            <p className="text-lg font-bold text-green-700">{INR(userWallet.lifetime_earned)}</p>
                          </div>
                          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
                            <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-1">Redeemed</p>
                            <p className="text-lg font-bold text-amber-700">{INR(userWallet.lifetime_redeemed)}</p>
                          </div>
                        </div>
                      )}

                      <div className="bg-muted/30 p-4 rounded-xl border border-border">
                        <h4 className="text-sm font-semibold mb-3">Manual Adjustment</h4>
                        <div className="flex gap-3 items-end flex-wrap">
                          <div className="space-y-1.5 flex-1 min-w-[200px]">
                            <Label>Amount</Label>
                            <Input 
                              type="number" 
                              placeholder="e.g. 500" 
                              value={adjustAmount} 
                              onChange={(e) => setAdjustAmount(e.target.value)}
                            />
                          </div>
                          <div className="space-y-1.5 flex-1 min-w-[200px]">
                            <Label>Type</Label>
                            <select 
                              className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                              value={adjustType}
                              onChange={(e) => setAdjustType(e.target.value as any)}
                            >
                              <option value="admin_credit">Credit (Add)</option>
                              <option value="admin_deduction">Debit (Deduct)</option>
                            </select>
                          </div>
                          <Button onClick={handleAdjustBalance} disabled={adjusting || !userWallet}>
                            {adjusting ? "Processing..." : "Apply Adjustment"}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <History className="h-4 w-4" /> Transaction Ledger
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="divide-y divide-border">
                        {txLoading ? (
                          <div className="py-8 text-center"><Loader2 className="h-5 w-5 animate-spin mx-auto text-primary" /></div>
                        ) : userTransactions?.length === 0 ? (
                          <p className="py-8 text-center text-sm text-muted-foreground">No transactions found.</p>
                        ) : (
                          userTransactions?.map((tx: any) => (
                            <div key={tx.id} className="p-4 flex items-center justify-between hover:bg-muted/30">
                              <div>
                                <p className="font-semibold text-sm capitalize">{tx.type.replace(/_/g, ' ')}</p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  {format(new Date(tx.created_at), 'MMM dd, yyyy HH:mm')} • {tx.source || 'system'}
                                </p>
                                {tx.reference_id && <p className="text-[10px] text-muted-foreground font-mono mt-0.5">Ref: {tx.reference_id}</p>}
                              </div>
                              <div className="text-right">
                                <p className={`font-bold ${tx.amount > 0 ? "text-green-600" : "text-foreground"}`}>
                                  {tx.amount > 0 ? "+" : ""}{INR(tx.amount)}
                                </p>
                                <p className="text-[10px] uppercase text-muted-foreground font-semibold mt-1">{tx.status}</p>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
