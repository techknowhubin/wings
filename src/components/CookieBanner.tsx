import { Link } from "react-router-dom";
import { Cookie } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCookieConsent } from "@/contexts/CookieConsentContext";

const CookieBanner = () => {
  const { hasResponded, acceptAll, rejectAll } = useCookieConsent();

  if (hasResponded) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 sm:left-4 sm:translate-x-0 z-[60] w-[calc(100%-2rem)] sm:w-auto max-w-[360px] bg-card border border-border shadow-2xl rounded-2xl p-4 flex flex-col gap-3 animate-in fade-in slide-in-from-bottom-5 duration-300">
      <div className="flex items-start gap-3">
        <Cookie className="h-5 w-5 text-primary shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground mb-0.5">We use cookies</p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            We use cookies to improve your experience and personalize content.{" "}
            <Link to="/privacy" className="underline underline-offset-2 hover:text-foreground transition-colors">
              Learn more
            </Link>
          </p>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 w-full pt-1">
        <Button
          variant="outline"
          size="sm"
          onClick={rejectAll}
          className="rounded-full text-xs h-8 px-2"
        >
          Reject
        </Button>
        <Button
          variant="outline"
          size="sm"
          asChild
          className="rounded-full text-xs h-8 px-2"
        >
          <Link to="/cookie-settings" className="flex items-center justify-center">Customize</Link>
        </Button>
        <Button
          size="sm"
          onClick={acceptAll}
          className="rounded-full text-xs h-8 px-2"
        >
          Accept
        </Button>
      </div>
    </div>
  );
};

export default CookieBanner;
