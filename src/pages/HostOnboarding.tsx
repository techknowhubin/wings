import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2, User, Briefcase, CreditCard, ShieldCheck, FileText,
  Upload, Loader2, ArrowRight, ChevronLeft, Check, Clock, Eye, EyeOff,
  X, Smartphone, MapPin, CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/components/ThemeProvider";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { DynamicLogo } from "@/components/DynamicLogo";

// ======================== Types ========================

type HostType = "individual" | "business";

interface BusinessDetails {
  hostType: HostType;
  fullName: string;
  displayName: string;
  phone: string;
  altPhone: string;
  email: string;
  businessName: string;
  businessType: string;
  gstNumber: string;
  msmeNumber: string;
  street: string;
  city: string;
  state: string;
  pin: string;
  serviceTypes: string[];
  listingCount: string;
}

interface BankDetails {
  accountHolderName: string;
  bankName: string;
  accountNumber: string;
  confirmAccountNumber: string;
  ifscCode: string;
  accountType: "savings" | "current";
  chequeFile?: File;
  chequePreview?: string;
}

interface IFSCData {
  bank: string;
  branch: string;
  city: string;
}

interface IdentityDetails {
  aadhaarNumber: string;
  panNumber: string;
  aadhaarFrontFile?: File;
  aadhaarBackFile?: File;
  panFile?: File;
  gstCertFile?: File;
  businessRegFile?: File;
  aadhaarVerified: boolean;
  panVerified: boolean;
  agreed: boolean;
  // DigiLocker
  digiPhone: string;
  digiOtp: string;
  digiOtpSent: boolean;
}

const SERVICE_TYPE_OPTIONS = [
  "Eco Stay", "Treehouse", "Homestay", "Farm Stay",
  "Tent Camp", "Self-Drive Cab", "Outstation Cab", "Travel Package",
];

const BUSINESS_TYPES = ["Proprietorship", "Partnership", "Pvt Ltd", "LLP"];

// ======================== Step Indicator ========================

