import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Marquee from "@/components/Marquee";
import { motion } from "framer-motion";
import { Search, HelpCircle, MessageCircle, Phone, Mail } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const HelpCenter = () => {
  const [supportPhone, setSupportPhone] = useState("+91 9422799420");
  const [supportEmail, setSupportEmail] = useState("support@xplorwing.com");
  const location = useLocation();

  useEffect(() => {
    async function fetchSettings() {
      const { data, error } = await supabase.from('platform_settings').select('support_phone, support_email').maybeSingle();
      if (!error && data) {
        if (data.support_phone) setSupportPhone(data.support_phone);
        if (data.support_email) setSupportEmail(data.support_email);
      }
    }
    fetchSettings();
  }, []);

  useEffect(() => {
    if (location.hash) {
      const id = location.hash.slice(1);
      const el = document.getElementById(id);
      if (el) setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    }
  }, [location.hash]);

  const faqs = [
    {
      question: "How do I book a homestay on Xplorwing?",
      answer: "Browse our homestay listings, select your preferred property, choose your dates, and click 'Book Now'. You'll be guided through a secure payment process. Once confirmed, you'll receive booking details via email and in your account dashboard.",
    },
    {
      question: "What documents do I need to rent a bike or car?",
      answer: "You'll need a valid driver's license (for the appropriate vehicle category), a government-issued ID (Aadhaar, PAN, or Passport), and a refundable security deposit. International travelers need an International Driving Permit along with their home country license.",
    },
    {
      question: "Can I cancel or modify my booking?",
      answer: "Yes, you can cancel or modify bookings through your account dashboard. Cancellation policies vary by host/provider. Free cancellation is available for most bookings up to 48 hours before check-in. Please review the specific cancellation policy before booking.",
    },
    {
      question: "How does the Digital ID/KYC work?",
      answer: "Complete your KYC verification once by uploading your documents. Once verified, you'll receive a Digital ID with a QR code that can be used for all future bookings on Xplorwing, making the process seamless and paperless.",
    },
    {
      question: "Is my payment information secure?",
      answer: "Absolutely. We use industry-standard encryption and secure payment gateways. Your payment information is never stored on our servers. All transactions are processed through PCI DSS compliant payment partners.",
    },
    {
      question: "What if I face issues during my stay or rental?",
      answer: "Contact our 24/7 support team via phone, email, or in-app chat. We're here to resolve any issues quickly. You can also reach out to your host or rental provider directly through the Xplorwing messaging system.",
    },
    {
      question: "How do Xplorwing Experiences work?",
      answer: "Browse unique local experiences, select your preferred date and group size, and book instantly. Your experience host will receive your booking and confirm details. You'll get a confirmation with meeting point and what to bring.",
    },
    {
      question: "Can I earn money by listing my property or vehicle?",
      answer: "Yes! Xplowing welcomes hosts and rental providers. Create a host account, list your property or vehicle with photos and details, set your pricing and availability. We'll handle bookings and payments while you earn.",
    },
  ];

  const contactMethods = [
    {
      icon: Phone,
      title: "Call Us",
      detail: supportPhone,
      description: "24/7 Support",
    },
    {
      icon: Mail,
      title: "Email Us",
      detail: supportEmail,
      description: "We'll respond within 24 hours",
    },
    {
      icon: MessageCircle,
      title: "Live Chat",
      detail: "Chat with us",
      description: "Available 24/7",
    },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Marquee />
      <Header />

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary/10 to-accent/5 py-20">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center max-w-3xl mx-auto"
          >
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
              How Can We Help?
            </h1>
            <p className="text-lg text-muted-foreground mb-8">
              Find answers to common questions or get in touch with our support team
            </p>
            {/* Search Bar */}
            <div className="relative max-w-2xl mx-auto">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search for help..."
                className="w-full pl-12 pr-4 py-4 rounded-full glass-effect border-none outline-none text-foreground"
              />
            </div>
          </motion.div>
        </div>
      </section>

      {/* Contact Methods */}
      <section id="contact-support" className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          {contactMethods.map((method, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="glass-effect rounded-2xl p-6 text-center hover-lift cursor-pointer"
            >
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4">
                <method.icon className="h-6 w-6 text-primary-text" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-2">{method.title}</h3>
              <p className="text-primary-text font-semibold mb-1">{method.detail}</p>
              <p className="text-sm text-muted-foreground">{method.description}</p>
            </motion.div>
          ))}
        </div>

        {/* FAQs */}
        <motion.div
          id="faqs"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="max-w-4xl mx-auto"
        >
          <div className="flex items-center gap-2 mb-8">
            <HelpCircle className="h-8 w-8 text-primary-text" />
            <h2 className="text-3xl font-bold text-foreground">Frequently Asked Questions</h2>
          </div>
          <Accordion type="single" collapsible className="space-y-4">
            {faqs.map((faq, index) => (
              <AccordionItem
                key={index}
                value={`item-${index}`}
                className="glass-effect rounded-2xl px-6 border-none"
              >
                <AccordionTrigger className="text-left text-foreground hover:no-underline py-6">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground pb-6">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </motion.div>
      </section>

      {/* Terms & Conditions */}
      <section id="terms" className="container mx-auto px-4 pb-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="max-w-4xl mx-auto glass-effect rounded-2xl p-8"
        >
          <h2 className="text-2xl font-bold text-foreground mb-4">Terms &amp; Conditions</h2>
          <p className="text-muted-foreground text-sm mb-4">
            By using Xplorwing, you agree to our terms of service. Please read the full document carefully before booking or listing services on our platform.
          </p>
          <a href="/terms" className="text-primary font-semibold text-sm hover:underline">Read Full Terms &amp; Conditions →</a>
        </motion.div>
      </section>

      {/* Privacy Policy */}
      <section id="privacy-policy" className="container mx-auto px-4 pb-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="max-w-4xl mx-auto glass-effect rounded-2xl p-8"
        >
          <h2 className="text-2xl font-bold text-foreground mb-4">Privacy Policy</h2>
          <p className="text-muted-foreground text-sm mb-4">
            Your privacy matters to us. We are committed to protecting your personal data and being transparent about how we collect, use, and share information.
          </p>
          <a href="/privacy" className="text-primary font-semibold text-sm hover:underline">Read Full Privacy Policy →</a>
        </motion.div>
      </section>

      <Footer />
    </div>
  );
};

export default HelpCenter;
