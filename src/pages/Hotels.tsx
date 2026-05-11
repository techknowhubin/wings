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

interface Hotel {
  id: string;
  title: string;
  location: string;
  price_per_night: number;
  currency: string;
  rating: number;
  images: string[];
  slug?: string;
  property_type?: string;
  host_id?: string;
  host_name?: string;
}

const Hotels = () => {
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchHotels = async () => {
      try {
        // Using "as any" because hotels/resorts are not in the generated Supabase types
        const { data, error } = await (supabase as any)
          .from("hotels")
          .select("id, title, location, price_per_night, currency, rating, images, slug, property_type, host_id")
          .eq("availability_status", true)
          .eq("marketplace_visible", true)
          .order("featured", { ascending: false })
          .order("created_at", { ascending: false })
          .limit(20);

        if (error) throw error;

        const rows: any[] = data || [];

        // Collect host IDs
        const hostIds = Array.from(
          new Set(rows.map((s) => s.host_id).filter(Boolean))
        ) as string[];

        if (hostIds.length > 0) {
          const { data: profiles } = await supabase
            .from("profiles")
            .select("id, full_name")
            .in("id", hostIds);

          if (profiles) {
            const nameMap = new Map(profiles.map((p) => [p.id, p.full_name]));
            const withNames: Hotel[] = rows.map((s) => ({
              ...s,
              host_name: nameMap.get(s.host_id) || undefined,
            }));
            setHotels(withNames);
            return;
          }
        }

        setHotels(rows as Hotel[]);
      } catch (error) {
        console.error("Error fetching hotels:", error);
        toast({
          title: "Error",
          description: "Failed to load hotels. Please try again.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchHotels();
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
              Premium Hotels &amp; Suites
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Luxurious accommodations across India's best destinations
            </p>
          </motion.div>
          <SearchBar defaultCategory="stays" />
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
        ) : hotels.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-muted-foreground text-lg">No hotels available at the moment.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6">
            {hotels.map((hotel, index) => (
              <ListingCard
                key={hotel.id}
                image={resolveListingCardImage(hotel.images, "hotel")}
                title={hotel.title}
                location={hotel.location}
                price={`${hotel.currency === "INR" ? "₹" : "$"}${hotel.price_per_night.toLocaleString()}`}
                rating={Number(hotel.rating)}
                type="hotel"
                id={hotel.id}
                delay={index * 0.05}
                hostName={hotel.host_name}
              />
            ))}
          </div>
        )}
      </section>

      <Footer />
    </div>
  );
};

export default Hotels;
