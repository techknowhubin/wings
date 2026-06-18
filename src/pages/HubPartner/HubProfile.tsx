import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Building2, User, FileText, Landmark, ShieldCheck, Edit, Key, Loader2,
  Phone, Mail, MapPin, Calendar, Activity, CheckCircle, CreditCard
} from "lucide-react";
import { format } from "date-fns";

export default function HubProfile() {
  const { uuid } = useParams<{ uuid: string }>();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Dialog states
  const [activeModal, setActiveModal] = useState<"profile" | "documents" | "bank" | "password" | null>(null);

  // Form states
  const [profileForm, setProfileForm] = useState({
    business_name: "",
    partner_name: "",
    partner_phone: "",
    partner_email: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
    alternate_mobile: "",
    hub_code: ""
  });

  const [docForm, setDocForm] = useState({
    gst_number: "",
    pan_number: "",
    business_registration_number: ""
  });

  const [bankForm, setBankForm] = useState({
    account_holder_name: "",
    account_number: "",
    ifsc_code: "",
    bank_name: "",
    upi_id: ""
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });

  // Query profile details
  const { data: profile, isLoading } = useQuery({
    queryKey: ["hub-partner-profile", uuid],
    enabled: !!uuid,
    queryFn: async () => {
      // 1. Get Hub Details
      const { data: hub, error: hubErr } = await supabase
        .from("hubs")
        .select("*")
        .eq("uuid", uuid)
        .single();
      if (hubErr) throw hubErr;
      const userId = hub.id;

      // 2. Get Hub Partner Details
      const { data: partner } = await supabase
        .from("hub_partners")
        .select("*")
        .eq("created_by", userId)
        .maybeSingle();

      // 3. Get User Details
      const { data: user } = await supabase
        .from("users")
        .select("*")
        .eq("id", userId)
        .single();

      // 4. Initialize Profile table if not exists
      let { data: hp } = await supabase
        .from("hub_profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();
      if (!hp) {
        const { data: newHp } = await supabase
          .from("hub_profiles")
          .insert({ id: userId })
          .select("*")
          .single();
        hp = newHp;
      }

      // 5. Initialize Bank table if not exists
      let { data: bank } = await supabase
        .from("bank_details")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();
      if (!bank) {
        const { data: newBank } = await supabase
          .from("bank_details")
          .insert({ user_id: userId })
          .select("*")
          .single();
        bank = newBank;
      }

      // 6. Initialize Documents table if not exists
      let { data: doc } = await supabase
        .from("documents")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();
      if (!doc) {
        const { data: newDoc } = await supabase
          .from("documents")
          .insert({ user_id: userId })
          .select("*")
          .single();
        doc = newDoc;
      }

      return { hub, partner, user, hp, bank, doc };
    }
  });

  // Initialize form fields when modal opens
  const openModal = (type: "profile" | "documents" | "bank" | "password") => {
    if (!profile) return;
    if (type === "profile") {
      setProfileForm({
        business_name: profile.partner?.business_name || profile.hub?.hub_name || "",
        partner_name: profile.partner?.partner_name || profile.hub?.owner_name || "",
        partner_phone: profile.partner?.partner_phone || profile.hub?.mobile || "",
        partner_email: profile.partner?.partner_email || profile.hub?.email || "",
        address: profile.partner?.address || "",
        city: profile.partner?.city || profile.hub?.district || "",
        state: profile.partner?.state || "",
        pincode: profile.partner?.pincode || "",
        alternate_mobile: profile.hp?.alternate_mobile || "",
        hub_code: profile.hp?.hub_code || profile.partner?.referral_id || ""
      });
    } else if (type === "documents") {
      setDocForm({
        gst_number: profile.doc?.gst_number || "",
        pan_number: profile.doc?.pan_number || "",
        business_registration_number: profile.doc?.business_registration_number || ""
      });
    } else if (type === "bank") {
      setBankForm({
        account_holder_name: profile.bank?.account_holder_name || "",
        account_number: profile.bank?.account_number || "",
        ifsc_code: profile.bank?.ifsc_code || "",
        bank_name: profile.bank?.bank_name || "",
        upi_id: profile.bank?.upi_id || ""
      });
    } else if (type === "password") {
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    }
    setActiveModal(type);
  };

  // Mutation: Update Profile Details
  const updateProfile = useMutation({
    mutationFn: async (data: typeof profileForm) => {
      if (!profile) return;
      const userId = profile.hub.id;

      // 1. Update hubs
      const { error: hubErr } = await supabase
        .from("hubs")
        .update({
          hub_name: data.business_name,
          owner_name: data.partner_name,
          mobile: data.partner_phone,
          email: data.partner_email,
          district: data.city,
          area: data.state
        })
        .eq("id", userId);
      if (hubErr) throw hubErr;

      // 2. Update hub_partners
      if (profile.partner) {
        const { error: partErr } = await supabase
          .from("hub_partners")
          .update({
            business_name: data.business_name,
            partner_name: data.partner_name,
            partner_phone: data.partner_phone,
            partner_email: data.partner_email,
            address: data.address,
            city: data.city,
            state: data.state,
            pincode: data.pincode
          })
          .eq("id", profile.partner.id);
        if (partErr) throw partErr;
      }

      // 3. Update hub_profiles
      const { error: hpErr } = await supabase
        .from("hub_profiles")
        .update({
          alternate_mobile: data.alternate_mobile,
          hub_code: data.hub_code
        })
        .eq("id", userId);
      if (hpErr) throw hpErr;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hub-partner-profile"] });
      toast({ title: "Profile updated successfully" });
      setActiveModal(null);
    },
    onError: (e: any) => toast({ title: "Error updating profile", description: e.message, variant: "destructive" })
  });

  // Mutation: Update Documents
  const updateDocuments = useMutation({
    mutationFn: async (data: typeof docForm) => {
      if (!profile) return;
      const { error } = await supabase
        .from("documents")
        .update({
          gst_number: data.gst_number,
          pan_number: data.pan_number,
          business_registration_number: data.business_registration_number
        })
        .eq("user_id", profile.hub.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hub-partner-profile"] });
      toast({ title: "Business documents updated" });
      setActiveModal(null);
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" })
  });

  // Mutation: Update Bank Details
  const updateBank = useMutation({
    mutationFn: async (data: typeof bankForm) => {
      if (!profile) return;
      const { error } = await supabase
        .from("bank_details")
        .update({
          account_holder_name: data.account_holder_name,
          account_number: data.account_number,
          ifsc_code: data.ifsc_code,
          bank_name: data.bank_name,
          upi_id: data.upi_id
        })
        .eq("user_id", profile.hub.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hub-partner-profile"] });
      toast({ title: "Bank details updated" });
      setActiveModal(null);
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" })
  });

  // Mutation: Update Password
  const updatePassword = useMutation({
    mutationFn: async (data: typeof passwordForm) => {
      if (data.newPassword !== data.confirmPassword) {
        throw new Error("New passwords do not match!");
      }
      const { error } = await supabase.auth.updateUser({ password: data.newPassword });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Password updated successfully" });
      setActiveModal(null);
    },
    onError: (e: any) => toast({ title: "Password update failed", description: e.message, variant: "destructive" })
  });

  if (isLoading) {
    return (
      <div className="h-[70vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/50 pb-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight">Hub Partner Profile</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage and review your business profile settings</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={() => openModal("profile")} className="rounded-xl gap-2 font-semibold">
            <Edit className="h-4 w-4" /> Edit Profile
          </Button>
          <Button onClick={() => openModal("documents")} className="rounded-xl gap-2 font-semibold" variant="outline">
            <FileText className="h-4 w-4 text-emerald-600" /> Update Documents
          </Button>
          <Button onClick={() => openModal("bank")} className="rounded-xl gap-2 font-semibold" variant="outline">
            <Landmark className="h-4 w-4 text-blue-600" /> Bank Details
          </Button>
          <Button onClick={() => openModal("password")} className="rounded-xl gap-2 font-semibold" variant="outline">
            <Key className="h-4 w-4 text-amber-500" /> Change Password
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Section 1: Business Information */}
        <Card className="border-border/50 hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center gap-3 bg-muted/20 border-b border-border/50 py-3.5">
            <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <Building2 className="h-4.5 w-4.5 text-emerald-600" />
            </div>
            <CardTitle className="text-sm font-bold">Business Information</CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3.5 text-sm">
            <div className="flex justify-between border-b border-border/20 pb-2">
              <span className="text-muted-foreground">Hub Name</span>
              <span className="font-semibold text-foreground">{profile.hub?.hub_name || "N/A"}</span>
            </div>
            <div className="flex justify-between border-b border-border/20 pb-2">
              <span className="text-muted-foreground">Business Name</span>
              <span className="font-semibold text-foreground">{profile.partner?.business_name || "N/A"}</span>
            </div>
            <div className="flex justify-between border-b border-border/20 pb-2">
              <span className="text-muted-foreground">Hub Code</span>
              <span className="font-mono font-semibold text-foreground">{profile.hp?.hub_code || "N/A"}</span>
            </div>
            <div className="flex justify-between border-b border-border/20 pb-2">
              <span className="text-muted-foreground">City</span>
              <span className="font-semibold text-foreground">{profile.partner?.city || profile.hub?.district || "N/A"}</span>
            </div>
            <div className="flex justify-between border-b border-border/20 pb-2">
              <span className="text-muted-foreground">State</span>
              <span className="font-semibold text-foreground">{profile.partner?.state || profile.hub?.area || "N/A"}</span>
            </div>
            <div className="flex justify-between border-b border-border/20 pb-2">
              <span className="text-muted-foreground">Address</span>
              <span className="font-semibold text-foreground text-right max-w-[200px] truncate" title={profile.partner?.address}>
                {profile.partner?.address || "N/A"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Pincode</span>
              <span className="font-semibold text-foreground">{profile.partner?.pincode || "N/A"}</span>
            </div>
          </CardContent>
        </Card>

        {/* Section 2: Owner Information */}
        <Card className="border-border/50 hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center gap-3 bg-muted/20 border-b border-border/50 py-3.5">
            <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <User className="h-4.5 w-4.5 text-blue-600" />
            </div>
            <CardTitle className="text-sm font-bold">Owner Information</CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3.5 text-sm">
            <div className="flex justify-between border-b border-border/20 pb-2">
              <span className="text-muted-foreground flex items-center gap-1.5"><User className="h-3.5 w-3.5" /> Owner Name</span>
              <span className="font-semibold text-foreground">{profile.hub?.owner_name || "N/A"}</span>
            </div>
            <div className="flex justify-between border-b border-border/20 pb-2">
              <span className="text-muted-foreground flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" /> Mobile Number</span>
              <span className="font-semibold text-foreground">{profile.hub?.mobile || "N/A"}</span>
            </div>
            <div className="flex justify-between border-b border-border/20 pb-2">
              <span className="text-muted-foreground flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" /> Email Address</span>
              <span className="font-semibold text-foreground">{profile.hub?.email || "N/A"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground flex items-center gap-1.5"><Phone className="h-3.5 w-3.5 text-muted-foreground" /> Alternate Mobile</span>
              <span className="font-semibold text-foreground">{profile.hp?.alternate_mobile || "N/A"}</span>
            </div>
          </CardContent>
        </Card>

        {/* Section 3: Business Documents */}
        <Card className="border-border/50 hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center gap-3 bg-muted/20 border-b border-border/50 py-3.5">
            <div className="h-8 w-8 rounded-lg bg-indigo-500/10 flex items-center justify-center">
              <FileText className="h-4.5 w-4.5 text-indigo-600" />
            </div>
            <CardTitle className="text-sm font-bold">Business Documents</CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3.5 text-sm">
            <div className="flex justify-between border-b border-border/20 pb-2">
              <span className="text-muted-foreground">GST Number</span>
              <span className="font-mono font-semibold text-foreground">{profile.doc?.gst_number || "N/A"}</span>
            </div>
            <div className="flex justify-between border-b border-border/20 pb-2">
              <span className="text-muted-foreground">PAN Number</span>
              <span className="font-mono font-semibold text-foreground">{profile.doc?.pan_number || "N/A"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Business Registration No.</span>
              <span className="font-mono font-semibold text-foreground">{profile.doc?.business_registration_number || "N/A"}</span>
            </div>
          </CardContent>
        </Card>

        {/* Section 4: Bank Details */}
        <Card className="border-border/50 hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center gap-3 bg-muted/20 border-b border-border/50 py-3.5">
            <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <Landmark className="h-4.5 w-4.5 text-blue-600" />
            </div>
            <CardTitle className="text-sm font-bold">Bank Details</CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3.5 text-sm">
            <div className="flex justify-between border-b border-border/20 pb-2">
              <span className="text-muted-foreground">Account Holder Name</span>
              <span className="font-semibold text-foreground">{profile.bank?.account_holder_name || "N/A"}</span>
            </div>
            <div className="flex justify-between border-b border-border/20 pb-2">
              <span className="text-muted-foreground">Account Number</span>
              <span className="font-mono font-semibold text-foreground">{profile.bank?.account_number || "N/A"}</span>
            </div>
            <div className="flex justify-between border-b border-border/20 pb-2">
              <span className="text-muted-foreground">IFSC Code</span>
              <span className="font-mono font-semibold text-foreground">{profile.bank?.ifsc_code || "N/A"}</span>
            </div>
            <div className="flex justify-between border-b border-border/20 pb-2">
              <span className="text-muted-foreground">Bank Name</span>
              <span className="font-semibold text-foreground">{profile.bank?.bank_name || "N/A"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">UPI ID</span>
              <span className="font-mono font-semibold text-foreground">{profile.bank?.upi_id || "N/A"}</span>
            </div>
          </CardContent>
        </Card>

        {/* Section 5: Account Information */}
        <Card className="border-border/50 hover:shadow-md transition-shadow md:col-span-2">
          <CardHeader className="flex flex-row items-center gap-3 bg-muted/20 border-b border-border/50 py-3.5">
            <div className="h-8 w-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <ShieldCheck className="h-4.5 w-4.5 text-amber-600" />
            </div>
            <CardTitle className="text-sm font-bold">Account Information</CardTitle>
          </CardHeader>
          <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 text-sm">
            <div className="space-y-1">
              <p className="text-muted-foreground flex items-center gap-1"><User className="h-3.5 w-3.5" /> Hub Partner ID</p>
              <p className="font-mono font-semibold text-xs truncate select-all">{profile.hub?.id}</p>
            </div>
            <div className="space-y-1">
              <p className="text-muted-foreground flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> Registration Date</p>
              <p className="font-semibold">{profile.hub?.created_at ? format(new Date(profile.hub.created_at), "dd MMM yyyy") : "N/A"}</p>
            </div>
            <div className="space-y-1">
              <p className="text-muted-foreground flex items-center gap-1"><Activity className="h-3.5 w-3.5" /> Status</p>
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100 rounded-full px-2.5 py-0.5 mt-0.5">
                <CheckCircle className="h-3 w-3" /> Active
              </span>
            </div>
            <div className="space-y-1">
              <p className="text-muted-foreground flex items-center gap-1"><ShieldCheck className="h-3.5 w-3.5" /> Verification Status</p>
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 bg-blue-100 rounded-full px-2.5 py-0.5 mt-0.5">
                {profile.user?.is_verified ? "Verified Partner" : "Pending Verification"}
              </span>
            </div>
            <div className="space-y-1">
              <p className="text-muted-foreground flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> Last Updated</p>
              <p className="font-semibold">{profile.partner?.updated_at ? format(new Date(profile.partner.updated_at), "dd MMM yyyy, hh:mm a") : "N/A"}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Modal 1: Edit Profile Dialog */}
      <Dialog open={activeModal === "profile"} onOpenChange={(open) => !open && setActiveModal(null)}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Profile Details</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Business/Hub Name</Label>
              <Input value={profileForm.business_name} onChange={(e) => setProfileForm({ ...profileForm, business_name: e.target.value })} className="rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Partner/Owner Name</Label>
              <Input value={profileForm.partner_name} onChange={(e) => setProfileForm({ ...profileForm, partner_name: e.target.value })} className="rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Mobile Number</Label>
              <Input value={profileForm.partner_phone} onChange={(e) => setProfileForm({ ...profileForm, partner_phone: e.target.value })} className="rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Alternate Mobile</Label>
              <Input value={profileForm.alternate_mobile} onChange={(e) => setProfileForm({ ...profileForm, alternate_mobile: e.target.value })} className="rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Email Address</Label>
              <Input value={profileForm.partner_email} onChange={(e) => setProfileForm({ ...profileForm, partner_email: e.target.value })} className="rounded-xl" type="email" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Hub Code</Label>
              <Input value={profileForm.hub_code} onChange={(e) => setProfileForm({ ...profileForm, hub_code: e.target.value })} className="rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">City</Label>
              <Input value={profileForm.city} onChange={(e) => setProfileForm({ ...profileForm, city: e.target.value })} className="rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">State</Label>
              <Input value={profileForm.state} onChange={(e) => setProfileForm({ ...profileForm, state: e.target.value })} className="rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Pincode</Label>
              <Input value={profileForm.pincode} onChange={(e) => setProfileForm({ ...profileForm, pincode: e.target.value })} className="rounded-xl" />
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label className="text-xs font-semibold">Full Address</Label>
              <Input value={profileForm.address} onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })} className="rounded-xl" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActiveModal(null)} className="rounded-xl">Cancel</Button>
            <Button onClick={() => updateProfile.mutate(profileForm)} disabled={updateProfile.isPending} className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white">
              {updateProfile.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal 2: Update Documents Dialog */}
      <Dialog open={activeModal === "documents"} onOpenChange={(open) => !open && setActiveModal(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Update Business Documents</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">GST Number</Label>
              <Input value={docForm.gst_number} onChange={(e) => setDocForm({ ...docForm, gst_number: e.target.value })} placeholder="15-digit GSTIN" className="rounded-xl font-mono uppercase" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">PAN Number</Label>
              <Input value={docForm.pan_number} onChange={(e) => setDocForm({ ...docForm, pan_number: e.target.value })} placeholder="10-digit PAN" className="rounded-xl font-mono uppercase" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Business Registration Number</Label>
              <Input value={docForm.business_registration_number} onChange={(e) => setDocForm({ ...docForm, business_registration_number: e.target.value })} placeholder="CIN/Registration No." className="rounded-xl font-mono" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActiveModal(null)} className="rounded-xl">Cancel</Button>
            <Button onClick={() => updateDocuments.mutate(docForm)} disabled={updateDocuments.isPending} className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white">
              {updateDocuments.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : "Save Documents"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal 3: Update Bank Details Dialog */}
      <Dialog open={activeModal === "bank"} onOpenChange={(open) => !open && setActiveModal(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Update Bank Account Details</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Account Holder Name</Label>
              <Input value={bankForm.account_holder_name} onChange={(e) => setBankForm({ ...bankForm, account_holder_name: e.target.value })} placeholder="Exact name in bank" className="rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Account Number</Label>
              <Input value={bankForm.account_number} onChange={(e) => setBankForm({ ...bankForm, account_number: e.target.value })} placeholder="Bank account number" className="rounded-xl font-mono" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">IFSC Code</Label>
              <Input value={bankForm.ifsc_code} onChange={(e) => setBankForm({ ...bankForm, ifsc_code: e.target.value })} placeholder="11-digit IFSC code" className="rounded-xl font-mono uppercase" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Bank Name</Label>
              <Input value={bankForm.bank_name} onChange={(e) => setBankForm({ ...bankForm, bank_name: e.target.value })} placeholder="e.g. State Bank of India" className="rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">UPI ID</Label>
              <Input value={bankForm.upi_id} onChange={(e) => setBankForm({ ...bankForm, upi_id: e.target.value })} placeholder="username@upi" className="rounded-xl font-mono" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActiveModal(null)} className="rounded-xl">Cancel</Button>
            <Button onClick={() => updateBank.mutate(bankForm)} disabled={updateBank.isPending} className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white">
              {updateBank.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : "Save Bank Details"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal 4: Change Password Dialog */}
      <Dialog open={activeModal === "password"} onOpenChange={(open) => !open && setActiveModal(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">New Password</Label>
              <Input type="password" value={passwordForm.newPassword} onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })} className="rounded-xl" placeholder="Min. 6 characters" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Confirm New Password</Label>
              <Input type="password" value={passwordForm.confirmPassword} onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })} className="rounded-xl" placeholder="Verify password" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActiveModal(null)} className="rounded-xl">Cancel</Button>
            <Button onClick={() => updatePassword.mutate(passwordForm)} disabled={updatePassword.isPending || !passwordForm.newPassword || passwordForm.newPassword.length < 6} className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white">
              {updatePassword.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : "Change Password"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
