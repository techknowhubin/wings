import * as React from "react";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Facebook, Instagram, Linkedin, Moon, Send, Sun } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { DynamicLogo } from "../DynamicLogo";

const companyLinks = [
  { label: "About Us", to: "/about" },
  { label: "Contact Us", to: "/contact" },
  { label: "Careers", to: "/careers" },
  { label: "Blog", to: "/blog" },
  { label: "Privacy Policy", to: "/privacy" },
  { label: "Terms & Conditions", to: "/terms" },
];

const travelLinks = [
  { label: "Home Stays", to: "/home-stays" },
  { label: "Hotels", to: "/hotels" },
  { label: "Resorts", to: "/resorts" },
  { label: "Packages & Experiences", to: "/experiences" },
];

const transportLinks = [
  { label: "Bike Rentals", to: "/bike-rentals" },
  { label: "Car Rentals", to: "/car-rentals" },
  { label: "Airport Cabs", to: "/airport-cabs" },
  { label: "Outstation Cabs", to: "/outstation-cabs" },
];

const hostLinks = [
  { label: "Become a Host", to: "/become-host" },
  { label: "Host Dashboard", to: "/host" },
  { label: "Wing-bio", to: "/link-in-bio" },
];

function Footerdemo() {
  const { theme, toggleTheme } = useTheme();
  const { toast } = useToast();
  const [isSubscribing, setIsSubscribing] = React.useState(false);
  const [hasSubscribed, setHasSubscribed] = React.useState(false);
  const isDarkMode = theme === "dark";

  return (
    <footer className="relative border-t border-border bg-[hsl(48,100%,99%)] dark:bg-card text-foreground transition-colors duration-300">
      <div className="container mx-auto px-4 py-12 md:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-8 lg:grid-cols-7">
          {/* Newsletter Section */}
          <div className="relative col-span-2 lg:col-span-2">
            <Link to="/">
              <DynamicLogo lightHeightClass="h-10" darkHeightClass="h-[53px]" className="mb-4" />
            </Link>
            <h2 className="mb-4 text-lg font-semibold tracking-tight">Stay Connected</h2>
            <p className="mb-6 text-sm text-muted-foreground">
              Join our newsletter for the latest updates and exclusive offers.
            </p>
            <form
              className="relative"
              onSubmit={async (e) => {
                e.preventDefault();
                const form = e.currentTarget;
                const email = (form.elements.namedItem("email") as HTMLInputElement).value;
                if (!email) return;

                setIsSubscribing(true);

                try {
                  const { data, error } = await supabase.functions.invoke("send-newsletter-welcome", {
                    body: { email },
                  });

                  if (error) throw error;

                  toast({
                    title: "Joined Xplorwing newsletter!",
                    description: "A confirmation has been sent to your email.",
                  });

                  setHasSubscribed(true);
                } catch (error) {
                  console.error("Newsletter error:", error);
                  toast({
                    title: "Subscription failed",
                    description: "There was an error joining the newsletter. Please try again.",
                    variant: "destructive",
                  });
                } finally {
                  setIsSubscribing(false);
                  form.reset();
                }
              }}
            >
              <Input
                name="email"
                type="email"
                placeholder="Enter your email"
                className="pr-12 rounded-full backdrop-blur-sm"
                required
                disabled={hasSubscribed || isSubscribing}
              />
              <Button
                type="submit"
                size="icon"
                disabled={hasSubscribed || isSubscribing}
                className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-primary text-primary-foreground transition-transform hover:scale-105"
              >
                <Send className={cn("h-4 w-4", isSubscribing && "animate-pulse")} />
                <span className="sr-only">Subscribe</span>
              </Button>
              {hasSubscribed && (
                <p className="mt-2 text-xs text-primary font-medium animate-in fade-in slide-in-from-top-1">
                  Successfully joined! Check your inbox soon.
                </p>
              )}
            </form>

            {/* Social Links & Theme Toggle */}
            <div className="mt-6">
              <TooltipProvider>
                <div className="mb-4 flex space-x-3">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <a href="http://facebook.com/joinXplorwing" target="_blank" rel="noopener noreferrer">
                        <Button variant="outline" size="icon" className="rounded-full">
                          <Facebook className="h-4 w-4" />
                          <span className="sr-only">Facebook</span>
                        </Button>
                      </a>
                    </TooltipTrigger>
                    <TooltipContent><p>Follow us on Facebook</p></TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <a href="https://www.instagram.com/xplorwing" target="_blank" rel="noopener noreferrer">
                        <Button variant="outline" size="icon" className="rounded-full">
                          <Instagram className="h-4 w-4" />
                          <span className="sr-only">Instagram</span>
                        </Button>
                      </a>
                    </TooltipTrigger>
                    <TooltipContent><p>Follow us on Instagram</p></TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <a href="https://www.linkedin.com/company/xplor-wing/" target="_blank" rel="noopener noreferrer">
                        <Button variant="outline" size="icon" className="rounded-full">
                          <Linkedin className="h-4 w-4" />
                          <span className="sr-only">LinkedIn</span>
                        </Button>
                      </a>
                    </TooltipTrigger>
                    <TooltipContent><p>Connect with us on LinkedIn</p></TooltipContent>
                  </Tooltip>
                </div>
              </TooltipProvider>
              <div className="flex items-center space-x-2">
                <Sun className="h-4 w-4" />
                <Switch checked={isDarkMode} onCheckedChange={toggleTheme} aria-label="Toggle dark mode" />
                <Moon className="h-4 w-4" />
                <Label htmlFor="dark-mode" className="sr-only">Toggle dark mode</Label>
              </div>
            </div>
          </div>

          {/* Company */}
          <div>
            <h3 className="mb-6 text-sm font-bold uppercase tracking-wider text-foreground/70">Company</h3>
            <nav className="space-y-3 text-sm" aria-label="Company links">
              {companyLinks.map((l) => (
                <Link key={l.to} to={l.to} className="block text-muted-foreground transition-colors hover:text-primary-text">
                  {l.label}
                </Link>
              ))}
            </nav>
          </div>

          {/* Travel */}
          <div>
            <h3 className="mb-6 text-sm font-bold uppercase tracking-wider text-foreground/70">Travel</h3>
            <nav className="space-y-3 text-sm" aria-label="Travel links">
              {travelLinks.map((l) => (
                <Link key={l.to} to={l.to} className="block text-muted-foreground transition-colors hover:text-primary-text">
                  {l.label}
                </Link>
              ))}
            </nav>
          </div>

          {/* Transport */}
          <div>
            <h3 className="mb-6 text-sm font-bold uppercase tracking-wider text-foreground/70">Transport</h3>
            <nav className="space-y-3 text-sm" aria-label="Transport links">
              {transportLinks.map((l) => (
                <Link key={l.to} to={l.to} className="block text-muted-foreground transition-colors hover:text-primary-text">
                  {l.label}
                </Link>
              ))}
            </nav>
          </div>

          {/* Host */}
          <div>
            <h3 className="mb-6 text-sm font-bold uppercase tracking-wider text-foreground/70">Host</h3>
            <nav className="space-y-3 text-sm" aria-label="Host links">
              {hostLinks.map((l) => (
                <Link key={l.to} to={l.to} className="block text-muted-foreground transition-colors hover:text-primary-text">
                  {l.label}
                </Link>
              ))}
            </nav>
          </div>

          {/* Contact */}
          <div className="col-span-2 lg:col-span-1">
            <h3 className="mb-6 text-sm font-bold uppercase tracking-wider text-foreground/70">Contact</h3>
            <address className="space-y-3 text-sm not-italic text-muted-foreground">
              {/* WhatsApp */}
              <a href="https://wa.me/919492986413?text=Hi%2C%20I%20need%20help" target="_blank" rel="noreferrer" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
                <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 fill-[#25D366]" xmlns="http://www.w3.org/2000/svg">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                <span>+91 9492986413</span>
              </a>
              {/* Book Cabs / Packages */}
              <div>
                <p className="text-xs font-semibold text-foreground/60 mb-1.5">Book Cabs / Packages</p>
                <div className="space-y-1.5">
                  {[["9492986413","9492986413"],["9492986412","9492986412"],["9422799420","9422799420"]].map(([raw, display]) => (
                    <a key={raw} href={`tel:+91${raw}`} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
                      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.5a19.79 19.79 0 01-3.07-8.68A2 2 0 012 .84h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 8.64a16 16 0 006.27 6.27l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>
                      <span>+91 {display}</span>
                    </a>
                  ))}
                </div>
              </div>
              {/* Customer Care */}
              <div>
                <p className="text-xs font-semibold text-foreground/60 mb-1.5">Customer Care</p>
                <a href="tel:+919422799420" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.5a19.79 19.79 0 01-3.07-8.68A2 2 0 012 .84h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 8.64a16 16 0 006.27 6.27l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>
                  <span>+91 9422799420</span>
                </a>
              </div>
              {/* Email */}
              <a href="mailto:hello@xplorwing.com" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 01-2.06 0L2 7"/></svg>
                <span>hello@xplorwing.com</span>
              </a>
            </address>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-border pt-8 text-center md:flex-row">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} WINGSNNESTS ECO SOLUTIONS PVT LTD. All rights reserved.
          </p>
          <nav className="flex gap-6 text-sm">
            <Link to="/privacy" className="text-muted-foreground transition-colors hover:text-primary-text">
              Privacy Policy
            </Link>
            <Link to="/terms" className="text-muted-foreground transition-colors hover:text-primary-text">
              Terms of Service
            </Link>
            <Link to="/cookie-settings" className="text-muted-foreground transition-colors hover:text-primary-text">
              Cookie Settings
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}

export { Footerdemo };
