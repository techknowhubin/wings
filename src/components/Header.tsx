import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Moon, Sun, Menu, User, Heart, X, Home, Car, Bike, Compass, MapPin, ChevronRight, Building, Palmtree, LogOut, LayoutDashboard, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/ThemeProvider";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useNavigate, useLocation } from "react-router-dom";
import MegaMenu from "./MegaMenu";
import { DynamicLogo } from "./DynamicLogo";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useListings";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import ButtonWithIcon from "@/components/ui/button-with-icon";



const mobileNavLinks = [
  { label: "Stays", icon: Home, to: "/stays" },
  { label: "Hotels", icon: Building, to: "/hotels" },
  { label: "Resorts", icon: Palmtree, to: "/resorts" },
  { label: "Experiences", icon: Compass, to: "/experiences" },
  { label: "Bikes", icon: Bike, to: "/bikes" },
  { label: "Cars", icon: Car, to: "/cars" },
  { label: "Destinations", icon: MapPin, to: "/destinations" },
];

const Header = () => {
  const { theme, toggleTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, signOut, getUserRole } = useAuth();
  const { data: profile } = useProfile(user?.id);
  const [role, setRole] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  const isDarkHeader = location.pathname === "/link-in-bio" || location.pathname === "/";

  // Derive display name — prefer profile display_name/full_name, fall back to phone, never show derived email
  const isWhatsAppUser = user?.user_metadata?.phone_provider === "whatsapp";
  const displayName = profile?.display_name
    || profile?.full_name
    || user?.user_metadata?.full_name
    || (isWhatsAppUser ? user?.user_metadata?.phone : user?.email?.split("@")[0])
    || "My Account";
  const displaySubtitle = isWhatsAppUser
    ? (user?.user_metadata?.phone || "")
    : (user?.email || "");
  const avatarLetter = (profile?.display_name || profile?.full_name || user?.user_metadata?.full_name || "").charAt(0).toUpperCase() || null;

  useEffect(() => {
    if (user) {
      getUserRole().then(setRole);
    } else {
      setRole(null);
    }
  }, [user, getUserRole]);

  const handleSignOut = async () => {
    await signOut();
    window.location.href = '/';
  };

  return (
    <>
      <motion.header
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5 }}
        className="sticky top-[32px] z-[90] glass-effect"
      >
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2">
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="transition-all duration-300"
              >
                <DynamicLogo />
              </motion.div>
            </Link>

            {/* Navigation */}
            <nav className="hidden md:flex items-center gap-2">
              <MegaMenu />
              <Link
                to="/stays"
                className="text-sm font-medium text-foreground hover:text-primary-text transition-colors px-3 py-2 rounded-lg nav-link-hover"
              >
                Stays
              </Link>
              <Link
                to="/hotels"
                className="text-sm font-medium text-foreground hover:text-primary-text transition-colors px-3 py-2 rounded-lg nav-link-hover"
              >
                Hotels
              </Link>
              <Link
                to="/resorts"
                className="text-sm font-medium text-foreground hover:text-primary-text transition-colors px-3 py-2 rounded-lg nav-link-hover"
              >
                Resorts
              </Link>
              <Link
                to="/bikes"
                className="text-sm font-medium text-foreground hover:text-primary-text transition-colors px-3 py-2 rounded-lg nav-link-hover"
              >
                Bikes
              </Link>
              <Link
                to="/cars"
                className="text-sm font-medium text-foreground hover:text-primary-text transition-colors px-3 py-2 rounded-lg nav-link-hover"
              >
                Cars
              </Link>
              <Link
                to="/experiences"
                className="text-sm font-medium text-foreground hover:text-primary-text transition-colors px-3 py-2 rounded-lg nav-link-hover"
              >
                Experiences
              </Link>
            </nav>

            {/* Right Side Actions */}
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleTheme}
                className="rounded-full"
                aria-label="Toggle theme"
              >
                {theme === "light" ? (
                  <Moon className="h-5 w-5" />
                ) : (
                  <Sun className="h-5 w-5" />
                )}
              </Button>

              <Button
                variant="ghost"
                size="icon"
                className="rounded-full hidden md:flex"
                aria-label="Wishlist"
              >
                <Heart className="h-5 w-5" />
              </Button>

              {user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="gap-2 rounded-full p-1 pr-1 md:pr-3 hover:bg-muted/60 transition-all">
                      <Avatar className="h-8 w-8 border border-border">
                        <AvatarImage src={profile?.profile_image || user?.user_metadata?.avatar_url || ""} />
                        <AvatarFallback className="bg-primary/10 text-primary-text text-xs">
                          {avatarLetter || <User className="h-4 w-4" />}
                        </AvatarFallback>
                      </Avatar>
                      <span className="hidden md:inline text-sm font-medium text-foreground max-w-[100px] truncate">
                        {displayName}
                      </span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 mt-1 rounded-xl shadow-xl border-border/50 backdrop-blur-md">
                    <DropdownMenuLabel className="font-normal">
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-semibold leading-none text-foreground">
                          {displayName}
                        </p>
                        <p className="text-xs leading-none text-muted-foreground truncate">
                          {displaySubtitle}
                        </p>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild className="rounded-lg cursor-pointer focus:bg-primary/10 focus:text-primary-dark">
                      <Link to="/profile" className="flex w-full items-center">
                        <User className="mr-2 h-4 w-4" />
                        <span>My Profile</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild className="rounded-lg cursor-pointer focus:bg-primary/10 focus:text-primary-dark">
                      <Link to={role === "host" || role === "admin" ? "/host/dashboard" : "/profile/bookings"} className="flex w-full items-center">
                        <LayoutDashboard className="mr-2 h-4 w-4" />
                        <span>Dashboard</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild className="rounded-lg cursor-pointer focus:bg-primary/10 focus:text-primary-dark">
                      <Link to="/profile/security" className="flex w-full items-center">
                        <Settings className="mr-2 h-4 w-4" />
                        <span>Settings</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={handleSignOut}
                      className="rounded-lg cursor-pointer text-destructive focus:bg-destructive/10 focus:text-destructive"
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Log out</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <>
                  <Link to="/auth" className="hidden md:flex">
                    <Button
                      variant="outline"
                      className={cn(
                        "rounded-full px-5 transition-all font-semibold",
                        isDarkHeader
                          ? "bg-transparent text-black border-black hover:bg-black/5 hover:text-black"
                          : "border-border text-foreground hover:bg-muted/50"
                      )}
                    >
                      Login/Signup
                    </Button>
                  </Link>
                  <div className="hidden md:flex ml-2">
                    <Link to={user ? "/onboarding/host" : "/host/signup"}>
                      <ButtonWithIcon label="Become a host" />
                    </Link>
                  </div>
                </>
              )}

              <Button
                variant="ghost"
                size="icon"
                className="md:hidden rounded-full"
                aria-label="Menu"
                onClick={() => setMobileOpen(!mobileOpen)}
              >
                {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
            </div>
          </div>
        </div>
      </motion.header>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-[100] bg-foreground/20 backdrop-blur-sm"
              onClick={() => setMobileOpen(false)}
            />

            {/* Slide-in panel */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed top-0 right-0 bottom-0 z-[110] w-[80vw] max-w-sm bg-card border-l border-border shadow-2xl flex flex-col"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-border">
                <DynamicLogo lightHeightClass="h-7" darkHeightClass="h-[36px]" />
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full"
                  onClick={() => setMobileOpen(false)}
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>

              {/* Nav links */}
              <div className="flex-1 overflow-y-auto py-4 px-3">
                <div className="space-y-1">
                  {mobileNavLinks.map((link, i) => (
                    <motion.div
                      key={link.to}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 + 0.1 }}
                    >
                      <Link
                        to={link.to}
                        onClick={() => setMobileOpen(false)}
                        className="flex items-center gap-3 px-4 py-3.5 rounded-xl hover:bg-muted/60 transition-colors group"
                      >
                        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                          <link.icon className="h-4 w-4 text-primary-text group-hover:text-primary-foreground transition-colors" />
                        </div>
                        <span className="text-sm font-semibold text-foreground group-hover:text-primary-text transition-colors">
                          {link.label}
                        </span>
                        <ChevronRight className="h-4 w-4 ml-auto text-muted-foreground group-hover:text-primary-text transition-colors" />
                      </Link>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Bottom actions */}
              <div className="p-4 border-t border-border flex flex-col gap-3">
                {user ? (
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border/50">
                      <Avatar className="h-10 w-10 border border-border">
                        <AvatarImage src={profile?.profile_image || user.user_metadata?.avatar_url || ""} />
                        <AvatarFallback className="bg-primary/10 text-primary-text">
                          {avatarLetter || <User className="h-4 w-4" />}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col overflow-hidden">
                        <p className="text-sm font-semibold text-foreground truncate">
                          {displayName}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {displaySubtitle}
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Link to="/profile" className="w-full" onClick={() => setMobileOpen(false)}>
                        <Button variant="outline" className="w-full rounded-xl text-xs gap-2 py-5">
                          <User className="h-4 w-4" />
                          Profile
                        </Button>
                      </Link>
                      <Link to={role === "host" || role === "admin" ? "/host/dashboard" : "/profile/bookings"} className="w-full" onClick={() => setMobileOpen(false)}>
                        <Button variant="outline" className="w-full rounded-xl text-xs gap-2 py-5">
                          <LayoutDashboard className="h-4 w-4" />
                          Dashboard
                        </Button>
                      </Link>
                    </div>
                    <Button
                      variant="ghost"
                      onClick={() => { handleSignOut(); setMobileOpen(false); }}
                      className="w-full rounded-xl text-destructive hover:bg-destructive/10 gap-2 py-5"
                    >
                      <LogOut className="h-4 w-4" />
                      Sign Out
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    <Link to="/auth" className="w-full" onClick={() => setMobileOpen(false)}>
                      <Button variant="gradient" className="w-full rounded-full gap-2 py-6">
                        <User className="h-4 w-4" />
                        Login / Sign Up
                      </Button>
                    </Link>
                    <Link to="/auth?role=host" className="w-full" onClick={() => setMobileOpen(false)}>
                      <ButtonWithIcon label="Become a Host" className="w-full h-12" />
                    </Link>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default Header;
