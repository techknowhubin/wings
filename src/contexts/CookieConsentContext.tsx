import React, { createContext, useContext, useEffect, useState } from "react";

const CONSENT_KEY = "xplorwing-cookie-consent";
const CONSENT_VERSION = "1.0";
const GA_ID = (import.meta.env.VITE_GA_MEASUREMENT_ID as string) || "";

export interface CookieConsent {
  essential: true;
  analytics: boolean;
  preferences: boolean;
  timestamp: number;
  version: string;
}

interface CookieConsentContextValue {
  consent: CookieConsent | null;
  hasResponded: boolean;
  acceptAll: () => void;
  rejectAll: () => void;
  updateConsent: (updates: Partial<Pick<CookieConsent, "analytics" | "preferences">>) => void;
}

const CookieConsentContext = createContext<CookieConsentContextValue | null>(null);

const initGA = () => {
  if (!GA_ID || document.getElementById("ga4-script")) return;
  const script = document.createElement("script");
  script.id = "ga4-script";
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
  document.head.appendChild(script);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = window as any;
  w.dataLayer = w.dataLayer || [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  w.gtag = function (...args: any[]) { w.dataLayer.push(args); };
  w.gtag("js", new Date());
  w.gtag("config", GA_ID, { anonymize_ip: true });
};

export const CookieConsentProvider = ({ children }: { children: React.ReactNode }) => {
  const [consent, setConsent] = useState<CookieConsent | null>(null);
  const [hasResponded, setHasResponded] = useState(true); // true to avoid flicker on load

  useEffect(() => {
    const raw = localStorage.getItem(CONSENT_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as CookieConsent;
        setConsent(parsed);
        setHasResponded(true);
        if (parsed.analytics) initGA();
      } catch {
        localStorage.removeItem(CONSENT_KEY);
        setHasResponded(false);
      }
    } else {
      setHasResponded(false);
    }
  }, []);

  const save = (next: CookieConsent) => {
    localStorage.setItem(CONSENT_KEY, JSON.stringify(next));
    setConsent(next);
    setHasResponded(true);
    if (next.analytics) initGA();
  };

  const acceptAll = () =>
    save({ essential: true, analytics: true, preferences: true, timestamp: Date.now(), version: CONSENT_VERSION });

  const rejectAll = () =>
    save({ essential: true, analytics: false, preferences: false, timestamp: Date.now(), version: CONSENT_VERSION });

  const updateConsent = (updates: Partial<Pick<CookieConsent, "analytics" | "preferences">>) =>
    save({
      ...(consent ?? { essential: true as const, analytics: false, preferences: false }),
      ...updates,
      essential: true,
      timestamp: Date.now(),
      version: CONSENT_VERSION,
    });

  return (
    <CookieConsentContext.Provider value={{ consent, hasResponded, acceptAll, rejectAll, updateConsent }}>
      {children}
    </CookieConsentContext.Provider>
  );
};

export const useCookieConsent = () => {
  const ctx = useContext(CookieConsentContext);
  if (!ctx) throw new Error("useCookieConsent must be used within CookieConsentProvider");
  return ctx;
};
