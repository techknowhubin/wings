import { useLocation, useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Marquee from "@/components/Marquee";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Receipt, RefreshCcw } from "lucide-react";
import type { BookingDetails } from "@/types/booking";

type TransactionFailedState = {
  booking?: BookingDetails;
};

const TransactionFailed = () => {
  const navigate = useNavigate();
  const { state } = useLocation();
  const booking = (state as TransactionFailedState | null)?.booking;

  return (
    <div className="min-h-screen flex flex-col">
      <Marquee />
      <Header />
      <main className="container mx-auto px-4 py-12 flex-grow">
        <Card className="max-w-3xl mx-auto rounded-3xl border-border shadow-strong overflow-hidden bg-white dark:bg-card">
          <div className="bg-destructive/10 border-b border-destructive/20 px-8 py-8 text-center">
            <div className="h-16 w-16 rounded-full bg-destructive text-destructive-foreground mx-auto flex items-center justify-center mb-4">
              <AlertTriangle className="h-8 w-8" />
            </div>
            <p className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-destructive bg-destructive/15 px-3 py-1 rounded-full mb-3">
              Payment Unsuccessful
            </p>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">Transaction Failed</h1>
            <p className="text-muted-foreground">
              Your payment could not be completed. Please try again to confirm your booking.
            </p>
          </div>
          <div className="p-8">
            {booking ? (
              <div className="rounded-2xl border border-border bg-secondary/40 p-5 mb-6 text-left text-sm">
                <p className="mb-2"><span className="text-muted-foreground">Listing:</span> <span className="text-foreground font-medium">{booking.listingTitle}</span></p>
                <p className="flex items-center gap-2">
                  <Receipt className="h-4 w-4 text-destructive" />
                  <span className="text-muted-foreground">Amount:</span>
                  <span className="text-foreground font-medium">{booking.currencySymbol}{booking.total}</span>
                </p>
              </div>
            ) : null}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button variant="outline" className="rounded-full px-6" onClick={() => navigate("/")}>
                Back to Home
              </Button>
              <Button
                className="rounded-full px-6 bg-primary hover:bg-primary/90 text-primary-foreground"
                onClick={() => navigate("/confirm-and-pay", { state: { booking } })}
              >
                <RefreshCcw className="h-4 w-4 mr-1" />
                Try Again
              </Button>
            </div>
          </div>
        </Card>
      </main>
      <Footer />
    </div>
  );
};

export default TransactionFailed;
