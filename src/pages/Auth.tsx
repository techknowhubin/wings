import { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { Mail, Lock, Eye, EyeOff, User, PhoneCall, Gift } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { z } from "zod";
import heroXplorwing from "@/assets/hero-xplorwing.jpg";
import { DynamicLogo } from "@/components/DynamicLogo";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { supabase } from "@/integrations/supabase/client";
import { useRateLimit } from "@/hooks/useRateLimit";
import { executeRoleBasedRedirect } from "@/lib/auth-routing";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PasswordStrengthMeter } from "@/components/PasswordStrengthMeter";

/* ─── validation ─── */
const passwordRules = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
const signupSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  mobileNumber: z.string().regex(/^[0-9]{10}$/, "Mobile number must be 10 digits"),
  password: z.string().min(8, "Password must be at least 8 characters").regex(passwordRules, "Password must include uppercase, lowercase, number, and special character"),
  confirmPassword: z.string().min(8, "Confirm password is required"),
  role: z.enum(['user','host','admin']),
}).superRefine((values, ctx) => {
  if (values.password !== values.confirmPassword) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['confirmPassword'],
      message: 'Passwords do not match',
    });
  }
});
const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

/* ─── inline styles to keep auth page self-contained ─── */
const styles = `
  * {
    font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important;
  }
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
    border-radius: 9999px;
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
    border-radius: 9999px;
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
    background: #e5f76e;
    color: #115f10;
    box-shadow: 0 4px 14px rgba(0,0,0,0.12);
  }
  .auth-btn-primary:hover:not(:disabled) { background: #d4e65d; }
  .social-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 2.75rem;
    border-radius: 9999px;
    border: 1.5px solid rgba(0,0,0,0.08);
    background: #ffffff;
    cursor: pointer;
    transition: background 0.2s ease, border-color 0.2s ease, transform 0.12s ease;
    will-change: transform;
  }
  .social-btn:hover { background: #f5f5f5; border-color: rgba(0,0,0,0.14); }
  .social-btn:active { transform: scale(0.96); }
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

// Email check phases:
// 'enter'   → neutral entry: email field + Continue button
// 'checking'→ loading while RPC runs
// 'login'   → account found: show password form
// 'signup'  → account not found: show full registration form
type EmailPhase = 'enter' | 'checking' | 'login' | 'signup';

const Auth = () => {
  const [loading, setLoading] = useState(false);
  const { signUp, signIn, signOut, resendEmail, signInWithPopup, signInWithOtp, verifyOtp, user, getUserRole, checkEmailRegistered } = useAuth();
  const { toast } = useToast();
  const { checkLimit } = useRateLimit();
  const navigate = useNavigate();
  const location = useLocation();
  // Guard: only route once per login event, ignore subsequent flickers
  const hasRoutedRef = useRef(false);

  // 2FA State
  const [checking2FA, setChecking2FA] = useState(false);
  const [requires2FA, setRequires2FA] = useState(false);
  const [twoFAVerified, setTwoFAVerified] = useState(false);
  const [twoFAUserId, setTwoFAUserId] = useState<string | null>(null);
  const [twoFASecret, setTwoFASecret] = useState<string | null>(null);
  const [twoFACode, setTwoFACode] = useState("");
  const [twoFARecoveryMode, setTwoFARecoveryMode] = useState(false);
  const [twoFARecoveryCode, setTwoFARecoveryCode] = useState("");

  const isHostSignupPath = location.pathname === "/host/signup";
  const isHostSigninPath = location.pathname === "/host/signin";

  // View state
  const [authMethod, setAuthMethod] = useState<"whatsapp" | "email">("email");

  // WhatsApp state
  const [waNumber, setWaNumber] = useState("");
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [otpValue, setOtpValue] = useState("");
  const [countdown, setCountdown] = useState(60);

  const [searchParams] = useSearchParams();
  const targetRole = (isHostSignupPath || isHostSigninPath) ? "host" : searchParams.get("role");

  // Email phase — host paths skip the check step entirely
  const initialEmailPhase: EmailPhase = isHostSignupPath ? 'signup' : isHostSigninPath ? 'login' : 'enter';
  const [emailPhase, setEmailPhase] = useState<EmailPhase>(initialEmailPhase);

  // Derived compat helpers (used in existing logic below)
  const isLoginMode = emailPhase === 'login';
  const setIsLoginMode = (v: boolean) => setEmailPhase(v ? 'login' : 'signup');

  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [fullName, setFullName] = useState("");
  const [verificationPending, setVerificationPending] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);
  const [confirmationSuccess, setConfirmationSuccess] = useState(false);
  const [successCountdown, setSuccessCountdown] = useState(5);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [roleConfirmed, setRoleConfirmed] = useState(false);
  const showRoleSelection = emailPhase === 'signup' && !roleConfirmed && !isHostSignupPath;

  // WhatsApp fallback modal
  const [showWaModal, setShowWaModal] = useState(false);
  // WhatsApp registration check state
  const [waAccountExists, setWaAccountExists] = useState<boolean | null>(null);

  const [selectedRole, setSelectedRole] = useState<'user' | 'host'>(
    targetRole === 'host' ? 'host' : 'user'
  );

  const [referralCode, setReferralCode] = useState("");
  const [referralError, setReferralError] = useState("");

  useEffect(() => {
    setSelectedRole(targetRole === 'host' ? 'host' : 'user');
  }, [targetRole]);

  // Auto-fill referral code from ?ref= URL param
  useEffect(() => {
    const ref = searchParams.get("ref");
    if (ref) {
      const clean = ref.trim().toUpperCase();
      if (/^WING[A-Z0-9]{6,}$/.test(clean)) {
        setReferralCode(clean);
      }
    }
  }, []);

  // Set initial phase based on path
  useEffect(() => {
    if (isHostSigninPath) {
      setEmailPhase('login');
    } else if (isHostSignupPath) {
      setEmailPhase('signup');
    }
  }, [isHostSigninPath, isHostSignupPath]);

  // Reset role confirmation and email phase when path changes
  useEffect(() => {
    setRoleConfirmed(false);
    if (!isHostSignupPath && !isHostSigninPath) {
      setEmailPhase('enter');
    }
  }, [location.pathname]);

  // Show account-deleted message if admin deleted this account
  useEffect(() => {
    const msg = localStorage.getItem('account_deleted_msg');
    if (msg) {
      localStorage.removeItem('account_deleted_msg');
      toast({ variant: "destructive", title: "Account Removed", description: msg });
    }
  }, []);

  /* ─── routing ─── */
  const handleSuccessRoleRouting = async (currentUser = user) => {
    setLoading(true);
    await executeRoleBasedRedirect(currentUser, navigate, targetRole);
    setLoading(false);
  };

  useEffect(() => {
    // The OAuth popup also loads /auth. We must do nothing there — the popup closes
    // automatically via AuthContext. All auth decisions (including the new-user check)
    // must run only in the main window, not the popup.
    if (typeof window !== 'undefined' && window.opener && window.opener !== window) return;

    // 1. Check for confirmation link in URL (hash or query)
    const hash = location.hash;
    const search = location.search;
    
    const hasConfirmParams = hash.includes("access_token") || 
                             hash.includes("type=signup") || 
                             hash.includes("type=recovery") ||
                             hash.includes("type=invite") ||
                             search.includes("type=signup") ||
                             search.includes("type=recovery") ||
                             search.includes("code="); // For PKCE flow if enabled

    if (hasConfirmParams && !confirmationSuccess) {
      console.log("[Auth] Confirmation detected in URL:", { hash: hash.substring(0, 20) + "...", search });
      setConfirmationSuccess(true);
      setVerificationPending(false);
      setSuccessCountdown(5);
      return;
    }

    // BLOCK standard routing if we are in the middle of a confirmation or recovery flow
    if (confirmationSuccess || hasConfirmParams) return;

    // 2. Standard session handling
    if (!user) {
      hasRoutedRef.current = false;
      return;
    }
    
    // Only route once — ignore subsequent re-renders during auth initialization
    if (hasRoutedRef.current) return;
    if (verificationPending && !user) return;

    hasRoutedRef.current = true;

    const handleGoogleLoginCheck = async () => {
      // Call the edge function (service-role key → bypasses RLS, checks user_roles):
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        if (currentSession?.access_token) {
          const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://uhtwkajqpuazxpnbaojx.supabase.co";
          const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVodHdrYWpxcHVhenhwbmJhb2p4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE2NzY1NTcsImV4cCI6MjA3NzI1MjU1N30.RPdeJk13uqnFssQXUyA0acsf53xgceR-59VLzoB7Wfg";
          const resp = await fetch(`${supabaseUrl}/functions/v1/delete-unregistered-user`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${currentSession.access_token}`,
              apikey: anonKey,
            },
          });

          if (resp.status === 200) {
            await signOut();
            hasRoutedRef.current = false;
            toast({
              variant: "destructive",
              title: "No account found",
              description: "No account found for this Google email. Please sign up first.",
            });
            return;
          }
        }
      } catch {
        // Network/fetch error — fail open, don't block the user.
      }

      handleSuccessRoleRouting(user);
    };

    const runAuthFlow = async () => {
      if (!twoFAVerified && !requires2FA && !checking2FA) {
        setChecking2FA(true);
        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('two_factor_enabled, two_factor_secret_encrypted')
            .eq('id', user.id)
            .maybeSingle();

          if (profile?.two_factor_enabled) {
            setRequires2FA(true);
            setTwoFAUserId(user.id);
            setChecking2FA(false);
            
            // Background decrypt secret
            if (profile.two_factor_secret_encrypted) {
              import('@/lib/crypto').then(({ decryptField }) => {
                decryptField(profile.two_factor_secret_encrypted, {
                  table: 'profiles',
                  column: 'two_factor_secret_encrypted',
                  recordId: user.id
                }).then(setTwoFASecret).catch(console.error);
              });
            }
            return; // HALT ROUTING
          }
        } catch (err) {
          console.error("Failed to check 2FA", err);
        }
        setChecking2FA(false);
      }

      if (requires2FA && !twoFAVerified) return;

      const googleMode = localStorage.getItem("google_auth_mode");
      if (googleMode === "login") {
        localStorage.removeItem("google_auth_mode");
        await handleGoogleLoginCheck();
      } else {
        localStorage.removeItem("google_auth_mode");
        handleSuccessRoleRouting(user);
      }
    };

    runAuthFlow();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, verificationPending, confirmationSuccess, location.hash, location.search, location.pathname, twoFAVerified]);

  /* ─── Success Countdown ─── */
  useEffect(() => {
    if (!confirmationSuccess || successCountdown <= 0) {
      if (confirmationSuccess && successCountdown <= 0) {
        setConfirmationSuccess(false);
        const checkAndRoute = async () => {
          let activeUser = user;
          if (!activeUser) {
            const { data: { session } } = await supabase.auth.getSession();
            activeUser = session?.user || null;
          }
          handleSuccessRoleRouting(activeUser);
        };
        checkAndRoute();
      }
      return;
    }
    const id = setInterval(() => setSuccessCountdown((c) => c - 1), 1000);
    return () => clearInterval(id);
  }, [confirmationSuccess, successCountdown, navigate, user]);

  /* ─── countdown ─── */
  useEffect(() => {
    if (!isOtpSent || countdown <= 0) return;
    const id = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [countdown, isOtpSent]);

  /* ─── WhatsApp handlers ─── */
  const handleSendWaOtp = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (targetRole) {
      localStorage.setItem("pending_role", targetRole);
    } else {
      localStorage.setItem("pending_role", selectedRole);
    }
    if (waNumber.replace(/\D/g, "").length !== 10) {
      toast({ variant: "destructive", title: "Invalid Number", description: "Please enter a valid 10-digit number." });
      return;
    }
    setLoading(true);

    // Check if this phone number is registered before sending OTP
    const formattedPhone = `+91${waNumber}`;
    const { data: phoneCheck } = await supabase
      .from('profiles')
      .select('id')
      .or(`phone.eq.${formattedPhone},phone.eq.${waNumber}`)
      .maybeSingle();

    if (!phoneCheck) {
      setLoading(false);
      setWaAccountExists(false);
      toast({
        variant: "destructive",
        title: "Account not found",
        description: "No account found for this number. Please create an account with your email first.",
      });
      return;
    }

    setWaAccountExists(true);
    const { error } = await signInWithOtp(formattedPhone);
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

  const handleContinueRoleSelection = () => {
    if (!selectedRole) {
      toast({ variant: "destructive", title: "Role selection required", description: "Please choose Traveller or Host to continue." });
      return;
    }

    setRoleConfirmed(true);
    if (selectedRole === 'host') {
      navigate('/host/signup');
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
        const savedRole = localStorage.getItem("pending_role");
        if (targetRole === 'host' || savedRole === 'host') {
          localStorage.removeItem("pending_role");
          navigate("/host/onboarding");
        } else {
          navigate("/onboarding/user");
        }
      }
      // Returning users are routed by the useEffect watching `user` state
    }
  };

  const handleResendEmail = async () => {
    if (resendCountdown > 0) return;
    setLoading(true);
    const { error } = await resendEmail(email);
    setLoading(false);
    if (error) {
      toast({ variant: "destructive", title: "Resend Failed", description: error.message });
    } else {
      toast({ title: "Email Sent", description: "Verification link has been resent to your email." });
      setResendCountdown(60);
    }
  };

  /* ─── resend countdown ─── */
  useEffect(() => {
    if (resendCountdown <= 0) return;
    const id = setInterval(() => setResendCountdown((c) => c - 1), 1000);
    return () => clearInterval(id);
  }, [resendCountdown]);

  /* ─── Google ─── */
  const handleGoogleSignIn = async () => {
    if (targetRole) {
      localStorage.setItem("pending_role", targetRole);
    } else {
      localStorage.setItem("pending_role", selectedRole);
    }
    localStorage.setItem("remember_me", rememberMe ? "true" : "false");
    localStorage.setItem("google_auth_mode", isLoginMode ? "login" : "signup");
    setLoading(true);
    const roleToAssign = targetRole === 'host' ? 'host' : selectedRole;
    const { error } = await signInWithPopup("google", roleToAssign);
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

  /* ─── Email check: enter phase ─── */
  const handleEmailContinue = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors({});
    const trimmed = email.trim();
    if (!trimmed) {
      setFormErrors({ email: 'Please enter your email address.' });
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmed)) {
      setFormErrors({ email: 'Please enter a valid email address.' });
      return;
    }
    setEmailPhase('checking');
    const { exists, checked } = await checkEmailRegistered(trimmed);

    if (!checked) {
      // RPC not yet deployed (run supabase/auth_email_check.sql). Default to login so
      // existing users are never blocked. They can switch to signup via the toggle below.
      setEmailPhase('login');
      return;
    }

    if (exists) {
      setEmailPhase('login');
      toast({ title: "Account found", description: "Welcome back! Please enter your password." });
    } else {
      setEmailPhase('signup');
      toast({ title: "New here?", description: "No account found — let's create one for you." });
    }
  };

  /* ─── Email auth: login / signup ─── */
  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors({});
    if (targetRole) {
      localStorage.setItem("pending_role", targetRole);
    } else {
      localStorage.setItem("pending_role", selectedRole);
    }
    localStorage.setItem("remember_me", rememberMe ? "true" : "false");
    setLoading(true);

    if (isLoginMode) {
      try {
        loginSchema.parse({ email, password });
        
        const limitRes = await checkLimit('login', email);
        if (!limitRes.allowed) {
          toast({
            variant: "destructive",
            title: "Too many login attempts",
            description: limitRes.message || "Rate limit exceeded. Please wait.",
          });
          setLoading(false);
          return;
        }

        const { error } = await signIn(email, password);
        if (error) throw error;
        toast({ title: "Welcome back!", description: "Signed in successfully." });
      } catch (err: any) {
        if (err instanceof z.ZodError) {
          toast({ variant: "destructive", title: "Validation Error", description: err.errors[0].message });
        } else {
          const msg: string = err.message ?? '';
          const msgL = msg.toLowerCase();

          // Supabase returns "Invalid login credentials" for BOTH wrong password and
          // unknown email — treat it as wrong credentials, never redirect to signup.
          const isWrongCredentials =
            msgL.includes('invalid login') ||
            msgL.includes('invalid credentials');

          const isUnverified =
            msg === 'email_not_verified' ||
            msgL.includes('email not confirmed') ||
            msgL.includes('email_not_confirmed');

          if (isWrongCredentials) {
            toast({
              variant: "destructive",
              title: "Incorrect password",
              description: "The password you entered is incorrect. Please try again or reset your password.",
            });
          } else if (isUnverified) {
            toast({
              variant: "destructive",
              title: "Email not confirmed",
              description: "Please check your inbox and click the verification link before signing in.",
            });
          } else {
            toast({ variant: "destructive", title: "Sign in failed", description: msg });
          }
        }
      } finally {
        setLoading(false);
      }
      return;
    }

    if (showRoleSelection) {
      setLoading(false);
      toast({ variant: "destructive", title: "Role selection required", description: "Please choose Traveller or Host before creating your account." });
      return;
    }

    try {
      const parsed = signupSchema.parse({
        fullName,
        email,
        mobileNumber,
        password,
        confirmPassword,
        role: targetRole === 'host' ? 'host' : selectedRole,
      });

      const limitRes = await checkLimit('registration');
      if (!limitRes.allowed) {
        toast({
          variant: "destructive",
          title: "Too many registration attempts",
          description: limitRes.message || "Rate limit exceeded. Please wait.",
        });
        setLoading(false);
        return;
      }

      // Validate and store referral code if provided
      const trimmedRef = referralCode.trim().toUpperCase();
      if (trimmedRef) {
        if (!/^WING[A-Z0-9]{6,}$/.test(trimmedRef)) {
          setReferralError("Invalid referral code format");
          setLoading(false);
          return;
        }
        const { data: refProfile } = await supabase
          .from('profiles')
          .select('id')
          .eq('referral_code', trimmedRef)
          .maybeSingle();
        if (!refProfile) {
          setReferralError("Referral code not found");
          setLoading(false);
          return;
        }
        const { captureReferral } = await import('@/lib/referral');
        captureReferral(trimmedRef);
      }

      const { data, error } = await signUp(parsed.email, parsed.password, parsed.fullName, parsed.mobileNumber, parsed.role);
      if (error) throw error;

      const userExists = data?.user && data.user.identities && data.user.identities.length === 0;
      if (userExists) {
        throw new Error("User already exists with this email");
      }

      // Clear WING referral code now that it's been passed to signup metadata
      const { clearUserReferral } = await import('@/lib/referral');
      clearUserReferral();

      if (data.session) {
        toast({ title: "Account Created!", description: "Welcome to Xplorwing." });
      } else {
        setVerificationPending(true);
        toast({ title: "Verify your email", description: "A confirmation link has been sent to your email address." });
      }
    } catch (err: any) {
      const zodError = err instanceof z.ZodError ? err.errors[0] : null;
      if (zodError) {
        const path = zodError.path?.[0] as string | undefined;
        if (path) {
          setFormErrors((prev) => ({ ...prev, [path]: zodError.message }));
        }
        toast({ variant: "destructive", title: "Validation Error", description: zodError.message });
      } else {
        const msg: string = err.message || "Something went wrong";
        const msgL = msg.toLowerCase();
        const isEmailSendFail =
          msgL.includes('error sending confirmation email') ||
          msgL.includes('email sending') ||
          msgL.includes('failed to send') ||
          msgL.includes('smtp');
        const isConflict = msgL.includes("already registered") ||
          msgL.includes("already exists") ||
          msgL.includes("user already");
        if (isEmailSendFail) {
          // Account was created but confirmation email couldn't be sent (SMTP issue).
          // Show a helpful message so the user knows to contact support.
          setVerificationPending(true);
          toast({
            variant: "destructive",
            title: "Email delivery issue",
            description: "Your account was created but the confirmation email couldn't be sent. Please contact support or try resending from the login page.",
          });
        } else if (isConflict) {
          toast({
            variant: "destructive",
            title: "User already exists",
            description: "An account with this email already exists. Sign in instead.",
          });
          setIsLoginMode(true);
        } else {
          toast({ variant: "destructive", title: "Signup Failed", description: msg });
        }
      }
    } finally {
      setLoading(false);
    }
  };

  /* ─── 2FA Handlers ─── */
  const submit2FA = async (e: React.FormEvent, codeOverride?: string) => {
    e.preventDefault();
    if (!twoFAUserId || !twoFASecret) return;
    setLoading(true);

    try {
      const { checkOTPLockout, recordFailedOTP, resetOTPAttempts, verifyTOTP } = await import('@/lib/totp');
      const lockout = await checkOTPLockout(twoFAUserId);
      
      if (lockout.locked && lockout.lockedUntil) {
        toast({ variant: "destructive", title: "Account Locked", description: `Too many failed attempts. Try again at ${lockout.lockedUntil.toLocaleTimeString()}` });
        setLoading(false);
        return;
      }

      if (twoFARecoveryMode) {
        // Check recovery codes
        const { data } = await supabase.from('profiles').select('recovery_codes_encrypted').eq('id', twoFAUserId).single();
        if (data?.recovery_codes_encrypted) {
          const { decryptField, encryptField } = await import('@/lib/crypto');
          const decrypted = await decryptField(data.recovery_codes_encrypted, {
            table: 'profiles',
            column: 'recovery_codes_encrypted',
            recordId: twoFAUserId
          });
          const codes: string[] = JSON.parse(decrypted);
          
          const targetCode = codeOverride || twoFARecoveryCode;
          if (codes.includes(targetCode)) {
            // Valid recovery code - consume it
            const newCodes = codes.filter(c => c !== targetCode);
            const newEncrypted = await encryptField(JSON.stringify(newCodes));
            await supabase.from('profiles').update({ recovery_codes_encrypted: newEncrypted }).eq('id', twoFAUserId);
            
            await resetOTPAttempts(twoFAUserId);
            hasRoutedRef.current = false;
            setTwoFAVerified(true);
            toast({ title: "Verification Success", description: "Recovery code accepted." });
          } else {
            const fail = await recordFailedOTP(twoFAUserId);
            toast({ variant: "destructive", title: "Invalid Code", description: `Recovery code incorrect. ${fail.remainingAttempts} attempts remaining.` });
          }
        }
      } else {
        // Normal TOTP Verification
        const targetCode = codeOverride || twoFACode;
        const isValid = verifyTOTP(twoFASecret, targetCode);
        if (isValid) {
          await resetOTPAttempts(twoFAUserId);
          hasRoutedRef.current = false;
          setTwoFAVerified(true);
        } else {
          const fail = await recordFailedOTP(twoFAUserId);
          toast({ variant: "destructive", title: "Invalid Code", description: `Verification code incorrect. ${fail.remainingAttempts} attempts remaining.` });
        }
      }
    } catch (err: any) {
      toast({ variant: "destructive", title: "Verification Failed", description: err.message });
    } finally {
      setLoading(false);
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
          {waAccountExists === false && (
            <p className="text-[11px] text-red-400 text-center">
              No account with this number.{' '}
              <button
                type="button"
                onClick={() => { setAuthMethod('email'); setEmailPhase('signup'); setWaAccountExists(null); }}
                className="underline font-bold hover:opacity-80"
              >
                Create account with email
              </button>
            </p>
          )}
          <button
            type="submit"
            disabled={loading || waNumber.length < 10}
            className="auth-btn auth-btn-primary"
            onClick={() => setWaAccountExists(null)}
          >
            {loading ? "Checking…" : "Get Started"}
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
                className="text-xs font-bold text-[#e5f76e] hover:underline underline-offset-4"
              >
                Resend OTP
              </button>
            )}
            <span className="text-gray-400">|</span>
            <button
              type="button"
              onClick={() => { setIsOtpSent(false); setOtpValue(""); }}
              className="text-xs text-[#e5f76e] hover:opacity-80 font-medium transition-opacity"
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
            <h1
              className={
                authMethod === "email"
                  ? "text-[1.5rem] font-extrabold text-[#064E3B] tracking-tight leading-tight"
                  : "text-[1.5rem] font-extrabold text-[#115f10] tracking-tight leading-tight"
              }
            >
              {requires2FA && !twoFAVerified ? "Two-Factor Authentication"
                : authMethod === "whatsapp"
                ? (isOtpSent ? "Enter verification code" : "Sign in with WhatsApp")
                : emailPhase === 'enter' || emailPhase === 'checking' ? "Sign in or create account"
                : emailPhase === 'login' ? "Welcome back!"
                : "Create your account"
              }
            </h1>
            <p
              className={
                authMethod === "email"
                  ? "text-[#064E3B] mt-1.5 text-[13px] leading-relaxed max-w-[260px] mx-auto"
                  : "text-[#115f10] mt-1.5 text-[13px] leading-relaxed max-w-[260px] mx-auto"
              }
            >
              {requires2FA && !twoFAVerified ? "Protecting your account with an extra layer of security"
                : authMethod === "whatsapp"
                ? (isOtpSent
                  ? "A 6-digit code was sent to your WhatsApp."
                  : "Enter your mobile number to get a secure verification code.")
                : emailPhase === 'enter' || emailPhase === 'checking'
                  ? "Enter your email address to get started."
                  : emailPhase === 'login'
                    ? "Your account was found. Please enter your password."
                    : "No account found — let's set one up for you."
              }
            </p>
          </div>

          {/* Main form area — CSS transition instead of AnimatePresence */}
          <div className="relative overflow-hidden" style={{ minHeight: requires2FA && !twoFAVerified ? 250 : authMethod === "email" ? 250 : 200 }}>
            {/* 2FA view */}
            <div
              className="auth-view"
              style={{
                opacity: requires2FA && !twoFAVerified ? 1 : 0,
                transform: requires2FA && !twoFAVerified ? "translateY(0)" : "translateY(8px)",
                pointerEvents: requires2FA && !twoFAVerified ? "auto" : "none",
                position: requires2FA && !twoFAVerified ? "relative" : "absolute",
                inset: requires2FA && !twoFAVerified ? undefined : 0,
              }}
            >
              <div className="space-y-6">
                <form onSubmit={submit2FA} className="space-y-4">
                  {twoFARecoveryMode ? (
                    <div className="space-y-3">
                      <div className="relative">
                        <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-gray-400" />
                        <input
                          type="text"
                          value={twoFARecoveryCode}
                          onChange={(e) => setTwoFARecoveryCode(e.target.value)}
                          className="auth-input font-mono tracking-wider text-center"
                          style={{ paddingLeft: "3rem" }}
                          placeholder="Recovery Code"
                          maxLength={8}
                          required
                          autoFocus
                        />
                      </div>
                      <button type="submit" disabled={loading || !twoFARecoveryCode} className="auth-btn auth-btn-primary w-full">
                        {loading ? "Verifying…" : "Verify Recovery Code"}
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex justify-center mb-4">
                        <InputOTP
                          maxLength={6}
                          value={twoFACode}
                          onChange={(val) => { 
                            setTwoFACode(val); 
                            if (val.length === 6) submit2FA({ preventDefault: () => {} } as React.FormEvent, val); 
                          }}
                          disabled={loading || !twoFASecret}
                        >
                          <InputOTPGroup className="gap-2">
                            {[0, 1, 2, 3, 4, 5].map((i) => (
                              <InputOTPSlot key={i} index={i} className="w-11 h-[3.25rem] text-lg rounded-xl border-[1.5px] border-gray-200/80 bg-white/50 focus-within:border-gray-400" />
                            ))}
                          </InputOTPGroup>
                        </InputOTP>
                      </div>
                      <button type="submit" disabled={loading || twoFACode.length !== 6 || !twoFASecret} className="auth-btn auth-btn-primary w-full">
                        {loading ? "Verifying…" : "Verify Code"}
                      </button>
                    </div>
                  )}
                </form>
                <div className="text-center pt-2">
                  <button 
                    onClick={() => { setTwoFARecoveryMode(!twoFARecoveryMode); setTwoFACode(''); setTwoFARecoveryCode(''); }} 
                    className="text-xs font-semibold text-[#115f10] hover:opacity-80 transition-opacity"
                  >
                    {twoFARecoveryMode ? "Use Authenticator App instead" : "Lost access? Use a recovery code"}
                  </button>
                </div>
              </div>
            </div>

            {/* WhatsApp view */}
            <div
              className="auth-view"
              style={{
                opacity: authMethod === "whatsapp" && (!requires2FA || twoFAVerified) ? 1 : 0,
                transform: authMethod === "whatsapp" && (!requires2FA || twoFAVerified) ? "translateY(0)" : "translateY(8px)",
                pointerEvents: authMethod === "whatsapp" && (!requires2FA || twoFAVerified) ? "auto" : "none",
                position: authMethod === "whatsapp" && (!requires2FA || twoFAVerified) ? "relative" : "absolute",
                inset: authMethod === "whatsapp" && (!requires2FA || twoFAVerified) ? undefined : 0,
              }}
            >
              {renderWhatsAppInput()}
            </div>

            {/* Email view */}
            <div
              className="auth-view"
              style={{
                opacity: authMethod === "email" && (!requires2FA || twoFAVerified) ? 1 : 0,
                transform: authMethod === "email" && (!requires2FA || twoFAVerified) ? "translateY(0)" : "translateY(8px)",
                pointerEvents: authMethod === "email" && (!requires2FA || twoFAVerified) ? "auto" : "none",
                position: authMethod === "email" && (!requires2FA || twoFAVerified) ? "relative" : "absolute",
                inset: authMethod === "email" && (!requires2FA || twoFAVerified) ? undefined : 0,
              }}
            >
              {confirmationSuccess ? (
                <div className="flex flex-col items-center py-6 text-center space-y-5">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center animate-bounce">
                    <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-bold text-gray-900">Signup Successful!</h3>
                    <p className="text-sm text-gray-500">
                      Your email has been verified. Redirecting to your dashboard...
                    </p>
                  </div>
                  
                  <div className="flex flex-col items-center gap-4 w-full pt-2">
                    <div className="text-xs font-medium text-gray-400">
                      Redirecting to dashboard in <span className="text-[#115f10] font-bold text-base">{successCountdown}s</span>
                    </div>
                    
                    <div className="w-full h-1 bg-gray-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-[#115f10] transition-all duration-1000 ease-linear"
                        style={{ width: `${(successCountdown / 5) * 100}%` }}
                      />
                    </div>

                    <button
                      onClick={async () => {
                        setConfirmationSuccess(false);
                        let activeUser = user;
                        if (!activeUser) {
                          const { data: { session } } = await supabase.auth.getSession();
                          activeUser = session?.user || null;
                        }
                        handleSuccessRoleRouting(activeUser);
                      }}
                      className="text-xs font-bold text-[#115f10] hover:underline underline-offset-4"
                    >
                      Go to dashboard now
                    </button>
                  </div>
                </div>
              ) : verificationPending ? (
                <div className="flex flex-col items-center py-6 text-center space-y-4">
                  <div className="w-16 h-16 bg-[#115f10]/15 rounded-full flex items-center justify-center">
                    <Mail className="w-8 h-8 text-[#115f10]" />
                  </div>
                  <div className="space-y-1.5">
                    <h3 className="font-bold text-[#064E3B]">Check your email</h3>
                    <p className="text-xs text-[#064E3B]/80 max-w-[220px] leading-relaxed">
                      We've sent a verification link to
                    </p>
                    <p className="text-sm font-bold text-[#064E3B] break-all">{email}</p>
                  </div>
                  <div className="pt-2 flex flex-col items-center gap-3">
                    <button
                      type="button"
                      onClick={handleResendEmail}
                      disabled={loading || resendCountdown > 0}
                      className="text-xs font-bold text-[#115f10] hover:underline underline-offset-4 disabled:opacity-50 disabled:no-underline"
                    >
                      {resendCountdown > 0 ? `Resend mail in ${resendCountdown}s` : "Resend mail"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setVerificationPending(false)}
                      className="text-[10px] text-[#064E3B]/60 font-medium hover:text-[#064E3B] transition-colors"
                    >
                      Use a different email
                    </button>
                  </div>
                </div>
              ) : showRoleSelection ? (
                <div className="space-y-5 py-4">
                  <div className="text-center mb-6">
                    <p className="text-[1.5rem] font-extrabold text-[#064E3B] tracking-tight leading-tight">Choose your role</p>
                    <p className="text-[#064E3B] mt-1.5 text-[13px] leading-relaxed max-w-[260px] mx-auto">Your role determines the experience we will tailor for you.</p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 px-0.5 pb-0.5">
                    <button
                      type="button"
                      onClick={() => setSelectedRole('user')}
                      className={`rounded-3xl border-2 p-5 text-left transition-all ${selectedRole === 'user' ? 'border-[#115f10] bg-[#fafde2] shadow-md' : 'border-gray-200 bg-white hover:border-gray-300'}`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className={`text-sm font-extrabold ${selectedRole === 'user' ? 'text-[#064E3B]' : 'text-gray-900'}`}>Traveller</p>
                          <p className={`text-xs mt-2 ${selectedRole === 'user' ? 'text-gray-800 font-medium' : 'text-gray-600'}`}>Book stays, bikes, cars and experiences with confidence.</p>
                        </div>
                        <div className="rounded-full bg-[#064E3B] p-2 text-white">
                          <User className="w-4 h-4" />
                        </div>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedRole('host')}
                      className={`rounded-3xl border-2 p-5 text-left transition-all ${selectedRole === 'host' ? 'border-[#115f10] bg-[#fafde2] shadow-md' : 'border-gray-200 bg-white hover:border-gray-300'}`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className={`text-sm font-extrabold ${selectedRole === 'host' ? 'text-[#064E3B]' : 'text-gray-900'}`}>Host</p>
                          <p className={`text-xs mt-2 ${selectedRole === 'host' ? 'text-gray-800 font-medium' : 'text-gray-600'}`}>List your space or vehicle and welcome travellers.</p>
                        </div>
                        <div className="rounded-full bg-[#115f10] p-2 text-white">
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 001 1m-6 0h6" /></svg>
                        </div>
                      </div>
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={handleContinueRoleSelection}
                    disabled={loading}
                    className="auth-btn auth-btn-primary"
                  >
                    Continue to create account
                  </button>
                </div>
              ) : emailPhase === 'enter' || emailPhase === 'checking' ? (
                /* ── PHASE 1: email entry ── */
                <form onSubmit={handleEmailContinue} className="flex flex-col justify-center space-y-3" style={{ minHeight: "220px" }}>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-gray-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); setFormErrors({}); }}
                      className="auth-input"
                      placeholder="Your email address"
                      autoFocus
                      required
                    />
                  </div>
                  {formErrors.email && <p className="text-[11px] text-red-500">{formErrors.email}</p>}
                  <button
                    type="submit"
                    disabled={emailPhase === 'checking' || !email.trim()}
                    className="auth-btn auth-btn-primary"
                  >
                    {emailPhase === 'checking' ? "Checking…" : "Continue"}
                  </button>
                </form>
              ) : emailPhase === 'login' ? (
                /* ── PHASE 2: login — account exists ── */
                <form onSubmit={handleEmailAuth} className="flex flex-col justify-center space-y-3" style={{ minHeight: "250px" }}>
                  {/* Locked email with change link */}
                  <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-[9999px] border border-gray-200/60 bg-white/40 text-sm">
                    <Mail className="h-[16px] w-[16px] text-green-700 shrink-0" />
                    <span className="flex-1 text-gray-800 truncate">{email}</span>
                    {!isHostSigninPath && (
                      <button
                        type="button"
                        onClick={() => { setEmailPhase('enter'); setPassword(''); setFormErrors({}); }}
                        className="text-[10px] font-bold text-[#115f10] hover:opacity-70 shrink-0"
                      >
                        Change
                      </button>
                    )}
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
                      autoFocus
                      required
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 transition-colors">
                      {showPassword ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
                    </button>
                  </div>
                  {formErrors.password && <p className="text-[11px] text-red-500">{formErrors.password}</p>}
                  <div className="flex justify-between items-center">
                    <label className="flex items-center gap-2 text-[11px] font-bold text-[#115f10] cursor-pointer hover:opacity-80 transition-opacity">
                      <div className="relative flex items-center justify-center w-4 h-4 rounded-full border-[1.5px] border-[#115f10] bg-transparent">
                        <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} className="appearance-none absolute inset-0 w-full h-full cursor-pointer rounded-full peer" />
                        <svg viewBox="0 0 14 14" className="w-2.5 h-2.5 text-[#115f10] fill-current opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none"><path d="M5.5 10.5L2 7l1.4-1.4 2.1 2.1 5.1-5.1L12 4z" /></svg>
                      </div>
                      Remember me
                    </label>
                    <Link to="/forgot-password" className="text-[11px] font-bold text-[#115f10] hover:opacity-80 transition-opacity">Forgot password?</Link>
                  </div>
                  <button type="submit" disabled={loading} className="auth-btn auth-btn-primary">
                    {loading ? "Signing in…" : "Sign In"}
                  </button>
                  {!isHostSigninPath && (
                    <p className="text-center mt-auto pt-1">
                      <button type="button" onClick={() => { setEmailPhase('signup'); setPassword(''); setRoleConfirmed(false); }} className="text-[11px] text-[#fafafa] font-semibold hover:opacity-80 transition-opacity">
                        Not your account? <span className="font-extrabold underline underline-offset-4 decoration-1">Create new one</span>
                      </button>
                    </p>
                  )}
                </form>
              ) : (
                /* ── PHASE 3: signup — no account found ── */
                <form onSubmit={handleEmailAuth} className="flex flex-col justify-center space-y-3" style={{ minHeight: "250px" }}>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-gray-400" />
                    <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} className="auth-input" placeholder="Full Name" required />
                  </div>
                  {formErrors.fullName && <p className="text-[11px] text-red-500">{formErrors.fullName}</p>}
                  {/* Locked email with change link */}
                  <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-[9999px] border border-gray-200/60 bg-white/40 text-sm">
                    <Mail className="h-[16px] w-[16px] text-green-700 shrink-0" />
                    <span className="flex-1 text-gray-800 truncate">{email}</span>
                    {!isHostSignupPath && (
                      <button type="button" onClick={() => { setEmailPhase('enter'); setPassword(''); setFullName(''); setFormErrors({}); }} className="text-[10px] font-bold text-[#115f10] hover:opacity-70 shrink-0">Change</button>
                    )}
                  </div>
                  {/* Referral code field — optional */}
                  <div className="relative">
                    <Gift className="absolute left-3.5 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-gray-400" />
                    <input
                      type="text"
                      value={referralCode}
                      onChange={(e) => { setReferralCode(e.target.value.toUpperCase()); setReferralError(""); }}
                      className="auth-input"
                      style={{ paddingLeft: '3rem' }}
                      placeholder="Referral Code (Optional)"
                      maxLength={20}
                      autoComplete="off"
                    />
                  </div>
                  {referralError && <p className="text-[11px] text-red-500">{referralError}</p>}
                  {referralCode && !referralError && /^WING[A-Z0-9]{6,}$/.test(referralCode) && (
                    <p className="text-[11px] text-green-300">✓ Referral code applied</p>
                  )}
                  <div className="relative flex items-center">
                    <div className="absolute left-3.5 flex items-center gap-1.5 pointer-events-none z-10">
                      <PhoneCall className="h-[18px] w-[18px] text-gray-400" />
                      <span className="text-xs font-semibold text-gray-500 pr-1.5 border-r border-gray-300/70">+91</span>
                    </div>
                    <input
                      type="tel"
                      value={mobileNumber}
                      onChange={(e) => setMobileNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      className="auth-input"
                      style={{ paddingLeft: '5.5rem' }}
                      placeholder="98765 43210"
                      maxLength={10}
                      required
                    />
                  </div>
                  {formErrors.mobileNumber && <p className="text-[11px] text-red-500">{formErrors.mobileNumber}</p>}
                  {mobileNumber.length > 0 && mobileNumber.length < 10 && !formErrors.mobileNumber && (
                    <p className="text-[10px] text-amber-600">{10 - mobileNumber.length} more digits needed</p>
                  )}
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-gray-400" />
                    <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} className="auth-input" style={{ paddingRight: "2.75rem" }} placeholder="Password" required />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 transition-colors">
                      {showPassword ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
                    </button>
                  </div>
                  {formErrors.password && <p className="text-[11px] text-red-500">{formErrors.password}</p>}
                  <PasswordStrengthMeter password={password} confirmPassword={confirmPassword} onDark />
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-gray-400" />
                    <input type={showPassword ? "text" : "password"} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="auth-input" style={{ paddingRight: "2.75rem" }} placeholder="Confirm Password" required />
                  </div>
                  {formErrors.confirmPassword && <p className="text-[11px] text-red-500">{formErrors.confirmPassword}</p>}
                  <button type="submit" disabled={loading} className="auth-btn auth-btn-primary">
                    {loading ? "Creating account…" : "Create Account"}
                  </button>
                  {!isHostSignupPath && (
                    <p className="text-center mt-auto pt-1">
                      <button type="button" onClick={() => { setEmailPhase('login'); setFullName(''); setPassword(''); setConfirmPassword(''); setRoleConfirmed(false); }} className="text-[11px] text-[#fafafa] font-semibold hover:opacity-80 transition-opacity">
                        Already have an account? <span className="font-extrabold underline underline-offset-4 decoration-1">Sign in</span>
                      </button>
                    </p>
                  )}
                </form>
              )}
            </div>
          </div>

          {!showRoleSelection && !verificationPending && !confirmationSuccess && emailPhase !== 'checking' && (
            <>
              {/* Divider */}
              <div className="flex items-center gap-3 my-7">
                <div className="divider-line" />
                <span className="text-[10px] uppercase tracking-[0.15em] font-bold text-[#fafafa] whitespace-nowrap select-none">
                  Or {emailPhase === 'login' ? "sign in" : "sign up"} with
                </span>
                <div className="divider-line" />
              </div>

              {/* Social row */}
              <div className="grid grid-cols-3 gap-3">
                {/* Email toggle */}
                <button
                  onClick={() => {
                    setAuthMethod("email");
                    setIsOtpSent(false);
                  }}
                  className="social-btn"
                  title="Email"
                >
                  <Mail className="h-[18px] w-[18px]" />
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

                {/* WhatsApp toggle */}
                <button
                  onClick={() => {
                    toast({
                      title: "Coming Soon",
                      description: "WhatsApp login is currently under development.",
                    });
                  }}
                  className="social-btn"
                  title="WhatsApp"
                >
                  <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="#25D366">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                </button>
              </div>

              {/* Footer */}
              <p className="text-center mt-6 text-[10px] text-[#fafafa] leading-relaxed font-medium">
                By continuing, you agree to our{" "}
                <Link to="/terms" className="underline underline-offset-2 hover:opacity-80 font-bold">Terms</Link>
                {" & "}
                <Link to="/privacy" className="underline underline-offset-2 hover:opacity-80 font-bold">Privacy Policy</Link>
              </p>
            </>
          )}
          {requires2FA && !twoFAVerified && (
            <div className="text-center mt-6">
              <button onClick={() => { signOut(); setRequires2FA(false); setTwoFAVerified(false); }} className="text-xs text-gray-400 hover:text-gray-700 font-semibold transition-colors">
                Cancel and sign out
              </button>
            </div>
          )}
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
