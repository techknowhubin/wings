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
import { Facebook, Instagram, Linkedin, Moon, Send, Sun, Twitter } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
import { DynamicLogo } from "../DynamicLogo";

function Footerdemo() {
  const { theme, toggleTheme } = useTheme();
  const isDarkMode = theme === "dark";

  return (
    <footer className="relative border-t border-border bg-[hsl(48,100%,99%)] dark:bg-card text-foreground transition-colors duration-300">
      <div className="container mx-auto px-4 py-12 md:px-6 lg:px-8">
        <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-5">
          {/* Newsletter Section */}
          <div className="relative">
            <Link to="/">
              <DynamicLogo lightHeightClass="h-10" darkHeightClass="h-[53px]" className="mb-4" />
            </Link>
            <h2 className="mb-4 text-lg font-semibold tracking-tight">Stay Connected</h2>
            <p className="mb-6 text-muted-foreground">
              Join our newsletter for the latest updates and exclusive offers.
            </p>
            <form className="relative" onSubmit={(e) => e.preventDefault()}>
              <Input
                type="email"
                placeholder="Enter your email"
                className="pr-12 backdrop-blur-sm"
              />
              <Button
                type="submit"
                size="icon"
                className="absolute right-1 top-1 h-8 w-8 rounded-full bg-primary text-primary-foreground transition-transform hover:scale-105"
              >
                <Send className="h-4 w-4" />
                <span className="sr-only">Subscribe</span>
              </Button>
            </form>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="mb-6 text-lg font-semibold">Quick Links</h3>
            <nav className="space-y-3 text-sm">
              <Link to="/" className="block text-muted-foreground transition-colors hover:text-primary-text">
                Home
              </Link>
              <Link to="/about" className="block text-muted-foreground transition-colors hover:text-primary-text">
                About Us
              </Link>
              <Link to="/stays" className="block text-muted-foreground transition-colors hover:text-primary-text">
                Homestays
              </Link>
              <Link to="/experiences" className="block text-muted-foreground transition-colors hover:text-primary-text">
                Experiences
              </Link>
              <Link to="/help" className="block text-muted-foreground transition-colors hover:text-primary-text">
                Help Center
              </Link>
            </nav>
          </div>

          {/* Service Providers */}
          <div>
            <h3 className="mb-6 text-lg font-semibold">Service Providers</h3>
            <nav className="space-y-3 text-sm">
              <Link to="/link-in-bio" className="block text-muted-foreground transition-colors hover:text-primary-text">
                Link in Bio
              </Link>
              <Link to="/onboarding/host" className="block text-muted-foreground transition-colors hover:text-primary-text">
                Become a Host
              </Link>
            </nav>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="mb-6 text-lg font-semibold">Contact Us</h3>
            <address className="space-y-3 text-sm not-italic text-muted-foreground">
              <p>Serving across India</p>
              <p>Phone: +91 9422 799 420</p>
              <p>Email: hello@xplorwing.com</p>
            </address>
          </div>

          {/* Social Links & Theme Toggle */}
          <div>
            <h3 className="mb-6 text-lg font-semibold">Follow Us</h3>
            <TooltipProvider>
              <div className="mb-6 flex space-x-3">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="icon" className="rounded-full">
                      <Facebook className="h-4 w-4" />
                      <span className="sr-only">Facebook</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Follow us on Facebook</p>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="icon" className="rounded-full">
                      <Twitter className="h-4 w-4" />
                      <span className="sr-only">Twitter</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Follow us on Twitter</p>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="icon" className="rounded-full">
                      <Instagram className="h-4 w-4" />
                      <span className="sr-only">Instagram</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Follow us on Instagram</p>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="icon" className="rounded-full">
                      <Linkedin className="h-4 w-4" />
                      <span className="sr-only">LinkedIn</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Connect with us on LinkedIn</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </TooltipProvider>

            <div className="flex items-center space-x-2">
              <Sun className="h-4 w-4" />
              <Switch
                checked={isDarkMode}
                onCheckedChange={toggleTheme}
                aria-label="Toggle dark mode"
              />
              <Moon className="h-4 w-4" />
              <Label htmlFor="dark-mode" className="sr-only">
                Toggle dark mode
              </Label>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-border pt-8 text-center md:flex-row">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} WINGSNNESTS ECO SOLUTIONS PVT LTD. All rights reserved.
          </p>
          <nav className="flex gap-6 text-sm">
            <Link to="/terms" className="text-muted-foreground transition-colors hover:text-primary-text">
              Privacy Policy
            </Link>
            <Link to="/terms" className="text-muted-foreground transition-colors hover:text-primary-text">
              Terms of Service
            </Link>
            <Link to="/terms" className="text-muted-foreground transition-colors hover:text-primary-text">
              Cookie Settings
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}

export { Footerdemo };
