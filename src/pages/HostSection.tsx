import { Navigate, useParams, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useHostProfile } from "@/hooks/useListings";
import { motion } from "framer-motion";
import { Clock, ShieldAlert, Loader2 } from "lucide-react";
import HostDashboard from "./HostDashboard";
import HostStays from "./HostStays";
import HostHotels from "./HostHotels";
import HostResorts from "./HostResorts";
import HostCars from "./HostCars";
import HostBikes from "./HostBikes";
import HostExperiences from "./HostExperiences";
import HostBookings from "./HostBookings";
import HostEarnings from "./HostEarnings";
import HostLinkInBio from "./HostLinkInBio";
import HostSettings from "./HostSettings";
import HostCoupons from "./HostCoupons";
import HostAddStay from "./HostAddStay";
import HostAddHotel from "./HostAddHotel";
import HostAddResort from "./HostAddResort";
import HostAddCar from "./HostAddCar";
import HostAddBike from "./HostAddBike";
import HostAddExperience from "./HostAddExperience";
import HostEditListing from "./HostEditListing";
import HostNotifications from "./HostNotifications";
import HostCabs from "./HostCabs";
import HostAddCab from "./HostAddCab";

export default function HostSection() {
  const { section } = useParams();
  const [searchParams] = useSearchParams();
  const isAddMode = searchParams.get("mode") === "add";
  const isEditMode = searchParams.get("mode") === "edit";
  const resolvedSection = section ?? "dashboard";

  const { user } = useAuth();
  const { data: profile, isLoading } = useHostProfile(user?.id);

  if (isAddMode) {
    if (isLoading) {
      return (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      );
    }
    
    if (!profile || profile.onboarding_status !== 'approved') {
      return (
        <div className="flex items-center justify-center p-6 md:p-12 min-h-[60vh]">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-md w-full bg-white/80 backdrop-blur-xl border border-white/20 shadow-2xl rounded-3xl p-8 text-center"
          >
            <div className="mx-auto w-16 h-16 rounded-2xl bg-amber-100 flex items-center justify-center mb-6 shadow-inner">
              {profile?.onboarding_status === 'rejected' ? (
                <ShieldAlert className="w-8 h-8 text-red-600" />
              ) : (
                <Clock className="w-8 h-8 text-amber-600" />
              )}
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-3">
              {profile?.onboarding_status === 'rejected' ? 'Verification Failed' : 'Verification Pending'}
            </h2>
            <p className="text-slate-600 mb-6 leading-relaxed">
              {profile?.onboarding_status === 'rejected' 
                ? 'Your host profile verification was rejected. Please check your email or contact support.' 
                : 'Your host profile is currently under review by our team. You can create listings once your account is fully verified. This usually takes 2-4 hours.'}
            </p>
            <button 
              onClick={() => window.history.back()}
              className="w-full py-3 rounded-xl bg-slate-900 text-white font-medium hover:bg-slate-800 transition-colors"
            >
              Go Back
            </button>
          </motion.div>
        </div>
      );
    }
  }

  // Feature access restriction check
  if (!isLoading && profile) {
    const ALL_LISTING_TYPES = ["stays", "hotels", "resorts", "cars", "bikes", "experiences"];
    if (ALL_LISTING_TYPES.includes(resolvedSection)) {
      const approvedTypes = profile.approved_listing_types || [];
      const hasRestriction = approvedTypes.length > 0;
      if (hasRestriction && !approvedTypes.includes(resolvedSection)) {
        return <Navigate to="/host/dashboard" replace />;
      }
    }
  }

  switch (resolvedSection) {
    case "dashboard":
      return <HostDashboard />;
    case "stays":
      return isAddMode ? <HostAddStay /> : isEditMode ? <HostEditListing /> : <HostStays />;
    case "hotels":
      return isAddMode ? <HostAddHotel /> : isEditMode ? <HostEditListing /> : <HostHotels />;
    case "resorts":
      return isAddMode ? <HostAddResort /> : isEditMode ? <HostEditListing /> : <HostResorts />;
    case "cars":
      return isAddMode ? <HostAddCar /> : isEditMode ? <HostEditListing /> : <HostCars />;
    case "bikes":
      return isAddMode ? <HostAddBike /> : isEditMode ? <HostEditListing /> : <HostBikes />;
    case "experiences":
      return isAddMode ? <HostAddExperience /> : isEditMode ? <HostEditListing /> : <HostExperiences />;
    case "bookings":
      return <HostBookings />;
    case "notifications":
      return <HostNotifications />;
    case "cabs":
      return isAddMode ? <HostAddCab /> : isEditMode ? <HostEditListing /> : <HostCabs />;
    case "earnings":
      return <HostEarnings />;
    case "link":
      return <HostLinkInBio />;
    case "coupons":
      return <HostCoupons />;
    case "settings":
      return <HostSettings />;
    // Blog Posts moved to Admin Dashboard — redirect if someone hits old URL
    case "blog":
      return <Navigate to="/admin/blog-posts" replace />;
    default:
      return <Navigate to="/host/dashboard" replace />;
  }
}
