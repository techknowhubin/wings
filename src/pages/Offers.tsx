import { useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Marquee from "@/components/Marquee";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, X } from "lucide-react";

const offers = [
  {
    id: 1,
    type: "Stay",
    title: "Save up to ₹500 on\nyour first booking",
    validity: "Valid till 30 Jun",
    code: "WINGFIRST",
    emoji: "🏕️",
    category: "Stay",
    terms: [
      "Applicable only for first-time users on Xplorwing stays.",
      "Minimum booking value of ₹2,500 is required.",
      "Get 10% discount up to a maximum of ₹500.",
      "Cannot be combined with any other promotional offers.",
      "Valid on all homestays listed on the Xplorwing platform."
    ],
    colors: {
      cardBg: "bg-[#f7d6da]",
      badgeBg: "bg-[#9B1B30]",
      badgeText: "text-white",
      title: "text-[#4a0a14]",
      validity: "text-[#7a2030]",
      couponBorder: "border-[#9B1B30]",
      couponText: "text-[#9B1B30]",
    }
  },
  {
    id: 2,
    type: "Cab",
    title: "Flat ₹200 off on\nairport transfers",
    validity: "Valid till 31 May",
    code: "CABSAVE200",
    emoji: "🚙",
    category: "Cab",
    terms: [
      "Flat ₹200 discount applicable on airport transfers.",
      "Minimum ride value must be ₹1,500.",
      "Applicable only on outstation cab bookings.",
      "Tolls, parking fees, and state taxes are charged extra.",
      "Cannot be clubbed with other active discount codes."
    ],
    colors: {
      cardBg: "bg-[#fdedc4]",
      badgeBg: "bg-[#E07B00]",
      badgeText: "text-white",
      title: "text-[#5a3000]",
      validity: "text-[#a05800]",
      couponBorder: "border-[#E07B00]",
      couponText: "text-[#E07B00]",
    }
  },
  {
    id: 3,
    type: "Tour",
    title: "Get 15% off on\ncurated treks",
    validity: "Valid till 15 Jun",
    code: "TREK15",
    emoji: "🏔️",
    category: "Tour",
    terms: [
      "Get 15% discount on curated trekking experiences.",
      "Maximum discount limit is ₹1,000 per booking.",
      "Valid for booking of minimum 2 travelers.",
      "Must book at least 48 hours prior to the trek start time.",
      "Discount is non-refundable upon booking cancellation."
    ],
    colors: {
      cardBg: "bg-[#d0dcf5]",
      badgeBg: "bg-[#1A3A6B]",
      badgeText: "text-white",
      title: "text-[#0a1e40]",
      validity: "text-[#2a4a8a]",
      couponBorder: "border-[#1A3A6B]",
      couponText: "text-[#1A3A6B]",
    }
  },
  {
    id: 4,
    type: "Stay",
    title: "₹300 off on plantation\nstay packages",
    validity: "Valid till 30 Jun",
    code: "GREEN300",
    emoji: "🍃",
    category: "Stay",
    terms: [
      "Flat ₹300 discount on selected plantation stay bookings.",
      "Minimum stay duration of 2 nights is required.",
      "Only valid on stays categorized under 'Plantation Stays'.",
      "Subject to room availability and host confirmation.",
      "Standard cancellation policies apply."
    ],
    colors: {
      cardBg: "bg-[#c8e6c4]",
      badgeBg: "bg-[#1C3D1E]",
      badgeText: "text-[#a3e635]",
      title: "text-[#0e200f]",
      validity: "text-[#2a5a2c]",
      couponBorder: "border-[#1C3D1E]",
      couponText: "text-[#1C3D1E]",
    }
    }
];

const filters = ["All", "Stay", "Cab", "Tour"];

