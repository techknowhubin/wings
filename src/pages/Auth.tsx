import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mail, Lock, Eye, EyeOff, User, PhoneCall } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { z } from "zod";
import heroXplorwing from "@/assets/hero-xplorwing.jpg";
import { DynamicLogo } from "@/components/DynamicLogo";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/* ─── validation ─── */
const signupSchema = z.object({
  fullName: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});
const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

/* ─── inline styles to keep auth page self-contained ─── */
const styles = `
  .auth-bg {
    position: absolute; inset: 0;
    background-size: cover; background-position: center;
    will-change: transform;
  }
  .auth-card {
    background: rgba(255,255,255,0.27);
    backdrop-filter: blur(16px) saturate(1.4);
    -webkit-backdrop-filter: blur(16px) saturate(1.4);
    border: 1px solid rgba(255,255,255,0.25);
    border-radius: 2rem;
    box-shadow:
      0 0 0 1px rgba(255,255,255,0.1),
      0 20px 60px -10px rgba(0,0,0,0.18),
      0 0 120px -40px rgba(0,0,0,0.08);
  }
  .auth-input {
    height: 2.75rem;
    width: 100%;
    padding: 0 1rem 0 2.75rem;
    border-radius: 0.875rem;
    border: 1.5px solid rgba(0,0,0,0.08);
    background: rgba(255,255,255,0.5);
    color: #111;
    font-size: 0.95rem;
    outline: none;
    transition: border-color 0.2s ease, background 0.2s ease, box-shadow 0.2s ease;
  }
  .auth-input::placeholder { color: #9ca3af; }
  .auth-input:focus {
    border-color: rgba(0,0,0,0.18);
    background: rgba(255,255,255,0.85);
    box-shadow: 0 0 0 3px rgba(0,0,0,0.04);
  }
  .auth-input.wa-input {
    padding-left: 5.5rem;
    font-size: 1.05rem;
    letter-spacing: 0.04em;
  }
  .auth-input.wa-input:focus {
    box-shadow: 0 0 0 3px rgba(37,211,102,0.12);
  }
  .auth-btn {
    width: 100%;
    height: 3rem;
    border-radius: 0.875rem;
    font-weight: 700;
    font-size: 0.95rem;
    border: none;
    cursor: pointer;
    transition: transform 0.15s ease, background 0.2s ease, box-shadow 0.2s ease;
    will-change: transform;
  }
  .auth-btn:active { transform: scale(0.98); }
  .auth-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .auth-btn-primary {
    background: #111;
    color: #fff;
    box-shadow: 0 4px 14px rgba(0,0,0,0.12);
  }
  .auth-btn-primary:hover:not(:disabled) { background: #000; }
  .social-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 2.75rem;
    border-radius: 0.75rem;
    border: 1.5px solid rgba(0,0,0,0.08);
    background: #ffffff;
    cursor: pointer;
    transition: background 0.2s ease, border-color 0.2s ease, transform 0.12s ease;
    will-change: transform;
  }
  .social-btn:hover { background: #f5f5f5; border-color: rgba(0,0,0,0.14); }
  .social-btn:active { transform: scale(0.96); }
  .social-btn.active {
    background: #111;
    border-color: #111;
    color: #fff;
  }
  /* smooth cross-fade for view transitions */
  .auth-view {
    transition: opacity 0.25s ease, transform 0.25s ease;
  }
  .auth-view-enter {
    opacity: 1; transform: translateY(0);
  }
  .auth-view-exit {
    opacity: 0; transform: translateY(8px);
    position: absolute; inset: 0; pointer-events: none;
  }
  .divider-line {
    flex: 1;
    height: 1px;
    background: repeating-linear-gradient(
      to right,
      rgba(0,0,0,0.1) 0px,
      rgba(0,0,0,0.1) 4px,
      transparent 4px,
      transparent 8px
    );
  }
  /* page load animation */
  @keyframes authCardIn {
    from { opacity: 0; transform: translateY(20px) scale(0.98); }
    to { opacity: 1; transform: translateY(0) scale(1); }
  }
  .auth-card-animate {
    animation: authCardIn 0.5s cubic-bezier(0.16,1,0.3,1) forwards;
  }
  /* countdown ring */
  .countdown-ring {
    width: 44px; height: 44px;
  }
  .countdown-ring circle {
    fill: none;
    stroke-width: 3;
    stroke-linecap: round;
    transform: rotate(-90deg);
    transform-origin: 50% 50%;
  }
`;

