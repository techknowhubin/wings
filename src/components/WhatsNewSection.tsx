import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, Calendar, UserCheck, Link as LinkIcon, Grid, X, ArrowRight } from "lucide-react";

interface FeatureItem {
  id: number;
  title: string;
  subtitle: string;
  details: string;
  iconName: string;
}

const newFeatures: FeatureItem[] = [
  {
    id: 1,
    title: "Free cancellation",
    subtitle: "100% refund on cancellation — no questions asked.",
    details: "Get a full refund on your bookings when you cancel up to 24 hours prior to your scheduled check-in or ride time. Stays, cabs, and treks are fully covered. The refund is processed instantly to your source account.",
    iconName: "shield"
  },
  {
    id: 2,
    title: "Free rescheduling",
    subtitle: "Change date at no extra cost, anytime.",
    details: "Plans changed? Easily modify your travel dates up to 12 hours before your booking start time. We support free rescheduling with no processing fees; you only pay the fare difference if applicable.",
    iconName: "calendar"
  },
  {
    id: 3,
    title: "Verified hosts & drivers",
    subtitle: "ID-verified before going live on the platform.",
    details: "Your safety is our top priority. Every single host listing a stay and every cab driver undergoes a rigorous identity verification process and criminal background check before they are approved on Xplorwing.",
    iconName: "user-check"
  },
  {
    id: 4,
    title: "Link-in-Bio storefronts",
    subtitle: "One link for stays, cabs & tours. Share anywhere.",
    details: "For creators and local service providers: build your custom storefront on Xplorwing. Aggregate your listings, accept direct bookings, and share your personal Wing Link across social media platforms like Instagram or WhatsApp.",
    iconName: "link"
  },
  {
    id: 5,
    title: "Multi-service marketplace",
    subtitle: "Stays, rides & experiences — all one dashboard.",
    details: "Manage all your bookings seamlessly. Book an outstation cab, secure a cozy homestay, and register for a curated trek, all managed under one unified Xplorwing customer dashboard.",
    iconName: "grid"
  }
];

interface WhatsNewSectionProps {
  variant?: "default" | "outstation-cabs";
}

