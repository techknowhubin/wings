import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Marquee from "@/components/Marquee";
import { motion } from "framer-motion";
import { Globe, Heart, Shield, Users } from "lucide-react";

const AboutUs = () => {
  const values = [
    {
      icon: Heart,
      title: "Authentic Experiences",
      description: "We connect you with genuine local experiences across India",
    },
    {
      icon: Globe,
      title: "Sustainable Travel",
      description: "Supporting local communities and eco-friendly tourism",
    },
    {
      icon: Shield,
      title: "Trust & Safety",
      description: "Your safety and security are our top priorities",
    },
    {
      icon: Users,
      title: "Community First",
      description: "Building a vibrant community of travelers and hosts",
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
              About Xplorwing
            </h1>
            <p className="text-lg text-muted-foreground">
              Your trusted companion for exploring India with freedom and authenticity
            </p>
          </motion.div>
        </div>
      </section>

      {/* Story Section */}
      <section className="container mx-auto px-4 py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="max-w-4xl mx-auto"
        >
          <h2 className="text-3xl font-bold text-foreground mb-6">Our Story</h2>
          <div className="space-y-4 text-muted-foreground">
            <p>
              Xplorwing was born from a simple idea: travel in India should be as free and
              effortless as a bird soaring through the sky. We saw travelers struggling with
              fragmented booking systems, unclear pricing, and a lack of authentic local
              experiences.
            </p>
            <p>
              Today, we're India's comprehensive travel ecosystem, bringing together homestays,
              vehicle rentals, unique experiences, and a vibrant community of travelers and
              hosts. We believe in making travel accessible, authentic, and hassle-free for
              everyone.
            </p>
            <p>
              From the snow-capped peaks of Ladakh to the beaches of Goa, from the heritage
              cities of Rajasthan to the backwaters of Kerala - Xplorwing is your gateway to
              discovering incredible India.
            </p>
          </div>
        </motion.div>
      </section>

      {/* Values Section */}
      <section className="bg-gradient-to-br from-primary/5 to-accent/5 py-16">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl font-bold text-foreground mb-4">Our Values</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              The principles that guide everything we do
            </p>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {values.map((value, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4 + index * 0.1 }}
                className="glass-effect rounded-2xl p-6 text-center hover-lift"
              >
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                  <value.icon className="h-8 w-8 text-primary-text" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-2">{value.title}</h3>
                <p className="text-muted-foreground">{value.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default AboutUs;
