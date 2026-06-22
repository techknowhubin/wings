import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Marquee from "@/components/Marquee";
import SEOHead from "@/components/SEOHead";
import ListingCard from "@/components/ListingCard";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { resolveListingCardImage } from "@/lib/listing-images";
import { useLocation } from "react-router-dom";
import CabFareSection from "@/components/CabFareSection";

type ServiceType = "stays" | "hotels" | "resorts" | "cars" | "bikes" | "experiences" | "outstation-cabs" | "airport-cabs";

interface SEOLandingProps {
  type: ServiceType;
  city: string;
  title: string;
}

const SEOLandingPage = ({ type, city, title }: SEOLandingProps) => {
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  const formattedCity = city.charAt(0).toUpperCase() + city.slice(1);
  const isCabs = type === "outstation-cabs" || type === "airport-cabs";

  useEffect(() => {
    const fetchListings = async () => {
      if (isCabs) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const table = type;
        const { data } = await (supabase as any)
          .from(table)
          .select("*")
          .eq("availability_status", true)
          .eq("marketplace_visible", true)
          .eq("approval_status", "approved")
          .ilike("location", `%${city}%`)
          .limit(12);

        setListings(data || []);
      } catch (error) {
        console.error("Error fetching SEO listings:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchListings();
  }, [type, city, isCabs]);

  const renderListings = () => {
    if (loading) {
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="bg-muted rounded-2xl aspect-square mb-3" />
              <div className="h-4 bg-muted rounded mb-2" />
              <div className="h-3 bg-muted rounded w-2/3" />
            </div>
          ))}
        </div>
      );
    }

    if (isCabs) {
      return <CabFareSection />;
    }

    if (listings.length === 0) {
      return (
        <div className="text-center py-20 bg-muted/30 rounded-2xl border border-border">
          <p className="text-muted-foreground text-lg mb-2">No {type} found in {formattedCity} currently.</p>
          <p className="text-sm text-muted-foreground">Please check back later or explore other destinations.</p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {listings.map((listing, index) => {
          // Normalize price field
          let price = 0;
          let unit = "";
          if (type === "cars" || type === "bikes") {
            price = listing.price_per_day;
            unit = "/day";
          } else if (type === "experiences") {
            price = listing.price_per_person;
            unit = "/person";
          } else {
            price = listing.price_per_night;
            unit = "/night";
          }

          const typeMapping: any = {
            stays: "stay",
            hotels: "hotel",
            resorts: "resort",
            cars: "car",
            bikes: "bike",
            experiences: "experience"
          };

          return (
            <ListingCard
              key={listing.id}
              id={listing.id}
              image={resolveListingCardImage(listing.images, typeMapping[type])}
              title={listing.title}
              location={listing.location}
              price={`${listing.currency === 'INR' ? '₹' : '$'}${price.toLocaleString()}${unit}`}
              rating={Number(listing.rating)}
              type={typeMapping[type]}
              delay={index * 0.05}
            />
          );
        })}
      </div>
    );
  };

  return (
    <div className="min-h-screen flex flex-col">
      <SEOHead 
        title={title} 
        description={`Book the best ${title.toLowerCase()} on Xplorwing. Trusted hosts, great prices, and instant booking.`}
        canonicalPath={location.pathname}
        breadcrumbs={[
          { name: "Home", url: "/" },
          { name: formattedCity, url: `/destinations/${city.toLowerCase()}` },
          { name: title, url: location.pathname }
        ]}
      />
      <Marquee />
      <Header />

      <section className="bg-gradient-to-br from-primary/10 via-accent/5 to-primary/5 py-20">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center max-w-3xl mx-auto"
          >
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
              {title}
            </h1>
            <p className="text-lg text-muted-foreground">
              Explore our handpicked selection of top-rated services in {formattedCity}.
            </p>
          </motion.div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-16 flex-grow">
        {renderListings()}
      </section>

      <Footer />
    </div>
  );
};

export default SEOLandingPage;
