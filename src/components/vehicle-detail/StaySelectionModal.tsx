import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import manaliImage from "@/assets/stays/manali-mountain-homestay.jpg";

interface StaySelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  location: string;
}

const StaySelectionModal = ({ isOpen, onClose, location }: StaySelectionModalProps) => {
  const [accommodations, setAccommodations] = useState<{ homestays: any[], hotels: any[], resorts: any[] }>({ homestays: [], hotels: [], resorts: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStays = async () => {
      if (!isOpen) return;
      
      setLoading(true);
      try {
        const fetchFromTable = async (tableName: string) => {
          let query = supabase.from(tableName).select("*").limit(8);
          if (location) {
            query = query.ilike("location", `%${location}%`);
          }
          const { data } = await query;
          return data || [];
        };

        const [staysData, hotelsData, resortsData] = await Promise.all([
          fetchFromTable("stays"),
          fetchFromTable("hotels"),
          fetchFromTable("resorts"),
        ]);
        
        setAccommodations({
          homestays: staysData,
          hotels: hotelsData,
          resorts: resortsData
        });

      } catch (err) {
        console.error(`Error fetching stays:`, err);
      } finally {
        setLoading(false);
      }
    };

    fetchStays();
  }, [isOpen, location]);

  const renderSection = (
    title: string,
    items: any[],
    badge: string,
    linkPrefix: string
  ) => {
    if (!items || items.length === 0) return null;

    return (
      <div className="mb-10 last:mb-0">
        <div className="flex items-center gap-3 mb-5">
          <h3 className="text-xl font-bold text-foreground">{title}</h3>
          <span className="text-xs font-bold text-accent uppercase tracking-widest border border-accent/30 bg-accent/5 px-2 py-0.5 rounded-sm">
            {items.length} available
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {items.map((s, i) => {
            const image = s.images?.[0]?.startsWith('http') ? s.images[0] : manaliImage;
            const pricePrefix = s.currency === 'INR' ? '₹' : (s.currency || '$');
            return (
              <div key={s.id} className="group flex flex-col">
                <div className="relative overflow-hidden rounded-2xl mb-3 aspect-square">
                  <img
                    src={image}
                    alt={s.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  <span className="absolute top-2 left-2 text-[10px] font-bold uppercase tracking-widest bg-black/60 text-white px-2 py-0.5 rounded-sm backdrop-blur-sm">
                    {badge}
                  </span>
                </div>
                <div className="space-y-1 mb-3 flex-grow">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 pr-2">
                      <h4 className="font-semibold text-foreground line-clamp-1 text-sm">{s.title}</h4>
                      <p className="text-xs text-muted-foreground line-clamp-1">{s.location}</p>
                    </div>
                    <div className="flex items-center gap-0.5 shrink-0">
                      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                      <span className="text-xs font-semibold">{Number(s.rating).toFixed(1)}</span>
                    </div>
                  </div>
                  <p className="text-sm">
                    <span className="font-semibold text-foreground">{pricePrefix}{s.price_per_night}</span>
                    <span className="text-muted-foreground text-xs">/night</span>
                  </p>
                </div>
                <Link to={`/${linkPrefix}/${s.id}`} onClick={onClose} className="w-full">
                  <Button variant="outline" size="sm" className="w-full font-medium">
                    View {badge}
                  </Button>
                </Link>
              </div>
            );
          })}
        </div>
        <div className="border-b border-border mt-8" />
      </div>
    );
  };

  const isEmpty = accommodations.homestays.length === 0 && accommodations.hotels.length === 0 && accommodations.resorts.length === 0;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[95vw] w-[1100px] max-h-[90vh] overflow-y-auto rounded-[2rem] p-6 sm:p-10 border-border shadow-soft bg-white/95 dark:bg-card/95 backdrop-blur-xl">
        <DialogHeader className="mb-6">
          <DialogTitle className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
            Available Accommodations {location ? `near ${location}` : ''}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
          </div>
        ) : isEmpty ? (
          <div className="text-center py-20">
            <h3 className="text-xl font-semibold text-foreground mb-2">No Accommodations found</h3>
            <p className="text-muted-foreground">We couldn't find any stays, hotels, or resorts near this location right now.</p>
          </div>
        ) : (
          <div className="pb-4">
            {renderSection("Homestays", accommodations.homestays, "Homestay", "stays")}
            {renderSection("Hotels", accommodations.hotels, "Hotel", "hotels")}
            {renderSection("Resorts", accommodations.resorts, "Resort", "resorts")}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default StaySelectionModal;
