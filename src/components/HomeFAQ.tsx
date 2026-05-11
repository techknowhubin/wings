import { motion } from "framer-motion";
import { useState } from "react";
import { Plus, Minus } from "lucide-react";

const faqCategories = [
  {
    label: "Booking",
    questions: [
      {
        q: "How do I book a stay or rental on Xplorwing?",
        a: "Simply browse our listings, select your dates and destination, and complete the booking through our secure checkout. You'll receive an instant confirmation with all the details you need.",
      },
      {
        q: "Can I modify or cancel my booking?",
        a: "Yes, you can modify or cancel your booking from your account dashboard. Cancellation policies vary by listing — free cancellation is available on most stays up to 48 hours before check-in.",
      },
      {
        q: "Is it safe to pay online on Xplorwing?",
        a: "Absolutely. All transactions are processed through secure, encrypted payment gateways. We support UPI, credit/debit cards, net banking, and popular wallets.",
      },
    ],
  },
  {
    label: "Stays & Experiences",
    questions: [
      {
        q: "What types of stays are available?",
        a: "We offer homestays, boutique hotels, heritage havelis, treehouses, cottages, and luxury resorts across India. Each property is verified for quality and authenticity.",
      },
      {
        q: "How are experiences curated on Xplorwing?",
        a: "Every experience is handpicked and hosted by verified local experts. From sunrise treks to cultural workshops, each activity is reviewed for safety, quality, and authenticity.",
      },
      {
        q: "Can I book an experience without booking a stay?",
        a: "Yes! Stays and experiences are completely independent. You can book just an experience, just a stay, or combine both for a complete trip.",
      },
    ],
  },
  {
    label: "Vehicles",
    questions: [
      {
        q: "What documents do I need to rent a bike or car?",
        a: "You'll need a valid driving license, a government-issued ID proof, and a refundable security deposit. For bikes above 50cc, a motorcycle-specific license is required.",
      },
      {
        q: "Are the vehicles insured?",
        a: "Yes, all vehicles listed on Xplorwing come with basic insurance coverage. We recommend checking the specific listing for details on coverage limits and excess charges.",
      },
    ],
  },
  {
    label: "Hosting",
    questions: [
      {
        q: "How can I list my property or vehicle on Xplorwing?",
        a: "Sign up as a host from the 'Become a Host' page, fill in your listing details, upload photos, set your pricing, and submit for review. Most listings go live within 24 hours.",
      },
      {
        q: "How do hosts get paid?",
        a: "Hosts receive payouts directly to their bank account within 24–48 hours after a guest's check-in. You can track all earnings from your host dashboard.",
      },
    ],
  },
];

const HomeFAQ = () => {
  const [activeCategory, setActiveCategory] = useState(0);
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const questions = faqCategories[activeCategory].questions;

  return (
    <section className="container mx-auto px-4 py-16">
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        viewport={{ once: true }}
      >
        {/* Header */}
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
            Frequently Asked Questions
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Everything you need to know before your next adventure
          </p>
        </div>

        <div className="max-w-3xl mx-auto">
          {/* Category Pills */}
          <div className="flex flex-wrap gap-2 justify-center mb-8">
            {faqCategories.map((cat, i) => (
              <button
                key={cat.label}
                onClick={() => {
                  setActiveCategory(i);
                  setOpenIndex(0);
                }}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                  activeCategory === i
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Accordion */}
          <div className="divide-y divide-border border-t border-b border-border">
            {questions.map((item, i) => {
              const isOpen = openIndex === i;
              return (
                <div key={`${activeCategory}-${i}`}>
                  <button
                    onClick={() => setOpenIndex(isOpen ? null : i)}
                    className="w-full flex items-center justify-between py-5 px-1 text-left group"
                  >
                    <span className="text-base font-medium text-foreground pr-4 group-hover:text-primary-text transition-colors">
                      {item.q}
                    </span>
                    <div
                      className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-colors duration-200 ${
                        isOpen
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {isOpen ? (
                        <Minus className="h-4 w-4" />
                      ) : (
                        <Plus className="h-4 w-4" />
                      )}
                    </div>
                  </button>
                  <motion.div
                    initial={false}
                    animate={{
                      height: isOpen ? "auto" : 0,
                      opacity: isOpen ? 1 : 0,
                    }}
                    transition={{ duration: 0.25, ease: "easeInOut" }}
                    className="overflow-hidden"
                  >
                    <p className="text-sm text-muted-foreground leading-relaxed pb-5 px-1 pr-12">
                      {item.a}
                    </p>
                  </motion.div>
                </div>
              );
            })}
          </div>
        </div>
      </motion.div>
    </section>
  );
};

export default HomeFAQ;