const WhatsNewSection = ({ variant = "default" }: WhatsNewSectionProps) => {
  const [selectedFeature, setSelectedFeature] = useState<FeatureItem | null>(null);
  const isOutstationVariant = variant === "outstation-cabs";

  const getIcon = (name: string, darkCard = false) => {
    const classNames = darkCard
      ? "w-5 h-5 text-[#c8e63c]"
      : isOutstationVariant
        ? "w-5 h-5 text-[#1a2e1a]"
        : "w-5 h-5 text-accent dark:text-primary";
    switch (name) {
      case "shield": return <Shield className={classNames} />;
      case "calendar": return <Calendar className={classNames} />;
      case "user-check": return <UserCheck className={classNames} />;
      case "link": return <LinkIcon className={classNames} />;
      case "grid": return <Grid className={classNames} />;
      default: return <Shield className={classNames} />;
    }
  };

  const outstationCardThemes = [
    {
      card: "bg-gradient-to-br from-[#1a2e1a] to-[#274227] text-white border-[#1f3a1f]",
      iconWrap: "bg-white/10",
      desc: "text-white/60",
      cta: "bg-[#c8e63c] text-[#1a2e1a] hover:bg-[#d6f04a]",
      dot: "bg-[rgba(200,230,60,0.22)]",
      glow: "from-[#c8e63c]/20 to-transparent",
      isDark: true,
    },
    {
      card: "bg-gradient-to-br from-[#c8e63c] to-[#d9ef6c] text-[#1a2e1a] border-[#c8e63c]",
      iconWrap: "bg-[rgba(26,46,26,0.10)]",
      desc: "text-[rgba(26,46,26,0.60)]",
      cta: "bg-[#1a2e1a] text-[#c8e63c] hover:bg-[#243824]",
      dot: "bg-[rgba(26,46,26,0.14)]",
      glow: "from-[#1a2e1a]/12 to-transparent",
      isDark: false,
    },
    {
      card: "bg-gradient-to-br from-[#e8e2d4] to-[#f2ede2] text-[#1a2e1a] border-[#ddd5c5]",
      iconWrap: "bg-[rgba(26,46,26,0.08)]",
      desc: "text-[rgba(26,46,26,0.58)]",
      cta: "bg-[#1a2e1a] text-white hover:bg-[#243824]",
      dot: "bg-[rgba(26,46,26,0.10)]",
      glow: "from-[#1a2e1a]/10 to-transparent",
      isDark: false,
    },
    {
      card: "bg-gradient-to-br from-[#1a2e1a] to-[#274227] text-white border-[#1f3a1f]",
      iconWrap: "bg-white/10",
      desc: "text-white/60",
      cta: "bg-[#c8e63c] text-[#1a2e1a] hover:bg-[#d6f04a]",
      dot: "bg-[rgba(200,230,60,0.22)]",
      glow: "from-[#c8e63c]/20 to-transparent",
      isDark: true,
    },
    {
      card: "bg-gradient-to-br from-[#deecd8] to-[#edf6e9] text-[#1a2e1a] border-[#cfe2c8]",
      iconWrap: "bg-[rgba(26,46,26,0.08)]",
      desc: "text-[rgba(26,46,26,0.58)]",
      cta: "bg-[#1a2e1a] text-white hover:bg-[#243824]",
      dot: "bg-[rgba(26,46,26,0.10)]",
      glow: "from-[#1a2e1a]/10 to-transparent",
      isDark: false,
    },
  ] as const;

  return (
    <section
      className={isOutstationVariant ? "py-12 md:py-16 bg-white" : "container mx-auto px-4 py-12 md:py-16"}
    >
      <div className={isOutstationVariant ? "container mx-auto px-4" : undefined}>
      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        whileInView={{ opacity: 1, y: 0 }} 
        transition={{ duration: 0.5 }} 
        viewport={{ once: true }}
      >
        <h2
          className={
            isOutstationVariant
              ? "text-[26px] font-medium text-[#1a2e1a] mb-6 tracking-[-0.4px]"
              : "text-3xl font-bold text-foreground mb-8"
          }
        >
          What's new
        </h2>
        
        <div className={isOutstationVariant ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-[14px]" : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6"}>
          {newFeatures.map((feat, idx) => {
            const theme = outstationCardThemes[idx % outstationCardThemes.length];
            return (
            <motion.div 
              key={feat.id}
              whileHover={{ y: -6, boxShadow: "0 12px 30px rgba(0,0,0,0.06)" }}
              onClick={() => setSelectedFeature(feat)}
              className={
                isOutstationVariant
                  ? `group flex flex-col justify-between min-h-[172px] border rounded-[18px] p-[20px_18px_18px] cursor-pointer transition-all duration-300 relative overflow-hidden shadow-[0_2px_10px_rgba(0,0,0,0.05)] ${theme.card}`
                  : "group flex flex-col justify-between min-h-[220px] bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-5 cursor-pointer transition-all duration-300 relative overflow-hidden"
              }
            >
              {isOutstationVariant && (
                <>
                  <span className={`absolute -right-6 -bottom-8 w-24 h-24 rounded-full bg-gradient-to-tr ${theme.glow}`} />
                  <span className={`absolute top-[18px] right-[18px] w-1 h-1 rounded-[1px] ${theme.dot}`} />
                  <span className={`absolute top-[18px] right-[27px] w-1 h-1 rounded-[1px] ${theme.dot}`} />
                  <span className={`absolute top-[27px] right-[18px] w-1 h-1 rounded-[1px] ${theme.dot}`} />
                  <span className={`absolute top-[27px] right-[27px] w-1 h-1 rounded-[1px] ${theme.dot}`} />
                </>
              )}

              <div>
                <div
                  className={
                    isOutstationVariant
                      ? `w-10 h-10 rounded-xl flex items-center justify-center mb-3 transition-transform group-hover:scale-105 duration-300 ${theme.iconWrap}`
                      : "w-10 h-10 rounded-2xl bg-accent/5 dark:bg-primary/5 flex items-center justify-center mb-4 transition-transform group-hover:scale-105 duration-300"
                  }
                >
                  {getIcon(feat.iconName, isOutstationVariant ? theme.isDark : false)}
                </div>
                
                <h3 className={isOutstationVariant ? "text-[16px] font-bold leading-tight tracking-[-0.2px] mb-1.5" : "text-base font-bold text-slate-850 dark:text-white mb-2 leading-tight"}>
                  {feat.title}
                </h3>
                
                <p className={isOutstationVariant ? `text-xs font-medium leading-relaxed mb-4 ${theme.desc}` : "text-xs font-medium text-slate-500 dark:text-slate-400 leading-relaxed mb-4"}>
                  {feat.subtitle}
                </p>
              </div>

              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedFeature(feat);
                }}
                className={
                  isOutstationVariant
                    ? `inline-flex items-center gap-1.5 text-xs font-semibold rounded-full px-3.5 py-1.5 mt-auto border-none cursor-pointer text-left self-start group/btn transition-all duration-200 ${theme.cta}`
                    : "inline-flex items-center gap-1.5 text-xs font-bold text-accent dark:text-primary hover:underline mt-auto bg-transparent border-none p-0 cursor-pointer text-left self-start group/btn"
                }
              >
                Know more
                <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover/btn:translate-x-1 duration-200" />
              </button>
            </motion.div>
          )})}
        </div>
      </motion.div>
      </div>

      {/* Feature Details Modal */}
      <AnimatePresence>
        {selectedFeature && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setSelectedFeature(null)}
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
                onClick={() => setSelectedFeature(null)}
                className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-all duration-200"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3.5 mb-5">
                <div className="w-12 h-12 rounded-2xl bg-accent/5 dark:bg-primary/5 flex items-center justify-center">
                  {getIcon(selectedFeature.iconName)}
                </div>
                <div>
                  <span className="text-[10px] font-bold text-accent dark:text-primary tracking-widest uppercase">Xplorwing Feature</span>
                  <h3 className="text-lg font-bold text-slate-850 dark:text-white leading-tight">
                    {selectedFeature.title}
                  </h3>
                </div>
              </div>

              <div className="mb-6">
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 leading-relaxed italic">
                  "{selectedFeature.subtitle}"
                </p>
                <div className="h-px bg-slate-100 dark:bg-slate-800 my-4" />
                <p className="text-xs text-slate-650 dark:text-slate-400 leading-relaxed">
                  {selectedFeature.details}
                </p>
              </div>

              <div className="flex justify-end">
                <button 
                  onClick={() => setSelectedFeature(null)}
                  className="w-full py-2.5 rounded-xl bg-accent dark:bg-primary text-accent-foreground dark:text-primary-foreground font-semibold text-sm hover:opacity-95 active:scale-[0.98] transition-all duration-200"
                >
                  Got it
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
};

export default WhatsNewSection;
