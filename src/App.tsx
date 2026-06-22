import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useSearchParams } from "react-router-dom";
import { useEffect } from "react";
import { HelmetProvider } from "react-helmet-async";
import { captureReferral } from "@/lib/referral";
import { ThemeProvider } from "./components/ThemeProvider";
import { AuthProvider } from "./contexts/AuthContext";
import { CookieConsentProvider } from "./contexts/CookieConsentContext";
import CookieBanner from "./components/CookieBanner";
import { isSupabaseConfigured, supabase } from "@/integrations/supabase/client";
import MissingSupabaseConfig from "@/components/MissingSupabaseConfig";
import ScrollToTop from "./components/ScrollToTop";
import AuthRedirectHandler from "./components/AuthRedirectHandler";
import SEOSchema from "./components/SEOSchema";
import LandingPage from "./pages/LandingPage";
import Auth from "./pages/Auth";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Stays from "./pages/Stays";
import Hotels from "./pages/Hotels";
import Resorts from "./pages/Resorts";
import Experiences from "./pages/Experiences";
import TourPackages from "./pages/TourPackages";
import TourPackageDetail from "./pages/TourPackageDetail";
import PackageBookingFlow from "./pages/PackageBookingFlow";
import OutstationCabs from "./pages/OutstationCabs";
import Bikes from "./pages/Bikes";
import Cars from "./pages/Cars";
import StayDetail from "./pages/StayDetail";
import BikeDetail from "./pages/BikeDetail";
import CarDetail from "./pages/CarDetail";
import ExperienceDetail from "./pages/ExperienceDetail";
import AboutUs from "./pages/AboutUs";
import Careers from "./pages/Careers";
import Blog from "./pages/Blog";
import BlogDetail from "./pages/BlogDetail";
import HelpCenter from "./pages/HelpCenter";
import NotFound from "./pages/NotFound";
import LinkInBioLanding from "./pages/LinkInBioLanding";
import Destinations from "./pages/Destinations";
import DestinationDetail from "./pages/DestinationDetail";
import Offers from "./pages/Offers";
import UserOnboarding from "./pages/UserOnboarding";
import HostOnboarding from "./pages/HostOnboarding";
import UserProfile from "./pages/UserProfile";
import ConfirmAndPay from "./pages/ConfirmAndPay";
import BookingConfirmation from "./pages/BookingConfirmation";
import TransactionFailed from "./pages/TransactionFailed";
import PublicLinkInBio from "./pages/PublicLinkInBio";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import CookieSettings from "./pages/CookieSettings";
import CabsBookingPage from "./pages/CabsBookingPage";
import WhatsAppButton from "./components/WhatsAppButton";
import PartnerDashboard from "./pages/PartnerDashboard";
import Contact from "./pages/Contact";
import BecomeHost from "./pages/BecomeHost";
import AirportCabs from "./pages/AirportCabs";
import SEOLandingPage from "./pages/SEOLandingPage";

import { ProtectedTravelerRoute } from "./components/ProtectedTravelerRoute";
import { RoleGuard } from "./components/RoleGuard";

// Host Dashboard
import HostLayout from "./pages/HostLayout";
import HostSection from "./pages/HostSection";
import { ProtectedHostRoute } from "./components/ProtectedHostRoute";

// Admin Dashboard
import AdminLayout from "./components/admin/AdminLayout";
import { ProtectedAdminRoute } from "./components/ProtectedAdminRoute";
import AdminOverview from "./pages/Admin/AdminOverview";
import KYCReview from "./pages/Admin/KYCReview";
import ListingApprovals from "./pages/Admin/ListingApprovals";
import AdminProviders from "./pages/Admin/AdminProviders";
import AdminUsers from "./pages/Admin/AdminUsers";
import AdminBookings from "./pages/Admin/AdminBookings";
import AdminHubs from "./pages/Admin/AdminHubs";
import AdminReferrals from "./pages/Admin/AdminReferrals";
import AdminPayouts from "./pages/Admin/AdminPayouts";
import AdminAnalytics from "./pages/Admin/AdminAnalytics";
import AdminSettings from "./pages/Admin/AdminSettings";
import AdminBlogPosts from "./pages/Admin/AdminBlogPosts";
import AdminWalletManagement from "./pages/Admin/AdminWalletManagement";
import AdminSecurityDashboard from "./pages/Admin/AdminSecurityDashboard";
import CreatePackage from "./pages/Admin/Packages/CreatePackage";
import EditPackage from "./pages/Admin/Packages/EditPackage";
import PackageList from "./pages/Admin/Packages/PackageList";
import PackageAssignments from "./pages/Admin/Packages/PackageAssignments";
import Departures from "./pages/Admin/Packages/Departures";
import AdminPackageBookings from "./pages/Admin/AdminPackageBookings";

