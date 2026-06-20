import { motion, AnimatePresence } from "framer-motion";
import { Check, X } from "lucide-react";

interface PasswordStrengthMeterProps {
  password: string;
  confirmPassword?: string;
  /** Use onDark=true when rendered over a dark/glass background (e.g. the auth page) */
  onDark?: boolean;
  className?: string;
}

const CRITERIA = [
  { label: "At least 8 characters",  test: (p: string) => p.length >= 8 },
  { label: "One uppercase letter",   test: (p: string) => /[A-Z]/.test(p) },
  { label: "One lowercase letter",   test: (p: string) => /[a-z]/.test(p) },
  { label: "One number",             test: (p: string) => /[0-9]/.test(p) },
  { label: "One special character",  test: (p: string) => /[^A-Za-z0-9]/.test(p) },
] as const;

function getLevel(score: number, onDark: boolean) {
  if (score <= 1) return { label: "Weak",      bar: "bg-red-500",    text: onDark ? "text-white" : "text-red-500",    glow: false };
  if (score === 2) return { label: "Fair",      bar: "bg-orange-400", text: onDark ? "text-white" : "text-orange-500", glow: false };
  if (score === 3) return { label: "Good",      bar: "bg-yellow-400", text: onDark ? "text-white" : "text-yellow-600", glow: false };
  if (score === 4) return { label: "Strong",    bar: "bg-green-500",  text: onDark ? "text-[#2d6a2d]" : "text-green-600",  glow: false };
  return              { label: "Excellent",  bar: "bg-green-400",  text: onDark ? "text-[#2d6a2d]" : "text-green-600",  glow: true  };
}

export function PasswordStrengthMeter({
  password,
  confirmPassword,
  onDark = false,
  className = "",
}: PasswordStrengthMeterProps) {
  if (!password) return null;

  const score     = CRITERIA.filter(c => c.test(password)).length;
  const level     = getLevel(score, onDark);
  const pct       = Math.max((score / 5) * 100, 4);
  const excellent = score === 5;

  const mutedText  = onDark ? "text-white"   : "text-muted-foreground";
  const passedText = onDark ? "text-white"   : "text-green-600 dark:text-green-400";
  const trackBg    = onDark ? "bg-white/20"  : "bg-muted";

  return (
    <div className={`space-y-3 pt-1 ${className}`}>
      {/* ── Strength bar ── */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className={`text-[11px] font-medium ${mutedText}`}>Password strength</span>
          <AnimatePresence mode="wait">
            <motion.span
              key={score}
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              transition={{ duration: 0.18 }}
              className={`text-[13px] font-bold ${level.text}`}
            >
              {level.label}
            </motion.span>
          </AnimatePresence>
        </div>

        <div className={`h-1.5 ${trackBg} rounded-full overflow-hidden`}>
          <motion.div
            className={`h-full rounded-full ${level.bar} ${level.glow ? "shadow-[0_0_8px_2px_rgba(34,197,94,0.55)]" : ""}`}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.35, ease: "easeOut" }}
          />
        </div>
      </div>

      {/* ── Checklist — hidden when Excellent ── */}
      <AnimatePresence>
        {!excellent && (
          <motion.div
            initial={false}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-1 gap-[5px]">
              {CRITERIA.map((c) => {
                const ok = c.test(password);
                return (
                  <motion.div
                    key={c.label}
                    className="flex items-center gap-2"
                    layout
                  >
                    <motion.span
                      animate={ok ? { scale: [1, 1.25, 1] } : { scale: 1 }}
                      transition={{ duration: 0.22 }}
                      className={`flex-shrink-0 w-[16px] h-[16px] rounded-full flex items-center justify-center transition-colors duration-200 ${
                        ok ? "bg-green-500" : onDark ? "bg-white/25" : "bg-muted"
                      }`}
                    >
                      {ok
                        ? <Check className="h-[9px] w-[9px] text-white" />
                        : <X    className={`h-[9px] w-[9px] ${onDark ? "text-white/80" : "text-muted-foreground"}`} />
                      }
                    </motion.span>
                    <span className={`text-[11px] transition-colors duration-200 ${ok ? passedText : mutedText}`}>
                      {c.label}
                    </span>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Password match indicator ── */}
      <AnimatePresence>
        {confirmPassword !== undefined && confirmPassword.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className={`flex items-center gap-1.5 text-[11px] font-medium ${
              password === confirmPassword
                ? onDark ? "text-white" : "text-green-600 dark:text-green-400"
                : onDark ? "text-red-300" : "text-red-500"
            }`}
          >
            {password === confirmPassword
              ? <><Check className="h-3.5 w-3.5" /> Passwords match</>
              : <><X     className="h-3.5 w-3.5" /> Passwords do not match</>
            }
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
