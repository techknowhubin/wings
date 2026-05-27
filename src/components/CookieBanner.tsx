import { Link } from "react-router-dom";
import { Cookie } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCookieConsent } from "@/contexts/CookieConsentContext";

const CookieBanner = () => {
  const { hasResponded, acceptAll, rejectAll } = useCookieConsent();

  if (hasResponded) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border shadow-2xl">
      <div className="container mx-auto px-4 py-4 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <Cookie className="hidden sm:block h-5 w-5 text-primary shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground mb-0.5">We use cookies</p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            We use cookies to improve your experience, measure site performance, and personalise content.
            See our{" "}
            <Link to="/privacy" className="underline underline-offset-2 hover:text-foreground transition-colors">
              Privacy Policy
            </Link>{" "}
            for details.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0 w-full sm:w-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={rejectAll}
            className="rounded-full text-xs flex-1 sm:flex-none"
          >
            Reject All
          </Button>
          <Button
            variant="outline"
            size="sm"
            asChild
            className="rounded-full text-xs flex-1 sm:flex-none"
          >
            <Link to="/cookie-settings">Customize</Link>
          </Button>
          <Button
            size="sm"
            onClick={acceptAll}
            className="rounded-full text-xs flex-1 sm:flex-none"
          >
            Accept All
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CookieBanner;
