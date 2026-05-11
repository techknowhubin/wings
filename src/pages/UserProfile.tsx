import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import {
  User, Calendar, ShieldCheck, Lock, Bell, HelpCircle, LogOut,
  Camera, Edit2, Save, Check, Clock, Upload, X, Eye, EyeOff,
  FileText, ChevronRight, ExternalLink, MessageSquare, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/useAuth";
import { useProfile, useUpdateProfile } from "@/hooks/useListings";
import { useTheme } from "@/components/ThemeProvider";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { DynamicLogo } from "@/components/DynamicLogo";
import { useQuery } from "@tanstack/react-query";
import { format, parseISO, isValid } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";
import { CalendarIcon } from "lucide-react";

// ======================== Types ========================

type Section = "profile" | "bookings" | "kyc" | "security" | "notifications" | "help";

interface KYCDoc {
  name: string;
  type: "aadhaar" | "pan" | "driving_license";
  status: string;
  doc_number?: string | null;
}

// ======================== Sidebar Nav ========================

const navItems: { icon: typeof User; label: string; section: Section }[] = [
  { icon: User, label: "My Profile", section: "profile" },
  { icon: Calendar, label: "Booking History", section: "bookings" },
  { icon: ShieldCheck, label: "KYC Details", section: "kyc" },
  { icon: Lock, label: "Security & Password", section: "security" },
  { icon: Bell, label: "Notifications", section: "notifications" },
  { icon: HelpCircle, label: "Help & Support", section: "help" },
];

// ======================== Masked Input ========================

function MaskedInput({
  value, onChange, placeholder,
}: {
  value: string; onChange: (v: string) => void; placeholder: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input type={show ? "text" : "password"} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
      <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

// ======================== Password Strength ========================

function PasswordStrength({ password }: { password: string }) {
  let strength = 0;
  if (password.length >= 8) strength++;
  if (/[A-Z]/.test(password)) strength++;
  if (/[0-9]/.test(password)) strength++;
  if (/[^A-Za-z0-9]/.test(password)) strength++;
  const labels = ["Weak", "Fair", "Good", "Strong"];
  const colors = ["bg-destructive", "bg-orange-400", "bg-yellow-400", "bg-accent"];
  if (!password) return null;
  return (
    <div className="space-y-1">
      <div className="flex gap-1">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className={`h-1.5 flex-1 rounded-full ${i < strength ? colors[strength - 1] : "bg-muted"}`} />
        ))}
      </div>
      <p className="text-xs text-muted-foreground">{labels[strength - 1] || "Too short"}</p>
    </div>
  );
}

// ======================== Main Component ========================

