import { useNavigate, useParams } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Marquee from "@/components/Marquee";
import { motion } from "framer-motion";
import { Star, MapPin, Heart, Share2, Clock, Users, Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { useState } from "react";
import { addDays } from "date-fns";
import experienceImage from "@/assets/experience-featured.jpg";
import type { BookingDetails } from "@/types/booking";

const ExperienceDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [guestCount, setGuestCount] = useState(1);

  const details = [
    { icon: Clock, label: "Duration", value: "3 hours" },
    { icon: Users, label: "Group Size", value: "Up to 12" },
    { icon: CalendarIcon, label: "Availability", value: "Daily" },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Marquee />
      <Header />

      <div className="container mx-auto px-4 py-8 flex-grow">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-6"
        >
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
                Kerala Cooking Class
              </h1>
              <div className="flex items-center gap-4 text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Star className="h-4 w-4 fill-primary-text text-primary-text" />
                  5.0 (234 reviews)
                </span>
                <span className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  Kochi, Kerala
                </span>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setIsWishlisted(!isWishlisted)}
              >
                <Heart
                  className={`h-5 w-5 transition-colors ${
                    isWishlisted ? "fill-red-500 text-red-500" : ""
                  }`}
                />
              </Button>
              <Button variant="outline" size="icon">
                <Share2 className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8 h-[400px]"
        >
          <img
            src={experienceImage}
            alt="Main view"
            className="w-full h-full object-cover rounded-2xl"
          />
          <div className="grid grid-cols-2 gap-4">
            <img
              src={experienceImage}
              alt="View 2"
              className="w-full h-full object-cover rounded-2xl"
            />
            <img
              src={experienceImage}
              alt="View 3"
              className="w-full h-full object-cover rounded-2xl"
            />
            <img
              src={experienceImage}
              alt="View 4"
              className="w-full h-full object-cover rounded-2xl"
            />
            <img
              src={experienceImage}
              alt="View 5"
              className="w-full h-full object-cover rounded-2xl"
            />
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="mb-8"
            >
              <h2 className="text-2xl font-bold text-foreground mb-4">About this experience</h2>
              <p className="text-muted-foreground leading-relaxed">
                Immerse yourself in the aromatic world of Kerala cuisine with our hands-on cooking
                class. Learn to prepare authentic dishes using traditional techniques and fresh,
                locally-sourced ingredients. Our expert chef will guide you through making classic
                Kerala recipes, from fragrant curries to delicious coconut-based sides. You'll
                discover the secrets of Kerala's famous spices and enjoy the meal you've created.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="mb-8"
            >
              <h2 className="text-2xl font-bold text-foreground mb-4">Experience Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {details.map((detail, index) => (
                  <div key={index} className="glass-effect rounded-2xl p-4">
                    <detail.icon className="h-6 w-6 text-primary-text mb-2" />
                    <p className="text-sm text-muted-foreground">{detail.label}</p>
                    <p className="font-semibold text-foreground">{detail.value}</p>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="mb-8"
            >
              <h2 className="text-2xl font-bold text-foreground mb-4">What's Included</h2>
              <ul className="space-y-2 text-muted-foreground">
                <li>✓ All ingredients and cooking equipment</li>
                <li>✓ Traditional Kerala recipes booklet</li>
                <li>✓ Professional chef instruction</li>
                <li>✓ Full meal that you'll prepare and eat</li>
                <li>✓ Complimentary Kerala tea and snacks</li>
                <li>✓ Apron and chef's hat (take home)</li>
              </ul>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.5 }}
            >
              <h2 className="text-2xl font-bold text-foreground mb-4">What to Bring</h2>
              <ul className="space-y-2 text-muted-foreground">
                <li>• Comfortable clothes</li>
                <li>• Appetite for learning and eating!</li>
                <li>• Camera (optional, for photos)</li>
              </ul>
            </motion.div>
          </div>

          <div className="lg:col-span-1">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="glass-effect rounded-2xl p-6 sticky top-24"
            >
              <div className="mb-6">
                <div className="flex items-baseline gap-2 mb-4">
                  <span className="text-3xl font-bold text-foreground">₹2,000</span>
                  <span className="text-muted-foreground">/ person</span>
                </div>
              </div>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="text-sm font-semibold text-foreground mb-2 block">
                    Select Date
                  </label>
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    disabled={(date) => date < new Date()}
                    className="rounded-xl border"
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold text-foreground mb-2 block">
                    Number of Guests
                  </label>
                  <select 
                    className="w-full p-3 rounded-xl glass-effect border text-foreground"
                    value={guestCount}
                    onChange={(e) => setGuestCount(Number(e.target.value))}
                  >
                    <option value={1}>1 Guest</option>
                    <option value={2}>2 Guests</option>
                    <option value={3}>3 Guests</option>
                    <option value={4}>4 Guests</option>
                  </select>
                </div>
              </div>

              <Button 
                className="w-full bg-primary hover:bg-accent" 
                size="lg"
                onClick={() => {
                  const startDate = selectedDate ?? new Date();
                  const unitPrice = 2000;
                  const subtotal = unitPrice * guestCount;
                  const discount = 0;
                  const serviceFee = 0;
                  const booking: BookingDetails = {
                    listingType: "experience",
                    listingTitle: "Village Cooking Experience",
                    listingImage: experienceImage,
                    currencySymbol: "₹",
                    unitLabel: guestCount === 1 ? "guest" : "guests",
                    unitPrice,
                    quantity: guestCount,
                    startDate: startDate.toISOString(),
                    endDate: addDays(startDate, 1).toISOString(),
                    description: `Experience for ${guestCount} guest(s)`,
                    subtotal,
                    discount,
                    serviceFee,
                    total: subtotal - discount + serviceFee,
                  };

                  navigate("/confirm-and-pay", {
                    state: { booking },
                  });
                }}
              >
                Book Experience
              </Button>

              <p className="text-xs text-center text-muted-foreground mt-4">
                Instant confirmation • Free cancellation up to 24h before
              </p>
            </motion.div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default ExperienceDetail;
