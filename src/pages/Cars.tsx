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

interface Car {
  id: string;
  title: string;
  location: string;
  price_per_day: number;
  currency: string;
  rating: number;
  images: string[];
  host_name?: string;
}

const Cars = () => {
  const [cars, setCars] = useState<Car[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchCars = async () => {
      try {
        const { data, error } = await supabase
          .from("cars")
          .select("id, title, location, price_per_day, currency, rating, images, host_id")
          .eq("availability_status", true)
          .eq("marketplace_visible", true)
          .order("featured", { ascending: false })
          .order("created_at", { ascending: false })
          .limit(4);

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
            const carsWithNames = (data || []).map(s => ({
              ...s,
              host_name: nameMap.get((s as any).host_id)
            }));
            setCars(carsWithNames as any);
          } else {
            setCars(data || []);
          }
        } else {
          setCars(data || []);
        }
      } catch (error) {
        console.error("Error fetching cars:", error);
        toast({
          title: "Error",
          description: "Failed to load cars. Please try again.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchCars();
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
              Rent a Car for Your Adventure
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Drive through India with comfort and freedom
            </p>
          </motion.div>
          <SearchBar defaultCategory="cars" />
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
        ) : cars.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-muted-foreground text-lg">No cars available at the moment.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6">
            {cars.map((car, index) => (
              <ListingCard
                key={car.id}
                id={car.id}
                image={resolveListingCardImage(car.images, "car")}
                title={car.title}
                location={car.location}
                price={`${car.currency === 'INR' ? '₹' : '$'}${car.price_per_day.toLocaleString()}`}
                rating={Number(car.rating)}
                type="car"
                delay={index * 0.05}
                hostName={(car as any).host_name}
              />
            ))}
          </div>
        )}
      </section>

      <Footer />
    </div>
  );
};

export default Cars;
