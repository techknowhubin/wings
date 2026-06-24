import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, X, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

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


const OffersSection = ({ variant = "default" }: OffersSectionProps) => {
  const { user } = useAuth();
  const [activeFilter, setActiveFilter] = useState("All");
  const [selectedOffer, setSelectedOffer] = useState<any | null>(null);
  const [offers, setOffers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchOffers() {
      const emojiMap: Record<string, string> = {
        Stay: "🏡", Cab: "🚗", Tour: "🌄", Default: "🏷️",
      };

      const toOffer = (dbOffer: any, idx: number) => {
        const cat = mapListingTypeToCategory(dbOffer.listing_types);
        const colorSet =
          idx % 2 === 0 && cat === "Stay"
            ? categoryColorMap["Default"]
            : categoryColorMap[cat] || categoryColorMap["Default"];
        const isFlat = dbOffer.discount_type === "flat";
        const discVal = isFlat
          ? Number(dbOffer.discount_value ?? 0)
          : Number(dbOffer.discount_percent ?? dbOffer.discount_value ?? 0);
        const discLabel = isFlat ? `₹${discVal} off` : `${discVal}% off`;
        const discDesc = isFlat ? `Get ₹${discVal} off on your booking.` : `Get ${discVal}% off on your booking fee.`;
        const scope = `on ${(dbOffer.listing_types as string[] | null)?.join(", ") || "all listings"}`;
        const expiry = dbOffer.ends_at;
        return {
          id: dbOffer.id,
          type: cat,
          title: dbOffer.title || `${discLabel}\n${scope}`,
          validity: getValidityText(expiry),
          code: dbOffer.code,
          emoji: dbOffer.emoji || emojiMap[cat] || "🏷️",
          category: cat,
          terms: Array.isArray(dbOffer.terms) && dbOffer.terms.length
            ? dbOffer.terms
            : [
                `Use code ${dbOffer.code} at checkout to avail this offer.`,
                discDesc,
                expiry
                  ? `Valid till ${new Date(expiry).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}.`
                  : "Valid until further notice.",
                "Cannot be combined with other coupon codes.",
                "Platform T&C apply.",
              ],
          colors: colorSet,
        };
      };

      // Query 1: Platform Offers
      const { data: platformData, error: err1 } = await supabase
        .from('host_coupons' as any)
        .select('id,code,discount_percent,discount_type,discount_value,listing_types,is_active,ends_at,usage_limit,used_count,is_platform_offer,title,emoji,terms')
        .eq('is_active', true)
        .eq('is_platform_offer', true);

      let data1: any[] = [];
      let data2: any[] = [];

      // Only fetch VIP coupons if user is logged in
      if (user) {
        const { data: assignmentsData } = await supabase
          .from('host_coupons' as any)
          .select('id,code,discount_percent,discount_type,discount_value,listing_types,is_active,ends_at,usage_limit,used_count,is_platform_offer,title,emoji,terms, assignments!inner(user_id)')
          .eq('is_active', true)
          .eq('assignments.user_id', user.id);
        
        const { data: legacyData } = await supabase
          .from('host_coupons' as any)
          .select('id,code,discount_percent,discount_type,discount_value,listing_types,is_active,ends_at,usage_limit,used_count,is_platform_offer,title,emoji,terms')
          .eq('is_active', true)
          .or(`target_user_id.eq.${user.id},target_email.eq.${user.email},target_phone.eq.${user.phone}`);
          
        data1 = assignmentsData || [];
        data2 = legacyData || [];
      }

      // Merge and deduplicate
      const combinedData = [...(platformData || []), ...data1, ...data2];
      const uniqueDataMap = new Map();
      combinedData.forEach(c => uniqueDataMap.set(c.id, c));
      const finalData = Array.from(uniqueDataMap.values());

      const seen = new Set<string>();
      const valid = finalData.filter((c: any) => {
        if (seen.has(c.id)) return false;
        seen.add(c.id);
        if (c.ends_at && new Date(c.ends_at) < new Date()) return false;
        if (c.usage_limit && c.used_count >= c.usage_limit) return false;
        return true;
      });

      console.log("Valid coupons after filter:", valid.length);
      setOffers(valid.map((c: any, idx: number) => toOffer(c, idx)));
      setLoading(false);
    }
    fetchOffers();
  }, []);

  const filteredOffers = offers.filter(
    offer => activeFilter === "All" || offer.category === activeFilter
  );

  return (
    <section className="container mx-auto px-4 py-8 md:py-12">
      <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} viewport={{ once: true }}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-3xl font-bold text-foreground">
            {user ? "🎁 Available Coupons" : "Offers for you"}
          </h2>
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
                className="relative w-full max-w-md overflow-hidden bg-white rounded-3xl p-6 shadow-2xl dark:bg-card border border-border"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Close button */}
                <button 
                  onClick={() => setSelectedOffer(null)}
                  className="absolute top-4 right-4 p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-full transition-all duration-200"
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
