import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield, ShieldCheck, ChevronLeft, Upload, Eye, Check,
  FileText, Loader2, X, ArrowRight, Sparkles, Fingerprint,
  CreditCard, Car, CheckCircle2, Clock, Zap, Star
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { DynamicLogo } from "@/components/DynamicLogo";
import { useQueryClient } from "@tanstack/react-query";

// ─── Types ────────────────────────────────────────────────────────────────────

type DocUploadStatus = "idle" | "uploading" | "done" | "error";

interface DocState {
  frontFile?: File;
  backFile?: File;
  frontPreview?: string;
  backPreview?: string;
  frontUrl?: string;
  backUrl?: string;
  docNumber: string;
  uploadStatus: DocUploadStatus;
  skipped: boolean;
}

const TOTAL_STEPS = 7;

// ─── Inline Styles ────────────────────────────────────────────────────────────

const styles = `
  .onb-bg {
    min-height: 100vh;
    background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 30%, #f0f9ff 70%, #eff6ff 100%);
  }
  .onb-card {
    background: rgba(255,255,255,0.85);
    backdrop-filter: blur(20px) saturate(1.5);
    -webkit-backdrop-filter: blur(20px) saturate(1.5);
    border: 1px solid rgba(255,255,255,0.5);
    border-radius: 1.5rem;
    box-shadow: 0 8px 40px -8px rgba(0,0,0,0.12), 0 0 0 1px rgba(255,255,255,0.3);
  }
  .onb-progress-bar {
    height: 4px;
    background: #e5e7eb;
    border-radius: 9999px;
    overflow: hidden;
  }
  .onb-progress-fill {
    height: 100%;
    border-radius: 9999px;
    background: linear-gradient(90deg, #16a34a, #22c55e);
    transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  }
  .onb-input {
    width: 100%;
    padding: 0.75rem 1rem;
    border-radius: 0.875rem;
    border: 1.5px solid rgba(0,0,0,0.08);
    background: rgba(255,255,255,0.7);
    color: #111;
    font-size: 0.95rem;
    outline: none;
    transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
  }
  .onb-input:focus {
    border-color: #16a34a;
    background: #fff;
    box-shadow: 0 0 0 3px rgba(22,163,74,0.1);
  }
  .onb-input::placeholder { color: #9ca3af; }
  .onb-btn-primary {
    width: 100%;
    padding: 0.875rem 1.5rem;
    border-radius: 0.875rem;
    background: linear-gradient(135deg, #15803d, #16a34a);
    color: #fff;
    font-weight: 700;
    font-size: 0.95rem;
    border: none;
    cursor: pointer;
    transition: transform 0.15s, box-shadow 0.2s, opacity 0.2s;
    box-shadow: 0 4px 14px rgba(22,163,74,0.3);
  }
  .onb-btn-primary:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 6px 20px rgba(22,163,74,0.35);
  }
  .onb-btn-primary:active:not(:disabled) { transform: scale(0.98); }
  .onb-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
  .onb-btn-secondary {
    width: 100%;
    padding: 0.75rem 1.5rem;
    border-radius: 0.875rem;
    background: transparent;
    color: #6b7280;
    font-weight: 600;
    font-size: 0.875rem;
    border: 1.5px solid rgba(0,0,0,0.08);
    cursor: pointer;
    transition: color 0.2s, border-color 0.2s, background 0.2s;
  }
  .onb-btn-secondary:hover { color: #111; border-color: rgba(0,0,0,0.2); background: rgba(0,0,0,0.02); }
  .upload-zone {
    border: 2px dashed rgba(0,0,0,0.1);
    border-radius: 0.875rem;
    padding: 1.5rem;
    text-align: center;
    cursor: pointer;
    transition: border-color 0.2s, background 0.2s;
  }
  .upload-zone:hover { border-color: #16a34a; background: rgba(22,163,74,0.03); }
  .upload-zone.has-file { border-color: #16a34a; background: rgba(22,163,74,0.05); border-style: solid; }
  .wing-benefit-card {
    display: flex;
    align-items: flex-start;
    gap: 0.875rem;
    padding: 0.875rem 1rem;
    border-radius: 0.875rem;
    background: rgba(255,255,255,0.6);
    border: 1px solid rgba(255,255,255,0.4);
  }
`;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function ProgressBar({ step }: { step: number }) {
  const pct = ((step) / (TOTAL_STEPS - 1)) * 100;
  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-2">
        <span className="text-xs font-semibold text-green-700">
          Step {step + 1} of {TOTAL_STEPS}
        </span>
        <span className="text-xs text-gray-400">{Math.round(pct)}% complete</span>
      </div>
      <div className="onb-progress-bar">
        <div className="onb-progress-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function FileUploadZone({
  label,
  required,
  file,
  preview,
  onFileSelect,
  onRemove,
  disabled,
}: {
  label: string;
  required?: boolean;
  file?: File;
  preview?: string;
  onFileSelect: (f: File) => void;
  onRemove: () => void;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-1.5">
      <label className="text-sm font-semibold text-gray-700">
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
        {!required && <span className="ml-2 text-[10px] uppercase tracking-wide text-gray-400 font-normal">optional</span>}
      </label>

      <input
        ref={inputRef}
        type="file"
        accept="image/*,.pdf"
        className="hidden"
        disabled={disabled}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          if (f.size > 5 * 1024 * 1024) { toast.error("File must be under 5MB"); return; }
          onFileSelect(f);
        }}
      />

      {file ? (
        <div className={`upload-zone has-file flex items-center gap-3 text-left`}>
          {preview && preview.startsWith("blob") && file.type.startsWith("image") ? (
            <img src={preview} alt="preview" className="w-12 h-10 object-cover rounded-lg shrink-0" />
          ) : (
            <FileText className="h-8 w-8 text-green-600 shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-800 truncate">{file.name}</p>
            <p className="text-xs text-gray-400">{(file.size / 1024).toFixed(0)} KB</p>
          </div>
          <div className="flex gap-1.5 shrink-0">
            {preview && (
              <button type="button" onClick={() => window.open(preview, "_blank")}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700">
                <Eye className="h-3.5 w-3.5" />
              </button>
            )}
            {!disabled && (
              <button type="button" onClick={onRemove}
                className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="upload-zone" onClick={() => !disabled && inputRef.current?.click()}>
          <Upload className="h-6 w-6 mx-auto mb-1.5 text-gray-300" />
          <p className="text-sm text-gray-500 font-medium">Click to upload</p>
          <p className="text-xs text-gray-400 mt-0.5">JPG, PNG or PDF · Max 5MB</p>
        </div>
      )}
    </div>
  );
}

// ─── Document Upload Step Component ──────────────────────────────────────────

function DocUploadStep({
  userId,
  docType,
  docLabel,
  docIcon,
  isRequired,
  docState,
  setDocState,
  onNext,
  onSkip,
}: {
  userId: string;
  docType: "aadhaar" | "pan" | "driving_license";
  docLabel: string;
  docIcon: React.ReactNode;
  isRequired: boolean;
  docState: DocState;
  setDocState: (s: DocState) => void;
  onNext: () => void;
  onSkip?: () => void;
}) {
  const queryClient = useQueryClient();

  const uploadFile = async (file: File, side: "front" | "back"): Promise<string> => {
    const ext = file.name.split(".").pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const filePath = `${userId}/${docType}/${side}/${fileName}`;
    const { error } = await supabase.storage.from("user-documents").upload(filePath, file);
    if (error) throw error;
    return filePath; // store path, not public URL (private bucket)
  };

  const handleUploadAndSave = async () => {
    if (!docState.frontFile) {
      toast.error("Please upload the front side of your document");
      return;
    }

    setDocState({ ...docState, uploadStatus: "uploading" });
    try {
      const frontPath = await uploadFile(docState.frontFile, "front");
      let backPath: string | undefined;
      if (docState.backFile) {
        backPath = await uploadFile(docState.backFile, "back");
      }

      // Save to user_documents using the new schema columns
      const { error: dbError } = await supabase.from("user_documents" as any).upsert({
        user_id: userId,
        document_type: docType,
        document_number: docState.docNumber,
        document_front_url: frontPath,
        document_back_url: backPath ?? null,
        status: "pending",
        submitted_at: new Date().toISOString(),
        attempt_number: 1,
      }, { onConflict: "user_id,document_type" });

      if (dbError) throw dbError;

      // Update profile kyc_status to 'pending'
      await supabase.from("profiles").update({ kyc_status: "pending" }).eq("id", userId);

      queryClient.invalidateQueries({ queryKey: ["user-kyc-docs", userId] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });

      setDocState({ ...docState, frontUrl: frontPath, backUrl: backPath, uploadStatus: "done" });
      toast.success(`${docLabel} uploaded successfully!`);
      setTimeout(onNext, 600);
    } catch (err: any) {
      console.error("Upload error:", err);
      toast.error(err.message || "Upload failed. Please try again.");
      setDocState({ ...docState, uploadStatus: "error" });
    }
  };

  if (docState.uploadStatus === "done") {
    return (
      <div className="flex flex-col items-center py-8 space-y-4">
        <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
          <CheckCircle2 className="h-8 w-8 text-green-600" />
        </div>
        <p className="font-bold text-gray-800">{docLabel} uploaded!</p>
        <p className="text-sm text-gray-500">Moving to next step…</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Doc Header */}
      <div className="flex items-center gap-3 p-4 rounded-xl bg-green-50/60 border border-green-100">
        <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center shrink-0">
          {docIcon}
        </div>
        <div>
          <h3 className="font-bold text-gray-800">{docLabel}</h3>
          <p className="text-xs text-gray-500">
            {isRequired ? "Required for identity verification" : "Optional — helps build trust with hosts"}
          </p>
        </div>
        <span className={`ml-auto shrink-0 text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
          isRequired ? "bg-red-100 text-red-600" : "bg-gray-100 text-gray-500"
        }`}>
          {isRequired ? "Required" : "Optional"}
        </span>
      </div>

      {/* Doc ID Input */}
      <div className="space-y-1.5">
        <label className="text-sm font-semibold text-gray-700">
          {docLabel} Number <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          className="onb-input"
          placeholder={`Enter your ${docLabel} ID`}
          value={docState.docNumber}
          disabled={docState.uploadStatus === "uploading"}
          onChange={(e) => setDocState({ ...docState, docNumber: e.target.value })}
        />
      </div>

      {/* Upload zones */}
      <FileUploadZone
        label="Front Side"
        required={true}
        file={docState.frontFile}
        preview={docState.frontPreview}
        disabled={docState.uploadStatus === "uploading"}
        onFileSelect={(f) => {
          setDocState({ ...docState, frontFile: f, frontPreview: URL.createObjectURL(f), uploadStatus: "idle" });
        }}
        onRemove={() => setDocState({ ...docState, frontFile: undefined, frontPreview: undefined })}
      />

      <FileUploadZone
        label="Back Side"
        required={false}
        file={docState.backFile}
        preview={docState.backPreview}
        disabled={docState.uploadStatus === "uploading"}
        onFileSelect={(f) => {
          setDocState({ ...docState, backFile: f, backPreview: URL.createObjectURL(f) });
        }}
        onRemove={() => setDocState({ ...docState, backFile: undefined, backPreview: undefined })}
      />

      {/* Submit */}
      <button
        type="button"
        className="onb-btn-primary flex items-center justify-center gap-2"
        disabled={!docState.frontFile || !docState.docNumber.trim() || docState.uploadStatus === "uploading"}
        onClick={handleUploadAndSave}
      >
        {docState.uploadStatus === "uploading" ? (
          <><Loader2 className="h-4 w-4 animate-spin" /> Uploading…</>
        ) : (
          <><Upload className="h-4 w-4" /> Upload {docLabel}</>
        )}
      </button>

      {!isRequired && onSkip && (
        <button
          type="button"
          onClick={() => {
            setDocState({ ...docState, skipped: true });
            onSkip();
          }}
          className="w-full text-center text-[12px] text-gray-400 hover:text-gray-700 transition-colors py-1"
        >
          Skip for now — I'll do this later
        </button>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function UserOnboarding() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const initialStep = Math.max(0, Math.min(parseInt(searchParams.get("step") || "0", 10), TOTAL_STEPS - 1));
  const [step, setStep] = useState(initialStep);
  const [saving, setSaving] = useState(false);

  // Step 2 — Basic profile
  const [basicInfo, setBasicInfo] = useState({
    full_name: "",
    phone: "",
    city: "",
  });

  // Step 4–6 — Document states
  const [aadhaar, setAadhaar] = useState<DocState>({ docNumber: "", uploadStatus: "idle", skipped: false });
  const [pan, setPan] = useState<DocState>({ docNumber: "", uploadStatus: "idle", skipped: false });
  const [dl, setDl] = useState<DocState>({ docNumber: "", uploadStatus: "idle", skipped: false });

  // ── Auth guard ──
  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  // ── Prefill from user/profile ──
  useEffect(() => {
    if (!user) return;

    const prefill = async () => {
      const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
      setBasicInfo({
        full_name: profile?.full_name || user.user_metadata?.full_name || "",
        phone: profile?.phone || user.phone || "",
        city: profile?.city || "",
      });

      // Restore already-uploaded docs (won't have File objects but marks them done)
      const { data: docs } = await (supabase as any).from("user_documents").select("*").eq("user_id", user.id);
      if (docs) {
        docs.forEach((d: any) => {
          const partial: Partial<DocState> = {
            docNumber: d.document_number || "",
            frontUrl: d.document_front_url,
            backUrl: d.document_back_url,
            uploadStatus: d.status === "pending" || d.status === "verified" || d.status === "under_review" ? "done" : "idle",
            skipped: false,
          };
          if (d.document_type === "aadhaar") setAadhaar(s => ({ ...s, ...partial }));
          else if (d.document_type === "pan") setPan(s => ({ ...s, ...partial }));
          else if (d.document_type === "driving_license") setDl(s => ({ ...s, ...partial }));
        });
      }
    };

    prefill();
  }, [user]);

  // ── Save basic profile to Supabase ──
  const saveBasicProfile = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("profiles").update({
        full_name: basicInfo.full_name,
        phone: basicInfo.phone,
        city: basicInfo.city,
        onboarding_step: 2,
      }).eq("id", user.id);
      if (error) throw error;
    } catch (err: any) {
      toast.error(err.message || "Failed to save profile");
      throw err;
    } finally {
      setSaving(false);
    }
  };

  // ── Save onboarding completion ──
  const handleComplete = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await supabase.from("profiles").update({
        onboarding_completed: true,
        onboarding_step: 6,
        kyc_status: "pending",
      }).eq("id", user.id);
      toast.success("Welcome to Xplorwing! Your journey begins now.");
      navigate("/");
    } catch (err: any) {
      toast.error(err.message || "Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  const goNext = () => setStep(s => Math.min(s + 1, TOTAL_STEPS - 1));
  const goBack = () => setStep(s => Math.max(s - 1, 0));

  const firstName = basicInfo.full_name.split(" ")[0] || user?.user_metadata?.full_name?.split(" ")?.[0] || "Explorer";

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-green-600" />
      </div>
    );
  }

  return (
    <>
      <style>{styles}</style>
      <div className="onb-bg pb-16">
        <div className="max-w-md mx-auto px-4 pt-8">

          {/* Logo */}
          <div className="flex justify-center mb-6">
            <button onClick={() => navigate("/")} className="transition-transform hover:scale-105 active:scale-95">
              <DynamicLogo lightHeightClass="h-8" darkHeightClass="h-9" />
            </button>
          </div>

          {/* Progress */}
          {step > 0 && step < TOTAL_STEPS - 1 && (
            <div className="mb-6">
              <ProgressBar step={step} />
            </div>
          )}

          {/* Card */}
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
              className="onb-card p-7"
            >

              {/* ── STEP 0: WELCOME ───────────────────────────────────── */}
              {step === 0 && (
                <div className="space-y-6 text-center">
                  <div className="relative mx-auto w-20 h-20">
                    <div className="absolute inset-0 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 opacity-20 blur-xl" />
                    <div className="relative h-20 w-20 rounded-full bg-gradient-to-br from-green-100 to-emerald-200 flex items-center justify-center mx-auto">
                      <Shield className="h-10 w-10 text-green-700" />
                    </div>
                  </div>

                  <div>
                    <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">
                      Welcome aboard,<br />{firstName}! 🌿
                    </h1>
                    <p className="text-sm text-gray-500 mt-2 leading-relaxed">
                      Let's set up your Xplorwing profile in just 7 quick steps. Complete your KYC to unlock all features.
                    </p>
                  </div>

                  <div className="space-y-2.5 text-left">
                    {[
                      { icon: <Fingerprint className="h-4 w-4 text-green-600" />, text: "Aadhaar verification (required)" },
                      { icon: <CreditCard className="h-4 w-4 text-blue-500" />, text: "PAN Card (optional)" },
                      { icon: <Car className="h-4 w-4 text-orange-500" />, text: "Driving License (optional)" },
                    ].map(({ icon, text }) => (
                      <div key={text} className="flex items-center gap-3 text-sm text-gray-600 bg-white/60 px-3 py-2 rounded-xl border border-white/50">
                        {icon}
                        <span>{text}</span>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-3 pt-2">
                    <button className="onb-btn-primary flex items-center justify-center gap-2" onClick={goNext}>
                      Get Started <ArrowRight className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      className="w-full text-xs text-gray-400 hover:text-gray-700 transition-colors py-1"
                      onClick={() => {
                        navigate("/");
                        toast.info("You can complete this anytime from your Profile.");
                      }}
                    >
                      Skip for now
                    </button>
                  </div>
                </div>
              )}

              {/* ── STEP 1: BASIC PROFILE ─────────────────────────────── */}
              {step === 1 && (
                <div className="space-y-5">
                  <div>
                    <h2 className="text-xl font-extrabold text-gray-900">Your Profile</h2>
                    <p className="text-xs text-gray-400 mt-1">Tell us a little about yourself</p>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-gray-700">Full Name <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        className="onb-input"
                        placeholder="Your full name"
                        value={basicInfo.full_name}
                        onChange={(e) => setBasicInfo({ ...basicInfo, full_name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-gray-700">
                        WhatsApp / Phone <span className="text-red-500">*</span>
                      </label>
                      <div className="flex gap-2">
                        <div className="flex items-center px-3 rounded-[0.875rem] border-[1.5px] border-[rgba(0,0,0,0.08)] bg-white/50 text-sm text-gray-500 shrink-0">
                          🇮🇳 +91
                        </div>
                        <input
                          type="tel"
                          className="onb-input flex-1"
                          placeholder="10-digit number"
                          value={basicInfo.phone.replace(/^\+91/, "")}
                          maxLength={10}
                          onChange={(e) => setBasicInfo({ ...basicInfo, phone: e.target.value.replace(/\D/g, "").slice(0, 10) })}
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-gray-700">City <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        className="onb-input"
                        placeholder="e.g. Bengaluru, Goa, Mumbai"
                        value={basicInfo.city}
                        onChange={(e) => setBasicInfo({ ...basicInfo, city: e.target.value })}
                      />
                    </div>
                  </div>

                  <button
                    className="onb-btn-primary flex items-center justify-center gap-2"
                    disabled={!basicInfo.full_name.trim() || basicInfo.phone.length < 10 || !basicInfo.city.trim() || saving}
                    onClick={async () => {
                      try {
                        await saveBasicProfile();
                        goNext();
                      } catch (_) { /* error already toasted */ }
                    }}
                  >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                    {saving ? "Saving…" : "Save & Continue"}
                  </button>
                </div>
              )}

              {/* ── STEP 2: WINGID EXPLAINER ─────────────────────────── */}
              {step === 2 && (
                <div className="space-y-5">
                  <div className="text-center">
                    <div className="relative inline-block mx-auto mb-4">
                      <div className="absolute inset-0 rounded-full bg-gradient-to-br from-yellow-300 to-amber-500 opacity-25 blur-xl scale-125" />
                      <div className="relative h-16 w-16 rounded-full bg-gradient-to-br from-amber-100 to-yellow-200 flex items-center justify-center mx-auto">
                        <Zap className="h-8 w-8 text-amber-600" />
                      </div>
                    </div>
                    <h2 className="text-xl font-extrabold text-gray-900">Meet your WingID ✈️</h2>
                    <p className="text-sm text-gray-500 mt-1.5 leading-relaxed">
                      Your unique 12-digit digital identity on Xplorwing — your passport to exploring India.
                    </p>
                  </div>

                  <div className="space-y-3">
                    {[
                      {
                        icon: <Shield className="h-5 w-5 text-green-600" />,
                        title: "Instant Trust",
                        desc: "Hosts and guests can verify your identity in seconds",
                        bg: "bg-green-50/80",
                      },
                      {
                        icon: <Star className="h-5 w-5 text-amber-500" />,
                        title: "Priority Access",
                        desc: "WingID holders get first access to exclusive listings",
                        bg: "bg-amber-50/80",
                      },
                      {
                        icon: <Sparkles className="h-5 w-5 text-blue-500" />,
                        title: "WingPass QR",
                        desc: "One scan to share your verified profile at any property",
                        bg: "bg-blue-50/80",
                      },
                      {
                        icon: <ShieldCheck className="h-5 w-5 text-purple-500" />,
                        title: "Safe Community",
                        desc: "Every verified user makes the platform safer for all",
                        bg: "bg-purple-50/80",
                      },
                    ].map(({ icon, title, desc, bg }) => (
                      <div key={title} className={`wing-benefit-card ${bg}`}>
                        <div className="h-9 w-9 rounded-full bg-white/80 flex items-center justify-center shrink-0">
                          {icon}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-800">{title}</p>
                          <p className="text-xs text-gray-500">{desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="p-4 rounded-xl bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-100 text-center">
                    <p className="text-xs text-amber-700 font-medium">
                      🎯 Your WingID is generated automatically after your KYC is approved.
                    </p>
                  </div>

                  <button className="onb-btn-primary flex items-center justify-center gap-2" onClick={goNext}>
                    Continue to Document Verification <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              )}

              {/* ── STEP 3: AADHAAR ─────────────────────────────────────── */}
              {step === 3 && (
                <div className="space-y-4">
                  <div>
                    <h2 className="text-xl font-extrabold text-gray-900">Aadhaar Card</h2>
                    <p className="text-xs text-gray-400 mt-1">Step 4 of 7 — Aadhaar verification is required</p>
                  </div>
                  <DocUploadStep
                    userId={user?.id || ""}
                    docType="aadhaar"
                    docLabel="Aadhaar Card"
                    docIcon={<Fingerprint className="h-5 w-5 text-green-600" />}
                    isRequired={true}
                    docState={aadhaar}
                    setDocState={setAadhaar}
                    onNext={goNext}
                  />
                </div>
              )}

              {/* ── STEP 4: PAN ─────────────────────────────────────────── */}
              {step === 4 && (
                <div className="space-y-4">
                  <div>
                    <h2 className="text-xl font-extrabold text-gray-900">PAN Card</h2>
                    <p className="text-xs text-gray-400 mt-1">Step 5 of 7 — Optional but recommended</p>
                  </div>
                  <DocUploadStep
                    userId={user?.id || ""}
                    docType="pan"
                    docLabel="PAN Card"
                    docIcon={<CreditCard className="h-5 w-5 text-blue-500" />}
                    isRequired={false}
                    docState={pan}
                    setDocState={setPan}
                    onNext={goNext}
                    onSkip={goNext}
                  />
                </div>
              )}

              {/* ── STEP 5: DRIVING LICENSE ─────────────────────────────── */}
              {step === 5 && (
                <div className="space-y-4">
                  <div>
                    <h2 className="text-xl font-extrabold text-gray-900">Driving License</h2>
                    <p className="text-xs text-gray-400 mt-1">Step 6 of 7 — Required for vehicle rentals</p>
                  </div>
                  <DocUploadStep
                    userId={user?.id || ""}
                    docType="driving_license"
                    docLabel="Driving License"
                    docIcon={<Car className="h-5 w-5 text-orange-500" />}
                    isRequired={false}
                    docState={dl}
                    setDocState={setDl}
                    onNext={goNext}
                    onSkip={goNext}
                  />
                </div>
              )}

              {/* ── STEP 6: CONFIRMATION ────────────────────────────────── */}
              {step === 6 && (
                <div className="space-y-6 text-center">
                  {/* Illustration */}
                  <div className="relative mx-auto w-24 h-24">
                    <div className="absolute inset-0 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 opacity-20 blur-2xl scale-150" />
                    <div className="relative h-24 w-24 rounded-full bg-gradient-to-br from-green-100 to-emerald-200 flex items-center justify-center mx-auto">
                      <CheckCircle2 className="h-12 w-12 text-green-600" />
                    </div>
                    {/* Sparkle dots */}
                    {[["top-1 right-2", "h-3 w-3", "text-yellow-400"],["bottom-2 left-1","h-2.5 w-2.5","text-blue-400"],["top-4 left-0","h-2 w-2","text-pink-400"]].map(([pos, sz, col]) => (
                      <div key={pos} className={`absolute ${pos}`}>
                        <Sparkles className={`${sz} ${col}`} />
                      </div>
                    ))}
                  </div>

                  <div>
                    <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">
                      KYC Submitted! 🎉
                    </h2>
                    <p className="text-sm text-gray-500 mt-2 leading-relaxed max-w-[280px] mx-auto">
                      We will review your documents within&nbsp;
                      <strong className="text-gray-700">2 business hours</strong> and notify you on{" "}
                      <strong className="text-green-600">WhatsApp</strong>.
                    </p>
                  </div>

                  {/* Doc summary */}
                  <div className="space-y-2 text-left">
                    {[
                      { label: "Aadhaar Card", state: aadhaar },
                      { label: "PAN Card", state: pan },
                      { label: "Driving License", state: dl },
                    ].map(({ label, state }) => {
                      const done = state.uploadStatus === "done";
                      const skipped = state.skipped;
                      return (
                        <div key={label} className="flex items-center gap-3 px-4 py-2.5 rounded-xl border border-gray-100 bg-white/60">
                          {done ? (
                            <div className="h-7 w-7 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                              <Check className="h-3.5 w-3.5 text-green-600" />
                            </div>
                          ) : (
                            <div className="h-7 w-7 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                              <Clock className="h-3.5 w-3.5 text-gray-400" />
                            </div>
                          )}
                          <span className="text-sm font-medium text-gray-700 flex-1">{label}</span>
                          <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                            done ? "bg-green-100 text-green-700" :
                            skipped ? "bg-gray-100 text-gray-500" :
                            "bg-yellow-100 text-yellow-700"
                          }`}>
                            {done ? "Uploaded" : skipped ? "Skipped" : "Pending"}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  <div className="p-4 rounded-xl bg-green-50 border border-green-100">
                    <p className="text-xs text-green-700 font-medium">
                      🔒 Your documents are encrypted and stored securely. They are only used for KYC verification.
                    </p>
                  </div>

                  <button
                    className="onb-btn-primary flex items-center justify-center gap-2"
                    disabled={saving}
                    onClick={handleComplete}
                  >
                    {saving ? (
                      <><Loader2 className="h-4 w-4 animate-spin" /> Please wait…</>
                    ) : (
                      <>Start Your Exploring Journey with Xplorwing <ArrowRight className="h-4 w-4" /></>
                    )}
                  </button>
                </div>
              )}

            </motion.div>
          </AnimatePresence>

          {/* Back button */}
          {step > 0 && step < TOTAL_STEPS - 1 && (
            <div className="mt-5 text-center">
              <button
                type="button"
                onClick={goBack}
                className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700 transition-colors"
              >
                <ChevronLeft className="h-3.5 w-3.5" /> Go back
              </button>
            </div>
          )}

        </div>
      </div>
    </>
  );
}
