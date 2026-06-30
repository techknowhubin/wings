import { useLocation, useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Marquee from "@/components/Marquee";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Ban, Receipt, RefreshCcw, ShieldAlert } from "lucide-react";
import type { BookingDetails } from "@/types/booking";

type TransactionFailedState = {
  booking?: BookingDetails;
  failureReason?: string;
  failedBookingId?: string;
};

function getFailureDisplay(reason?: string) {
  if (!reason) {
    return {
      icon: <AlertTriangle className="h-8 w-8" />,
      badge: "Payment Unsuccessful",
      heading: "Transaction Failed",
      body: "Your payment could not be completed. Please try again to confirm your booking.",
    };
  }
  const r = reason.toLowerCase();
  if (r.includes("cancelled")) {
    return {
      icon: <Ban className="h-8 w-8" />,
      badge: "Payment Cancelled",
      heading: "Payment Cancelled",
      body: "You cancelled the payment. Your booking has not been confirmed. Click 'Try Again' whenever you're ready.",
    };
  }
  if (r.includes("verification") || r.includes("signature")) {
    return {
      icon: <ShieldAlert className="h-8 w-8" />,
      badge: "Verification Failed",
      heading: "Payment Verification Failed",
      body: "We could not verify your payment. If your bank account was debited, please contact our support team immediately with your booking reference.",
    };
  }
  return {
    icon: <AlertTriangle className="h-8 w-8" />,
    badge: "Payment Unsuccessful",
    heading: "Transaction Failed",
    body: "Your payment could not be completed. Please try again or use a different payment method.",
  };
}

const TransactionFailed = () => {
  const navigate = useNavigate();
  const { state } = useLocation();
  const {
    booking,
    failureReason,
    failedBookingId,
  } = (state as TransactionFailedState | null) ?? {};

  const { icon, badge, heading, body } = getFailureDisplay(failureReason);

  const handleRetry = () => {
    navigate("/confirm-and-pay", {
      state: {
        booking,
        existingFailedBookingId: failedBookingId,
      },
    });
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Marquee />
      <Header />
      <main className="container mx-auto px-4 py-12 flex-grow">
        <Card className="max-w-3xl mx-auto rounded-3xl border-border shadow-strong overflow-hidden bg-white dark:bg-card">
          <div className="bg-destructive/10 border-b border-destructive/20 px-8 py-8 text-center">
            <div className="h-16 w-16 rounded-full bg-destructive text-destructive-foreground mx-auto flex items-center justify-center mb-4">
              {icon}
            </div>
            <p className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-destructive bg-destructive/15 px-3 py-1 rounded-full mb-3">
              {badge}
            </p>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">{heading}</h1>
            <p className="text-muted-foreground">{body}</p>
          </div>

          <div className="p-8">
            {(booking || failureReason || failedBookingId) && (
              <div className="rounded-2xl border border-border bg-secondary/40 p-5 mb-6 text-left text-sm space-y-2">
                {booking?.listingTitle && (
                  <p>
                    <span className="text-muted-foreground">Listing: </span>
                    <span className="text-foreground font-medium">{booking.listingTitle}</span>
                  </p>
                )}
                {booking?.total != null && (
                  <p className="flex items-center gap-2">
                    <Receipt className="h-4 w-4 text-destructive" />
                    <span className="text-muted-foreground">Amount:</span>
                    <span className="text-foreground font-medium">{booking.currencySymbol}{booking.total}</span>
                  </p>
                )}
                {failureReason && (
                  <p>
                    <span className="text-muted-foreground">Reason: </span>
                    <span className="text-foreground font-medium">{failureReason}</span>
                  </p>
                )}
                {failedBookingId && (
                  <p>
                    <span className="text-muted-foreground">Booking Ref: </span>
                    <span className="text-foreground font-mono font-medium">{failedBookingId.slice(0, 8).toUpperCase()}</span>
                  </p>
                )}
              </div>
            )}

            {failureReason?.toLowerCase().includes("verification") && (
              <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 mb-6 text-sm text-amber-800">
                <strong>Important:</strong> If money was deducted from your account, please contact us at{" "}
                <a href="https://wa.me/919492986413" className="underline font-semibold">+91 94929 86413</a>{" "}
                with your booking reference: <span className="font-mono font-semibold">{failedBookingId?.slice(0, 8).toUpperCase()}</span>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button variant="outline" className="rounded-full px-6" onClick={() => navigate("/")}>
                Back to Home
              </Button>
              {booking && (
                <Button
                  className="rounded-full px-6 bg-primary hover:bg-primary/90 text-primary-foreground"
                  onClick={handleRetry}
                >
                  <RefreshCcw className="h-4 w-4 mr-1" />
                  Try Again
                </Button>
              )}
            </div>
          </div>
        </Card>
      </main>
      <Footer />
    </div>
  );
};

export default TransactionFailed;
