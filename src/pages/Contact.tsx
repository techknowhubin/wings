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
    window.open(`https://wa.me/919492986413?text=${encodeURIComponent(waMsg)}`, "_blank");
    toast({ title: "Message sent!", description: "We'll get back to you shortly." });
    setFormData({ name: "", email: "", phone: "", message: "" });
    setSending(false);
  };

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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* WhatsApp */}
          <motion.a href="https://wa.me/919492986413?text=Hi%2C%20I%20have%20a%20question" target="_blank" rel="noreferrer" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="group glass-effect rounded-2xl p-6 hover-lift cursor-pointer border border-border/50">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500/20 to-green-600/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <svg viewBox="0 0 24 24" className="h-5 w-5 fill-[#25D366]" xmlns="http://www.w3.org/2000/svg">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
            </div>
            <h3 className="text-sm font-bold text-foreground mb-2">WhatsApp</h3>
            <p className="text-base font-semibold text-foreground">+91 9492986413</p>
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1"><Clock className="h-3 w-3" /> Quick responses, 24/7</p>
          </motion.a>

          {/* Book Cabs / Packages */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }} className="glass-effect rounded-2xl p-6 border border-border/50">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-600/10 flex items-center justify-center mb-4">
              <Phone className="h-5 w-5 text-blue-600" />
            </div>
            <h3 className="text-sm font-bold text-foreground mb-2">Book Cabs / Packages</h3>
            <div className="space-y-1.5">
              {["+91 9492986413", "+91 9492986412", "+91 9422799420"].map((num) => (
                <a key={num} href={`tel:+91${num.replace(/\D/g,"")}`} className="flex items-center gap-2 text-sm text-foreground font-medium hover:text-green-600 transition-colors">
                  <Phone className="h-3.5 w-3.5 text-muted-foreground" /> {num}
                </a>
              ))}
            </div>
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-3"><Clock className="h-3 w-3" /> Mon–Sun, 9AM–9PM IST</p>
          </motion.div>

          {/* Customer Care + Email */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.2 }} className="glass-effect rounded-2xl p-6 border border-border/50 space-y-4">
            <div>
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500/20 to-orange-600/10 flex items-center justify-center mb-4">
                <Phone className="h-5 w-5 text-orange-600" />
              </div>
              <h3 className="text-sm font-bold text-foreground mb-2">Customer Care</h3>
              <a href="tel:+919422799420" className="flex items-center gap-2 text-sm text-foreground font-medium hover:text-green-600 transition-colors"><Phone className="h-3.5 w-3.5 text-muted-foreground" /> +91 9422799420</a>
            </div>
            <div className="pt-2 border-t border-border/50">
              <a href="mailto:hello@xplorwing.com" className="flex items-center gap-2 text-sm text-foreground font-medium hover:text-green-600 transition-colors"><Mail className="h-3.5 w-3.5 text-muted-foreground" /> hello@xplorwing.com</a>
              <p className="text-xs text-muted-foreground mt-1">Reply within 24 hours</p>
            </div>
          </motion.div>
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