const Auth = () => {
  const [loading, setLoading] = useState(false);
  const { signUp, signIn, signInWithProvider, signInWithPopup, signInWithOtp, verifyOtp, user, getUserRole } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  // Guard: only route once per login event, ignore subsequent flickers
  const hasRoutedRef = useRef(false);

  // View state
  const [authMethod, setAuthMethod] = useState<"whatsapp" | "email">("whatsapp");

  // WhatsApp state
  const [waNumber, setWaNumber] = useState("");
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [otpValue, setOtpValue] = useState("");
  const [countdown, setCountdown] = useState(60);

  // Email state
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [verificationPending, setVerificationPending] = useState(false);

  // WhatsApp fallback modal
  const [showWaModal, setShowWaModal] = useState(false);

  /* ─── routing ─── */
  const handleSuccessRoleRouting = async (currentUser = user) => {
    setLoading(true);
    const r = await getUserRole();
    if (r === "admin") {
      navigate("/admin");
    } else if (r === "host") {
      navigate("/host");
    } else {
      // Regular user — check if onboarding is done
      const { data: profile } = await supabase
        .from('profiles')
        .select('onboarding_completed')
        .eq('id', currentUser?.id)
        .maybeSingle();
      if (!profile?.onboarding_completed) {
        navigate("/onboarding/user");
      } else {
        navigate("/");
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    // Reset the guard whenever the user logs out
    if (!user) {
      hasRoutedRef.current = false;
      return;
    }
    // Only route once — ignore subsequent re-renders during auth initialization
    if (hasRoutedRef.current || verificationPending) return;
    hasRoutedRef.current = true;

    if (!user.phone && !isOtpSent && user.app_metadata?.provider === "google") {
      setShowWaModal(true);
    } else if (!showWaModal) {
      handleSuccessRoleRouting(user);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, verificationPending]);

  /* ─── countdown ─── */
  useEffect(() => {
    if (!isOtpSent || countdown <= 0) return;
    const id = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [countdown, isOtpSent]);

  /* ─── WhatsApp handlers ─── */
  const handleSendWaOtp = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (waNumber.replace(/\D/g, "").length !== 10) {
      toast({ variant: "destructive", title: "Invalid Number", description: "Please enter a valid 10-digit number." });
      return;
    }
    setLoading(true);
    const { error } = await signInWithOtp(`+91${waNumber}`);
    setLoading(false);
    if (error) {
      toast({ variant: "destructive", title: "Failed to send OTP", description: error.message });
    } else {
      setIsOtpSent(true);
      setCountdown(60);
      setOtpValue("");
      toast({ title: "OTP Sent", description: "Check your WhatsApp for the verification code." });
    }
  };

  const handleVerifyWaOtp = async (value: string) => {
    if (value.length !== 6) return;
    setLoading(true);
    const { data, error } = await verifyOtp(`+91${waNumber}`, value);
    if (error) {
      setLoading(false);
      toast({ variant: "destructive", title: "Verification Failed", description: error.message });
    } else {
      toast({ title: "Success!", description: "WhatsApp number verified." });
      if (showWaModal) {
        setShowWaModal(false);
      }
      // Route immediately based on server-provided flag — don't wait for useEffect
      if ((data as any)?.is_new_user) {
        navigate("/onboarding/user");
      }
      // Returning users are routed by the useEffect watching `user` state
    }
  };

  /* ─── Google ─── */
  const handleGoogleSignIn = async () => {
    setLoading(true);
    const { error } = await signInWithPopup("google");
    setLoading(false);
    if (error) {
      // If the email is already registered via email/password, guide user
      const isConflict = error.message?.toLowerCase().includes("already registered") ||
                         error.message?.toLowerCase().includes("already exists");
      if (isConflict) {
        toast({
          variant: "destructive",
          title: "Account exists with this email",
          description: "You already have an account with this email. Sign in with email & password instead, then link Google from Settings.",
        });
        setAuthMethod("email");
        setIsLoginMode(true);
      } else {
        toast({ variant: "destructive", title: "Google Auth Failed", description: error.message });
      }
    }
  };

  /* ─── Email ─── */
  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    if (isLoginMode) {
      try {
        loginSchema.parse({ email, password });
        const { error } = await signIn(email, password);
        if (error) throw error;
        toast({ title: "Welcome back!", description: "Signed in successfully." });
      } catch (err: any) {
        setLoading(false);
        toast({ variant: "destructive", title: "Login Failed", description: err instanceof z.ZodError ? err.errors[0].message : err.message });
      }
    } else {
      try {
        signupSchema.parse({ fullName, email, password });
        const { data, error } = await signUp(email, password, fullName, "user");
        if (error) throw error;
        if (data.session) {
          toast({ title: "Account Created!", description: "Welcome to Xplorwing." });
        } else {
          setVerificationPending(true);
          setLoading(false);
        }
      } catch (err: any) {
        setLoading(false);
        const msg: string = err instanceof z.ZodError ? err.errors[0].message : err.message;
        // Detect "email already registered" — guide user to sign in instead
        const isConflict = msg?.toLowerCase().includes("already registered") ||
                           msg?.toLowerCase().includes("already exists") ||
                           msg?.toLowerCase().includes("user already");
        if (isConflict) {
          toast({
            variant: "destructive",
            title: "Account already exists",
            description: "An account with this email already exists. Sign in instead, or use Google if you registered with Google.",
          });
          setIsLoginMode(true);
        } else {
          toast({ variant: "destructive", title: "Signup Failed", description: msg });
        }
      }
    }
  };

  /* ─── helpers ─── */
  const countdownPercent = countdown / 60;
  const circumference = 2 * Math.PI * 18;

  /* ─── shared WhatsApp form (used in card + modal) ─── */
  const renderWhatsAppInput = (autoFocusInput = true) => (
    <>
      {!isOtpSent ? (
        <form onSubmit={handleSendWaOtp} className="space-y-5">
          <div className="relative flex items-center">
            <div className="absolute left-3.5 flex items-center gap-1.5 pointer-events-none text-gray-400 z-10">
              <span className="text-sm">🇮🇳</span>
              <span className="text-sm font-semibold pr-1.5 border-r border-gray-200/80">+91</span>
            </div>
            <input
              type="tel"
              value={waNumber}
              onChange={(e) => setWaNumber(e.target.value.replace(/\D/g, "").slice(0, 10))}
              placeholder="98765 43210"
              className="auth-input wa-input"
              autoFocus={autoFocusInput}
            />
          </div>
          <button
            type="submit"
            disabled={loading || waNumber.length < 10}
            className="auth-btn auth-btn-primary"
          >
            {loading ? "Sending…" : "Get Started"}
          </button>
        </form>
      ) : (
        <div className="space-y-5">
          <p className="text-center text-xs text-gray-500 font-medium">
            Enter the 6-digit code sent to <span className="text-gray-800 font-bold">+91 {waNumber}</span>
          </p>
          <div className="flex justify-center">
            <InputOTP
              maxLength={6}
              value={otpValue}
              onChange={(val) => { setOtpValue(val); if (val.length === 6) handleVerifyWaOtp(val); }}
              disabled={loading}
            >
              <InputOTPGroup className="gap-2">
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <InputOTPSlot
                    key={i}
                    index={i}
                    className="w-11 h-[3.25rem] text-lg rounded-xl border-[1.5px] border-gray-200/80 bg-white/50 focus-within:border-gray-400"
                  />
                ))}
              </InputOTPGroup>
            </InputOTP>
          </div>
          <div className="flex items-center justify-center gap-3 pt-1">
            {countdown > 0 ? (
              <div className="flex items-center gap-2">
                <svg className="countdown-ring" viewBox="0 0 44 44">
                  <circle cx="22" cy="22" r="18" stroke="rgba(0,0,0,0.06)" />
                  <circle
                    cx="22" cy="22" r="18"
                    stroke="#111"
                    strokeDasharray={circumference}
                    strokeDashoffset={circumference * (1 - countdownPercent)}
                    style={{ transition: "stroke-dashoffset 1s linear" }}
                  />
                </svg>
                <span className="text-xs text-gray-400 font-bold tabular-nums">{countdown}s</span>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => handleSendWaOtp()}
                disabled={loading}
                className="text-xs font-bold text-[#115f10] hover:underline underline-offset-4"
              >
                Resend OTP
              </button>
            )}
            <span className="text-gray-400">|</span>
            <button
              type="button"
              onClick={() => { setIsOtpSent(false); setOtpValue(""); }}
              className="text-xs text-[#115f10] hover:opacity-80 font-medium transition-opacity"
            >
              Change number
            </button>
          </div>
        </div>
      )}
    </>
  );

  /* ─── render ─── */
  return (
    <>
      <style>{styles}</style>

      <div className="min-h-screen w-full relative flex items-center justify-center p-4 sm:p-6 overflow-hidden">
        {/* Background */}
        <div className="auth-bg" style={{ backgroundImage: `url(${heroXplorwing})` }}>
          <div className="absolute inset-0 bg-gradient-to-b from-black/5 via-transparent to-black/10" />
        </div>

        {/* Card */}
        <div className="relative z-10 w-full max-w-[420px] auth-card auth-card-animate p-7 sm:p-9">
          {/* Logo */}
          <div className="flex justify-center mb-7">
            <Link to="/" className="transition-transform hover:scale-105 active:scale-95">
              <DynamicLogo lightHeightClass="h-9" darkHeightClass="h-[50px]" />
            </Link>
          </div>

          {/* Header */}
          <div className="text-center mb-7">
            <h1 className="text-[1.5rem] font-extrabold text-gray-900 tracking-tight leading-tight">
              {authMethod === "whatsapp"
                ? (isOtpSent ? "Enter verification code" : "Sign in with WhatsApp")
                : verificationPending
                  ? "Check your inbox"
                  : isLoginMode ? "Sign in with email" : "Create your account"
              }
            </h1>
            <p className="text-gray-500 mt-1.5 text-[13px] leading-relaxed max-w-[260px] mx-auto">
              {authMethod === "whatsapp"
                ? (isOtpSent
                  ? "A 6-digit code was sent to your WhatsApp."
                  : "Enter your mobile number to get a secure verification code.")
                : verificationPending
                  ? `We've sent a link to ${email}`
                  : isLoginMode
                    ? "Welcome back! Enter your credentials."
                    : "Join the community of explorers."
              }
            </p>
          </div>

          {/* Main form area — CSS transition instead of AnimatePresence */}
          <div className="relative overflow-hidden" style={{ minHeight: authMethod === "email" ? 250 : 200 }}>
            {/* WhatsApp view */}
            <div
              className="auth-view"
              style={{
                opacity: authMethod === "whatsapp" ? 1 : 0,
                transform: authMethod === "whatsapp" ? "translateY(0)" : "translateY(8px)",
                pointerEvents: authMethod === "whatsapp" ? "auto" : "none",
                position: authMethod === "whatsapp" ? "relative" : "absolute",
                inset: authMethod === "whatsapp" ? undefined : 0,
              }}
            >
              {renderWhatsAppInput()}
            </div>

            {/* Email view */}
            <div
              className="auth-view"
              style={{
                opacity: authMethod === "email" ? 1 : 0,
                transform: authMethod === "email" ? "translateY(0)" : "translateY(8px)",
                pointerEvents: authMethod === "email" ? "auto" : "none",
                position: authMethod === "email" ? "relative" : "absolute",
                inset: authMethod === "email" ? undefined : 0,
              }}
            >
              {verificationPending ? (
                <div className="flex flex-col items-center py-6 text-center space-y-3">
                  <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center">
                    <Mail className="w-6 h-6 text-gray-600" />
                  </div>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-[#115f10] font-bold animate-pulse">
                    Waiting for verification…
                  </p>
                </div>
              ) : (
                <form onSubmit={handleEmailAuth} className="flex flex-col justify-center space-y-3" style={{ minHeight: "250px" }}>
                  {!isLoginMode && (
                    <div className="relative">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-gray-400" />
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="auth-input"
                        placeholder="Full Name"
                        required
                      />
                    </div>
                  )}
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-gray-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="auth-input"
                      placeholder="Email"
                      required
                    />
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-gray-400" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="auth-input"
                      style={{ paddingRight: "2.75rem" }}
                      placeholder="Password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
                    </button>
                  </div>
                  {isLoginMode && (
                    <div className="flex justify-end">
                      <Link to="/forgot-password" className="text-[11px] font-bold text-[#115f10] hover:opacity-80 transition-opacity">
                        Forgot password?
                      </Link>
                    </div>
                  )}
                  <button type="submit" disabled={loading} className="auth-btn auth-btn-primary">
                    {loading ? "Please wait…" : isLoginMode ? "Sign In" : "Get Started"}
                  </button>
                  <div className="mt-auto pt-1">
                    <p className="text-center">
                      <button
                        type="button"
                        onClick={() => setIsLoginMode(!isLoginMode)}
                        className="text-[11px] text-[#115f10] font-semibold hover:opacity-80 transition-opacity"
                      >
                        {isLoginMode ? "Don't have an account? " : "Already have an account? "}
                        <span className="font-extrabold underline underline-offset-4 decoration-1">{isLoginMode ? "Sign up" : "Sign in"}</span>
                      </button>
                    </p>
                  </div>
                </form>
              )}
            </div>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3 my-7">
            <div className="divider-line" />
            <span className="text-[10px] uppercase tracking-[0.15em] font-bold text-[#115f10] whitespace-nowrap select-none">
              Or sign in with
            </span>
            <div className="divider-line" />
          </div>

          {/* Social row */}
          <div className="grid grid-cols-3 gap-3">
            {/* WhatsApp toggle */}
            <button
              onClick={() => {
                setAuthMethod("whatsapp");
              }}
              className={`social-btn ${authMethod === "whatsapp" ? "active" : ""}`}
              title="WhatsApp"
            >
              <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill={authMethod === "whatsapp" ? "#fff" : "#25D366"}>
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
            </button>

            {/* Google */}
            <button onClick={handleGoogleSignIn} disabled={loading} className="social-btn" title="Google">
              <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24">
                <path fill="#EA4335" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#4285F4" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
            </button>

            {/* Email toggle */}
            <button
              onClick={() => {
                setAuthMethod(authMethod === "whatsapp" ? "email" : "whatsapp");
                setIsOtpSent(false);
              }}
              className={`social-btn ${authMethod === "email" ? "active" : ""}`}
              title="Email"
            >
              <Mail className="h-[18px] w-[18px]" />
            </button>
          </div>

          {/* Footer */}
          <p className="text-center mt-6 text-[10px] text-[#115f10] leading-relaxed">
            By continuing, you agree to our{" "}
            <a href="#" className="underline underline-offset-2 hover:opacity-80">Terms</a>
            {" & "}
            <a href="#" className="underline underline-offset-2 hover:opacity-80">Privacy Policy</a>
          </p>
        </div>
      </div>

      {/* WhatsApp Fallback Modal */}
      <Dialog open={showWaModal} onOpenChange={(open) => { if (open) setShowWaModal(true); }}>
        <DialogContent className="max-w-[400px] border-none bg-white/92 backdrop-blur-[40px] rounded-[2rem] p-8 sm:p-9 shadow-2xl [&>button]:hidden">
          <DialogHeader>
            <div className="mx-auto w-14 h-14 bg-[#25D366]/10 text-[#25D366] rounded-full flex items-center justify-center mb-5">
              <PhoneCall className="w-7 h-7" />
            </div>
            <DialogTitle className="text-xl font-extrabold text-center text-gray-900">Verify WhatsApp</DialogTitle>
            <DialogDescription className="text-center text-gray-500 text-[13px] leading-relaxed pt-1">
              Verify your number for booking updates and host communication.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-6">{renderWhatsAppInput()}</div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default Auth;
