import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, Calendar, UserCheck, Link as LinkIcon, Grid, X, ArrowRight } from "lucide-react";

const newFeatures = [
  {
    id: 1,
    title: "Free cancellation",
    subtitle: "100% refund on cancellation — no questions asked.",
    emoji: "🛡️",
    details: "Get a full refund on your bookings when you cancel up to 24 hours prior to your scheduled check-in or ride time. Stays, cabs, and treks are fully covered. The refund is processed instantly to your source account.",
    iconName: "shield"
  },
  {
    id: 2,
    title: "Free rescheduling",
    subtitle: "Change date at no extra cost, anytime.",
    emoji: "📅",
    details: "Plans changed? Easily modify your travel dates up to 12 hours before your booking start time. We support free rescheduling with no processing fees; you only pay the fare difference if applicable.",
    iconName: "calendar"
  },
  {
    id: 3,
    title: "Verified hosts & drivers",
    subtitle: "ID-verified before going live on the platform.",
    emoji: "👤",
    details: "Your safety is our top priority. Every single host listing a stay and every cab driver undergoes a rigorous identity verification process and criminal background check before they are approved on Xplorwing.",
    iconName: "user-check"
  },
  {
    id: 4,
    title: "Link-in-Bio storefronts",
    subtitle: "One link for stays, cabs & tours. Share anywhere.",
    emoji: "🔗",
    details: "For creators and local service providers: build your custom storefront on Xplorwing. Aggregate your listings, accept direct bookings, and share your personal Wing Link across social media platforms like Instagram or WhatsApp.",
    iconName: "link"
  },
  {
    id: 5,
    title: "Multi-service marketplace",
    subtitle: "Stays, rides & experiences — all one dashboard.",
    emoji: "🎒",
    details: "Manage all your bookings seamlessly. Book an outstation cab, secure a cozy homestay, and register for a curated trek, all managed under one unified Xplorwing customer dashboard.",
    iconName: "grid"
  }
];

const WhatsNewSection = () => {
  const [selectedFeature, setSelectedFeature] = useState<any | null>(null);

  const getIcon = (name: string) => {
    const classNames = "w-5 h-5 text-accent dark:text-primary";
    switch (name) {
      case "shield": return <Shield className={classNames} />;
      case "calendar": return <Calendar className={classNames} />;
      case "user-check": return <UserCheck className={classNames} />;
      case "link": return <LinkIcon className={classNames} />;
      case "grid": return <Grid className={classNames} />;
      default: return <Shield className={classNames} />;
    }
  };

  return (
    <section className="container mx-auto px-4 py-12 md:py-16">
      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        whileInView={{ opacity: 1, y: 0 }} 
        transition={{ duration: 0.5 }} 
        viewport={{ once: true }}
      >
        <h2 className="text-3xl font-bold text-foreground mb-8">What's new</h2>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
          {newFeatures.map((feat) => (
            <motion.div 
              key={feat.id}
              whileHover={{ y: -6, boxShadow: "0 12px 30px rgba(0,0,0,0.06)" }}
              onClick={() => setSelectedFeature(feat)}
              className="group flex flex-col justify-between min-h-[220px] bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-5 cursor-pointer transition-all duration-300 relative overflow-hidden"
            >
              {/* Top Section: Icon & Header */}
              <div>
                <div className="w-10 h-10 rounded-2xl bg-accent/5 dark:bg-primary/5 flex items-center justify-center mb-4 transition-transform group-hover:scale-105 duration-300">
                  {getIcon(feat.iconName)}
                </div>
                
                <h3 className="text-base font-bold text-slate-850 dark:text-white mb-2 leading-tight">
                  {feat.title}
                </h3>
                
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 leading-relaxed mb-4">
                  {feat.subtitle}
                </p>
              </div>

              {/* Bottom Section: Action */}
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedFeature(feat);
                }}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-accent dark:text-primary hover:underline mt-auto bg-transparent border-none p-0 cursor-pointer text-left self-start group/btn"
              >
                Know more
                <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover/btn:translate-x-1 duration-200" />
              </button>
            </motion.div>
          ))}
        </div>
      </motion.div>

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
