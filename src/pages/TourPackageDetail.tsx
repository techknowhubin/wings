import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, MapPin, Calendar, Users, Clock, Check, X as XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TourPackage } from "@/types/tour-packages";

export default function TourPackageDetail() {
  const { id } = useParams();
  const [pkg, setPkg] = useState<TourPackage | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPackage = async () => {
      if (!id) return;
      const { data, error } = await supabase
        .from('tour_packages')
        .select('*')
        .eq('id', id)
        .single();
        
      if (!error && data) {
        setPkg(data as TourPackage);
      }
      setLoading(false);
    };
    
    fetchPackage();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
        <Footer />
      </div>
    );
  }

  if (!pkg) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-xl text-muted-foreground">Package not found</p>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      {/* Hero Banner */}
      <div className="relative h-[40vh] md:h-[60vh] bg-muted">
        {pkg.cover_image ? (
          <img src={pkg.cover_image} alt={pkg.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">No Cover Image</div>
        )}
        <div className="absolute inset-0 bg-black/40" />
        <div className="absolute inset-0 flex items-center">
          <div className="container mx-auto px-4">
            <span className="bg-primary/90 text-primary-foreground px-3 py-1 rounded-full text-sm font-semibold mb-4 inline-block">
              {pkg.category}
            </span>
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-4">{pkg.name}</h1>
            <div className="flex flex-wrap gap-4 text-white/90">
              <div className="flex items-center gap-2"><MapPin className="h-5 w-5" /> {pkg.destination}</div>
              <div className="flex items-center gap-2"><Clock className="h-5 w-5" /> {pkg.duration}</div>
              <div className="flex items-center gap-2"><Calendar className="h-5 w-5" /> {pkg.start_date}</div>
              <div className="flex items-center gap-2"><Users className="h-5 w-5" /> Max {pkg.max_capacity} Seats</div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12 flex-1">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-12">
            <section>
              <h2 className="text-2xl font-bold mb-4">Overview</h2>
              <p className="text-muted-foreground leading-relaxed">
                Experience the best of {pkg.destination} with our carefully curated {pkg.duration} itinerary. 
                Departing from {pkg.departure_city}, this {pkg.category.toLowerCase()} offers an unforgettable journey.
              </p>
            </section>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <section>
                <h2 className="text-xl font-bold mb-4">Inclusions</h2>
                <ul className="space-y-3">
                  {pkg.inclusions.map((inc, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <Check className="h-5 w-5 text-green-500 shrink-0" />
                      <span>{inc}</span>
                    </li>
                  ))}
                  {pkg.inclusions.length === 0 && <p className="text-muted-foreground">Not specified</p>}
                </ul>
              </section>
              
              <section>
                <h2 className="text-xl font-bold mb-4">Exclusions</h2>
                <ul className="space-y-3">
                  {pkg.exclusions.map((exc, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <XIcon className="h-5 w-5 text-red-500 shrink-0" />
                      <span>{exc}</span>
                    </li>
                  ))}
                  {pkg.exclusions.length === 0 && <p className="text-muted-foreground">Not specified</p>}
                </ul>
              </section>
            </div>
          </div>

          {/* Sidebar / Booking Card */}
          <div className="lg:col-span-1">
            <div className="bg-card border border-border rounded-2xl p-6 sticky top-24 shadow-sm">
              <h3 className="text-2xl font-bold mb-2">₹{pkg.adult_price} <span className="text-sm font-normal text-muted-foreground">/ adult</span></h3>
              
              <div className="space-y-4 my-6">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Child Price</span>
                  <span className="font-medium">₹{pkg.child_price || '-'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Single Sharing</span>
                  <span className="font-medium">₹{pkg.single_sharing_price || '-'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Twin Sharing</span>
                  <span className="font-medium">₹{pkg.twin_sharing_price || '-'}</span>
                </div>
              </div>

              <Button className="w-full h-12 text-base rounded-xl" asChild>
                <Link to={`/experiences/${pkg.id}/book`}>Book Now</Link>
              </Button>
              
              <p className="text-center text-xs text-muted-foreground mt-4">
                You won't be charged yet
              </p>
            </div>
          </div>
          
        </div>
      </div>

      <Footer />
    </div>
  );
}
