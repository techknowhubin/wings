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

interface Bike {
  id: string;
  title: string;
  location: string;
  price_per_day: number;
  currency: string;
  rating: number;
  images: string[];
  host_name?: string;
}

const Bikes = () => {
  const [bikes, setBikes] = useState<Bike[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchBikes = async () => {
      try {
        const { data, error } = await supabase
          .from("bikes")
          .select("id, title, location, price_per_day, currency, rating, images, host_id")
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
            const bikesWithNames = (data || []).map(s => ({
              ...s,
              host_name: nameMap.get((s as any).host_id)
            }));
            setBikes(bikesWithNames as any);
          } else {
            setBikes(data || []);
          }
        } else {
          setBikes(data || []);
        }
      } catch (error) {
        console.error("Error fetching bikes:", error);
        toast({
          title: "Error",
          description: "Failed to load bikes. Please try again.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchBikes();
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
              Rent a Bike for Your Journey
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Explore India on two wheels with our diverse bike fleet
            </p>
          </motion.div>
          <SearchBar defaultCategory="bikes" />
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
        ) : bikes.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-muted-foreground text-lg">No bikes available at the moment.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6">
            {bikes.map((bike, index) => (
              <ListingCard
                key={bike.id}
                id={bike.id}
                image={resolveListingCardImage(bike.images, "bike")}
                title={bike.title}
                location={bike.location}
                price={`${bike.currency === 'INR' ? '₹' : '$'}${bike.price_per_day.toLocaleString()}`}
                rating={Number(bike.rating)}
                type="bike"
                delay={index * 0.05}
                hostName={(bike as any).host_name}
              />
            ))}
          </div>
        )}
      </section>

      <Footer />
    </div>
  );
};

export default Bikes;