export default function UserProfile() {
  const { user, loading: authLoading, signOut } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const { data: profile, isLoading: profileLoading } = useProfile(user?.id);
  const updateProfile = useUpdateProfile();

  // Determine section from URL
  const pathSection = location.pathname.split("/profile/")[1] || "profile";
  const [activeSection, setActiveSection] = useState<Section>(
    navItems.find((n) => n.section === pathSection)?.section || "profile"
  );

  useEffect(() => {
    const s = location.pathname.split("/profile/")[1] || "profile";
    const match = navItems.find((n) => n.section === s);
    if (match) setActiveSection(match.section);
  }, [location.pathname]);

  // Profile form
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    full_name: "",
    display_name: "",
    phone: "",
    dob: "",
    gender: "prefer_not_to_say",
    city: "",
    state: "",
  });

  useEffect(() => {
    if (profile) {
      setForm({
        full_name: profile.full_name || "",
        display_name: (profile as any).display_name || "",
        phone: profile.phone || "",
        dob: (profile as any).date_of_birth || "",
        gender: (profile as any).gender || "prefer_not_to_say",
        city: (profile as any).city || "",
        state: (profile as any).state || "",
      });
    }
  }, [profile]);

  // Password form
  const [passwords, setPasswords] = useState({ current: "", newPw: "", confirm: "" });

  // Notifications
  const [notifs, setNotifs] = useState({
    emailBooking: true,
    emailPromo: false,
    emailKyc: true,
    emailPrice: false,
    emailSecurity: true,
    pushBooking: true,
    pushPromo: false,
    pushKyc: true,
    pushPrice: false,
    pushSecurity: true,
  });

  useEffect(() => {
    if (profile?.preferences && typeof profile.preferences === 'object') {
      const prefs = profile.preferences as any;
      if (prefs.notifications) {
        setNotifs((prev) => ({ ...prev, ...prefs.notifications }));
      }
    }
  }, [profile?.preferences]);

  const handleNotificationChange = async (key: string, value: boolean) => {
    const newNotifs = { ...notifs, [key]: value };
    setNotifs(newNotifs);
    
    if (user && profile) {
      try {
        const currentPrefs = typeof profile.preferences === 'object' && profile.preferences !== null 
          ? profile.preferences 
          : {};
          
        await updateProfile.mutateAsync({
          userId: user.id,
          updates: {
            preferences: {
              ...currentPrefs,
              notifications: newNotifs
            }
          } as any
        });
        toast.success("Preferences saved");
      } catch (err: any) {
        toast.error("Failed to save preferences");
        setNotifs(notifs); // revert
      }
    }
  };

  // Real KYC State fetching using useQuery
  const { data: kycData, isLoading: kycLoading, error: kycError } = useQuery({
    queryKey: ["user-kyc-docs", user?.id],
    queryFn: async () => {
      if (!user) return null;
      console.log("Fetching KYC for:", user.id);
      
      const { data: docs, error: dErr } = await (supabase as any).from("user_documents").select("*").eq("user_id", user.id);
      if (dErr) {
        console.error("KYC Docs Fetch Error:", dErr);
        throw dErr;
      }

      const { data: profile, error: pErr } = await supabase.from("profiles").select("kyc_status").eq("id", user.id).maybeSingle();
      if (pErr) console.error("Profile KYC Status Error:", pErr);

      return {
        documents: docs || [],
        overallStatus: profile?.kyc_status || "not_started"
      };
    },
    enabled: !!user,
    staleTime: 0,
    refetchInterval: 5000, // Poll every 5s while page is open for real-time updates
  });

  useEffect(() => {
    if (kycError) {
      toast.error("Failed to load KYC documents. Please refresh.");
    }
  }, [kycError]);

  const kycDocs = [
    { name: "Aadhaar Card", type: "aadhaar" as const },
    { name: "PAN Card", type: "pan" as const },
    { name: "Driving License", type: "driving_license" as const },
  ].map(doc => {
    const match = kycData?.documents.find((d: any) => d.document_type === doc.type);
    return {
      ...doc,
      status: match?.status || "not_submitted",
      doc_number: match?.document_number || null,
    };
  });

  const maskDocNumber = (num?: string | null) => {
    if (!num) return "";
    if (num.length <= 4) return num;
    return `•••• ${num.slice(-4)}`;
  };

  useEffect(() => {
    if (!authLoading && !user) navigate("/login");
  }, [user, authLoading, navigate]);

  // Dynamic bookings fetching
  const { data: bookings = [], isLoading: bookingsLoading } = useQuery({
    queryKey: ["user-bookings", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data: bookingsData, error: bErr } = await supabase
        .from("bookings")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (bErr) throw bErr;
      if (!bookingsData) return [];

      // Fetch details in parallel groups for efficiency
      const results = await Promise.all(bookingsData.map(async (b) => {
        let table = "";
        if (b.listing_type === "stay") table = "stays";
        else if (b.listing_type === "car") table = "cars";
        else if (b.listing_type === "bike") table = "bikes";
        else if (b.listing_type === "experience") table = "experiences";
        else if (b.listing_type === "hotel") table = "hotels";
        else if (b.listing_type === "resort") table = "resorts";

        if (!table) return { ...b, listing_title: "Deleted Listing", listing_image: null };

        // Cast to any to bypass table strictness in this polymorphic scenario
        const { data } = await (supabase as any).from(table).select("title, images, location").eq("id", b.listing_id).maybeSingle();
        return {
          ...b,
          listing_title: (data as any)?.title || "Deleted Listing",
          listing_image: (data as any)?.images?.[0] || null,
          listing_location: (data as any)?.location || "N/A"
        };
      }));

      return results;
    },
    enabled: !!user
  });

  const handleSaveProfile = async () => {
    if (!user) return;
    try {
      await updateProfile.mutateAsync({ 
        userId: user.id, 
        updates: { 
          full_name: form.full_name, 
          display_name: form.display_name,
          phone: form.phone,
          date_of_birth: form.dob || null,
          gender: form.gender,
          city: form.city,
          state: form.state
        } as any
      });
      setEditing(false);
      toast.success("Profile updated successfully!");
    } catch (err: any) {
      console.error("Profile Update Error:", err);
      toast.error(err.message || "Failed to update profile");
    }
  };

  const handleChangePassword = async () => {
    if (passwords.newPw !== passwords.confirm) {
      toast.error("Passwords don't match");
      return;
    }
    if (passwords.newPw.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    
    try {
      const { error } = await supabase.auth.updateUser({
        password: passwords.newPw,
        current_password: passwords.current
      } as any);
      
      if (error) throw error;
      
      toast.success("Password changed successfully!");
      setPasswords({ current: "", newPw: "", confirm: "" });
    } catch (error: any) {
      console.error("Password Update Error:", error);
      toast.error(error.message || "Failed to update password");
    }
  };

  const handleSignOut = async () => {
    await signOut();
    window.location.href = '/';
  };

  const navigateSection = (section: Section) => {
    setActiveSection(section);
    if (section === "profile") navigate("/profile");
    else navigate(`/profile/${section}`);
  };

  if (authLoading || profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const kycVerifiedCount = kycDocs.filter((d) => d.status === "verified").length;
  const kycProgress = (kycVerifiedCount / kycDocs.length) * 100;
  const overallKycStatus = kycData?.overallStatus || "not_started";

  const statusColor: Record<string, string> = {
    confirmed: "bg-accent/10 text-accent border-accent/20", // using active style
    pending: "bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-950/40 dark:text-yellow-400 dark:border-yellow-800",
    completed: "bg-primary/10 text-primary border-primary/20",
    cancelled: "bg-destructive/10 text-destructive border-destructive/20",
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <button onClick={() => navigate("/")} className="transition-transform hover:scale-105 active:scale-95">
            <DynamicLogo />
          </button>
          <Button variant="ghost" size="sm" onClick={handleSignOut} className="text-muted-foreground">
            <LogOut className="h-4 w-4 mr-2" /> Sign Out
          </Button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 flex flex-col lg:flex-row gap-6">
        {/* Sidebar */}
        <aside className="lg:w-64 shrink-0">
          <Card className="sticky top-6">
            <CardContent className="p-4">
              {/* Profile card */}
              <div className="flex items-center gap-3 mb-4 pb-4 border-b border-border">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={profile?.profile_image || ""} />
                  <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
                    {(form.display_name || form.full_name)?.charAt(0) || "U"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold text-foreground text-sm truncate">
                    {profile?.display_name || profile?.full_name || "Guest User"}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                </div>
              </div>

              {/* Nav */}
              <nav className="space-y-1">
                {navItems.map((item) => (
                  <button
                    key={item.section}
                    onClick={() => navigateSection(item.section)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all",
                      activeSection === item.section
                        ? "bg-primary text-primary-foreground font-medium"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </button>
                ))}
                <Separator className="my-2" />
                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-destructive hover:bg-destructive/10 transition-all"
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </button>
              </nav>
            </CardContent>
          </Card>
        </aside>

        {/* Mobile bottom nav */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50 flex justify-around py-2 px-1">
          {navItems.slice(0, 5).map((item) => (
            <button
              key={item.section}
              onClick={() => navigateSection(item.section)}
              className={cn(
                "flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg text-[10px]",
                activeSection === item.section ? "text-primary font-medium" : "text-muted-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label.split(" ")[0]}
            </button>
          ))}
        </div>

        {/* Main Content */}
        <main className="flex-1 pb-20 lg:pb-0">
          <motion.div
            key={activeSection}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            {/* ====== My Profile ====== */}
            {activeSection === "profile" && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h1 className="text-2xl font-bold text-foreground">My Profile</h1>
                  <Button
                    variant={editing ? "default" : "outline"}
                    size="sm"
                    onClick={() => editing ? handleSaveProfile() : setEditing(true)}
                  >
                    {editing ? <><Save className="h-4 w-4 mr-1" /> Save Changes</> : <><Edit2 className="h-4 w-4 mr-1" /> Edit</>}
                  </Button>
                </div>

                <Card>
                  <CardContent className="p-6">
                    {/* Avatar */}
                    <div className="flex items-center gap-4 mb-6">
                      <div className="relative">
                        <Avatar className="h-20 w-20">
                          <AvatarImage src={profile?.profile_image || ""} />
                          <AvatarFallback className="bg-primary text-primary-foreground text-2xl font-bold">
                            {(form.display_name || form.full_name)?.charAt(0) || "U"}
                          </AvatarFallback>
                        </Avatar>
                        {editing && (
                          <button className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                            <Camera className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                      <div>
                        <h2 className="text-lg font-semibold text-foreground">
                          {profile?.display_name || profile?.full_name || "Guest User"}
                        </h2>
                        <p className="text-sm text-muted-foreground">{user?.email}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Full Name</Label>
                        <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} disabled={!editing} />
                      </div>
                      <div className="space-y-2">
                        <Label>Display Name</Label>
                        <Input value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })} disabled={!editing} placeholder="How others see you" />
                      </div>
                      <div className="space-y-2">
                        <Label>Email</Label>
                        <Input value={user?.email || ""} disabled className="bg-muted/30" />
                        <Badge variant="outline" className="text-[10px] text-accent border-accent/30">Verified</Badge>
                      </div>
                      <div className="space-y-2">
                        <Label>Phone</Label>
                        <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, "") })} disabled={!editing} maxLength={10} />
                      </div>
                      <div className="space-y-2 flex flex-col">
                        <Label>Date of Birth</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              disabled={!editing}
                              className={cn(
                                "justify-start text-left font-normal h-10 px-3",
                                !form.dob && "text-muted-foreground"
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
                              {form.dob && isValid(parseISO(form.dob)) ? (
                                format(parseISO(form.dob), "PPP")
                              ) : (
                                <span>Select your birth date</span>
                              )}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <CalendarPicker
                              mode="single"
                              selected={form.dob && isValid(parseISO(form.dob)) ? parseISO(form.dob) : undefined}
                              onSelect={(date) => {
                                if (date) {
                                  setForm({ ...form, dob: format(date, "yyyy-MM-dd") });
                                }
                              }}
                              disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                      <div className="space-y-2">
                        <Label>Gender</Label>
                        <RadioGroup value={form.gender} onValueChange={(v) => setForm({ ...form, gender: v })} disabled={!editing} className="flex gap-4 pt-2">
                          {[["male", "Male"], ["female", "Female"], ["other", "Other"]].map(([val, label]) => (
                            <div key={val} className="flex items-center gap-2">
                              <RadioGroupItem value={val} id={val} disabled={!editing} />
                              <Label htmlFor={val} className="cursor-pointer text-sm">{label}</Label>
                            </div>
                          ))}
                        </RadioGroup>
                      </div>
                      <div className="space-y-2">
                        <Label>City</Label>
                        <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} disabled={!editing} />
                      </div>
                      <div className="space-y-2">
                        <Label>State</Label>
                        <Input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} disabled={!editing} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* ====== Booking History ====== */}
            {activeSection === "bookings" && (
              <div className="space-y-6">
                <h1 className="text-2xl font-bold text-foreground">Booking History</h1>
                <Tabs defaultValue="all">
                  <TabsList>
                    <TabsTrigger value="all">All</TabsTrigger>
                    <TabsTrigger value="active">Active</TabsTrigger>
                    <TabsTrigger value="completed">Completed</TabsTrigger>
                    <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
                  </TabsList>

                  {["all", "confirmed", "completed", "cancelled", "pending"].map((tab) => (
                    <TabsContent key={tab} value={tab === "all" ? "all" : tab} className="space-y-4 mt-4">
                      {bookingsLoading ? (
                         <div className="space-y-4">
                            {[1, 2].map(i => (
                              <div key={i} className="h-28 w-full bg-muted animate-pulse rounded-xl" />
                            ))}
                         </div>
                      ) : (
                        <>
                          {bookings
                            .filter((b) => tab === "all" || b.booking_status === tab)
                            .map((booking) => (
                              <Card key={booking.id} className="overflow-hidden">
                                <CardContent className="p-0 flex flex-col sm:flex-row">
                                  <div className="sm:w-32 h-24 sm:h-auto bg-muted flex items-center justify-center overflow-hidden">
                                    {booking.listing_image ? (
                                      <img src={booking.listing_image} alt={booking.listing_title} className="w-full h-full object-cover" />
                                    ) : (
                                      <Calendar className="h-8 w-8 text-muted-foreground" />
                                    )}
                                  </div>
                                  <div className="flex-1 p-4">
                                    <div className="flex items-start justify-between gap-2">
                                      <div>
                                        <p className="font-semibold text-foreground text-sm line-clamp-1">{booking.listing_title}</p>
                                        <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">{booking.id}</p>
                                      </div>
                                      <Badge variant="outline" className={cn("text-[10px] capitalize", statusColor[booking.booking_status] || "bg-muted text-muted-foreground")}>
                                        {booking.booking_status}
                                      </Badge>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 text-xs text-muted-foreground">
                                      <span className="flex items-center gap-1">
                                        <Calendar className="h-3 w-3" />
                                        {format(new Date(booking.start_date), "MMM d")} – {format(new Date(booking.end_date), "MMM d, yyyy")}
                                      </span>
                                      <span className="font-semibold text-foreground">₹{booking.total_price.toLocaleString()}</span>
                                    </div>
                                    <Button variant="ghost" size="sm" className="mt-2 text-xs h-8">
                                      View Details <ChevronRight className="h-3 w-3 ml-1" />
                                    </Button>
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          {bookings.filter((b) => tab === "all" || b.booking_status === tab).length === 0 && (
                            <Card>
                              <CardContent className="p-12 text-center">
                                <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                                <p className="text-muted-foreground mb-4">No {tab !== "all" ? tab : ""} bookings found</p>
                                <Button onClick={() => navigate("/stays")}>Start Exploring</Button>
                              </CardContent>
                            </Card>
                          )}
                        </>
                      )}
                    </TabsContent>
                  ))}
                </Tabs>
              </div>
            )}

            {/* ====== KYC Details ====== */}
            {activeSection === "kyc" && (
              <div className="space-y-6">
                <h1 className="text-2xl font-bold text-foreground">KYC Details</h1>

                {/* Overall status */}
                <Card>
                  <CardContent className="p-6">
                    {kycLoading ? (
                      <div className="space-y-3">
                         <div className="h-4 w-1/3 bg-muted animate-pulse rounded" />
                         <div className="h-2 w-full bg-muted animate-pulse rounded" />
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <p className="text-sm font-medium text-foreground">
                              {overallKycStatus === "verified" ? "Fully Verified" : 
                               overallKycStatus === "submitted" ? "Under Review" : 
                               "Identity Verification"}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {kycVerifiedCount} of {kycDocs.length} documents verified
                            </p>
                          </div>
                          <div className="text-right">
                             <span className="text-sm font-bold text-primary">{Math.round(kycProgress)}%</span>
                          </div>
                        </div>
                        <Progress value={kycProgress} className="h-2" />
                      </>
                    )}
                  </CardContent>
                </Card>

                {/* Document rows */}
                <div className="space-y-3">
                  {kycLoading ? (
                    [1, 2, 3].map(i => (
                      <Card key={i} className="animate-pulse">
                        <CardContent className="p-4 h-20 bg-muted/50" />
                      </Card>
                    ))
                  ) : (
                    kycDocs.map((doc) => (
                      <Card key={doc.type}>
                        <CardContent className="p-4 flex items-center gap-4">
                          <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                            doc.status === "verified" ? "bg-primary/20" : "bg-muted"
                          }`}>
                            {doc.status === "verified" ? (
                              <ShieldCheck className="h-5 w-5 text-primary" />
                            ) : doc.status === "under_review" || doc.status === "pending" || doc.status === "uploading" ? (
                              <Clock className="h-5 w-5 text-muted-foreground" />
                            ) : (
                              <FileText className="h-5 w-5 text-muted-foreground" />
                            )}
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-foreground text-sm flex items-center gap-2">
                              {doc.name}
                              {doc.status === "verified" && doc.doc_number && (
                                <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                  {maskDocNumber(doc.doc_number)}
                                </span>
                              )}
                            </p>
                            <p className="text-xs text-muted-foreground capitalize mt-0.5">
                              {doc.status.replace("_", " ")}
                            </p>
                          </div>
                          {doc.status === "verified" ? (
                            <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50 dark:bg-green-950/30 dark:border-green-800 text-[10px]">
                              <Check className="h-3 w-3 mr-1" /> Verified
                            </Badge>
                          ) : doc.status === "pending" || doc.status === "under_review" || doc.status === "uploading" ? (
                            <Badge variant="outline" className="text-yellow-600 border-yellow-200 bg-yellow-50 dark:bg-yellow-950/30 dark:border-yellow-800 text-[10px]">
                              <Clock className="h-3 w-3 mr-1" /> {doc.status === "pending" ? "Pending" : "Under Review"}
                            </Badge>
                          ) : doc.status === "skipped" ? (
                            <Badge variant="outline" className="text-muted-foreground border-border text-[10px]">
                              Skipped
                            </Badge>
                          ) : (
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={() => {
                                const step = doc.type === 'aadhaar' ? 2 : doc.type === 'pan' ? 3 : 4;
                                navigate(`/onboarding/user?step=${step}`);
                              }} 
                              className="text-xs h-8"
                            >
                              <Upload className="h-3 w-3 mr-1" /> Upload
                            </Button>
                          )}
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* ====== Security & Password ====== */}
            {activeSection === "security" && (
              <div className="space-y-6">
                <h1 className="text-2xl font-bold text-foreground">Security & Password</h1>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Change Password</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Current Password</Label>
                      <MaskedInput value={passwords.current} onChange={(v) => setPasswords({ ...passwords, current: v })} placeholder="Enter current password" />
                    </div>
                    <div className="space-y-2">
                      <Label>New Password</Label>
                      <MaskedInput value={passwords.newPw} onChange={(v) => setPasswords({ ...passwords, newPw: v })} placeholder="Enter new password" />
                      <PasswordStrength password={passwords.newPw} />
                    </div>
                    <div className="space-y-2">
                      <Label>Confirm New Password</Label>
                      <MaskedInput value={passwords.confirm} onChange={(v) => setPasswords({ ...passwords, confirm: v })} placeholder="Re-enter new password" />
                      {passwords.confirm && passwords.newPw !== passwords.confirm && (
                        <p className="text-xs text-destructive">Passwords don't match</p>
                      )}
                    </div>
                    <Button onClick={handleChangePassword} disabled={!passwords.current || !passwords.newPw || !passwords.confirm}>
                      <Lock className="h-4 w-4 mr-2" /> Update Password
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Linked Accounts</CardTitle>
                    <CardDescription>Connect multiple sign-in methods to the same profile</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {/* Google */}
                    <div className="flex items-center justify-between p-3 rounded-xl border border-border">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                          </svg>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">Google</p>
                          <p className="text-xs text-muted-foreground">
                            {user?.app_metadata?.providers?.includes("google") ? "Connected" : "Not linked"}
                          </p>
                        </div>
                      </div>
                      {user?.app_metadata?.providers?.includes("google") ? (
                        <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50 dark:bg-green-950/30 text-[10px]">
                          <Check className="h-3 w-3 mr-1" /> Linked
                        </Badge>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs h-8"
                          onClick={async () => {
                            const { error } = await supabase.auth.linkIdentity({ provider: "google" });
                            if (error) toast.error(error.message);
                          }}
                        >
                          Link Google
                        </Button>
                      )}
                    </div>

                    {/* WhatsApp */}
                    <div className="flex items-center justify-between p-3 rounded-xl border border-border">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                          <MessageSquare className="h-4 w-4 text-green-500" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">WhatsApp</p>
                          <p className="text-xs text-muted-foreground">
                            {profile?.phone ? profile.phone : "Not linked"}
                          </p>
                        </div>
                      </div>
                      {profile?.phone ? (
                        <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50 dark:bg-green-950/30 text-[10px]">
                          <Check className="h-3 w-3 mr-1" /> Linked
                        </Badge>
                      ) : (
                        <Button size="sm" variant="outline" className="text-xs h-8" onClick={() => navigate("/auth")}>
                          Link WhatsApp
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>


                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Active Sessions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between p-3 rounded-xl border border-border">
                      <div>
                        <p className="text-sm font-medium text-foreground">Current Device</p>
                        <p className="text-xs text-muted-foreground">Chrome • Active now</p>
                      </div>
                      <Badge variant="outline" className="text-accent border-accent/30 text-[10px]">Current</Badge>
                    </div>
                    <Button variant="destructive" size="sm" className="w-full">
                      <LogOut className="h-4 w-4 mr-2" /> Sign out of all devices
                    </Button>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* ====== Notifications ====== */}
            {activeSection === "notifications" && (
              <div className="space-y-6">
                <h1 className="text-2xl font-bold text-foreground">Notification Preferences</h1>

                {[
                  { title: "Email Notifications", prefix: "email" as const },
                  { title: "Push Notifications", prefix: "push" as const },
                ].map(({ title, prefix }) => (
                  <Card key={prefix}>
                    <CardHeader>
                      <CardTitle className="text-base">{title}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {[
                        { key: `${prefix}Booking` as keyof typeof notifs, label: "Booking confirmations" },
                        { key: `${prefix}Promo` as keyof typeof notifs, label: "Promotions & offers" },
                        { key: `${prefix}Kyc` as keyof typeof notifs, label: "KYC reminders" },
                        { key: `${prefix}Price` as keyof typeof notifs, label: "Price drop alerts" },
                        { key: `${prefix}Security` as keyof typeof notifs, label: "Account security alerts" },
                      ].map(({ key, label }) => (
                        <div key={key} className="flex items-center justify-between">
                          <Label className="cursor-pointer">{label}</Label>
                          <Switch
                            checked={notifs[key as keyof typeof notifs]}
                            onCheckedChange={(v) => handleNotificationChange(key, v)}
                          />
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* ====== Help & Support ====== */}
            {activeSection === "help" && (
              <div className="space-y-6">
                <h1 className="text-2xl font-bold text-foreground">Help & Support</h1>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    { icon: HelpCircle, label: "FAQs", desc: "Find answers to common questions", link: "/help" },
                    { icon: MessageSquare, label: "Contact Support", desc: "Get help from our team", link: "/help" },
                    { icon: FileText, label: "Terms & Conditions", desc: "Read our terms of service", link: "/help" },
                    { icon: Lock, label: "Privacy Policy", desc: "Your data & privacy", link: "/help" },
                  ].map((item) => (
                    <Card key={item.label} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(item.link)}>
                      <CardContent className="p-4 flex items-center gap-4">
                        <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                          <item.icon className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-foreground text-sm">{item.label}</p>
                          <p className="text-xs text-muted-foreground">{item.desc}</p>
                        </div>
                        <ExternalLink className="h-4 w-4 text-muted-foreground" />
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <Card>
                  <CardContent className="p-6 text-center">
                    <MessageSquare className="h-10 w-10 mx-auto text-accent mb-3" />
                    <h3 className="font-semibold text-foreground mb-1">Need immediate help?</h3>
                    <p className="text-sm text-muted-foreground mb-4">Our support team is available 24/7</p>
                    <Button className="bg-accent hover:bg-accent/90 text-accent-foreground">
                      <MessageSquare className="h-4 w-4 mr-2" /> Start Chat
                    </Button>
                  </CardContent>
                </Card>
              </div>
            )}
          </motion.div>
        </main>
      </div>
    </div>
  );
}
