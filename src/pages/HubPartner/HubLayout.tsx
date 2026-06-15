import { Link, Outlet, useLocation } from "react-router-dom";
import { LayoutDashboard, Users, Building, CalendarCheck, MapPin, Navigation, Car, LifeBuoy, BarChart3, Settings, User } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

export default function HubLayout() {
  const { profile } = useAuth();
  const location = useLocation();

  const navigation = [
    { name: "Dashboard", href: "/hubpartner", icon: LayoutDashboard },
    { name: "Hosts", href: "/hubpartner/hosts", icon: Users },
    { name: "Listings", href: "/hubpartner/listings", icon: Building },
    { name: "Bookings", href: "/hubpartner/bookings", icon: CalendarCheck },
    { name: "Travellers", href: "/hubpartner/travellers", icon: MapPin },
    { name: "Drivers", href: "/hubpartner/drivers", icon: Car },
    { name: "Live Map", href: "/hubpartner/map", icon: Navigation },
    { name: "Support", href: "/hubpartner/support", icon: LifeBuoy },
    { name: "Reports & Earnings", href: "/hubpartner/reports", icon: BarChart3 },
    { name: "Profile", href: "/hubpartner/profile", icon: User },
    { name: "Settings", href: "/hubpartner/settings", icon: Settings },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-900">
      {/* Sidebar */}
      <div className="w-64 flex-shrink-0 border-r bg-white dark:bg-gray-800 dark:border-gray-700 flex flex-col">
        <div className="h-16 flex items-center px-6 border-b dark:border-gray-700">
          <h1 className="text-xl font-bold text-emerald-700 dark:text-emerald-400">Hub Partner</h1>
        </div>
        
        <div className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
          State: {profile?.assigned_state || "Unassigned"}
        </div>

        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href || (item.href !== "/hubpartner" && location.pathname.startsWith(item.href));
            return (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  isActive
                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800/50 dark:hover:text-gray-100"
                )}
              >
                <item.icon className={cn("w-5 h-5", isActive ? "text-emerald-600 dark:text-emerald-400" : "text-gray-400")} />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-auto">
        <main className="p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
