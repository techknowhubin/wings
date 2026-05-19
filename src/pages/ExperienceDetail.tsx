import { useNavigate, useParams } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Marquee from "@/components/Marquee";
import { motion } from "framer-motion";
import { Star, MapPin, Heart, Share2, Clock, Users, Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { useState, useEffect } from "react";
import { addDays } from "date-fns";
import experienceImage from "@/assets/experience-featured.jpg";
import type { BookingDetails } from "@/types/booking";
import { supabase } from "@/integrations/supabase/client";
import StayImageGallery from "@/components/stay-detail/StayImageGallery";

const ExperienceDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [guestCount, setGuestCount] = useState(1);
  const [experience, setExperience] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchExperience = async () => {
      if (!id) return;
      try {
        const { data, error } = await supabase
          .from("experiences")
          .select("*")
          .eq("id", id)
          .single();
          
        if (error) throw error;
        setExperience(data);
      } catch (err) {
        console.error("Error fetching experience:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchExperience();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Marquee />
        <Header />
        <div className="container mx-auto px-4 py-8 flex-grow flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Loading experience details...</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!experience) {
    return (
      <div className="min-h-screen flex flex-col">
        <Marquee />
        <Header />
        <div className="container mx-auto px-4 py-8 flex-grow flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-foreground mb-2">Experience Not Found</h2>
            <p className="text-muted-foreground">The experience you're looking for doesn't exist or is no longer available.</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const primaryImage = experience.images?.[0]?.startsWith('http') ? experience.images[0] : experienceImage;
  const resolvedImages = experience.images?.length > 0
    ? experience.images.map((img: string) => img.startsWith('http') ? img : primaryImage)
    : [primaryImage];

  const currencySymbol = experience.currency === "INR" ? "₹" : (experience.currency || "$");
  const unitPrice = Number(experience.price_per_person);

  const details = [
    { icon: Clock, label: "Duration", value: experience.duration || "3 hours" },
    { icon: Users, label: "Group Size", value: `Up to ${experience.group_size || 12}` },
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
                {experience.title}
              </h1>
              <div className="flex items-center gap-4 text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Star className="h-4 w-4 fill-primary-text text-primary-text" />
                  {experience.rating ? Number(experience.rating).toFixed(1) : "5.0"} ({experience.total_reviews || 0} reviews)
                </span>
                <span className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  {experience.location}
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

        <div className="mb-8">
          <StayImageGallery images={resolvedImages} title={experience.title} />
        </div>

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
                {experience.description}
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

            {experience.inclusions && experience.inclusions.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
                className="mb-8"
              >
                <h2 className="text-2xl font-bold text-foreground mb-4">What's Included</h2>
                <ul className="space-y-2 text-muted-foreground">
                  {experience.inclusions.map((inc: string, idx: number) => (
                    <li key={idx}>✓ {inc}</li>
                  ))}
                </ul>
              </motion.div>
            )}

            {experience.exclusions && experience.exclusions.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.5 }}
              >
                <h2 className="text-2xl font-bold text-foreground mb-4">What's Excluded</h2>
                <ul className="space-y-2 text-muted-foreground">
                  {experience.exclusions.map((exc: string, idx: number) => (
                    <li key={idx}>• {exc}</li>
                  ))}
                </ul>
              </motion.div>
            )}
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
                  <span className="text-3xl font-bold text-foreground">{currencySymbol}{unitPrice.toLocaleString("en-IN")}</span>
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
                  const subtotal = unitPrice * guestCount;
                  const discount = 0;
                  const serviceFee = 0;
                  const booking: BookingDetails = {
                    listingId: experience.id,
                    listingType: "experience",
                    listingCouponType: "experiences" as any,
                    hostId: experience.host_id,
                    listingTitle: experience.title,
                    listingImage: primaryImage,
                    currencySymbol,
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
