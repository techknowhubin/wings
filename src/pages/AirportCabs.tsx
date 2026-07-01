import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Marquee from "@/components/Marquee";
import SEOHead from "@/components/SEOHead";
import CabFareSection from "@/components/CabFareSection";
import { motion } from "framer-motion";
import { Plane, Clock, Shield, MapPin, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";

const features = [
  { icon: Plane, title: "All Major Airports", desc: "Hyderabad, Bangalore, Chennai, Vizag, Goa & more" },
  { icon: Clock, title: "24/7 Availability", desc: "Early morning or late night — we've got you covered" },
  { icon: Shield, title: "Verified Drivers", desc: "Background-checked, professional chauffeurs" },
  { icon: MapPin, title: "Flight Tracking", desc: "We monitor your flight for on-time pickup" },
];

const AirportCabs = () => (
  <div className="min-h-screen flex flex-col">
    <SEOHead
      title="Airport Cabs"
      description="Book reliable airport cab services across India. Available 24/7 at Hyderabad, Bangalore, Chennai, Vizag, Goa and more airports. Verified drivers, flight tracking, and transparent pricing."
      canonicalPath="/airport-cabs"
      breadcrumbs={[{ name: "Home", url: "/" }, { name: "Airport Cabs", url: "/airport-cabs" }]}
    />
    <Marquee />
    <Header />

    {/* Hero */}
    <section className="bg-gradient-to-br from-primary/10 via-accent/5 to-primary/5 py-20">
      <div className="container mx-auto px-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="text-center max-w-3xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">Airport Cab Services</h1>
          <p className="text-lg text-muted-foreground mb-8">Hassle-free airport transfers across India's top cities</p>
          <a href="https://wa.me/919492986413?text=Hi%2C%20I%20need%20an%20airport%20cab" target="_blank" rel="noreferrer">
            <Button variant="gradient" className="rounded-full h-14 px-8 text-base gap-2">
              <Phone className="h-4 w-4" /> Book Airport Cab via WhatsApp
            </Button>
          </a>
        </motion.div>
      </div>
    </section>

    {/* Features */}
    <section className="container mx-auto px-4 py-16">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {features.map((f, i) => (
          <motion.div key={f.title} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }} className="glass-effect rounded-2xl p-6 text-center hover-lift">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <f.icon className="h-5 w-5 text-primary-text" />
            </div>
            <h3 className="text-base font-bold text-foreground mb-2">{f.title}</h3>
            <p className="text-sm text-muted-foreground">{f.desc}</p>
          </motion.div>
        ))}
      </div>
    </section>

    {/* Fare Calculator */}
    <CabFareSection />

    <Footer />
  </div>
);

export default AirportCabs;
