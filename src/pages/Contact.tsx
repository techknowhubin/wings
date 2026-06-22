import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Marquee from "@/components/Marquee";
import SEOHead from "@/components/SEOHead";
import { motion } from "framer-motion";
import { Mail, Phone, MapPin, MessageCircle, Clock, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

const Contact = () => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({ name: "", email: "", phone: "", message: "" });
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    const waMsg = `Hi Xplorwing,\n\nName: ${formData.name}\nEmail: ${formData.email}\nPhone: ${formData.phone}\n\nMessage: ${formData.message}`;
    window.open(`https://wa.me/916362986420?text=${encodeURIComponent(waMsg)}`, "_blank");
    toast({ title: "Message sent!", description: "We'll get back to you shortly." });
    setFormData({ name: "", email: "", phone: "", message: "" });
    setSending(false);
  };

  const contactCards = [
    { icon: Phone, title: "Call Us", content: "+91 6362986420", subtitle: "Mon–Sun, 9AM–9PM IST", href: "tel:+916362986420", color: "from-blue-500/20 to-blue-600/10" },
    { icon: MessageCircle, title: "WhatsApp", content: "+91 6362986420", subtitle: "Quick responses, 24/7", href: "https://wa.me/916362986420?text=Hi%2C%20I%20have%20a%20question", color: "from-green-500/20 to-green-600/10" },
    { icon: Mail, title: "Email Us", content: "hello@xplorwing.com", subtitle: "Reply within 24 hours", href: "mailto:hello@xplorwing.com", color: "from-purple-500/20 to-purple-600/10" },
    { icon: MapPin, title: "Serving", content: "Pan India", subtitle: "Stays, cabs & rentals", href: "/destinations", color: "from-orange-500/20 to-orange-600/10" },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <SEOHead title="Contact Us" description="Get in touch with Xplorwing. Call, WhatsApp, or email for homestay bookings, cab services, bike and car rentals across India." canonicalPath="/contact" breadcrumbs={[{ name: "Home", url: "/" }, { name: "Contact Us", url: "/contact" }]} />
      <Marquee />
      <Header />

      <section className="bg-gradient-to-br from-primary/10 via-accent/5 to-primary/5 py-20">
        <div className="container mx-auto px-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="text-center max-w-3xl mx-auto">
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">Contact Us</h1>
            <p className="text-lg text-muted-foreground">Have a question or need help planning your trip? We're here to help.</p>
          </motion.div>
        </div>
      </section>

      <section className="container mx-auto px-4 -mt-8 relative z-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {contactCards.map((card, i) => (
            <motion.a key={card.title} href={card.href} target={card.href.startsWith("http") ? "_blank" : undefined} rel={card.href.startsWith("http") ? "noreferrer" : undefined} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: i * 0.1 }} className="group glass-effect rounded-2xl p-6 hover-lift cursor-pointer border border-border/50">
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${card.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                <card.icon className="h-5 w-5 text-foreground" />
              </div>
              <h3 className="text-sm font-bold text-foreground mb-1">{card.title}</h3>
              <p className="text-base font-semibold text-primary-text mb-1">{card.content}</p>
              <p className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" /> {card.subtitle}</p>
            </motion.a>
          ))}
        </div>
      </section>

      <section className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }}>
            <h2 className="text-2xl font-bold text-foreground mb-2 text-center">Send Us a Message</h2>
            <p className="text-muted-foreground text-center mb-8">Fill in the form and we'll reach out via WhatsApp or email</p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="contact-name" className="text-sm font-medium text-foreground block mb-1.5">Name</label>
                  <Input id="contact-name" placeholder="Your full name" required value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} />
                </div>
                <div>
                  <label htmlFor="contact-phone" className="text-sm font-medium text-foreground block mb-1.5">Phone</label>
                  <Input id="contact-phone" type="tel" placeholder="+91 XXXXX XXXXX" value={formData.phone} onChange={e => setFormData(p => ({ ...p, phone: e.target.value }))} />
                </div>
              </div>
              <div>
                <label htmlFor="contact-email" className="text-sm font-medium text-foreground block mb-1.5">Email</label>
                <Input id="contact-email" type="email" placeholder="your@email.com" required value={formData.email} onChange={e => setFormData(p => ({ ...p, email: e.target.value }))} />
              </div>
              <div>
                <label htmlFor="contact-message" className="text-sm font-medium text-foreground block mb-1.5">Message</label>
                <textarea id="contact-message" rows={5} required placeholder="How can we help?" className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" value={formData.message} onChange={e => setFormData(p => ({ ...p, message: e.target.value }))} />
              </div>
              <Button type="submit" disabled={sending} className="w-full rounded-full py-6 text-base font-semibold gap-2" variant="gradient">
                <Send className="h-4 w-4" /> Send Message
              </Button>
            </form>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Contact;
