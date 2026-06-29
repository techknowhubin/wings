import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Marquee from "@/components/Marquee";
import SEOHead from "@/components/SEOHead";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Home, DollarSign, Shield, Star, ArrowRight, Users, BarChart3, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import ButtonWithIcon from "@/components/ui/button-with-icon";

const benefits = [
  { icon: DollarSign, title: "Earn Extra Income", desc: "Turn your property, vehicle, or expertise into a revenue stream." },
  { icon: Globe, title: "Reach Travelers Nationwide", desc: "Get discovered by thousands of travelers searching on Xplorwing." },
  { icon: Shield, title: "Secure Payments", desc: "Verified payouts directly to your bank — no chasing guests." },
  { icon: BarChart3, title: "Smart Dashboard", desc: "Manage bookings, earnings, coupons, and reviews from one place." },
  { icon: Users, title: "Community Support", desc: "Join 500+ hosts with 24/7 support and local hub partners." },
  { icon: Star, title: "Link-in-Bio Page", desc: "Get a personal landing page to share your listings across social media." },
];

const steps = [
  { step: "01", title: "Sign Up", desc: "Create your free host account in under 2 minutes." },
  { step: "02", title: "List Your Property", desc: "Add photos, pricing, and availability for your stay, vehicle, or experience." },
  { step: "03", title: "Start Earning", desc: "Receive bookings and get paid securely into your bank account." },
];

const BecomeHost = () => (
  <div className="min-h-screen flex flex-col">
    <SEOHead title="Become a Host" description="List your homestay, hotel, resort, bike, car, or travel experience on Xplorwing. Earn extra income, reach travelers across India, and manage everything from one dashboard." canonicalPath="/become-host" breadcrumbs={[{ name: "Home", url: "/" }, { name: "Become a Host", url: "/become-host" }]} />
    <Marquee />
    <Header />

    {/* Hero */}
    <section className="bg-gradient-to-br from-primary/15 via-accent/5 to-primary/5 py-24">
      <div className="container mx-auto px-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="text-center max-w-3xl mx-auto">
          <span className="inline-block bg-primary/10 text-primary-text text-xs font-bold px-4 py-1.5 rounded-full mb-4 uppercase tracking-wider">Hosting Made Simple</span>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6 leading-tight">
            Turn Your Space Into <span className="text-primary-text">Income</span>
          </h1>
          <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto">
            List homestays, hotels, resorts, bikes, cars, or experiences. Join India's fastest-growing travel platform.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/onboarding/host">
              <ButtonWithIcon label="Start Hosting — It's Free" className="h-14 text-base px-8" />
            </Link>
            <Link to="/about">
              <Button variant="outline" className="rounded-full h-14 px-8 text-base gap-2">Learn More <ArrowRight className="h-4 w-4" /></Button>
            </Link>
          </div>
        </motion.div>
      </div>
    </section>

    {/* Benefits */}
    <section className="container mx-auto px-4 py-20">
      <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="text-center mb-12">
        <h2 className="text-3xl font-bold text-foreground mb-3">Why Host on Xplorwing?</h2>
        <p className="text-muted-foreground max-w-xl mx-auto">Everything you need to succeed as a host</p>
      </motion.div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {benefits.map((b, i) => (
          <motion.div key={b.title} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }} className="glass-effect rounded-2xl p-6 hover-lift">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
              <b.icon className="h-5 w-5 text-primary-text" />
            </div>
            <h3 className="text-lg font-bold text-foreground mb-2">{b.title}</h3>
            <p className="text-sm text-muted-foreground">{b.desc}</p>
          </motion.div>
        ))}
      </div>
    </section>

    {/* How it works */}
    <section className="bg-gradient-to-br from-primary/5 to-accent/5 py-20">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold text-foreground text-center mb-12">How It Works</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          {steps.map((s, i) => (
            <motion.div key={s.step} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.15 }} className="text-center">
              <div className="text-5xl font-black text-primary/20 mb-3">{s.step}</div>
              <h3 className="text-xl font-bold text-foreground mb-2">{s.title}</h3>
              <p className="text-sm text-muted-foreground">{s.desc}</p>
            </motion.div>
          ))}
        </div>
        <div className="text-center mt-12">
          <Link to="/onboarding/host">
            <ButtonWithIcon label="Get Started Now" className="h-14 text-base px-8" />
          </Link>
        </div>
      </div>
    </section>

    <Footer />
  </div>
);

export default BecomeHost;
