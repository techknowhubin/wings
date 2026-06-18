import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Marquee from "@/components/Marquee";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { TourPackage } from "@/types/tour-packages";
import SearchBar from "@/components/SearchBar";

const TourPackages = () => {
  const [packages, setPackages] = useState<TourPackage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPackages();
  }, []);

  const fetchPackages = async () => {
    // Fetch all published assignments and expand their associated packages
    const { data, error } = await supabase
      .from('package_assignments')
      .select(`
        status,
        tour_packages (*)
      `)
      .eq('status', 'published');

    if (!error && data) {
      // Deduplicate packages in case multiple hubs published the same package
      const uniquePackagesMap = new Map();
      data.forEach((assignment: any) => {
        if (assignment.tour_packages) {
          uniquePackagesMap.set(assignment.tour_packages.id, assignment.tour_packages);
        }
      });
      
      const pkgs = Array.from(uniquePackagesMap.values()).sort(
        (a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      
      setPackages(pkgs as TourPackage[]);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Marquee />
      <Header />

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

      <section className="container mx-auto px-4 py-16 flex-grow">
        {loading ? (
          <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
        ) : packages.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-muted-foreground text-lg">No group experiences available at the moment.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {packages.map((pkg, index) => (
              <motion.div 
                key={pkg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-card rounded-2xl border border-border overflow-hidden flex flex-col"
              >
                <div className="aspect-[4/3] bg-muted relative">
                  {pkg.cover_image ? (
                    <img src={pkg.cover_image} alt={pkg.name} className="object-cover w-full h-full" />
                  ) : (
                    <div className="flex items-center justify-center w-full h-full text-muted-foreground">No Image</div>
                  )}
                  <div className="absolute top-2 left-2 bg-background/80 backdrop-blur-md px-2 py-1 rounded text-xs font-semibold">
                    {pkg.category}
                  </div>
                </div>
                <div className="p-4 flex flex-col flex-grow">
                  <h3 className="font-semibold text-lg line-clamp-1">{pkg.name}</h3>
                  <p className="text-muted-foreground text-sm mb-2">{pkg.destination} • {pkg.duration}</p>
                  <p className="text-sm font-medium mt-auto">Starts at ₹{pkg.adult_price}</p>
                  
                  <Link to={`/experiences/${pkg.id}`} className="mt-4 bg-primary text-primary-foreground text-center py-2 rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors">
                    View Details
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </section>

      <Footer />
    </div>
  );
};

export default TourPackages;