// Hub Partner Dashboard
import { ProtectedHubRoute } from "./components/ProtectedHubRoute";
import HubLayout from "./pages/HubPartner/HubLayout";
import HubOverview from "./pages/HubPartner/HubOverview";
import HubHosts from "./pages/HubPartner/HubHosts";
import HubListings from "./pages/HubPartner/HubListings";
import HubBookings from "./pages/HubPartner/HubBookings";
import HubBookingRequests from "./pages/HubPartner/HubBookingRequests";
import HubMarketplaceBookings from "./pages/HubPartner/HubMarketplaceBookings";
import HubWalkInEnquiries from "./pages/HubPartner/HubWalkInEnquiries";
import HubTravellerAssistance from "./pages/HubPartner/HubTravellerAssistance";
import HubReviews from "./pages/HubPartner/HubReviews";
import HubTravellers from "./pages/HubPartner/HubTravellers";
import HubDrivers from "./pages/HubPartner/HubDrivers";
import HubMap from "./pages/HubPartner/HubMap";
import HubSupport from "./pages/HubPartner/HubSupport";
import HubReports from "./pages/HubPartner/HubReports";
import HubEarnings from "./pages/HubPartner/HubEarnings";
import HubProfile from "./pages/HubPartner/HubProfile";
import HubSettings from "./pages/HubPartner/HubSettings";
import AssignedPackages from "./pages/HubPartner/Packages/AssignedPackages";
import HubBookingsPackages from "./pages/HubPartner/Packages/HubBookings";

const queryClient = new QueryClient();

// Captures ?ref=HUB-XXXXXXXX from any page and stores in localStorage/cookie
function ReferralCapture() {
  const [params] = useSearchParams();
  useEffect(() => {
    const ref = params.get('ref');
    if (ref) {
      captureReferral(ref);
      
      // Increment the QR scan count safely inside an async wrapper
      const trackScan = async () => {
        try {
          const { error } = await supabase.rpc('increment_partner_qr_scans_by_code', { ref_code: ref });
          if (error) console.error('Error tracking QR scan:', error);
        } catch (err) {
          console.error('Exception tracking QR scan:', err);
        }
      };
      trackScan();
    }
  }, [params]);
  return null;
}

