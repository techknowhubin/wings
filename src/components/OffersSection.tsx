import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, X, Loader2 } from "lucide-react";
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

interface OffersSectionProps {
  variant?: "default" | "outstation-cabs";
}

const outstationCabOffer = {
  title: "₹500 off on your\nfirst outstation cab",
  validity: "Valid till 30 Jun",
  emoji: "🚙",
  modalTitle: "Outstation Cab Offer",
  modalSub: "₹500 off · First booking",
  terms: [
    "Offer valid only on your first outstation cab booking via Xplorwing.",
    "Minimum booking value of ₹1,000 required to avail this discount.",
    "Valid till 30 June 2026. Cannot be clubbed with other offers.",
    "Discount applies to base fare only. Taxes & toll charges are excluded.",
    "Xplorwing reserves the right to modify or withdraw this offer at any time.",
  ],
};

const OffersSection = ({ variant = "default" }: OffersSectionProps) => {
  const [activeFilter, setActiveFilter] = useState("All");
  const [selectedOffer, setSelectedOffer] = useState<any | null>(null);
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
          // Distribute colors across items if they share same category
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

  if (variant === "outstation-cabs") {
    return (
      <section className="container mx-auto px-4 py-8 md:py-12 bg-white">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-3xl font-bold text-foreground">Offers for you</h2>
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.25 }}
            onClick={() => setSelectedOffer(outstationCabOffer)}
            className="relative overflow-hidden rounded-[18px] p-[18px_16px_16px] w-full sm:w-[260px] min-h-[172px] bg-[#fce8eb] cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_12px_32px_rgba(155,27,48,0.12)]"
          >
            <div className="inline-block rounded-full px-3.5 py-1 text-xs font-bold bg-[#9B1B30] text-white mb-3">
              Cab
            </div>

            <h3 className="text-[15px] font-extrabold text-[#2a0a0a] leading-[1.35] whitespace-pre-line mb-1.5">
              {outstationCabOffer.title}
            </h3>

            <p className="text-[11.5px] text-[#7a2030] mb-3.5">{outstationCabOffer.validity}</p>

            <button
              onClick={(e) => {
                e.stopPropagation();
                setSelectedOffer(outstationCabOffer);
              }}
              className="text-[10.5px] text-[#9B1B30] font-semibold underline underline-offset-2 bg-transparent border-none p-0 cursor-pointer hover:opacity-75"
            >
              *Terms &amp; Conditions apply
            </button>

            <div className="absolute -right-2.5 -bottom-2.5 w-[90px] h-[90px] rounded-full bg-[rgba(155,27,48,0.06)] pointer-events-none" />
            <div className="absolute right-3.5 bottom-3.5 text-[54px] leading-none pointer-events-none select-none">
              {outstationCabOffer.emoji}
            </div>
          </motion.div>

          <AnimatePresence>
            {selectedOffer && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45"
                onClick={() => setSelectedOffer(null)}
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.94 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.94 }}
                  transition={{ duration: 0.2 }}
                  className="relative bg-white rounded-[20px] p-[28px_24px] max-w-[340px] w-[90%] shadow-[0_24px_60px_rgba(0,0,0,0.18)]"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={() => setSelectedOffer(null)}
                    className="absolute top-3.5 right-4 w-7 h-7 rounded-full bg-[#f5efe4] border-none cursor-pointer flex items-center justify-center text-[#555] hover:bg-[#ead8c0]"
                    aria-label="Close modal"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>

                  <div className="flex items-center gap-2.5 mb-4">
                    <div className="w-[38px] h-[38px] rounded-[10px] bg-[#fce8eb] flex items-center justify-center text-xl">
                      {selectedOffer.emoji}
                    </div>
                    <div>
                      <div className="text-sm font-extrabold text-[#2a0a0a] mb-0.5">{selectedOffer.modalTitle}</div>
                      <div className="text-[11px] text-[#9B1B30] font-semibold">{selectedOffer.modalSub}</div>
                    </div>
                  </div>

                  <div className="h-px bg-[#f0e8e8] mb-3.5" />

                  <div className="flex flex-col gap-2.5 mb-5">
                    {selectedOffer.terms.map((term: string, idx: number) => (
                      <div key={idx} className="flex gap-2 items-start text-xs text-[#444] leading-[1.7]">
                        <span className="text-[#9B1B30] font-bold shrink-0">{idx + 1}.</span>
                        <span>{term}</span>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => setSelectedOffer(null)}
                    className="w-full bg-[#9B1B30] rounded-full py-3 text-[13px] font-bold text-white border-none cursor-pointer hover:opacity-90"
                  >
                    Got it
                  </button>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </section>
    );
  }

  const filteredOffers = offers.filter(
    offer => activeFilter === "All" || offer.category === activeFilter
  );

  return (
    <section className="container mx-auto px-4 py-8 md:py-12">
      <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} viewport={{ once: true }}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-3xl font-bold text-foreground">Offers for you</h2>
          <Link to="/offers" className="flex items-center gap-1 text-sm font-medium text-primary-text hover:underline">
            View more <ChevronRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="flex gap-2 mb-8 overflow-x-auto pb-2 scrollbar-hide">
          {filters.map(filter => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`whitespace-nowrap rounded-full px-5 py-2 text-sm font-medium transition-all border ${activeFilter === filter
                  ? "bg-[#9B1B30] text-white border-[#9B1B30]"
                  : "bg-transparent text-muted-foreground border-border hover:border-muted-foreground hover:text-foreground"
                }`}
            >
              {filter}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-32">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-[14px]">
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
                className={`relative overflow-hidden rounded-[18px] p-[20px_18px_18px] min-h-[172px] cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_12px_32px_rgba(0,0,0,0.10)] ${offer.colors.cardBg}`}
              >
                {/* Big background emoji */}
                <div className="absolute -right-2 -bottom-2 text-[80px] opacity-[0.12] leading-none select-none pointer-events-none">
                  {offer.emoji}
                </div>

                {/* Badge */}
                <div className={`inline-block rounded-md px-3 py-1 text-xs font-bold tracking-wide mb-3 ${offer.colors.badgeBg} ${offer.colors.badgeText}`}>
                  {offer.category}
                </div>

                {/* Title */}
                <h3 className={`text-base font-bold leading-tight mb-2 whitespace-pre-line ${offer.colors.title}`}>
                  {offer.title}
                </h3>

                {/* Validity */}
                <p className={`text-xs mb-4 font-medium ${offer.colors.validity}`}>
                  {offer.validity}
                </p>

                <div className="flex flex-col gap-2">
                  {/* Coupon */}
                  <div className={`inline-flex items-center gap-2 bg-white rounded-full px-4 py-2 border-dashed border ${offer.colors.couponBorder} self-start`}>
                    <span className={`text-sm ${offer.colors.couponText}`}>🏷</span>
                    <span className={`text-xs font-bold tracking-wider ${offer.colors.couponText}`}>
                      {offer.code}
                    </span>
                  </div>
                  {/* T&C */}
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedOffer(offer);
                    }}
                    className={`text-[10px] font-medium opacity-70 hover:opacity-100 hover:underline inline-block mt-1 bg-transparent border-none p-0 cursor-pointer text-left ${offer.colors.title}`}
                  >
                    *T&amp;C Apply
                  </button>
                </div>

                {/* Foreground emoji */}
                <div className="absolute right-4 bottom-[18px] text-[48px] leading-none select-none pointer-events-none">
                  {offer.emoji}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
        )}

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
      </motion.div>
    </section>
  );
};

export default OffersSection;
