import { useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Marquee from "@/components/Marquee";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, X, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const categoryColorMap: Record<string, any> = {
  Stay: { cardBg: "bg-[#f7d6da]", badgeBg: "bg-[#9B1B30]", badgeText: "text-white", title: "text-[#4a0a14]", validity: "text-[#7a2030]", couponBorder: "border-[#9B1B30]", couponText: "text-[#9B1B30]" },
  Cab: { cardBg: "bg-[#fdedc4]", badgeBg: "bg-[#E07B00]", badgeText: "text-white", title: "text-[#5a3000]", validity: "text-[#a05800]", couponBorder: "border-[#E07B00]", couponText: "text-[#E07B00]" },
  Tour: { cardBg: "bg-[#d0dcf5]", badgeBg: "bg-[#1A3A6B]", badgeText: "text-white", title: "text-[#0a1e40]", validity: "text-[#2a4a8a]", couponBorder: "border-[#1A3A6B]", couponText: "text-[#1A3A6B]" },
  Default: { cardBg: "bg-[#c8e6c4]", badgeBg: "bg-[#1C3D1E]", badgeText: "text-white", title: "text-[#0e200f]", validity: "text-[#2a5a2c]", couponBorder: "border-[#1C3D1E]", couponText: "text-[#1C3D1E]" }
};

const mapListingTypeToCategory = (types: string[] | null) => {
  if (!types || types.length === 0) return 'Stay';
  if (types.includes('stays')) return 'Stay';
  if (types.includes('cars') || types.includes('bikes')) return 'Cab';
  if (types.includes('experiences')) return 'Tour';
  return 'Stay';
};

const getValidityText = (endsAt: string | null) => {
  if (!endsAt) return "Valid indefinitely";
  const date = new Date(endsAt);
  return `Valid till ${date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`;
};

const filters = ["All", "Stay", "Cab", "Tour"];

const Offers = () => {
  const [activeFilter, setActiveFilter] = useState("All");
  const [selectedOffer, setSelectedOffer] = useState<any | null>(null);
  const navigate = useNavigate();
  const [offers, setOffers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchOffers() {
      const { data, error } = await supabase
        .from('host_coupons')
        .select('*')
        .eq('is_platform_offer', true)
        .eq('is_active', true);
        
      if (!error && data) {
        const mappedOffers = data.map((dbOffer, idx) => {
          const cat = mapListingTypeToCategory(dbOffer.listing_types);
          const colorSet = idx % 2 === 0 && cat === 'Stay' ? categoryColorMap['Default'] : categoryColorMap[cat] || categoryColorMap['Default'];
          return {
            id: dbOffer.id,
            type: cat,
            title: dbOffer.title || `${dbOffer.discount_percent}% off`,
            validity: getValidityText(dbOffer.ends_at),
            code: dbOffer.code,
            emoji: dbOffer.emoji || "🏷️",
            category: cat,
            terms: dbOffer.terms || ["Standard T&C Apply"],
            colors: colorSet
          };
        });
        setOffers(mappedOffers);
      }
      setLoading(false);
    }
    fetchOffers();
  }, []);

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

          {loading ? (
            <div className="flex justify-center items-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
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
          )}
          
          {!loading && filteredOffers.length === 0 && (
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
