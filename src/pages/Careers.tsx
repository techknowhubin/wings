import { useState, useEffect } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Marquee from "@/components/Marquee";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Briefcase, MapPin, Clock } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";

const Careers = () => {
  const { user } = useAuth();
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [isApplyOpen, setIsApplyOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    message: ""
  });

  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        name: user.user_metadata?.full_name || "",
        email: user.email || "",
        phone: user.phone || ""
      }));
    }
  }, [user]);

  const handleApplyClick = (job: any) => {
    setSelectedJob(job);
    setIsApplyOpen(true);
  };

  const handleDetailsClick = (job: any) => {
    setSelectedJob(job);
    setIsDetailsOpen(true);
  };

  const submitApplication = (e: React.FormEvent) => {
    e.preventDefault();
    const waMsg = `Hi Xplorwing, I want to apply for ${selectedJob?.title}.\n\nName: ${formData.name}\nEmail: ${formData.email}\nPhone: ${formData.phone}\nMessage: ${formData.message}`;
    window.open(`https://wa.me/919492986413?text=${encodeURIComponent(waMsg)}`, "_blank");
    setIsApplyOpen(false);
  };

  const openings = [
    {
      title: "Business Development",
      location: "Bangalore, Karnataka",
      type: "Freelance",
      department: "Sales & Marketing",
    },
    {
      title: "Content Creator",
      location: "Bangalore, Karnataka",
      type: "Freelance",
      department: "Marketing",
    },
    {
      title: "Business Development Intern",
      location: "Bangalore, Karnataka",
      type: "Internship",
      department: "Sales & Marketing",
    },
    {
      title: "Content Creator Intern",
      location: "Bangalore, Karnataka",
      type: "Internship",
      department: "Marketing",
    },
    {
      title: "Trip Organizer",
      location: "Bangalore, Karnataka",
      type: "Freelance",
      department: "Operations",
    },
    {
      title: "Executive Assistant",
      location: "Bangalore, Karnataka",
      type: "Freelance",
      department: "Administration",
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
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" className="rounded-full" onClick={() => handleDetailsClick(job)}>
                      View Details
                    </Button>
                    <Button className="rounded-full bg-primary hover:bg-accent" onClick={() => handleApplyClick(job)}>
                      Apply Now
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* Job Details Modal */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="sm:max-w-[425px] bg-card text-foreground">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">{selectedJob?.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="flex flex-wrap gap-2 text-sm">
              <span className="bg-primary text-primary-foreground font-medium px-3 py-1 rounded-full">{selectedJob?.department}</span>
              <span className="bg-muted text-muted-foreground px-3 py-1 rounded-full">{selectedJob?.location}</span>
              <span className="bg-muted text-muted-foreground px-3 py-1 rounded-full">{selectedJob?.type}</span>
            </div>
            <p className="text-muted-foreground mt-4 leading-relaxed">
              We are looking for a passionate and skilled {selectedJob?.title} to join our team in {selectedJob?.location === 'Remote' ? 'a Remote capacity' : selectedJob?.location}. 
              If you love solving complex problems and want to shape the future of travel in India, this role is for you.
            </p>
            <div className="pt-4 flex justify-end gap-2">
              <Button variant="outline" className="rounded-full" onClick={() => setIsDetailsOpen(false)}>Close</Button>
              <Button className="rounded-full bg-primary hover:bg-accent" onClick={() => { setIsDetailsOpen(false); handleApplyClick(selectedJob); }}>
                Apply Now
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Apply Now Modal */}
      <Dialog open={isApplyOpen} onOpenChange={setIsApplyOpen}>
        <DialogContent className="sm:max-w-[425px] bg-card text-foreground">
          <DialogHeader>
            <DialogTitle>Apply for {selectedJob?.title}</DialogTitle>
          </DialogHeader>
          <form onSubmit={submitApplication} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Your full name" />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" required value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} placeholder="your.email@example.com" />
            </div>
            <div className="space-y-2">
              <Label>Phone Number</Label>
              <Input type="tel" required value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} placeholder="+91 xxxxx xxxxx" />
            </div>
            <div className="space-y-2">
              <Label>Short Note (Optional)</Label>
              <Input value={formData.message} onChange={e => setFormData({...formData, message: e.target.value})} placeholder="Why are you a good fit?" />
            </div>
            <Button type="submit" className="w-full rounded-full bg-primary hover:bg-accent">
              Submit via WhatsApp
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
};

export default Careers;