function StepIndicator({ currentStep, totalSteps }: { currentStep: number; totalSteps: number }) {
  const labels = ["Welcome", "Details", "Bank", "Identity", "Complete"];
  return (
    <div className="w-full max-w-2xl mx-auto mb-8">
      <Progress value={(currentStep / (totalSteps - 1)) * 100} className="h-2 mb-4" />
      <div className="flex justify-between">
        {labels.map((label, i) => (
          <div key={label} className="flex flex-col items-center gap-1">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
                i < currentStep
                  ? "bg-accent text-accent-foreground"
                  : i === currentStep
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {i < currentStep ? <Check className="h-4 w-4" /> : i + 1}
            </div>
            <span className="text-xs text-muted-foreground hidden sm:block">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ======================== File Upload Zone ========================

function FileUploadZone({
  label, file, preview, onFileSelect, onRemove,
}: {
  label: string; file?: File; preview?: string; onFileSelect: (f: File) => void; onRemove: () => void;
}) {
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f && f.size <= 5 * 1024 * 1024) onFileSelect(f);
    else toast.error("File must be under 5MB");
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-foreground">{label}</label>
      {file ? (
        <div className="flex items-center gap-3 p-3 rounded-xl border border-border bg-muted/30">
          <FileText className="h-5 w-5 text-accent" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{file.name}</p>
            <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
          </div>
          {preview && (
            <button type="button" onClick={() => window.open(preview, "_blank")} className="text-muted-foreground hover:text-foreground">
              <Eye className="h-4 w-4" />
            </button>
          )}
          <button type="button" onClick={onRemove} className="text-muted-foreground hover:text-destructive">
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => {
            const input = document.createElement("input");
            input.type = "file";
            input.accept = "image/*,.pdf";
            input.onchange = (e) => {
              const f = (e.target as HTMLInputElement).files?.[0];
              if (f && f.size <= 5 * 1024 * 1024) onFileSelect(f);
              else toast.error("File must be under 5MB");
            };
            input.click();
          }}
          className="border-2 border-dashed border-border rounded-xl p-6 text-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-all"
        >
          <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Drag & drop or click to upload</p>
          <p className="text-xs text-muted-foreground mt-1">Max 5MB • JPG, PNG, PDF</p>
        </div>
      )}
    </div>
  );
}

// ======================== Masked Input ========================

function MaskedInput({
  value, onChange, placeholder, maxLength, className,
}: {
  value: string; onChange: (v: string) => void; placeholder: string; maxLength?: number; className?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        className={className}
      />
      <button
        type="button"
        onClick={() => setShow(!show)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

// ======================== Main Component ========================

export default function HostOnboarding() {
  const { user, loading: authLoading } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);

  // Step 2 state
  const [biz, setBiz] = useState<BusinessDetails>({
    hostType: "individual",
    fullName: user?.user_metadata?.full_name || "",
    displayName: "",
    phone: "",
    altPhone: "",
    email: user?.email || "",
    businessName: "",
    businessType: "",
    gstNumber: "",
    msmeNumber: "",
    street: "",
    city: "",
    state: "",
    pin: "",
    serviceTypes: [],
    listingCount: "1",
  });

  // Step 3 state
  const [bank, setBank] = useState<BankDetails>({
    accountHolderName: "",
    bankName: "",
    accountNumber: "",
    confirmAccountNumber: "",
    ifscCode: "",
    accountType: "savings",
  });
  const [ifscData, setIfscData] = useState<IFSCData | null>(null);
  const [ifscLoading, setIfscLoading] = useState(false);

  // Step 4 state
  const [identity, setIdentity] = useState<IdentityDetails>({
    aadhaarNumber: "",
    panNumber: "",
    aadhaarVerified: false,
    panVerified: false,
    agreed: false,
    digiPhone: "",
    digiOtp: "",
    digiOtpSent: false,
  });

  useEffect(() => {
    if (!authLoading && !user) navigate("/login");
  }, [user, authLoading, navigate]);

  // IFSC auto-fetch
  const fetchIFSC = useCallback(async (code: string) => {
    if (code.length !== 11) { setIfscData(null); return; }
    setIfscLoading(true);
    try {
      const res = await fetch(`https://ifsc.razorpay.com/${code}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setIfscData({ bank: data.BANK, branch: data.BRANCH, city: data.CITY });
      setBank((b) => ({ ...b, bankName: data.BANK }));
    } catch {
      setIfscData(null);
      toast.error("Invalid IFSC code");
    } finally {
      setIfscLoading(false);
    }
  }, []);

  useEffect(() => {
    if (bank.ifscCode.length === 11) fetchIFSC(bank.ifscCode);
    else setIfscData(null);
  }, [bank.ifscCode, fetchIFSC]);

  const toggleServiceType = (type: string) => {
    setBiz((b) => ({
      ...b,
      serviceTypes: b.serviceTypes.includes(type)
        ? b.serviceTypes.filter((t) => t !== type)
        : [...b.serviceTypes, type],
    }));
  };

  const validateStep2 = () => {
    if (biz.hostType === "individual") {
      if (!biz.fullName || !biz.phone || !biz.email) {
        toast.error("Please fill all required fields");
        return false;
      }
    } else {
      if (!biz.businessName || !biz.businessType || !biz.phone || !biz.email) {
        toast.error("Please fill all required business fields");
        return false;
      }
    }
    if (biz.serviceTypes.length === 0) {
      toast.error("Select at least one service type");
      return false;
    }
    return true;
  };

  const validateStep3 = () => {
    if (!bank.accountHolderName || !bank.accountNumber || !bank.confirmAccountNumber || !bank.ifscCode) {
      toast.error("Please fill all required bank fields");
      return false;
    }
    if (bank.accountNumber !== bank.confirmAccountNumber) {
      toast.error("Account numbers don't match");
      return false;
    }
    if (!ifscData) {
      toast.error("Please enter a valid IFSC code");
      return false;
    }
    return true;
  };

  const handleSimulateAadhaarVerify = async () => {
    setLoading(true);
    await new Promise((r) => setTimeout(r, 2000));
    setIdentity((id) => ({ ...id, aadhaarVerified: true }));
    setLoading(false);
    toast.success("Aadhaar verified successfully!");
  };

  const handleSimulatePanVerify = async () => {
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1500));
    setIdentity((id) => ({ ...id, panVerified: true }));
    setLoading(false);
    toast.success("PAN verified successfully!");
  };

  const handleDigiSendOTP = async () => {
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1500));
    setIdentity((id) => ({ ...id, digiOtpSent: true }));
    setLoading(false);
    toast.success("OTP sent successfully!");
  };

  const handleDigiVerifyOTP = async () => {
    setLoading(true);
    await new Promise((r) => setTimeout(r, 2000));
    setIdentity((id) => ({ ...id, aadhaarVerified: true }));
    setLoading(false);
    toast.success("Aadhaar verified via DigiLocker!");
  };

  const validateStep4 = () => {
    if (!identity.aadhaarNumber || identity.aadhaarNumber.length !== 12) {
      toast.error("Please enter a valid 12-digit Aadhaar number");
      return false;
    }
    if (biz.hostType === "business" && !identity.panNumber) {
      toast.error("PAN is mandatory for business hosts");
      return false;
    }
    if (!identity.agreed) {
      toast.error("Please accept the terms and conditions");
      return false;
    }
    return true;
  };


  const handleComplete = async () => {
    if (!user) return;

    try {
      const addressString = [biz.street, biz.city, biz.state, biz.pin].filter(Boolean).join(", ");

      const { error: profileError } = await supabase
        .from("host_profiles")
        .upsert({
          id: user.id,
          business_name: biz.hostType === "business" ? biz.businessName : biz.fullName,
          business_type: biz.hostType === "business" ? biz.businessType : "Individual",
          gst_number: biz.gstNumber || null,
          bank_account_holder: bank.accountHolderName,
          bank_account_number: bank.accountNumber,
          bank_ifsc: bank.ifscCode,
          aadhaar_last_four: identity.aadhaarNumber ? identity.aadhaarNumber.slice(-4) : null,
          pan_number: identity.panNumber || null,
          service_types: biz.serviceTypes,
          address: addressString || null,
        });

      if (profileError) throw profileError;

      const { error: roleError } = await supabase
        .from("user_roles")
        .upsert(
          {
            user_id: user.id,
            role: "host",
          },
          { onConflict: "user_id,role", ignoreDuplicates: true },
        );

      if (roleError) throw roleError;

      toast.success("Host profile submitted for review!");
      navigate("/host");
    } catch (error) {
      console.error(error);
      toast.error("Could not complete onboarding. Please try again.");
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="text-center mb-6">
          <button onClick={() => navigate("/")} className="transition-transform hover:scale-105 active:scale-95 mb-1">
            <DynamicLogo className="justify-center" />
          </button>
          <p className="text-sm text-muted-foreground">Host Onboarding</p>
        </div>

        <StepIndicator currentStep={step} totalSteps={5} />

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.3 }}
          >
            {/* Step 0 — Welcome */}
            {step === 0 && (
              <Card>
                <CardContent className="p-8 text-center space-y-6">
                  <div className="h-16 w-16 rounded-full bg-accent/20 flex items-center justify-center mx-auto">
                    <Building2 className="h-8 w-8 text-accent" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-foreground mb-2">Let's set up your Host profile</h2>
                    <p className="text-muted-foreground">
                      Welcome to Xplorwing! As a host, you can list eco stays, vehicles, and travel experiences for travelers from around the world. Let's get you set up in a few simple steps.
                    </p>
                  </div>
                  <div className="bg-muted/30 rounded-xl p-4 text-left space-y-2 text-sm text-muted-foreground">
                    <p className="flex items-center gap-2"><Briefcase className="h-4 w-4 text-accent" /> Share your business or property details</p>
                    <p className="flex items-center gap-2"><CreditCard className="h-4 w-4 text-accent" /> Add bank account for payouts</p>
                    <p className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-accent" /> Verify your identity for trust & safety</p>
                  </div>
                  <Button
                    onClick={() => setStep(1)}
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-6 text-base font-semibold"
                  >
                    Get Started <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Step 1 — Business / Property Details */}
            {step === 1 && (
              <Card>
                <CardContent className="p-6 space-y-6">
                  <h2 className="text-xl font-bold text-foreground">Business & Property Details</h2>

                  {/* Host Type Toggle */}
                  <div className="space-y-2">
                    <Label>Host Type</Label>
                    <div className="grid grid-cols-2 gap-3">
                      {(["individual", "business"] as const).map((type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setBiz((b) => ({ ...b, hostType: type }))}
                          className={`p-4 rounded-xl border-2 text-center transition-all ${
                            biz.hostType === type
                              ? "border-primary bg-primary/10 text-foreground"
                              : "border-border text-muted-foreground hover:border-primary/50"
                          }`}
                        >
                          {type === "individual" ? <User className="h-5 w-5 mx-auto mb-1" /> : <Building2 className="h-5 w-5 mx-auto mb-1" />}
                          <span className="text-sm font-medium capitalize">{type}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <AnimatePresence mode="wait">
                    <motion.div
                      key={biz.hostType}
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3 }}
                      className="space-y-4"
                    >
                      {biz.hostType === "individual" ? (
                        <>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>Full Name *</Label>
                              <Input value={biz.fullName} onChange={(e) => setBiz({ ...biz, fullName: e.target.value })} placeholder="Your full name" />
                            </div>
                            <div className="space-y-2">
                              <Label>Display Name</Label>
                              <Input value={biz.displayName} onChange={(e) => setBiz({ ...biz, displayName: e.target.value })} placeholder="Name shown on listings" />
                            </div>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>Phone *</Label>
                              <Input value={biz.phone} onChange={(e) => setBiz({ ...biz, phone: e.target.value.replace(/\D/g, "") })} placeholder="10-digit mobile" maxLength={10} />
                            </div>
                            <div className="space-y-2">
                              <Label>Alternate Phone</Label>
                              <Input value={biz.altPhone} onChange={(e) => setBiz({ ...biz, altPhone: e.target.value.replace(/\D/g, "") })} placeholder="Optional" maxLength={10} />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label>Email *</Label>
                            <Input value={biz.email} onChange={(e) => setBiz({ ...biz, email: e.target.value })} placeholder="Your email" type="email" />
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>Business Name *</Label>
                              <Input value={biz.businessName} onChange={(e) => setBiz({ ...biz, businessName: e.target.value })} placeholder="Registered business name" />
                            </div>
                            <div className="space-y-2">
                              <Label>Business Type *</Label>
                              <Select value={biz.businessType} onValueChange={(v) => setBiz({ ...biz, businessType: v })}>
                                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                                <SelectContent>
                                  {BUSINESS_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>GST Number</Label>
                              <Input value={biz.gstNumber} onChange={(e) => setBiz({ ...biz, gstNumber: e.target.value.toUpperCase() })} placeholder="Optional" maxLength={15} />
                            </div>
                            <div className="space-y-2">
                              <Label>MSME Registration No.</Label>
                              <Input value={biz.msmeNumber} onChange={(e) => setBiz({ ...biz, msmeNumber: e.target.value })} placeholder="Optional" />
                            </div>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>Phone *</Label>
                              <Input value={biz.phone} onChange={(e) => setBiz({ ...biz, phone: e.target.value.replace(/\D/g, "") })} placeholder="10-digit mobile" maxLength={10} />
                            </div>
                            <div className="space-y-2">
                              <Label>Email *</Label>
                              <Input value={biz.email} onChange={(e) => setBiz({ ...biz, email: e.target.value })} type="email" />
                            </div>
                          </div>
                          <h3 className="text-sm font-semibold text-foreground pt-2">Business Address</h3>
                          <div className="space-y-2">
                            <Input value={biz.street} onChange={(e) => setBiz({ ...biz, street: e.target.value })} placeholder="Street address" />
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                            <Input value={biz.city} onChange={(e) => setBiz({ ...biz, city: e.target.value })} placeholder="City" />
                            <Input value={biz.state} onChange={(e) => setBiz({ ...biz, state: e.target.value })} placeholder="State" />
                            <Input value={biz.pin} onChange={(e) => setBiz({ ...biz, pin: e.target.value.replace(/\D/g, "") })} placeholder="PIN" maxLength={6} />
                          </div>
                        </>
                      )}
                    </motion.div>
                  </AnimatePresence>

                  {/* Service Types */}
                  <div className="space-y-2">
                    <Label>What do you plan to list? *</Label>
                    <div className="flex flex-wrap gap-2">
                      {SERVICE_TYPE_OPTIONS.map((type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => toggleServiceType(type)}
                          className={`px-3 py-1.5 rounded-full text-sm border transition-all ${
                            biz.serviceTypes.includes(type)
                              ? "bg-primary text-primary-foreground border-primary"
                              : "border-border text-muted-foreground hover:border-primary/50"
                          }`}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Listing Count */}
                  <div className="space-y-2">
                    <Label>How many listings do you plan to add?</Label>
                    <Select value={biz.listingCount} onValueChange={(v) => setBiz({ ...biz, listingCount: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1</SelectItem>
                        <SelectItem value="2-5">2–5</SelectItem>
                        <SelectItem value="6-10">6–10</SelectItem>
                        <SelectItem value="10+">10+</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button
                    onClick={() => { if (validateStep2()) setStep(2); }}
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-5"
                  >
                    Continue <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Step 2 — Bank Account Details */}
            {step === 2 && (
              <Card>
                <CardContent className="p-6 space-y-6">
                  <h2 className="text-xl font-bold text-foreground">Bank Account Details</h2>
                  <p className="text-sm text-muted-foreground">Your payouts will be processed to this account within 3–5 business days after a booking is completed.</p>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Account Holder Name *</Label>
                      <Input value={bank.accountHolderName} onChange={(e) => setBank({ ...bank, accountHolderName: e.target.value })} placeholder="As per bank records" />
                    </div>

                    <div className="space-y-2">
                      <Label>IFSC Code *</Label>
                      <div className="relative">
                        <Input
                          value={bank.ifscCode}
                          onChange={(e) => setBank({ ...bank, ifscCode: e.target.value.toUpperCase() })}
                          placeholder="e.g. SBIN0001234"
                          maxLength={11}
                        />
                        {ifscLoading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />}
                        {ifscData && <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-accent" />}
                      </div>
                      {ifscData && (
                        <motion.div
                          initial={{ opacity: 0, y: -5 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="flex items-center gap-2 text-xs text-accent"
                        >
                          <MapPin className="h-3 w-3" />
                          {ifscData.bank} — {ifscData.branch}, {ifscData.city}
                        </motion.div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label>Bank Name</Label>
                      <Input value={bank.bankName} onChange={(e) => setBank({ ...bank, bankName: e.target.value })} placeholder="Auto-filled from IFSC" readOnly={!!ifscData} />
                    </div>

                    <div className="space-y-2">
                      <Label>Account Number *</Label>
                      <MaskedInput value={bank.accountNumber} onChange={(v) => setBank({ ...bank, accountNumber: v.replace(/\D/g, "") })} placeholder="Enter account number" />
                    </div>

                    <div className="space-y-2">
                      <Label>Confirm Account Number *</Label>
                      <MaskedInput value={bank.confirmAccountNumber} onChange={(v) => setBank({ ...bank, confirmAccountNumber: v.replace(/\D/g, "") })} placeholder="Re-enter account number" />
                      {bank.confirmAccountNumber && bank.accountNumber !== bank.confirmAccountNumber && (
                        <p className="text-xs text-destructive">Account numbers don't match</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label>Account Type</Label>
                      <RadioGroup value={bank.accountType} onValueChange={(v) => setBank({ ...bank, accountType: v as "savings" | "current" })} className="flex gap-4">
                        <div className="flex items-center gap-2">
                          <RadioGroupItem value="savings" id="savings" />
                          <Label htmlFor="savings" className="cursor-pointer">Savings</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <RadioGroupItem value="current" id="current" />
                          <Label htmlFor="current" className="cursor-pointer">Current</Label>
                        </div>
                      </RadioGroup>
                    </div>

                    <FileUploadZone
                      label="Upload cancelled cheque or passbook (optional)"
                      file={bank.chequeFile}
                      preview={bank.chequePreview}
                      onFileSelect={(f) => setBank({ ...bank, chequeFile: f, chequePreview: URL.createObjectURL(f) })}
                      onRemove={() => setBank({ ...bank, chequeFile: undefined, chequePreview: undefined })}
                    />
                  </div>

                  <Button
                    onClick={() => { if (validateStep3()) setStep(3); }}
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-5"
                  >
                    Continue <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Step 3 — Identity & Compliance */}
            {step === 3 && (
              <Card>
                <CardContent className="p-6 space-y-6">
                  <h2 className="text-xl font-bold text-foreground">Identity & Compliance</h2>

                  {/* Aadhaar */}
                  <div className="space-y-4 p-4 rounded-xl border border-border">
                    <div className="flex items-center gap-3">
                      <ShieldCheck className="h-5 w-5 text-accent" />
                      <div>
                        <h3 className="font-semibold text-foreground text-sm">Aadhaar Verification</h3>
                        <p className="text-xs text-muted-foreground">12-digit identity number</p>
                      </div>
                      {identity.aadhaarVerified && (
                        <span className="ml-auto text-xs font-medium px-2 py-1 rounded-full bg-accent/10 text-accent">Verified</span>
                      )}
                    </div>

                    {!identity.aadhaarVerified ? (
                      <Tabs defaultValue="upload" className="w-full">
                        <TabsList className="w-full grid grid-cols-2">
                          <TabsTrigger value="upload">Upload Docs</TabsTrigger>
                          <TabsTrigger value="digilocker">Use DigiLocker</TabsTrigger>
                        </TabsList>
                        <TabsContent value="upload" className="space-y-4 mt-4">
                          <div className="space-y-2">
                            <Label>Aadhaar Number *</Label>
                            <MaskedInput value={identity.aadhaarNumber} onChange={(v) => setIdentity({ ...identity, aadhaarNumber: v.replace(/\D/g, "") })} placeholder="xxxx xxxx xxxx" maxLength={12} />
                          </div>
                          <FileUploadZone
                            label="Aadhaar Front"
                            file={identity.aadhaarFrontFile}
                            onFileSelect={(f) => setIdentity({ ...identity, aadhaarFrontFile: f })}
                            onRemove={() => setIdentity({ ...identity, aadhaarFrontFile: undefined })}
                          />
                          <FileUploadZone
                            label="Aadhaar Back"
                            file={identity.aadhaarBackFile}
                            onFileSelect={(f) => setIdentity({ ...identity, aadhaarBackFile: f })}
                            onRemove={() => setIdentity({ ...identity, aadhaarBackFile: undefined })}
                          />
                          <Button
                            onClick={handleSimulateAadhaarVerify}
                            disabled={identity.aadhaarNumber.length !== 12 || !identity.aadhaarFrontFile || loading}
                            className="w-full"
                          >
                            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
                            Upload & Verify
                          </Button>
                        </TabsContent>
                        <TabsContent value="digilocker" className="space-y-4 mt-4">
                          <div className="space-y-2">
                            <Label>Mobile linked to DigiLocker</Label>
                            <div className="flex gap-2">
                              <span className="flex items-center px-3 rounded-xl border border-input bg-muted/30 text-sm text-muted-foreground">+91</span>
                              <Input
                                type="tel"
                                maxLength={10}
                                value={identity.digiPhone}
                                onChange={(e) => setIdentity({ ...identity, digiPhone: e.target.value.replace(/\D/g, "") })}
                                placeholder="10-digit number"
                                disabled={identity.digiOtpSent}
                              />
                            </div>
                          </div>
                          {!identity.digiOtpSent ? (
                            <Button onClick={handleDigiSendOTP} disabled={identity.digiPhone.length !== 10 || loading} className="w-full">
                              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Smartphone className="h-4 w-4 mr-2" />}
                              Send OTP
                            </Button>
                          ) : (
                            <div className="space-y-4">
                              <div className="space-y-2">
                                <Label>Enter 6-digit OTP</Label>
                                <div className="flex justify-center gap-2">
                                  {Array.from({ length: 6 }).map((_, i) => (
                                    <input
                                      key={i}
                                      type="text"
                                      maxLength={1}
                                      value={identity.digiOtp[i] || ""}
                                      onChange={(e) => {
                                        const val = e.target.value.replace(/\D/g, "");
                                        const newOtp = identity.digiOtp.split("");
                                        newOtp[i] = val;
                                        setIdentity({ ...identity, digiOtp: newOtp.join("") });
                                        if (val && e.target.nextElementSibling) (e.target.nextElementSibling as HTMLInputElement).focus();
                                      }}
                                      onKeyDown={(e) => {
                                        if (e.key === "Backspace" && !identity.digiOtp[i] && e.currentTarget.previousElementSibling)
                                          (e.currentTarget.previousElementSibling as HTMLInputElement).focus();
                                      }}
                                      className="w-11 h-13 text-center text-lg font-semibold rounded-xl border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                                    />
                                  ))}
                                </div>
                              </div>
                              <Button onClick={handleDigiVerifyOTP} disabled={identity.digiOtp.length !== 6 || loading} className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
                                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ShieldCheck className="h-4 w-4 mr-2" />}
                                Verify OTP
                              </Button>
                            </div>
                          )}
                        </TabsContent>
                      </Tabs>
                    ) : (
                      <div className="flex items-center gap-2 text-accent text-sm">
                        <CheckCircle2 className="h-4 w-4" /> Aadhaar verified successfully
                      </div>
                    )}
                  </div>

                  {/* PAN */}
                  <div className="space-y-4 p-4 rounded-xl border border-border">
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-primary" />
                      <div>
                        <h3 className="font-semibold text-foreground text-sm">PAN Card {biz.hostType === "business" ? "*" : "(Optional)"}</h3>
                        <p className="text-xs text-muted-foreground">For TDS compliance</p>
                      </div>
                      {identity.panVerified && (
                        <span className="ml-auto text-xs font-medium px-2 py-1 rounded-full bg-accent/10 text-accent">Verified</span>
                      )}
                    </div>
                    {!identity.panVerified ? (
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label>PAN Number</Label>
                          <Input
                            value={identity.panNumber}
                            onChange={(e) => setIdentity({ ...identity, panNumber: e.target.value.toUpperCase() })}
                            placeholder="ABCDE1234F"
                            maxLength={10}
                          />
                        </div>
                        <FileUploadZone
                          label="Upload PAN Card"
                          file={identity.panFile}
                          onFileSelect={(f) => setIdentity({ ...identity, panFile: f })}
                          onRemove={() => setIdentity({ ...identity, panFile: undefined })}
                        />
                        <Button onClick={handleSimulatePanVerify} disabled={!identity.panNumber || !identity.panFile || loading} variant="outline" className="w-full">
                          {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
                          Upload & Verify
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-accent text-sm">
                        <CheckCircle2 className="h-4 w-4" /> PAN verified successfully
                      </div>
                    )}
                  </div>

                  {/* Business docs */}
                  {biz.hostType === "business" && (
                    <div className="space-y-4 p-4 rounded-xl border border-border">
                      <h3 className="font-semibold text-foreground text-sm">Business Documents (Optional)</h3>
                      <FileUploadZone
                        label="GST Certificate"
                        file={identity.gstCertFile}
                        onFileSelect={(f) => setIdentity({ ...identity, gstCertFile: f })}
                        onRemove={() => setIdentity({ ...identity, gstCertFile: undefined })}
                      />
                      <FileUploadZone
                        label="Business Registration Document"
                        file={identity.businessRegFile}
                        onFileSelect={(f) => setIdentity({ ...identity, businessRegFile: f })}
                        onRemove={() => setIdentity({ ...identity, businessRegFile: undefined })}
                      />
                    </div>
                  )}

                  {/* Declaration */}
                  <div className="flex items-start gap-3 p-4 rounded-xl border border-border">
                    <Checkbox
                      id="agree"
                      checked={identity.agreed}
                      onCheckedChange={(v) => setIdentity({ ...identity, agreed: v === true })}
                      className="mt-1"
                    />
                    <label htmlFor="agree" className="text-sm text-muted-foreground cursor-pointer">
                      I confirm that all details provided are accurate and I agree to Xplorwing's Host Terms & Conditions.
                    </label>
                  </div>

                  <Button
                    onClick={() => { if (validateStep4()) setStep(4); }}
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-5"
                  >
                    Submit for Review <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Step 4 — Completion */}
            {step === 4 && (
              <Card>
                <CardContent className="p-8 text-center space-y-6">
                  <div className="h-16 w-16 rounded-full bg-accent/20 flex items-center justify-center mx-auto">
                    <Clock className="h-8 w-8 text-accent" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-foreground mb-2">Your host profile is under review</h2>
                    <p className="text-muted-foreground">Estimated review time: <strong>24–48 hours</strong></p>
                  </div>

                  <div className="space-y-3 text-left">
                    {[
                      { name: "Business Details", status: "submitted" },
                      { name: "Bank Account", status: "submitted" },
                      { name: "Aadhaar", status: identity.aadhaarVerified ? "verified" : "pending" },
                      { name: "PAN Card", status: identity.panVerified ? "verified" : identity.panNumber ? "submitted" : "skipped" },
                      ...(biz.hostType === "business"
                        ? [
                            { name: "GST Certificate", status: identity.gstCertFile ? "submitted" : "skipped" },
                            { name: "Business Registration", status: identity.businessRegFile ? "submitted" : "skipped" },
                          ]
                        : []),
                    ].map((doc) => (
                      <div key={doc.name} className="flex items-center gap-3 p-3 rounded-xl border border-border">
                        <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                          doc.status === "verified" ? "bg-accent/20" : doc.status === "submitted" ? "bg-primary/20" : "bg-muted"
                        }`}>
                          {doc.status === "verified" ? (
                            <ShieldCheck className="h-4 w-4 text-accent" />
                          ) : doc.status === "submitted" ? (
                            <Check className="h-4 w-4 text-primary" />
                          ) : (
                            <Clock className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                        <span className="flex-1 text-sm font-medium text-foreground">{doc.name}</span>
                        <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                          doc.status === "verified"
                            ? "bg-accent/10 text-accent"
                            : doc.status === "submitted"
                            ? "bg-primary/10 text-primary-foreground"
                            : "bg-muted text-muted-foreground"
                        }`}>
                          {doc.status === "verified" ? "Verified" : doc.status === "submitted" ? "Submitted" : "Skipped"}
                        </span>
                      </div>
                    ))}
                  </div>

                  <Button
                    onClick={handleComplete}
                    className="w-full bg-accent hover:bg-accent/90 text-accent-foreground py-6 text-base font-semibold"
                  >
                    Go to Host Dashboard <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>
            )}
          </motion.div>
        </AnimatePresence>

        {step > 0 && step < 4 && (
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => setStep(step - 1)}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1"
            >
              <ChevronLeft className="h-4 w-4" /> Go back
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
