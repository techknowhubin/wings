import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { DynamicLogo } from "@/components/DynamicLogo";
import { ShieldCheck, Loader2, CheckCircle2, AlertCircle } from "lucide-react";

type HostQRRecord = { id: string; host_id: string; qr_status: string };

export default function KYCQRForm() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [qrRecord, setQrRecord] = useState<HostQRRecord | null>(null);
  const [tokenValid, setTokenValid] = useState<boolean | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [form, setForm] = useState({
    full_name: "",
    mobile: "",
    email: "",
    address: "",
    aadhaar: "",
    pan: "",
    driving_licence: "",
    emergency_contact_name: "",
    emergency_contact_phone: "",
    emergency_contact_relation: "",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof typeof form, string>>>({});

  useEffect(() => {
    if (!token) { setTokenValid(false); return; }

    const validateToken = async () => {
      // 1. Use SECURITY DEFINER RPC — works for anon AND authenticated travellers,
      //    bypassing the RLS policies that only allow hosts/admins to read the table.
      const { data: result } = await (supabase as any).rpc('validate_host_qr_token', { p_token: token });

      if (result && result.valid === true) {
        setQrRecord({ id: result.id, host_id: result.host_id, qr_status: result.qr_status });
        setTokenValid(true);
        return;
      }

      if (result && result.valid === false) {
        // QR exists but was revoked
        setTokenValid(false);
        return;
      }

      // 2. Legacy fallback — old kyc_qr_codes table (still used by earlier QR links)
      const { data: legacyQR } = await supabase
        .from('kyc_qr_codes')
        .select('id, status, expires_at')
        .eq('token', token)
        .maybeSingle();

      if (!legacyQR || legacyQR.status !== 'active') { setTokenValid(false); return; }
      if (legacyQR.expires_at && new Date(legacyQR.expires_at) < new Date()) { setTokenValid(false); return; }
      setTokenValid(true);
    };

    validateToken();
  }, [token]);

  const set = (k: keyof typeof form, v: string) => {
    setForm(p => ({ ...p, [k]: v }));
    setErrors(p => ({ ...p, [k]: undefined }));
  };

  const validate = () => {
    const e: Partial<Record<keyof typeof form, string>> = {};
    if (!form.full_name.trim()) e.full_name = "Required";
    if (!form.mobile.match(/^\d{10}$/)) e.mobile = "Enter valid 10-digit phone";
    if (form.email && !form.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) e.email = "Enter valid email";
    if (!form.address.trim()) e.address = "Required";
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
      if (qrRecord) {
        // New system: write to traveller_kyc linked to host
        const { error } = await (supabase as any).from('traveller_kyc').insert({
          host_id: qrRecord.host_id,
          qr_id: qrRecord.id,
          full_name: form.full_name,
          mobile: form.mobile,
          email: form.email || null,
          address: form.address || null,
          aadhaar: form.aadhaar || null,
          pan: form.pan || null,
          driving_licence: form.driving_licence || null,
          emergency_contact: {
            name: form.emergency_contact_name,
            phone: form.emergency_contact_phone,
            relation: form.emergency_contact_relation,
          },
        });
        if (error) throw error;
      } else {
        // Legacy system
        const { error } = await supabase.from('kyc_qr_submissions').insert({
          qr_token: token,
          full_name: form.full_name,
          phone: form.mobile,
          email: form.email || null,
          address: form.address || null,
          emergency_contact_name: form.emergency_contact_name,
          emergency_contact_phone: form.emergency_contact_phone,
          emergency_contact_relation: form.emergency_contact_relation,
        });
        if (error) throw error;
      }
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
                <Label>Mobile Number <span className="text-red-500">*</span></Label>
                <Input value={form.mobile} onChange={e => set("mobile", e.target.value.replace(/\D/g, "").slice(0, 10))} placeholder="10-digit mobile" className="mt-1" />
                {errors.mobile && <p className="text-xs text-red-500 mt-1">{errors.mobile}</p>}
              </div>
              <div>
                <Label>Email Address</Label>
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

          {/* Identity Documents */}
          <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">Identity Documents</h2>
            <p className="text-xs text-muted-foreground">Fill in the document numbers you have. At least one is recommended.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Aadhaar Number</Label>
                <Input
                  value={form.aadhaar}
                  onChange={e => set("aadhaar", e.target.value.replace(/\D/g, "").slice(0, 12))}
                  placeholder="12-digit Aadhaar"
                  className="mt-1 font-mono"
                  inputMode="numeric"
                />
              </div>
              <div>
                <Label>PAN Number</Label>
                <Input
                  value={form.pan}
                  onChange={e => set("pan", e.target.value.toUpperCase().slice(0, 10))}
                  placeholder="e.g. ABCDE1234F"
                  className="mt-1 font-mono"
                />
              </div>
              <div className="sm:col-span-2">
                <Label>Driving Licence Number</Label>
                <Input
                  value={form.driving_licence}
                  onChange={e => set("driving_licence", e.target.value.toUpperCase())}
                  placeholder="e.g. MH01 20110012345"
                  className="mt-1 font-mono"
                />
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
            <span>Your data is stored securely. Only the Super Admin can view complete KYC details. Hosts only see masked information (last 4 digits).</span>
          </div>

          <Button type="submit" disabled={submitting} className="w-full rounded-xl h-12 text-base font-semibold" variant="gradient">
            {submitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Submitting…</> : "Submit KYC Securely"}
          </Button>
        </form>
      </div>
    </div>
  );
}
