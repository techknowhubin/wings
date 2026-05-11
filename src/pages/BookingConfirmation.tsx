import { useLocation, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Marquee from "@/components/Marquee";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BadgeCheck, CalendarDays, Receipt, Sparkles } from "lucide-react";
import type { BookingDetails } from "@/types/booking";

type BookingConfirmationState = {
  booking?: BookingDetails;
  paymentId?: string;
  customerName?: string;
};

const BookingConfirmation = () => {
  const navigate = useNavigate();
  const { state } = useLocation();
  const bookingState = (state as BookingConfirmationState | null) ?? {};

  const booking = bookingState.booking;
  const paymentId = bookingState.paymentId;
  const customerName = bookingState.customerName || "Guest";

  if (!booking) {
    return (
      <div className="min-h-screen flex flex-col">
        <Marquee />
        <Header />
        <main className="container mx-auto px-4 py-12 flex-grow">
          <Card className="max-w-xl mx-auto p-8 rounded-3xl border-border shadow-strong bg-white dark:bg-card">
            <h1 className="text-2xl font-bold text-foreground mb-2">No booking found</h1>
            <p className="text-muted-foreground mb-5">Please start a new booking from any listing page.</p>
            <Button className="rounded-full px-6" onClick={() => navigate("/")}>Back to Home</Button>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Marquee />
      <Header />
      <main className="container mx-auto px-4 py-12 flex-grow">
        <Card className="max-w-3xl mx-auto rounded-3xl border-border shadow-strong overflow-hidden bg-white dark:bg-card">
          <div className="bg-accent/10 border-b border-accent/20 px-8 py-8 text-center">
            <div className="h-16 w-16 rounded-full bg-accent text-accent-foreground mx-auto flex items-center justify-center mb-4">
              <BadgeCheck className="h-8 w-8" />
            </div>
            <p className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-accent bg-accent/15 px-3 py-1 rounded-full mb-3">
              <Sparkles className="h-3.5 w-3.5" />
              Payment Successful
            </p>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">Booking Confirmed</h1>
            <p className="text-muted-foreground">
              Thanks {customerName}, your booking is confirmed and payment is successful.
            </p>
          </div>
          <div className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="rounded-2xl border border-border bg-secondary/30 p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Listing</p>
                <p className="font-semibold text-foreground">{booking.listingTitle}</p>
              </div>
              <div className="rounded-2xl border border-border bg-secondary/30 p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Amount Paid</p>
                <p className="font-semibold text-foreground">{booking.currencySymbol}{booking.total}</p>
              </div>
            </div>
            <div className="text-left bg-secondary/40 rounded-2xl p-5 space-y-3 text-sm mb-6 border border-border">
              <p className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-accent" />
                <span className="text-muted-foreground">Dates:</span>
                <span className="text-foreground font-medium">
                  {format(new Date(booking.startDate), "MMM dd, yyyy")} - {format(new Date(booking.endDate), "MMM dd, yyyy")}
                </span>
              </p>
              {paymentId ? (
                <p className="flex items-center gap-2">
                  <Receipt className="h-4 w-4 text-accent" />
                  <span className="text-muted-foreground">Payment ID:</span>
                  <span className="text-foreground font-medium">{paymentId}</span>
                </p>
              ) : null}
            </div>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button variant="outline" className="rounded-full px-6" onClick={() => navigate("/confirm-and-pay", { state: { booking } })}>
                View Booking
              </Button>
              <Button className="rounded-full px-6 bg-primary hover:bg-primary/90 text-primary-foreground" onClick={() => navigate("/")}>
                Return to Home
              </Button>
            </div>
          </div>
        </Card>
      </main>
      <Footer />
    </div>
  );
};

export default BookingConfirmation;