const Offers = () => {
  const [activeFilter, setActiveFilter] = useState("All");
  const [selectedOffer, setSelectedOffer] = useState<any | null>(null);
  const navigate = useNavigate();

  const filteredOffers = offers.filter(
    offer => activeFilter === "All" || offer.category === activeFilter
  );

  return (
    <div className="min-h-screen flex flex-col bg-slate-50/50">
      <Marquee />
      <Header />

      <main className="flex-grow container mx-auto px-4 py-8 md:py-24 max-w-7xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <div className="mb-6 md:mb-8">
            <button 
              onClick={() => navigate(-1)} 
              className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
          </div>

          <div className="mb-10 text-center">
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">Exclusive Offers</h1>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Save big on your next journey with these handpicked deals for stays, cabs, and curated experiences.
            </p>
          </div>

          <div className="flex justify-center gap-3 mb-10 overflow-x-auto pb-2 scrollbar-hide">
            {filters.map(filter => (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={`whitespace-nowrap rounded-full px-6 py-2 text-sm font-semibold transition-all border-[1.5px] ${
                  activeFilter === filter
                    ? "bg-primary text-white border-primary shadow-sm"
                    : "bg-white text-muted-foreground border-border hover:bg-slate-50 hover:text-foreground"
                }`}
              >
                {filter}
              </button>
            ))}
          </div>

          <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            <AnimatePresence>
              {filteredOffers.map((offer) => (
                <motion.div
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.2 }}
                  key={offer.id}
                  onClick={() => setSelectedOffer(offer)}
                  className={`relative overflow-hidden rounded-[20px] p-6 min-h-[190px] cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:shadow-xl ${offer.colors.cardBg}`}
                >
                  {/* Big background emoji */}
                  <div className="absolute -right-2 -bottom-2 text-[100px] opacity-[0.12] leading-none select-none pointer-events-none">
                    {offer.emoji}
                  </div>

                  {/* Badge */}
                  <div className={`inline-block rounded-md px-3 py-1 text-xs font-bold tracking-wide mb-3 ${offer.colors.badgeBg} ${offer.colors.badgeText}`}>
                    {offer.category}
                  </div>

                  {/* Title */}
                  <h3 className={`text-lg font-bold leading-tight mb-2 whitespace-pre-line ${offer.colors.title}`}>
                    {offer.title}
                  </h3>

                  {/* Validity */}
                  <p className={`text-xs mb-5 font-medium ${offer.colors.validity}`}>
                    {offer.validity}
                  </p>

                  <div className="flex flex-col gap-2">
                    {/* Coupon */}
                    <div className={`inline-flex items-center gap-2 bg-white rounded-full px-4 py-2 border-[1.5px] border-dashed shadow-sm ${offer.colors.couponBorder} self-start`}>
                      <span className={`text-sm ${offer.colors.couponText}`}>🏷</span>
                      <span className={`text-sm font-bold tracking-wider ${offer.colors.couponText}`}>
                        {offer.code}
                      </span>
                    </div>
                    {/* T&C */}
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedOffer(offer);
                      }}
                      className={`text-[11px] font-semibold opacity-70 hover:opacity-100 hover:underline inline-block mt-1 bg-transparent border-none p-0 cursor-pointer text-left ${offer.colors.title}`}
                    >
                      *T&amp;C Apply
                    </button>
                  </div>

                  {/* Foreground emoji */}
                  <div className="absolute right-5 bottom-6 text-[56px] leading-none select-none pointer-events-none drop-shadow-md">
                    {offer.emoji}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
          
          {filteredOffers.length === 0 && (
            <div className="text-center py-20 text-muted-foreground">
              No offers available for this category right now.
            </div>
          )}
        </motion.div>

        {/* Custom Terms & Conditions Modal */}
        <AnimatePresence>
          {selectedOffer && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
              onClick={() => setSelectedOffer(null)}
            >
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="relative w-full max-w-md overflow-hidden bg-white rounded-3xl p-6 shadow-2xl dark:bg-slate-900 border border-slate-100 dark:border-slate-800"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Close button */}
                <button 
                  onClick={() => setSelectedOffer(null)}
                  className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-all duration-200"
                  aria-label="Close modal"
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="flex items-center gap-3 mb-4">
                  <span className="text-3xl">{selectedOffer.emoji}</span>
                  <div>
                    <span className="text-xs font-bold text-primary tracking-wider uppercase">{selectedOffer.category} Offer</span>
                    <h3 className="text-lg font-bold text-slate-850 dark:text-white leading-tight">
                      Code: <span className="font-mono text-primary bg-primary/5 px-2 py-0.5 rounded-md border border-primary/20">{selectedOffer.code}</span>
                    </h3>
                  </div>
                </div>

                <div className="mb-6">
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-2">Terms &amp; Conditions:</h4>
                  <ul className="space-y-2">
                    {selectedOffer.terms.map((term: string, idx: number) => (
                      <li key={idx} className="flex gap-2 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                        <span className="text-primary font-bold">•</span>
                        <span>{term}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="flex justify-end">
                  <button 
                    onClick={() => setSelectedOffer(null)}
                    className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 active:scale-[0.98] transition-all duration-200"
                  >
                    Got it, thanks!
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <Footer />
    </div>
  );
};

export default Offers;
