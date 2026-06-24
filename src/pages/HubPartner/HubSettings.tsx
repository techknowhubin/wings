import { useState } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import {
  Sliders, Bell, CalendarRange, Truck, Building2, Wallet, Users, Shield,
  Loader2, Plus, Trash2, ShieldAlert, Key, Smartphone, Clock, Eye, AlertCircle
} from "lucide-react";
import { format } from "date-fns";
import { SecurityCard } from "@/components/SecurityCard";

const ROLES = ['Operations Manager', 'Booking Executive', 'Driver Manager', 'Finance Executive', 'Support Executive'];
const PERMISSIONS = ['View', 'Create', 'Edit', 'Delete'];

export default function HubSettings() {
  const { user } = useAuth();
  const { uuid } = useParams<{ uuid: string }>();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<"general" | "notifications" | "booking" | "driver" | "listing" | "financial" | "team" | "security">("general");

  // Team Member Form
  const [showAddMember, setShowAddMember] = useState(false);
  const [memberForm, setMemberForm] = useState({
    name: "",
    email: "",
    role: "Booking Executive",
    permissions: ["View"]
  });

  // Query Settings
  const { data: settings, isLoading } = useQuery({
    queryKey: ["hub-settings", uuid],
    enabled: !!uuid,
    queryFn: async () => {
      const { data: hub } = await supabase.from("hubs").select("id").eq("uuid", uuid).single();
      if (!hub) throw new Error("Hub not found");
      const userId = hub.id;

      let { data } = await supabase.from("hub_settings").select("*").eq("id", userId).maybeSingle();
      if (!data) {
        const { data: newSettings } = await supabase
          .from("hub_settings")
          .insert({ id: userId })
          .select("*")
          .single();
        data = newSettings;
      }
      return data;
    }
  });

  // Query Team Members
  const { data: teamMembers, isLoading: loadingTeam } = useQuery({
    queryKey: ["hub-team-members", uuid],
    enabled: !!uuid,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hub_team_members")
        .select("*")
        .eq("hub_id", uuid)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    }
  });

  // Save Settings Mutation
  const saveSettings = useMutation({
    mutationFn: async ({ category, value }: { category: string; value: any }) => {
      if (!settings) return;
      const { error } = await supabase
        .from("hub_settings")
        .update({ [category]: value, updated_at: new Date().toISOString() })
        .eq("id", settings.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hub-settings"] });
      toast({ title: "Settings auto-saved" });
    },
    onError: (e: any) => toast({ title: "Failed to save", description: e.message, variant: "destructive" })
  });

  // Add Team Member Mutation
  const addTeamMember = useMutation({
    mutationFn: async (data: typeof memberForm) => {
      const { data: hub } = await supabase.from("hubs").select("id").eq("uuid", uuid).single();
      if (!hub) throw new Error("Hub not found");
      const userId = hub.id;

      const { error } = await supabase
        .from("hub_team_members")
        .insert({
          hub_id: uuid,
          hub_partner_id: userId,
          name: data.name,
          email: data.email,
          role: data.role,
          permissions: data.permissions
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hub-team-members"] });
      toast({ title: "Team member added" });
      setShowAddMember(false);
      setMemberForm({ name: "", email: "", role: "Booking Executive", permissions: ["View"] });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" })
  });

  // Delete Team Member Mutation
  const deleteTeamMember = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("hub_team_members").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hub-team-members"] });
      toast({ title: "Team member removed" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" })
  });

  // Toggle Team Member Status Mutation
  const toggleMemberStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("hub_team_members").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hub-team-members"] });
      toast({ title: "Status updated" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" })
  });

  if (isLoading) {
    return (
      <div className="h-[70vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!settings) return null;

  // Extract settings values
  const general = (settings.general_settings || {}) as any;
  const notifications = (settings.notification_preferences || {}) as any;
  const booking = (settings.booking_settings || {}) as any;
  const driver = (settings.driver_settings || {}) as any;
  const listing = (settings.listing_settings || {}) as any;
  const financial = (settings.financial_settings || {}) as any;

  // Update helper
  const updateSettingsVal = (category: string, subkey: string, val: any) => {
    const orig = (settings as any)[category] || {};
    saveSettings.mutate({
      category,
      value: { ...orig, [subkey]: val }
    });
  };

  const updateNestedVal = (category: string, key1: string, key2: string, val: any) => {
    const orig = (settings as any)[category] || {};
    const nested = orig[key1] || {};
    saveSettings.mutate({
      category,
      value: { ...orig, [key1]: { ...nested, [key2]: val } }
    });
  };

  const tabs = [
    { id: "general", label: "General Settings", icon: Sliders },
    { id: "notifications", label: "Notification Preferences", icon: Bell },
    { id: "booking", label: "Booking Settings", icon: CalendarRange },
    { id: "driver", label: "Driver Settings", icon: Truck },
    { id: "listing", label: "Listing Settings", icon: Building2 },
    { id: "financial", label: "Financial Settings", icon: Wallet },
    { id: "team", label: "Team Management", icon: Users },
    { id: "security", label: "Security Settings", icon: Shield }
  ] as const;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Customize your hub, notifications, booking rules, and team</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Sidebar Nav */}
        <Card className="w-full lg:w-[260px] border-border/50 p-2 shrink-0">
          <nav className="flex flex-row lg:flex-col gap-1 overflow-x-auto lg:overflow-x-visible">
            {tabs.map(t => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all w-full text-left ${activeTab === t.id ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'}`}
              >
                <t.icon className="h-4 w-4 shrink-0" />
                {t.label}
              </button>
            ))}
          </nav>
        </Card>

        {/* Settings Panel */}
        <div className="flex-1 w-full space-y-6">
          {activeTab === "general" && (
            <Card className="border-border/50">
              <CardHeader className="border-b border-border/50 py-4"><CardTitle className="text-base font-bold">General Settings</CardTitle></CardHeader>
              <CardContent className="p-6 space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Time Zone</Label>
                    <Select value={general.time_zone || "Asia/Kolkata"} onValueChange={(val) => updateSettingsVal("general_settings", "time_zone", val)}>
                      <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Asia/Kolkata">India (IST) - GMT+5:30</SelectItem>
                        <SelectItem value="UTC">Coordinated Universal Time (UTC)</SelectItem>
                        <SelectItem value="Europe/London">London (GMT/BST)</SelectItem>
                        <SelectItem value="America/New_York">New York (EST/EDT)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Language</Label>
                    <Select value={general.language || "en"} onValueChange={(val) => updateSettingsVal("general_settings", "language", val)}>
                      <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en">English (US/UK)</SelectItem>
                        <SelectItem value="hi">Hindi (हिन्दी)</SelectItem>
                        <SelectItem value="te">Telugu (తెలుగు)</SelectItem>
                        <SelectItem value="ta">Tamil (தமிழ்)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Currency Symbol</Label>
                    <Select value={general.currency || "INR"} onValueChange={(val) => updateSettingsVal("general_settings", "currency", val)}>
                      <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="INR">Rupee (₹)</SelectItem>
                        <SelectItem value="USD">Dollar ($)</SelectItem>
                        <SelectItem value="EUR">Euro (€)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Date Format</Label>
                    <Select value={general.date_format || "dd-MMM-yyyy"} onValueChange={(val) => updateSettingsVal("general_settings", "date_format", val)}>
                      <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="dd-MMM-yyyy">dd-MMM-yyyy (18-Jun-2026)</SelectItem>
                        <SelectItem value="yyyy-MM-dd">yyyy-MM-dd (2026-06-18)</SelectItem>
                        <SelectItem value="MM/dd/yyyy">MM/dd/yyyy (06/18/2026)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === "notifications" && (
            <Card className="border-border/50">
              <CardHeader className="border-b border-border/50 py-4"><CardTitle className="text-base font-bold">Notification Preferences</CardTitle></CardHeader>
              <CardContent className="p-6 space-y-6">
                {/* Email Notifications */}
                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-foreground">Email Notifications</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[
                      { k: "summary", l: "Daily Booking Summary" },
                      { k: "alert", l: "New Booking Alert" },
                      { k: "cancel", l: "Cancellation Alert" },
                      { k: "settle", l: "Settlement Alert" }
                    ].map(item => (
                      <div key={item.k} className="flex items-center justify-between p-3 bg-muted/20 border border-border/50 rounded-xl">
                        <Label className="text-xs font-semibold">{item.l}</Label>
                        <Switch checked={notifications.email?.[item.k] ?? true} onCheckedChange={(val) => updateNestedVal("notification_preferences", "email", item.k, val)} />
                      </div>
                    ))}
                  </div>
                </div>

                {/* SMS & WhatsApp Notifications */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                  <div className="space-y-3">
                    <h3 className="text-sm font-bold text-foreground">SMS Notifications</h3>
                    <div className="space-y-2">
                      {[
                        { k: "alert", l: "New Booking Alert" },
                        { k: "driver", l: "Driver Assignment Alert" }
                      ].map(item => (
                        <div key={item.k} className="flex items-center justify-between p-3 bg-muted/20 border border-border/50 rounded-xl">
                          <Label className="text-xs font-semibold">{item.l}</Label>
                          <Switch checked={notifications.sms?.[item.k] ?? true} onCheckedChange={(val) => updateNestedVal("notification_preferences", "sms", item.k, val)} />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-sm font-bold text-foreground">WhatsApp Notifications</h3>
                    <div className="space-y-2">
                      {[
                        { k: "updates", l: "Booking Updates" },
                        { k: "traveller", l: "Traveller Updates" },
                        { k: "payment", l: "Payment Updates" }
                      ].map(item => (
                        <div key={item.k} className="flex items-center justify-between p-3 bg-muted/20 border border-border/50 rounded-xl">
                          <Label className="text-xs font-semibold">{item.l}</Label>
                          <Switch checked={notifications.whatsapp?.[item.k] ?? true} onCheckedChange={(val) => updateNestedVal("notification_preferences", "whatsapp", item.k, val)} />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Push Notifications */}
                <div className="space-y-3 pt-2">
                  <h3 className="text-sm font-bold text-foreground">Push Notifications</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {[
                      { k: "alerts", l: "Real-time Alerts" },
                      { k: "tickets", l: "Support Tickets" },
                      { k: "driver", l: "Driver Activity" }
                    ].map(item => (
                      <div key={item.k} className="flex items-center justify-between p-3 bg-muted/20 border border-border/50 rounded-xl">
                        <Label className="text-xs font-semibold">{item.l}</Label>
                        <Switch checked={notifications.push?.[item.k] ?? true} onCheckedChange={(val) => updateNestedVal("notification_preferences", "push", item.k, val)} />
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === "booking" && (
            <Card className="border-border/50">
              <CardHeader className="border-b border-border/50 py-4"><CardTitle className="text-base font-bold">Booking Settings</CardTitle></CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="flex items-center justify-between p-4 bg-muted/20 border border-border/50 rounded-xl">
                  <div>
                    <h4 className="text-xs font-bold">Auto Accept Bookings</h4>
                    <p className="text-[10px] text-muted-foreground">Instantly confirm bookings without manual review</p>
                  </div>
                  <Switch checked={booking.auto_accept ?? false} onCheckedChange={(val) => updateSettingsVal("booking_settings", "auto_accept", val)} />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Booking Cutoff Time (hours before start)</Label>
                  <div className="flex items-center gap-4">
                    <Slider max={24} min={1} step={1} value={[booking.cutoff_hours || 4]} onValueChange={([val]) => updateSettingsVal("booking_settings", "cutoff_hours", val)} className="flex-1" />
                    <span className="text-xs font-bold text-emerald-600 font-mono w-12">{booking.cutoff_hours || 4} hrs</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Cancellation Rules</Label>
                    <Select value={booking.cancellation_rules || "standard"} onValueChange={(val) => updateSettingsVal("booking_settings", "cancellation_rules", val)}>
                      <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="flexible">Flexible (100% refund up to 12h)</SelectItem>
                        <SelectItem value="standard">Standard (100% refund up to 24h)</SelectItem>
                        <SelectItem value="strict">Strict (No refund within 48h)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Refund Policy</Label>
                    <Select value={booking.refund_policy || "standard"} onValueChange={(val) => updateSettingsVal("booking_settings", "refund_policy", val)}>
                      <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="standard">Standard (Refund to original source, 5-7 days)</SelectItem>
                        <SelectItem value="wallet">Wallet Credits (Instant refund to wallet)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === "driver" && (
            <Card className="border-border/50">
              <CardHeader className="border-b border-border/50 py-4"><CardTitle className="text-base font-bold">Driver Settings</CardTitle></CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="flex items-center justify-between p-4 bg-muted/20 border border-border/50 rounded-xl">
                  <div>
                    <h4 className="text-xs font-bold">Auto Assign Driver</h4>
                    <p className="text-[10px] text-muted-foreground">Automatically assign available driver when a booking is confirmed</p>
                  </div>
                  <Switch checked={driver.auto_assign ?? false} onCheckedChange={(val) => updateSettingsVal("driver_settings", "auto_assign", val)} />
                </div>

                <div className="flex items-center justify-between p-4 bg-muted/20 border border-border/50 rounded-xl">
                  <div>
                    <h4 className="text-xs font-bold">Driver Verification Required</h4>
                    <p className="text-[10px] text-muted-foreground">Drivers must be verified before they can accept bookings</p>
                  </div>
                  <Switch checked={driver.verification_required ?? true} onCheckedChange={(val) => updateSettingsVal("driver_settings", "verification_required", val)} />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Driver Availability Rules</Label>
                  <Select value={driver.availability_rules || "standard"} onValueChange={(val) => updateSettingsVal("driver_settings", "availability_rules", val)}>
                    <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="standard">Standard (Available for assigned hub vehicle)</SelectItem>
                      <SelectItem value="flexible">Flexible (Allow pool sharing across hubs)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === "listing" && (
            <Card className="border-border/50">
              <CardHeader className="border-b border-border/50 py-4"><CardTitle className="text-base font-bold">Listing Settings</CardTitle></CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="flex items-center justify-between p-4 bg-muted/20 border border-border/50 rounded-xl">
                  <div>
                    <h4 className="text-xs font-bold">Auto Approve Listings</h4>
                    <p className="text-[10px] text-muted-foreground">Listings will bypass moderator review and go live immediately</p>
                  </div>
                  <Switch checked={listing.auto_approve ?? false} onCheckedChange={(val) => updateSettingsVal("listing_settings", "auto_approve", val)} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Listing Visibility</Label>
                    <Select value={listing.visibility || "public"} onValueChange={(val) => updateSettingsVal("listing_settings", "visibility", val)}>
                      <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="public">Public (Visible to all travellers)</SelectItem>
                        <SelectItem value="unlisted">Unlisted (Visible via direct links only)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Featured Listing Priority</Label>
                    <Select value={listing.featured_priority || "normal"} onValueChange={(val) => updateSettingsVal("listing_settings", "featured_priority", val)}>
                      <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low (Standard listing rank)</SelectItem>
                        <SelectItem value="normal">Normal (Standard platform weights)</SelectItem>
                        <SelectItem value="high">High (Featured above local searches)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === "financial" && (
            <Card className="border-border/50">
              <CardHeader className="border-b border-border/50 py-4"><CardTitle className="text-base font-bold">Financial Settings</CardTitle></CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Settlement Frequency</Label>
                    <Select value={financial.settlement_frequency || "Monthly"} onValueChange={(val) => updateSettingsVal("financial_settings", "settlement_frequency", val)}>
                      <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Daily">Daily Payouts</SelectItem>
                        <SelectItem value="Weekly">Weekly Settlements</SelectItem>
                        <SelectItem value="Monthly">Monthly Settlements</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Preferred Payment Method</Label>
                    <Select value={financial.preferred_payment_method || "Bank Transfer"} onValueChange={(val) => updateSettingsVal("financial_settings", "preferred_payment_method", val)}>
                      <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Bank Transfer">Bank Transfer / NEFT</SelectItem>
                        <SelectItem value="UPI">UPI Payout</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="p-4 bg-muted/30 border border-border/50 rounded-xl space-y-2 text-xs">
                  <h4 className="font-bold flex items-center gap-1.5"><Wallet className="h-4 w-4 text-emerald-600" /> Platform Commission Rate (View Only)</h4>
                  <p className="text-muted-foreground">Your platform referral rate is locked at <span className="font-semibold text-foreground">5.00%</span> of the booking value. If you need details or want to dispute this, contact platform support.</p>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === "team" && (
            <Card className="border-border/50">
              <CardHeader className="flex flex-row items-center justify-between border-b border-border/50 py-3.5">
                <div>
                  <CardTitle className="text-base font-bold">Team Management</CardTitle>
                  <CardDescription className="text-xs">Manage active sub-executive logins and permissions</CardDescription>
                </div>
                <Button onClick={() => setShowAddMember(true)} size="sm" className="rounded-xl gap-2 font-semibold">
                  <Plus className="h-4 w-4" /> Add Team Member
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto min-w-0 w-full pb-2">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/10">
                        {['Name', 'Email', 'Role', 'Permissions', 'Status', 'Actions'].map(h => (
                          <TableHead key={h} className="text-xs font-semibold uppercase tracking-wider">{h}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loadingTeam ? (
                        <TableRow><TableCell colSpan={6} className="h-24 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" /></TableCell></TableRow>
                      ) : !teamMembers || teamMembers.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-xs text-muted-foreground py-10">No team members added yet.</TableCell>
                        </TableRow>
                      ) : (
                        teamMembers.map((m: any) => (
                          <TableRow key={m.id} className="hover:bg-muted/30 transition-colors">
                            <TableCell className="text-xs font-semibold">{m.name}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">{m.email}</TableCell>
                            <TableCell className="text-xs font-semibold text-emerald-700">{m.role}</TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {m.permissions?.map((p: string) => (
                                  <Badge key={p} variant="outline" className="text-[9px] px-1.5 py-0.5">{p}</Badge>
                                ))}
                              </div>
                            </TableCell>
                            <TableCell>
                              <button
                                onClick={() => toggleMemberStatus.mutate({ id: m.id, status: m.status === 'Active' ? 'Inactive' : 'Active' })}
                                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full transition-colors ${m.status === 'Active' ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
                              >
                                {m.status || 'Active'}
                              </button>
                            </TableCell>
                            <TableCell>
                              <Button onClick={() => deleteTeamMember.mutate(m.id)} variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:text-destructive hover:bg-destructive/10">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === "security" && (
            <Card className="border-border/50">
              <CardHeader className="border-b border-border/50 py-4"><CardTitle className="text-base font-bold">Security Settings</CardTitle></CardHeader>
              <CardContent className="p-6 space-y-6">
                {user && <SecurityCard userId={user.id} />}

                <div className="space-y-3 pt-2">
                  <h3 className="text-sm font-bold flex items-center gap-1.5"><Clock className="h-4 w-4 text-primary" /> Active Login Sessions</h3>
                  <div className="border border-border/50 rounded-xl overflow-hidden text-xs">
                    <div className="p-3 bg-muted/30 border-b border-border/50 flex justify-between font-semibold">
                      <span>Device / Browser</span>
                      <span>Location</span>
                      <span>Status</span>
                    </div>
                    <div className="divide-y divide-border/30">
                      {[
                        { dev: "Chrome 125.0 · Windows OS (Current Session)", loc: "Hyderabad, IN", status: "Active Now", color: "text-emerald-600 font-bold" },
                        { dev: "Safari · iPhone 15 Pro", loc: "Secunderabad, IN", status: "Active 4h ago", color: "text-muted-foreground" },
                      ].map((sess, idx) => (
                        <div key={idx} className="p-3 flex justify-between items-center hover:bg-muted/10">
                          <p className="font-semibold">{sess.dev}</p>
                          <p className="text-muted-foreground">{sess.loc}</p>
                          <span className={sess.color}>{sess.status}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Dialog: Add Team Member */}
      <Dialog open={showAddMember} onOpenChange={setShowAddMember}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Team Member</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Name</Label>
              <Input value={memberForm.name} onChange={(e) => setMemberForm({ ...memberForm, name: e.target.value })} placeholder="Full name" className="rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Email Address</Label>
              <Input value={memberForm.email} onChange={(e) => setMemberForm({ ...memberForm, email: e.target.value })} placeholder="username@hub.com" className="rounded-xl" type="email" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Role</Label>
              <Select value={memberForm.role} onValueChange={(val) => setMemberForm({ ...memberForm, role: val })}>
                <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>{ROLES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Permissions</Label>
              <div className="flex flex-wrap gap-4 pt-1">
                {PERMISSIONS.map(p => (
                  <div key={p} className="flex items-center gap-1.5">
                    <input
                      type="checkbox"
                      id={`perm-${p}`}
                      checked={memberForm.permissions.includes(p)}
                      onChange={(e) => {
                        const newPerms = e.target.checked
                          ? [...memberForm.permissions, p]
                          : memberForm.permissions.filter(perm => perm !== p);
                        setMemberForm({ ...memberForm, permissions: newPerms });
                      }}
                      className="rounded border-border text-emerald-600 focus:ring-emerald-500"
                    />
                    <label htmlFor={`perm-${p}`} className="text-xs font-semibold">{p}</label>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddMember(false)} className="rounded-xl">Cancel</Button>
            <Button
              onClick={() => addTeamMember.mutate(memberForm)}
              disabled={!memberForm.name || !memberForm.email || memberForm.permissions.length === 0 || addTeamMember.isPending}
              className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {addTeamMember.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : "Add Member"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
