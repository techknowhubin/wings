import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ShieldCheck, BarChart2, SlidersHorizontal, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Footerdemo } from "@/components/ui/footer-section";
import { DynamicLogo } from "@/components/DynamicLogo";
import { useCookieConsent } from "@/contexts/CookieConsentContext";
import { useToast } from "@/hooks/use-toast";

interface CategoryProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  bullets: string[];
  checked: boolean;
  disabled?: boolean;
  onToggle?: (val: boolean) => void;
}

const Category = ({ icon, title, description, bullets, checked, disabled, onToggle }: CategoryProps) => (
  <div className="flex flex-col sm:flex-row sm:items-start gap-4 py-6">
    <div className="flex items-center gap-3 sm:w-8 shrink-0">
      <span className="text-primary">{icon}</span>
    </div>
    <div className="flex-1 min-w-0">
      <div className="flex items-center justify-between gap-4 mb-2">
        <h3 className="font-semibold text-foreground">{title}</h3>
        <div className="flex items-center gap-2 shrink-0">
          {disabled && <Lock className="h-3.5 w-3.5 text-muted-foreground" />}
          <Switch
            checked={checked}
            disabled={disabled}
            onCheckedChange={onToggle}
            aria-label={`Toggle ${title}`}
          />
        </div>
      </div>
      <p className="text-sm text-muted-foreground mb-3">{description}</p>
      <ul className="space-y-1">
        {bullets.map((b) => (
          <li key={b} className="text-xs text-muted-foreground flex items-start gap-2">
            <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary/40 shrink-0" />
            {b}
          </li>
        ))}
      </ul>
    </div>
  </div>
);

const CookieSettings = () => {
  const { consent, hasResponded, acceptAll, rejectAll, updateConsent } = useCookieConsent();
  const { toast } = useToast();

  const [analytics, setAnalytics] = useState(false);
  const [preferences, setPreferences] = useState(false);

  useEffect(() => {
    if (consent) {
      setAnalytics(consent.analytics);
      setPreferences(consent.preferences);
    }
  }, [consent]);

  const handleSave = () => {
    updateConsent({ analytics, preferences });
    toast({ title: "Preferences saved", description: "Your cookie settings have been updated." });
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <header className="border-b border-border bg-background/95 backdrop-blur sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/">
            <DynamicLogo lightHeightClass="h-8" darkHeightClass="h-[43px]" />
          </Link>
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            ← Back to Home
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 max-w-2xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-3">Cookie Settings</h1>
          <p className="text-muted-foreground">
            Control how Xplorwing uses cookies and similar technologies on your device.
            Essential cookies cannot be disabled as they are required for the site to function.
          </p>
        </div>

        {/* Status badge */}
        {hasResponded && (
          <div className="mb-6 px-4 py-3 rounded-xl bg-primary/8 border border-primary/20 text-sm text-foreground flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
            Your preferences are saved.{" "}
            {consent?.timestamp && (
              <span className="text-muted-foreground">
                Last updated {new Date(consent.timestamp).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}.
              </span>
            )}
          </div>
        )}

        <div className="rounded-2xl border border-border bg-card divide-y divide-border">
          <Category
            icon={<ShieldCheck className="h-5 w-5" />}
            title="Essential Cookies"
            description="Always active. These cookies are necessary for the website to function and cannot be switched off."
            bullets={[
              "Authentication and secure login sessions",
              "Shopping cart and booking state",
              "Security and fraud prevention",
              "Load balancing and site performance",
            ]}
            checked={true}
            disabled={true}
          />
          <Category
            icon={<BarChart2 className="h-5 w-5" />}
            title="Analytics Cookies"
            description="Help us understand how visitors interact with our website. Data is anonymised and never sold."
            bullets={[
              "Google Analytics 4 — page views and session data",
              "Traffic sources and user journeys",
              "Feature usage and engagement metrics",
            ]}
            checked={analytics}
            onToggle={setAnalytics}
          />
          <Category
            icon={<SlidersHorizontal className="h-5 w-5" />}
            title="Preference Cookies"
            description="Remember your settings and personalise your experience across visits."
            bullets={[
              "Dark / light theme selection",
              "Language and region preferences",
              "UI layout and display preferences",
            ]}
            checked={preferences}
            onToggle={setPreferences}
          />
        </div>

        {/* Actions */}
        <div className="mt-6 flex flex-wrap gap-3">
          <Button onClick={handleSave} className="rounded-full flex-1 sm:flex-none">
            Save Preferences
          </Button>
          <Button variant="outline" onClick={acceptAll} className="rounded-full flex-1 sm:flex-none">
            Accept All
          </Button>
          <Button variant="outline" onClick={rejectAll} className="rounded-full flex-1 sm:flex-none">
            Reject All
          </Button>
        </div>

        <Separator className="my-8" />

        <p className="text-xs text-muted-foreground leading-relaxed">
          For more information about how we handle your data, see our{" "}
          <Link to="/privacy" className="underline underline-offset-2 hover:text-foreground">
            Privacy Policy
          </Link>
          . If you have questions, contact us at{" "}
          <a href="mailto:hello@xplorwing.com" className="underline underline-offset-2 hover:text-foreground">
            hello@xplorwing.com
          </a>
          .
        </p>
      </main>

      <Footerdemo />
    </div>
  );
};

export default CookieSettings;
