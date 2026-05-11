import { useParams } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Marquee from "@/components/Marquee";
import { Link } from "react-router-dom";
import { ChevronRight, Star, MapPin, Heart, Share2, Users, Fuel, Shield, Map, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import VehicleBookingPanel from "@/components/vehicle-detail/VehicleBookingPanel";
import StayImageGallery from "@/components/stay-detail/StayImageGallery";
import StaySelectionModal from "@/components/vehicle-detail/StaySelectionModal";
import hondaCityImage from "@/assets/vehicles/honda-city.jpg";
import manaliImage from "@/assets/stays/manali-mountain-homestay.jpg";
import { parseListingDiscountConfig } from "@/lib/discounts";

const CarDetail = () => {
  const { id } = useParams();
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [car, setCar] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isStayModalOpen, setIsStayModalOpen] = useState(false);

  const [crossSells, setCrossSells] = useState<any[]>([]);

  useEffect(() => {
    const fetchCar = async () => {
      if (!id) return;
      try {
        const { data, error } = await supabase
          .from("cars")
          .select("*")
          .eq("id", id)
          .single();
          
        if (error) throw error;
        setCar(data);
      } catch (err) {
        console.error("Error fetching car:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchCar();
  }, [id]);

  useEffect(() => {
    const fetchCrossSells = async () => {
      if (!car?.location) return;
      try {
        const fetchOne = async (tableName: string, typeName: string, badgeName: string) => {
          const { data } = await supabase.from(tableName).select("*").ilike("location", `%${car.location}%`).limit(1);
          if (data && data.length > 0) {
            return { ...data[0], _uiType: typeName, _badge: badgeName };
          }
          return null;
        };

        const [homestay, hotel, resort] = await Promise.all([
          fetchOne("stays", "stay", "Homestay"),
          fetchOne("hotels", "hotel", "Hotel"),
          fetchOne("resorts", "resort", "Resort")
        ]);

        const valid = [homestay, hotel, resort].filter(Boolean);
        setCrossSells(valid);
      } catch (err) {
        console.error("Error fetching cross sells:", err);
      }
    };
    fetchCrossSells();
  }, [car?.location]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Marquee />
        <Header />
        <div className="max-w-7xl mx-auto px-4 py-6 flex-grow flex justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
        </div>
        <Footer />
      </div>
    );
  }

  if (!car) {
    return (
      <div className="min-h-screen flex flex-col">
        <Marquee />
        <Header />
        <div className="max-w-7xl mx-auto px-4 py-6 flex-grow flex justify-center text-center py-20">
            <div>
              <h2 className="text-2xl font-bold mb-2">Vehicle not found</h2>
              <p className="text-muted-foreground">This car may no longer be available.</p>
            </div>
        </div>
        <Footer />
      </div>
    );
  }

  const primaryImage = car.images?.[0]?.startsWith('http') ? car.images[0] : hondaCityImage;
  const resolvedImages = car.images?.length > 0
    ? car.images.map((img: string) => img.startsWith('http') ? img : (img === car.images[0] ? primaryImage : hondaCityImage))
    : [primaryImage];
    
  const price = car.price_per_day;
  const currencySymbol = car.currency === "INR" ? "₹" : (car.currency || "$");
  const discountConfig = parseListingDiscountConfig(car.discounts);

  const specs = [
    { icon: Users, label: "Capacity", value: `${car.max_guests || 5} Seats` },
    { icon: Fuel, label: "Fuel Type", value: "Petrol/Diesel" },
    { icon: Shield, label: "Insurance", value: "Comprehensive" },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Marquee />
      <Header />

      <div className="max-w-7xl mx-auto px-4 py-6 flex-grow w-full">
        <nav className="flex items-center gap-1.5 text-sm text-muted-foreground mb-6">
          <Link to="/" className="hover:text-foreground transition-colors">Home</Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <Link to="/cars" className="hover:text-foreground transition-colors">Cars</Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="text-foreground font-medium truncate max-w-[200px]">{car.title}</span>
        </nav>

        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
              {car.title}
            </h1>
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant="outline" className="bg-accent/10 text-accent border-accent/30 font-medium">
                Car Rental
              </Badge>
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                {car.location}
              </span>
              <div className="flex items-center gap-1.5">
                <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                <span className="text-sm font-semibold text-foreground">
                  {car.rating ? Number(car.rating).toFixed(1) : "New"}
                </span>
                <span className="text-sm text-muted-foreground">
                  ({car.total_reviews || 0} reviews)
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" className="rounded-full h-10 w-10">
              <Map className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" className="rounded-full h-10 w-10">
              <Share2 className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className={`rounded-full h-10 w-10 ${isWishlisted ? 'bg-destructive/10 border-destructive/30' : ''}`}
              onClick={() => setIsWishlisted(!isWishlisted)}
            >
              <Heart className={`h-4 w-4 ${isWishlisted ? 'fill-destructive text-destructive' : ''}`} />
            </Button>
            <Button variant="outline" size="icon" className="rounded-full h-10 w-10">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <StayImageGallery images={resolvedImages} title={car.title} />

            <section className="pb-8 border-b border-border">
              <h2 className="text-2xl font-semibold text-foreground mb-4">About this vehicle</h2>
              <p className="text-muted-foreground leading-relaxed text-[15px]">
                {car.description || `Explore ${car.location} natively with the reliable ${car.title}. Built for exploring local geography securely and efficiently, this vehicle guarantees peace of mind and comfort throughout your journey.`}
              </p>
            </section>

            <section className="pb-8 border-b border-border">
              <h2 className="text-2xl font-semibold text-foreground mb-6">Specifications</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                {specs.map((spec, index) => {
                  const Icon = spec.icon;
                  return (
                    <div key={index} className="flex gap-4">
                      <Icon className="h-6 w-6 text-accent shrink-0" />
                      <div>
                        <p className="text-sm text-muted-foreground font-medium">{spec.label}</p>
                        <p className="font-semibold text-foreground">{spec.value}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="pb-8 border-b border-border">
              <h2 className="text-2xl font-semibold text-foreground mb-6">Features</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-8">
                {["Manual / Auto Options available", "Air conditioning", "Bluetooth connectivity", "24/7 Roadside support", "Unlimited Kilometers"].map((item, i) => (
                  <div key={i} className="flex items-center gap-3 text-muted-foreground">
                    <div className="h-5 w-5 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
                      <span className="text-accent text-xs">✓</span>
                    </div>
                    <span className="text-[15px]">{item}</span>
                  </div>
                ))}
              </div>
            </section>

            {crossSells.length > 0 && (
              <section className="pb-8 border-border relative">
                <h2 className="text-2xl font-semibold text-foreground mb-6 flex items-center gap-2">Book a stay</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                  {crossSells.map((stay, i) => {
                    const stayImage = stay.images?.[0]?.startsWith('http') ? stay.images[0] : manaliImage;
                    return (
                      <div key={i} className="group flex flex-col">
                        <div className="relative overflow-hidden rounded-2xl mb-3 aspect-square">
                          <img
                            src={stayImage}
                            alt={stay.title}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                          />
                        </div>
                        
                        <div className="space-y-1 mb-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 pr-2">
                              <h3 className="font-semibold text-foreground line-clamp-1">{stay.title}</h3>
                              <p className="text-xs font-medium text-accent uppercase tracking-wider">{stay._badge}</p>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <Star className="h-4 w-4 fill-primary-text text-primary-text" />
                              <span className="text-sm font-medium">{Number(stay.rating).toFixed(1)}</span>
                            </div>
                          </div>
                          <p className="text-sm mt-1">
                            <span className="font-semibold text-foreground">{currencySymbol}{stay.price_per_night}</span>
                            <span className="text-muted-foreground">/night</span>
                          </p>
                        </div>

                        <div className="flex flex-col gap-2 mt-auto">
                          <Button variant="outline" size="sm" className="w-full font-medium" onClick={() => setIsStayModalOpen(true)}>
                            Choose other stay
                          </Button>
                          <Button size="sm" className="w-full font-medium bg-primary hover:bg-primary/90 text-primary-foreground">
                            Add to Reserve
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </section>
            )}
              
              <StaySelectionModal 
                isOpen={isStayModalOpen}
                onClose={() => setIsStayModalOpen(false)}
                location={car.location}
              />
            </div>

          <div className="lg:col-span-1">
            <VehicleBookingPanel
              pricePerDay={price}
              title={car.title}
              currencySymbol={currencySymbol}
              requirements="Valid driving license, ID proof, refundable deposit"
              imageUrl={resolvedImages[0]}
              hostId={car.host_id}
              listingCouponType="cars"
              hostDiscountPercent={discountConfig.hostDiscountPercent}
              availableCoupons={discountConfig.coupons}
            />
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default CarDetail;
