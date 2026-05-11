import { Navigate, useParams, useSearchParams } from "react-router-dom";
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

export default function HostSection() {
  const { section } = useParams();
  const [searchParams] = useSearchParams();
  const isAddMode = searchParams.get("mode") === "add";
  const isEditMode = searchParams.get("mode") === "edit";
  const resolvedSection = section ?? "dashboard";

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