const App = () =>
  !isSupabaseConfigured ? (
    <MissingSupabaseConfig />
  ) : (
    <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <CookieConsentProvider>
        <ThemeProvider defaultTheme="light">
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <ScrollToTop />
          <ReferralCapture />
          <AuthRedirectHandler />
          <SEOSchema />
          <Routes>
            <Route path="/" element={<RoleGuard><OutstationCabs /></RoleGuard>} />
            <Route path="/landing-page" element={<LandingPage />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/host/signup" element={<Auth />} />
            <Route path="/host/signin" element={<Auth />} />
            <Route path="/login" element={<Navigate to="/auth" replace />} />
            <Route path="/signup" element={<Navigate to="/auth" replace />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            {/* Primary category pages */}
            <Route path="/stays" element={<Stays />} />
            <Route path="/stays/:id" element={<StayDetail tableType="stays" />} />
            <Route path="/hotels" element={<Hotels />} />
            <Route path="/hotels/:id" element={<StayDetail tableType="hotels" />} />
            <Route path="/resorts" element={<Resorts />} />
            <Route path="/resorts/:id" element={<StayDetail tableType="resorts" />} />
            <Route path="/local-experiences" element={<Experiences />} />
            <Route path="/local-experiences/:id" element={<ExperienceDetail />} />
            <Route path="/experiences" element={<TourPackages />} />
            <Route path="/experiences/:id" element={<TourPackageDetail />} />
            <Route path="/experiences/:id/book" element={<PackageBookingFlow />} />
            <Route path="/bikes" element={<Bikes />} />
            <Route path="/bikes/:id" element={<BikeDetail />} />
            <Route path="/cars" element={<Cars />} />
            <Route path="/cars/:id" element={<CarDetail />} />

            {/* SEO-friendly URL aliases for sitelinks */}
            <Route path="/home-stays" element={<Stays />} />
            <Route path="/bike-rentals" element={<Bikes />} />
            <Route path="/car-rentals" element={<Cars />} />
            <Route path="/outstation-cabs" element={<Navigate to="/" replace />} />
            <Route path="/airport-cabs" element={<AirportCabs />} />
            <Route path="/packages" element={<Navigate to="/experiences" replace />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/become-host" element={<BecomeHost />} />

            {/* Specific SEO Location Pages */}
            <Route path="/hotels-in-hyderabad" element={<SEOLandingPage type="hotels" city="hyderabad" title="Hotels in Hyderabad" />} />
            <Route path="/resorts-in-goa" element={<SEOLandingPage type="resorts" city="goa" title="Resorts in Goa" />} />
            <Route path="/home-stays-in-vizag" element={<SEOLandingPage type="stays" city="vizag" title="Homestays in Vizag" />} />
            <Route path="/outstation-cabs-hyderabad" element={<SEOLandingPage type="outstation-cabs" city="hyderabad" title="Outstation Cabs from Hyderabad" />} />
            <Route path="/airport-cabs-hyderabad" element={<SEOLandingPage type="airport-cabs" city="hyderabad" title="Airport Cabs in Hyderabad" />} />

            {/* Cab booking */}
            <Route path="/cabs-booking" element={<CabsBookingPage />} />

            {/* Info & content pages */}
            <Route path="/about" element={<AboutUs />} />
            <Route path="/careers" element={<Careers />} />
            <Route path="/blog" element={<Blog />} />
            <Route path="/blog/:slug" element={<BlogDetail />} />
            <Route path="/help" element={<HelpCenter />} />
            <Route path="/link-in-bio" element={<LinkInBioLanding />} />
            <Route path="/p/:slug" element={<PublicLinkInBio />} />
            <Route path="/destinations" element={<Destinations />} />
            <Route path="/destinations/:name" element={<DestinationDetail />} />
            <Route path="/offers" element={<Offers />} />
            <Route path="/onboarding" element={<Navigate to="/onboarding/user" replace />} />
            <Route path="/onboarding/user" element={<UserOnboarding />} />
            <Route path="/onboarding/host" element={<HostOnboarding />} />
            <Route path="/host/onboarding" element={<HostOnboarding />} />
            
            {/* Traveler Dashboard & Profile */}
            <Route path="/traveler/dashboard" element={<Navigate to="/profile" replace />} />
            <Route path="/profile" element={<ProtectedTravelerRoute><UserProfile /></ProtectedTravelerRoute>} />
            <Route path="/profile/:section" element={<ProtectedTravelerRoute><UserProfile /></ProtectedTravelerRoute>} />
            
            <Route path="/confirm-and-pay" element={<ConfirmAndPay />} />
            <Route path="/booking-confirmation" element={<BookingConfirmation />} />
            <Route path="/transaction-failed" element={<TransactionFailed />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/cookie-settings" element={<CookieSettings />} />
            <Route path="/partner-dashboard/:referralId" element={<PartnerDashboard />} />
            <Route path="/partner/:partnerId" element={<PartnerDashboard />} />
            
            {/* Dashboard Aliases */}
            <Route path="/host/dashboard" element={<Navigate to="/host" replace />} />
            <Route path="/admin/dashboard" element={<Navigate to="/admin" replace />} />
            <Route path="/super-admin/dashboard" element={<Navigate to="/admin" replace />} />
            
            {/* Host Dashboard — shared layout, only content transitions */}
            <Route 
              path="/host" 
              element={
                <ProtectedHostRoute>
                  <HostLayout />
                </ProtectedHostRoute>
              }
            >
              <Route index element={<HostSection />} />
              <Route path="stays/add" element={<Navigate to="/host/stays?mode=add" replace />} />
              <Route path="hotels/add" element={<Navigate to="/host/hotels?mode=add" replace />} />
              <Route path="resorts/add" element={<Navigate to="/host/resorts?mode=add" replace />} />
              <Route path="cars/add" element={<Navigate to="/host/cars?mode=add" replace />} />
              <Route path="cabs/add" element={<Navigate to="/host/cabs?mode=add" replace />} />
              <Route path="bikes/add" element={<Navigate to="/host/bikes?mode=add" replace />} />
              <Route path="experiences/add" element={<Navigate to="/host/experiences?mode=add" replace />} />
              <Route path=":section" element={<HostSection />} />
            </Route>

            {/* Admin Dashboard — completely separate from host dashboard */}
            <Route
              path="/admin"
              element={
                <ProtectedAdminRoute>
                  <AdminLayout />
                </ProtectedAdminRoute>
              }
            >
              <Route index element={<AdminOverview />} />
              <Route path="kyc" element={<KYCReview />} />
              <Route path="listings" element={<ListingApprovals />} />
              <Route path="providers" element={<AdminProviders />} />
              <Route path="users" element={<AdminUsers />} />
              <Route path="bookings" element={<AdminBookings />} />
              <Route path="hubs" element={<AdminHubs />} />
              <Route path="referrals" element={<AdminReferrals />} />
              <Route path="payouts" element={<AdminPayouts />} />
              <Route path="analytics" element={<AdminAnalytics />} />
              <Route path="wing-credits" element={<AdminWalletManagement />} />
              <Route path="blog-posts" element={<AdminBlogPosts />} />
              <Route path="security" element={<AdminSecurityDashboard />} />
              <Route path="settings" element={<AdminSettings />} />
              
              <Route path="experiences" element={<PackageList />} />
              <Route path="experiences/create" element={<CreatePackage />} />
              <Route path="experiences/edit/:id" element={<EditPackage />} />
              <Route path="experiences/assignments" element={<PackageAssignments />} />
              <Route path="experiences/departures" element={<Departures />} />
              <Route path="package-bookings" element={<AdminPackageBookings />} />
            </Route>

            {/* Hub Partner Dashboard */}
            <Route
              path="/hub/:uuid"
              element={
                <ProtectedHubRoute>
                  <HubLayout />
                </ProtectedHubRoute>
              }
            >
              <Route index element={<HubOverview />} />
              {/* Operations */}
              <Route path="booking-requests" element={<HubBookingRequests />} />
              <Route path="outstation-cabs" element={<HubBookings />} />
              <Route path="marketplace-bookings" element={<HubMarketplaceBookings />} />
              <Route path="walkin-enquiries" element={<HubWalkInEnquiries />} />
              <Route path="traveller-assistance" element={<HubTravellerAssistance />} />
              {/* Network */}
              <Route path="hosts" element={<HubHosts />} />
              <Route path="listings" element={<HubListings />} />
              <Route path="drivers" element={<HubDrivers />} />
              <Route path="vehicles" element={<HubDrivers />} />
              {/* Customers */}
              <Route path="travellers" element={<HubTravellers />} />
              <Route path="reviews" element={<HubReviews />} />
              {/* Finance */}
              <Route path="earnings" element={<HubEarnings />} />
              {/* Platform */}
              <Route path="bookings" element={<HubBookingRequests />} /> {/* backwards compat */}
              <Route path="map" element={<HubMap />} />
              <Route path="support" element={<HubSupport />} />
              <Route path="reports" element={<HubReports />} />
              <Route path="profile" element={<HubProfile />} />
              <Route path="settings" element={<HubSettings />} />
              
              <Route path="experiences" element={<AssignedPackages />} />
              <Route path="experiences/bookings" element={<HubBookingsPackages />} />
            </Route>

            {/* Backwards compatibility for old Hub Partner URL */}
            <Route path="/hubpartner" element={<Navigate to="/profile" replace />} />

            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          <WhatsAppButton />
          <CookieBanner />
        </BrowserRouter>
      </TooltipProvider>
        </ThemeProvider>
        </CookieConsentProvider>
      </AuthProvider>
    </QueryClientProvider>
    </HelmetProvider>
  );

export default App;
