import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { DynamicLogo } from "@/components/DynamicLogo";
import { ShieldCheck, Loader2, CheckCircle2, AlertCircle } from "lucide-react";

const GOV_ID_TYPES = ["Aadhaar Card", "PAN Card", "Passport", "Driving Licence", "Voter ID"];

export default function KYCQRForm() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [tokenValid, setTokenValid] = useState<boolean | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [form, setForm] = useState({
    full_name: "",
    phone: "",
    email: "",
    address: "",
    government_id_type: "",
    government_id_number: "",
    emergency_contact_name: "",
    emergency_contact_phone: "",
    emergency_contact_relation: "",
  });
  const [errors, setErrors] = useState<Partial<typeof form>>({});

  useEffect(() => {
    if (!token) { setTokenValid(false); return; }
    supabase
      .from('kyc_qr_codes')
      .select('id, status, expires_at')
      .eq('token', token)
      .maybeSingle()
      .then(({ data }) => {
        if (!data || data.status !== 'active') { setTokenValid(false); return; }
        if (data.expires_at && new Date(data.expires_at) < new Date()) { setTokenValid(false); return; }
        setTokenValid(true);
      });
  }, [token]);

  const set = (k: keyof typeof form, v: string) => {
    setForm(p => ({ ...p, [k]: v }));
    setErrors(p => ({ ...p, [k]: undefined }));
  };

  const validate = () => {
    const e: Partial<typeof form> = {};
    if (!form.full_name.trim()) e.full_name = "Required";
    if (!form.phone.match(/^\d{10}$/)) e.phone = "Enter valid 10-digit phone";
    if (!form.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) e.email = "Enter valid email";
    if (!form.address.trim()) e.address = "Required";
    if (!form.government_id_type) e.government_id_type = "Required";
    if (!form.government_id_number.trim()) e.government_id_number = "Required";
    if (!form.emergency_contact_name.trim()) e.emergency_contact_name = "Required";
    if (!form.emergency_contact_phone.match(/^\d{10}$/)) e.emergency_contact_phone = "Enter valid 10-digit phone";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.from('kyc_qr_submissions').insert({
        qr_token: token,
        ...form,
      });
      if (error) throw error;
      setSubmitted(true);
    } catch (err: any) {
      toast({ variant: "destructive", title: "Submission failed", description: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  if (tokenValid === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (tokenValid === false) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6 text-center">
        <AlertCircle className="h-16 w-16 text-destructive" />
        <h1 className="text-2xl font-bold">Invalid or Expired QR Code</h1>
        <p className="text-muted-foreground">This KYC link is no longer valid. Please ask your host to generate a new QR code.</p>
        <Button variant="outline" onClick={() => navigate("/")}>Go Home</Button>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6 text-center">
        <CheckCircle2 className="h-16 w-16 text-green-500" />
        <h1 className="text-2xl font-bold">KYC Submitted Successfully</h1>
        <p className="text-muted-foreground">Your KYC details have been submitted securely. We'll review them shortly.</p>
        <Button variant="outline" onClick={() => navigate("/")}>Go Home</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-card py-4 px-6">
        <DynamicLogo />
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <ShieldCheck className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">KYC Verification</h1>
            <p className="text-sm text-muted-foreground">Please fill in your details securely</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Personal Details */}
          <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">Personal Information</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Full Name <span className="text-red-500">*</span></Label>
                <Input value={form.full_name} onChange={e => set("full_name", e.target.value)} placeholder="As per government ID" className="mt-1" />
                {errors.full_name && <p className="text-xs text-red-500 mt-1">{errors.full_name}</p>}
              </div>
              <div>
                <Label>Phone Number <span className="text-red-500">*</span></Label>
                <Input value={form.phone} onChange={e => set("phone", e.target.value.replace(/\D/g, "").slice(0, 10))} placeholder="10-digit mobile" className="mt-1" />
                {errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone}</p>}
              </div>
              <div>
                <Label>Email Address <span className="text-red-500">*</span></Label>
                <Input type="email" value={form.email} onChange={e => set("email", e.target.value)} placeholder="your@email.com" className="mt-1" />
                {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
              </div>
            </div>
            <div>
              <Label>Address <span className="text-red-500">*</span></Label>
              <Textarea value={form.address} onChange={e => set("address", e.target.value)} placeholder="Full residential address" className="mt-1 resize-none" rows={3} />
              {errors.address && <p className="text-xs text-red-500 mt-1">{errors.address}</p>}
            </div>
          </div>

          {/* Government ID */}
          <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">Government ID</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>ID Type <span className="text-red-500">*</span></Label>
                <Select value={form.government_id_type} onValueChange={v => set("government_id_type", v)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select ID type" />
                  </SelectTrigger>
                  <SelectContent>
                    {GOV_ID_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
                {errors.government_id_type && <p className="text-xs text-red-500 mt-1">{errors.government_id_type}</p>}
              </div>
              <div>
                <Label>ID Number <span className="text-red-500">*</span></Label>
                <Input value={form.government_id_number} onChange={e => set("government_id_number", e.target.value.toUpperCase())} placeholder="ID number" className="mt-1 font-mono" />
                {errors.government_id_number && <p className="text-xs text-red-500 mt-1">{errors.government_id_number}</p>}
              </div>
            </div>
          </div>

          {/* Emergency Contact */}
          <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">Emergency Contact</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Contact Name <span className="text-red-500">*</span></Label>
                <Input value={form.emergency_contact_name} onChange={e => set("emergency_contact_name", e.target.value)} placeholder="Full name" className="mt-1" />
                {errors.emergency_contact_name && <p className="text-xs text-red-500 mt-1">{errors.emergency_contact_name}</p>}
              </div>
              <div>
                <Label>Contact Phone <span className="text-red-500">*</span></Label>
                <Input value={form.emergency_contact_phone} onChange={e => set("emergency_contact_phone", e.target.value.replace(/\D/g, "").slice(0, 10))} placeholder="10-digit mobile" className="mt-1" />
                {errors.emergency_contact_phone && <p className="text-xs text-red-500 mt-1">{errors.emergency_contact_phone}</p>}
              </div>
              <div>
                <Label>Relationship</Label>
                <Input value={form.emergency_contact_relation} onChange={e => set("emergency_contact_relation", e.target.value)} placeholder="e.g. Parent, Spouse" className="mt-1" />
              </div>
            </div>
          </div>

          <div className="bg-muted/30 rounded-xl p-4 text-xs text-muted-foreground flex gap-2">
            <ShieldCheck className="h-4 w-4 shrink-0 text-primary mt-0.5" />
            <span>Your data is encrypted and stored securely. Only Super Admin can view complete KYC details. Hosts only see masked information.</span>
          </div>

          <Button type="submit" disabled={submitting} className="w-full rounded-xl h-12 text-base font-semibold" variant="gradient">
            {submitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Submitting…</> : "Submit KYC Securely"}
          </Button>
        </form>
      </div>
    </div>
  );
}
