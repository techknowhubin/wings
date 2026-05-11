import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Marquee from "@/components/Marquee";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Briefcase, MapPin, Clock } from "lucide-react";

const Careers = () => {
  const openings = [
    {
      title: "Senior Full Stack Developer",
      location: "Bangalore, Karnataka",
      type: "Full-time",
      department: "Engineering",
    },
    {
      title: "Product Manager",
      location: "Mumbai, Maharashtra",
      type: "Full-time",
      department: "Product",
    },
    {
      title: "Travel Experience Curator",
      location: "Delhi NCR",
      type: "Full-time",
      department: "Operations",
    },
    {
      title: "Customer Success Manager",
      location: "Remote",
      type: "Full-time",
      department: "Support",
    },
    {
      title: "Marketing Lead",
      location: "Bangalore, Karnataka",
      type: "Full-time",
      department: "Marketing",
    },
    {
      title: "UI/UX Designer",
      location: "Pune, Maharashtra",
      type: "Full-time",
      department: "Design",
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
              Join Our Journey
            </h1>
            <p className="text-lg text-muted-foreground mb-8">
              Help us revolutionize travel in India. Build something meaningful with a
              passionate team.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Why Join Section */}
      <section className="container mx-auto px-4 py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="max-w-4xl mx-auto mb-12"
        >
          <h2 className="text-3xl font-bold text-foreground mb-6">Why Xplorwing?</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="glass-effect rounded-2xl p-6">
              <h3 className="text-xl font-bold text-foreground mb-2">Impact</h3>
              <p className="text-muted-foreground">
                Shape the future of travel for millions across India
              </p>
            </div>
            <div className="glass-effect rounded-2xl p-6">
              <h3 className="text-xl font-bold text-foreground mb-2">Growth</h3>
              <p className="text-muted-foreground">
                Learn, grow, and advance your career with us
              </p>
            </div>
            <div className="glass-effect rounded-2xl p-6">
              <h3 className="text-xl font-bold text-foreground mb-2">Culture</h3>
              <p className="text-muted-foreground">
                Work with passionate people in a flexible environment
              </p>
            </div>
          </div>
        </motion.div>

        {/* Open Positions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <h2 className="text-3xl font-bold text-foreground mb-8">Open Positions</h2>
          <div className="space-y-4">
            {openings.map((job, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.4 + index * 0.1 }}
                className="glass-effect rounded-2xl p-6 hover-lift"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-bold text-foreground mb-2">{job.title}</h3>
                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Briefcase className="h-4 w-4" />
                        {job.department}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        {job.location}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {job.type}
                      </span>
                    </div>
                  </div>
                  <Button className="bg-primary hover:bg-accent">Apply Now</Button>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      <Footer />
    </div>
  );
};

export default Careers;
