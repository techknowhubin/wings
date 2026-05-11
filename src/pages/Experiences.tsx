import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Marquee from "@/components/Marquee";
import SearchBar from "@/components/SearchBar";
import ListingCard from "@/components/ListingCard";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { resolveListingCardImage } from "@/lib/listing-images";

interface Experience {
  id: string;
  title: string;
  location: string;
  price_per_person: number;
  currency: string;
  rating: number;
  images: string[];
  host_name?: string;
}

const Experiences = () => {
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchExperiences = async () => {
      try {
        const { data, error } = await supabase
          .from("experiences")
          .select("id, title, location, price_per_person, currency, rating, images, host_id")
          .eq("availability_status", true)
          .eq("marketplace_visible", true)
          .order("featured", { ascending: false })
          .order("created_at", { ascending: false });

        if (error) throw error;
        
        // Fetch host names
        const hostIds = Array.from(new Set((data || []).map(s => (s as any).host_id).filter(Boolean)));
        if (hostIds.length > 0) {
          const { data: profiles } = await supabase
            .from("profiles")
            .select("id, full_name")
            .in("id", hostIds);
          
          if (profiles) {
            const nameMap = new Map(profiles.map(p => [p.id, p.full_name]));
            const experiencesWithNames = (data || []).map(s => ({
              ...s,
              host_name: nameMap.get((s as any).host_id)
            }));
            setExperiences(experiencesWithNames as any);
          } else {
            setExperiences(data || []);
          }
        } else {
          setExperiences(data || []);
        }
      } catch (error) {
        console.error("Error fetching experiences:", error);
        toast({
          title: "Error",
          description: "Failed to load experiences. Please try again.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchExperiences();
  }, [toast]);

  return (
    <div className="min-h-screen flex flex-col">
      <Marquee />
      <Header />

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary/10 to-accent/5 py-16">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center mb-8"
          >
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
              Unique Indian Experiences
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Immerse yourself in local culture and traditions
            </p>
          </motion.div>
          <SearchBar defaultCategory="experiences" />
        </div>
      </section>

      {/* Listings Section */}
      <section className="container mx-auto px-4 py-16 flex-grow">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6">
            {[...Array(12)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="bg-muted rounded-2xl aspect-square mb-3" />
                <div className="h-4 bg-muted rounded mb-2" />
                <div className="h-3 bg-muted rounded w-2/3" />
              </div>
            ))}
          </div>
        ) : experiences.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-muted-foreground text-lg">No experiences available at the moment.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6">
            {experiences.map((experience, index) => (
              <ListingCard
                key={experience.id}
                id={experience.id}
                image={resolveListingCardImage(experience.images, "experience")}
                title={experience.title}
                location={experience.location}
                price={`${experience.currency === 'INR' ? '₹' : '$'}${experience.price_per_person.toLocaleString()}`}
                rating={Number(experience.rating)}
                type="experience"
                delay={index * 0.05}
                hostName={(experience as any).host_name}
              />
            ))}
          </div>
        )}
      </section>

      <Footer />
    </div>
  );
};

export default Experiences;
