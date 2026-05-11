import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import ListingCard from "@/components/ListingCard";
import hondaCityImage from "@/assets/vehicles/honda-city.jpg";
import royalEnfieldImage from "@/assets/vehicles/royal-enfield-classic.jpg";

interface VehicleSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  vehicleType: "car" | "bike" | null;
  location: string;
}

const VehicleSelectionModal = ({ isOpen, onClose, vehicleType, location }: VehicleSelectionModalProps) => {
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVehicles = async () => {
      if (!isOpen || !vehicleType) return;
      
      setLoading(true);
      try {
        const table = vehicleType === 'car' ? 'cars' : 'bikes';
        let query = supabase
          .from(table)
          .select("*")
          .eq("availability_status", true)
          .limit(8);
          
        if (location) {
          query = query.ilike("location", `%${location}%`);
        }

        const { data, error } = await query;
        if (error) throw error;
        
        // If exact location search turned up empty, fallback to 8 random vehicles
        if (!data || data.length === 0) {
           const { data: fallbackData } = await supabase.from(table).select("*").eq("availability_status", true).limit(8);
           setVehicles(fallbackData || []);
        } else {
           setVehicles(data || []);
        }

      } catch (err) {
        console.error(`Error fetching ${vehicleType}s:`, err);
      } finally {
        setLoading(false);
      }
    };

    fetchVehicles();
  }, [isOpen, vehicleType, location]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[95vw] w-[1100px] max-h-[90vh] overflow-y-auto rounded-[2rem] p-6 sm:p-10 border-border shadow-soft bg-white/95 dark:bg-card/95 backdrop-blur-xl">
        <DialogHeader className="mb-6">
          <DialogTitle className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
            Available {vehicleType === 'car' ? 'Cars' : 'Bikes'} {location ? `near ${location}` : ''}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
          </div>
        ) : vehicles.length === 0 ? (
          <div className="text-center py-20">
            <h3 className="text-xl font-semibold text-foreground mb-2">No {vehicleType}s found</h3>
            <p className="text-muted-foreground">We couldn't find any {vehicleType}s right now.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 pb-6">
            {vehicles.map((v, i) => {
               const fallback = vehicleType === 'car' ? hondaCityImage : royalEnfieldImage;
               const image = v.images?.[0]?.startsWith('http') ? v.images[0] : fallback;
               const pricePrefix = v.currency === 'INR' ? '₹' : (v.currency || '$');
               
               return (
                 <ListingCard 
                   key={v.id}
                   id={v.id}
                   type={vehicleType as "car" | "bike"}
                   image={image}
                   title={v.title}
                   location={v.location}
                   price={`${pricePrefix}${v.price_per_day}`}
                   rating={Number(v.rating) || 0}
                   delay={i * 0.05}
                 />
               );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default VehicleSelectionModal;
