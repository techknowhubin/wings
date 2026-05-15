import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "./components/ThemeProvider";
import { AuthProvider } from "./contexts/AuthContext";
import ScrollToTop from "./components/ScrollToTop";
import AuthRedirectHandler from "./components/AuthRedirectHandler";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Stays from "./pages/Stays";
import Hotels from "./pages/Hotels";
import Resorts from "./pages/Resorts";
import Experiences from "./pages/Experiences";
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
import UserOnboarding from "./pages/UserOnboarding";
import HostOnboarding from "./pages/HostOnboarding";
import UserProfile from "./pages/UserProfile";
import ConfirmAndPay from "./pages/ConfirmAndPay";
import BookingConfirmation from "./pages/BookingConfirmation";
import TransactionFailed from "./pages/TransactionFailed";
import PublicLinkInBio from "./pages/PublicLinkInBio";
import Terms from "./pages/Terms";
import WhatsAppButton from "./components/WhatsAppButton";

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
import AdminPayouts from "./pages/Admin/AdminPayouts";
import AdminAnalytics from "./pages/Admin/AdminAnalytics";
import AdminSettings from "./pages/Admin/AdminSettings";
import AdminBlogPosts from "./pages/Admin/AdminBlogPosts";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
    <ThemeProvider defaultTheme="light">
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <ScrollToTop />
          <AuthRedirectHandler />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/host/signup" element={<Auth />} />
            <Route path="/host/signin" element={<Auth />} />
            <Route path="/login" element={<Navigate to="/auth" replace />} />
            <Route path="/signup" element={<Navigate to="/auth" replace />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/stays" element={<Stays />} />
            <Route path="/stays/:id" element={<StayDetail />} />
            <Route path="/hotels" element={<Hotels />} />
            <Route path="/hotels/:id" element={<StayDetail />} />
            <Route path="/resorts" element={<Resorts />} />
            <Route path="/resorts/:id" element={<StayDetail />} />
            <Route path="/experiences" element={<Experiences />} />
            <Route path="/experiences/:id" element={<ExperienceDetail />} />
            <Route path="/bikes" element={<Bikes />} />
            <Route path="/bikes/:id" element={<BikeDetail />} />
            <Route path="/cars" element={<Cars />} />
            <Route path="/cars/:id" element={<CarDetail />} />
            <Route path="/about" element={<AboutUs />} />
            <Route path="/careers" element={<Careers />} />
            <Route path="/blog" element={<Blog />} />
            <Route path="/blog/:slug" element={<BlogDetail />} />
            <Route path="/help" element={<HelpCenter />} />
            <Route path="/link-in-bio" element={<LinkInBioLanding />} />
            <Route path="/p/:slug" element={<PublicLinkInBio />} />
            <Route path="/destinations" element={<Destinations />} />
            <Route path="/destinations/:name" element={<DestinationDetail />} />
            <Route path="/onboarding" element={<Navigate to="/onboarding/user" replace />} />
            <Route path="/onboarding/user" element={<UserOnboarding />} />
            <Route path="/onboarding/host" element={<HostOnboarding />} />
            <Route path="/profile" element={<UserProfile />} />
            <Route path="/profile/:section" element={<UserProfile />} />
            <Route path="/confirm-and-pay" element={<ConfirmAndPay />} />
            <Route path="/booking-confirmation" element={<BookingConfirmation />} />
            <Route path="/transaction-failed" element={<TransactionFailed />} />
            <Route path="/terms" element={<Terms />} />
            
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
              <Route path="payouts" element={<AdminPayouts />} />
              <Route path="analytics" element={<AdminAnalytics />} />
              <Route path="blog-posts" element={<AdminBlogPosts />} />
              <Route path="settings" element={<AdminSettings />} />
            </Route>

            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          <WhatsAppButton />
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
