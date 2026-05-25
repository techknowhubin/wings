import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Marquee from "@/components/Marquee";
import BackButton from "@/components/BackButton";
import CabFareSection from "@/components/CabFareSection";
import CabDriverCTA from "@/components/CabDriverCTA";
import CustomerTestimonials from "@/components/CustomerTestimonials";
import HomeFAQ from "@/components/HomeFAQ";
import JourneyCTA from "@/components/JourneyCTA";
import { motion } from "framer-motion";
import { useState, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import heroOutstationCabs from "@/assets/hero-outstation-cabs.jpg";
import heroXplorwing from "@/assets/hero-xplorwing.jpg";

const CabsBookingPage = () => {
  const [heroSlide, setHeroSlide] = useState(0);
  const heroImages = [heroXplorwing, heroOutstationCabs];

  // Auto-slide hero banner
  useEffect(() => {
    const interval = setInterval(() => {
      setHeroSlide((p) => (p + 1) % heroImages.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [heroImages.length]);

  return (
    <div className="min-h-screen bg-slate-50/50">
      <Marquee />
      <Header />
      <BackButton />

      {/* Hero Section */}
      <section className="hidden lg:block container mx-auto px-4 pt-4">
        <div className="relative h-[65vh] md:h-[85vh] rounded-3xl overflow-hidden">
          {heroImages.map((img, i) => (
            <motion.div
              key={i}
              initial={false}
              animate={{ opacity: i === heroSlide ? 1 : 0 }}
              transition={{ duration: 1.2, ease: "easeInOut" }}
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url(${img})` }}
            />
          ))}

          {/* Nav arrows */}
          <button
            onClick={() => setHeroSlide((heroSlide - 1 + heroImages.length) % heroImages.length)}
            aria-label="Previous slide"
            className="absolute left-4 top-1/2 -translate-y-1/2 z-20 bg-black/30 hover:bg-black/50 text-white rounded-full p-2 backdrop-blur-sm transition-all duration-200"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <button
            onClick={() => setHeroSlide((heroSlide + 1) % heroImages.length)}
            aria-label="Next slide"
            className="absolute right-4 top-1/2 -translate-y-1/2 z-20 bg-black/30 hover:bg-black/50 text-white rounded-full p-2 backdrop-blur-sm transition-all duration-200"
          >
            <ChevronRight className="h-6 w-6" />
          </button>

          {/* Slide indicators */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex gap-2">
            {heroImages.map((_, i) => (
              <button
                key={i}
                onClick={() => setHeroSlide(i)}
                aria-label={`Go to slide ${i + 1}`}
                className={`h-2 rounded-full transition-all duration-300 ${
                  i === heroSlide ? "w-6 bg-white" : "w-2 bg-white/50"
                }`}
              />
            ))}
          </div>

          {/* Overlay CTA */}
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center text-center px-4">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.2 }}
            >
              <h1 className="text-4xl md:text-6xl font-extrabold text-white drop-shadow-lg mb-4">
                Book Your Outstation Cab
              </h1>
              <p className="text-lg md:text-xl text-white/90 max-w-2xl mx-auto drop-shadow">
                Fixed fares · No surge · Transparent billing. Explore India comfortably.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Mobile Hero */}
      <section className="lg:hidden relative h-56 overflow-hidden">
        <motion.div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${heroOutstationCabs})` }}
        />
        <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center px-4 text-center">
          <h1 className="text-2xl font-extrabold text-white mb-2">Book Your Outstation Cab</h1>
          <p className="text-sm text-white/85">Fixed fares · No surge · Transparent billing</p>
        </div>
      </section>

      {/* Pricing Section */}
      <main className="flex-grow flex flex-col">
        <div className="pt-2 md:pt-16">
          <CabFareSection variant="ticket" />
        </div>
        <CabDriverCTA />
      </main>

      {/* Testimonials */}
      <CustomerTestimonials variant="outstation-cabs" />

      {/* FAQ */}
      <HomeFAQ variant="outstation-cabs" />

      {/* Footer CTA */}
      <section className="container mx-auto px-4 py-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
        >
          <JourneyCTA />
        </motion.div>
      </section>

      <Footer />
    </div>
  );
};

export default CabsBookingPage;
