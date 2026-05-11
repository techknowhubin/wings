import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Marquee from "@/components/Marquee";
import ListingCard from "@/components/ListingCard";
import ListingListCard from "@/components/ListingListCard";
import ListingsMap, { MapMarker } from "@/components/ListingsMap";
import { motion } from "framer-motion";
import { useEffect, useState, useMemo } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Search, LayoutGrid, List, MapPin, Map } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { destinationCoordinates } from "@/lib/destination-coordinates";
import { useIsMobile } from "@/hooks/use-mobile";

// Demo images for fallback
import manaliImage from "@/assets/stays/manali-mountain-homestay.jpg";
import goaImage from "@/assets/stays/goa-beach-villa.jpg";
import jaipurImage from "@/assets/stays/jaipur-heritage-haveli.jpg";
import munnarImage from "@/assets/stays/munnar-tea-cottage.jpg";
import hondaCity from "@/assets/vehicles/honda-city.jpg";
import royalEnfield from "@/assets/vehicles/royal-enfield-classic.jpg";
import sunriseTrek from "@/assets/demo/sunrise-trek.jpg";

type ServiceType = "stay" | "hotel" | "resort" | "car" | "bike" | "experience";
type ViewMode = "grid" | "list";

interface ServiceListing {
  id: string;
  title: string;
  location: string;
  price: string;
  rating: number;
  image: string;
  type: ServiceType;
  lat?: number;
  lng?: number;
  description?: string;
}

const fallbackImages: Record<ServiceType, string[]> = {
  stay: [manaliImage, goaImage, jaipurImage, munnarImage],
  hotel: [jaipurImage, munnarImage, goaImage],
  resort: [goaImage, manaliImage, jaipurImage],
  car: [hondaCity],
  bike: [royalEnfield],
  experience: [sunriseTrek],
};

function getFallbackImage(type: ServiceType, index: number): string {
  const images = fallbackImages[type];
  return images[index % images.length];
}

const serviceFilters: { type: ServiceType | "all"; label: string }[] = [
  { type: "all", label: "All Services" },
  { type: "stay", label: "Homestays" },
  { type: "hotel", label: "Hotels" },
  { type: "resort", label: "Resorts" },
  { type: "car", label: "Cars" },
  { type: "bike", label: "Bikes" },
  { type: "experience", label: "Experiences" },
];

const DestinationDetail = () => {
  const { name } = useParams<{ name: string }>();
  const destinationName = name ? decodeURIComponent(name).replace(/-/g, " ") : "";
  const displayName = destinationName
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

  const [listings, setListings] = useState<ServiceListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<ServiceType | "all">("all");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [showMap, setShowMap] = useState(true);
  const [mobileShowMap, setMobileShowMap] = useState(false);
  const isMobile = useIsMobile();

  const coords = destinationCoordinates[displayName];

  useEffect(() => {
    const fetchListings = async () => {
      setLoading(true);
      const allListings: ServiceListing[] = [];

      try {
        // Fetch stays
        const { data: stays } = await supabase
          .from("stays")
          .select("id, title, location, price_per_night, currency, rating, images, slug, property_type")
          .eq("availability_status", true)
          .eq("marketplace_visible", true)
          .ilike("location", `%${displayName}%`);

        stays?.forEach((s, i) => {
          allListings.push({
            id: s.id,
            title: s.title,
            location: s.location,
            price: `${s.currency === "INR" ? "₹" : "$"}${s.price_per_night.toLocaleString()}/night`,
            rating: Number(s.rating),
            image: s.images?.[0]?.startsWith('http') ? s.images[0] : getFallbackImage("stay", i),
            type: "stay",
            lat: coords?.lat ? coords.lat + (Math.random() - 0.5) * 0.05 : undefined,
            lng: coords?.lng ? coords.lng + (Math.random() - 0.5) * 0.05 : undefined,
          });
        });

        // Fetch hotels
        const { data: hotels } = await supabase
          .from("hotels")
          .select("id, title, location, price_per_night, currency, rating, images, slug, property_type")
          .eq("availability_status", true)
          .eq("marketplace_visible", true)
          .ilike("location", `%${displayName}%`);

        hotels?.forEach((h, i) => {
          allListings.push({
            id: h.id,
            title: h.title,
            location: h.location,
            price: `${h.currency === "INR" ? "₹" : "$"}${h.price_per_night.toLocaleString()}/night`,
            rating: Number(h.rating),
            image: h.images?.[0]?.startsWith('http') ? h.images[0] : getFallbackImage("hotel", i),
            type: "hotel",
            lat: coords?.lat ? coords.lat + (Math.random() - 0.5) * 0.05 : undefined,
            lng: coords?.lng ? coords.lng + (Math.random() - 0.5) * 0.05 : undefined,
          });
        });

        // Fetch resorts
        const { data: resorts } = await supabase
          .from("resorts")
          .select("id, title, location, price_per_night, currency, rating, images, slug, property_type")
          .eq("availability_status", true)
          .eq("marketplace_visible", true)
          .ilike("location", `%${displayName}%`);

        resorts?.forEach((r, i) => {
          allListings.push({
            id: r.id,
            title: r.title,
            location: r.location,
            price: `${r.currency === "INR" ? "₹" : "$"}${r.price_per_night.toLocaleString()}/night`,
            rating: Number(r.rating),
            image: r.images?.[0]?.startsWith('http') ? r.images[0] : getFallbackImage("resort", i),
            type: "resort",
            lat: coords?.lat ? coords.lat + (Math.random() - 0.5) * 0.05 : undefined,
            lng: coords?.lng ? coords.lng + (Math.random() - 0.5) * 0.05 : undefined,
          });
        });

        // Fetch cars
        const { data: cars } = await supabase
          .from("cars")
          .select("id, title, location, price_per_day, currency, rating, images, slug")
          .eq("availability_status", true)
          .eq("marketplace_visible", true)
          .ilike("location", `%${displayName}%`);

        cars?.forEach((c, i) => {
          allListings.push({
            id: c.id,
            title: c.title,
            location: c.location,
            price: `${c.currency === "INR" ? "₹" : "$"}${c.price_per_day.toLocaleString()}/day`,
            rating: Number(c.rating),
            image: c.images?.[0]?.startsWith('http') ? c.images[0] : getFallbackImage("car", i),
            type: "car",
            lat: coords?.lat ? coords.lat + (Math.random() - 0.5) * 0.05 : undefined,
            lng: coords?.lng ? coords.lng + (Math.random() - 0.5) * 0.05 : undefined,
          });
        });

        // Fetch bikes
        const { data: bikes } = await supabase
          .from("bikes")
          .select("id, title, location, price_per_day, currency, rating, images, slug")
          .eq("availability_status", true)
          .eq("marketplace_visible", true)
          .ilike("location", `%${displayName}%`);

        bikes?.forEach((b, i) => {
          allListings.push({
            id: b.id,
            title: b.title,
            location: b.location,
            price: `${b.currency === "INR" ? "₹" : "$"}${b.price_per_day.toLocaleString()}/day`,
            rating: Number(b.rating),
            image: b.images?.[0]?.startsWith('http') ? b.images[0] : getFallbackImage("bike", i),
            type: "bike",
            lat: coords?.lat ? coords.lat + (Math.random() - 0.5) * 0.05 : undefined,
            lng: coords?.lng ? coords.lng + (Math.random() - 0.5) * 0.05 : undefined,
          });
        });

        // Fetch experiences
        const { data: experiences } = await supabase
          .from("experiences")
          .select("id, title, location, price_per_person, currency, rating, images, slug")
          .eq("availability_status", true)
          .eq("marketplace_visible", true)
          .ilike("location", `%${displayName}%`);

        experiences?.forEach((e, i) => {
          allListings.push({
            id: e.id,
            title: e.title,
            location: e.location,
            price: `${e.currency === "INR" ? "₹" : "$"}${e.price_per_person.toLocaleString()}/person`,
            rating: Number(e.rating),
            image: e.images?.[0]?.startsWith('http') ? e.images[0] : getFallbackImage("experience", i),
            type: "experience",
            lat: coords?.lat ? coords.lat + (Math.random() - 0.5) * 0.05 : undefined,
            lng: coords?.lng ? coords.lng + (Math.random() - 0.5) * 0.05 : undefined,
          });
        });
      } catch (error) {
        console.error("Error fetching listings:", error);
      }

      // If no DB results, show demo listings
      if (allListings.length === 0) {
        const demoListings: ServiceListing[] = [
          { id: "demo-1", title: `${displayName} Heritage Stay`, location: displayName, price: "₹1,500/night", rating: 4.7, image: getFallbackImage("stay", 0), type: "stay" },
          { id: "demo-2", title: `${displayName} Lake View Cottage`, location: displayName, price: "₹2,200/night", rating: 4.8, image: getFallbackImage("stay", 1), type: "stay" },
          { id: "demo-3", title: `${displayName} Mountain Retreat`, location: displayName, price: "₹1,800/night", rating: 4.5, image: getFallbackImage("stay", 2), type: "stay" },
          { id: "demo-4", title: `Sedan for ${displayName} Tour`, location: displayName, price: "₹1,200/day", rating: 4.6, image: getFallbackImage("car", 0), type: "car" },
          { id: "demo-5", title: `Royal Enfield in ${displayName}`, location: displayName, price: "₹800/day", rating: 4.9, image: getFallbackImage("bike", 0), type: "bike" },
          { id: "demo-6", title: `Sunrise Trek at ${displayName}`, location: displayName, price: "₹500/person", rating: 4.8, image: getFallbackImage("experience", 0), type: "experience" },
        ];
        // Add coordinates to demo listings
        demoListings.forEach((l) => {
          if (coords) {
            l.lat = coords.lat + (Math.random() - 0.5) * 0.04;
            l.lng = coords.lng + (Math.random() - 0.5) * 0.04;
          }
        });
        setListings(demoListings);
      } else {
        setListings(allListings);
      }

      setLoading(false);
    };

    if (displayName) fetchListings();
  }, [displayName, coords]);

  const filtered = useMemo(() => {
    return listings.filter((l) => {
      const matchesType = activeFilter === "all" || l.type === activeFilter;
      const matchesSearch =
        l.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.location.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesType && matchesSearch;
    });
  }, [listings, activeFilter, searchQuery]);

  const mapMarkers: MapMarker[] = useMemo(() => {
    return filtered
      .filter((l) => l.lat && l.lng)
      .map((l) => ({
        lat: l.lat!,
        lng: l.lng!,
        title: l.title,
        price: l.price,
        type: l.type,
        id: l.id,
      }));
  }, [filtered]);

  return (
    <div className="min-h-screen flex flex-col">
      <Marquee />
      <Header />

      {/* Top bar */}
      <section className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div className="flex items-center gap-2 mb-1">
              <MapPin className="h-5 w-5 text-primary-text" />
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">
                {displayName}
              </h1>
            </div>
            <p className="text-sm text-muted-foreground ml-7">
              {filtered.length} service{filtered.length !== 1 ? "s" : ""} available
            </p>
          </motion.div>

          {/* Controls row */}
          <div className="flex flex-col sm:flex-row gap-3 mt-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search services..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Service type filters */}
              {serviceFilters.map((f) => (
                <button
                  key={f.type}
                  onClick={() => setActiveFilter(f.type)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-300 backdrop-blur-md border ${
                    activeFilter === f.type
                      ? "bg-gradient-to-r from-primary/80 to-accent/80 text-primary-foreground border-primary/30 shadow-lg shadow-primary/20"
                      : "bg-muted/80 text-foreground border-border hover:bg-muted"
                  }`}
                >
                  {f.label}
                </button>
              ))}

              {/* Divider */}
              <div className="w-px h-6 bg-border mx-1 hidden sm:block" />

              {/* View toggles */}
              <div className="flex items-center border border-border rounded-lg overflow-hidden">
                <Button
                  variant={viewMode === "grid" ? "default" : "ghost"}
                  size="sm"
                  className="rounded-none h-8 px-2.5"
                  onClick={() => setViewMode("grid")}
                >
                  <LayoutGrid className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === "list" ? "default" : "ghost"}
                  size="sm"
                  className="rounded-none h-8 px-2.5"
                  onClick={() => setViewMode("list")}
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>

              <Button
                variant={showMap ? "default" : "outline"}
                size="sm"
                className="h-8 gap-1.5 text-xs hidden lg:flex"
                onClick={() => setShowMap(!showMap)}
              >
                <MapPin className="h-3.5 w-3.5" />
                Map
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Main content */}
      <section className="flex-1 relative">
        <div className={`flex h-[calc(100vh-220px)] ${showMap ? "" : "container mx-auto px-4"}`}>
          {/* Listings panel - hidden on mobile when map is shown */}
          <div
            className={`overflow-y-auto p-4 ${
              mobileShowMap && isMobile ? "hidden" : "block"
            } ${
              showMap ? "w-full lg:w-1/2 xl:w-[55%]" : "w-full"
            }`}
          >
            {loading ? (
              <div className={`grid gap-4 ${
                viewMode === "grid"
                  ? showMap
                    ? "grid-cols-2 sm:grid-cols-2"
                    : "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
                  : "grid-cols-1"
              }`}>
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className={`bg-muted rounded-xl ${viewMode === "list" ? "h-[130px]" : "aspect-square"}`} />
                    <div className="h-4 bg-muted rounded mt-2" />
                    <div className="h-3 bg-muted rounded w-2/3 mt-1" />
                  </div>
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-muted-foreground text-lg">
                  No services found in {displayName}.
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Try adjusting your filters.
                </p>
              </div>
            ) : viewMode === "list" ? (
              <div className="flex flex-col gap-3">
                {filtered.map((listing, index) => (
                  <ListingListCard
                    key={listing.id}
                    image={listing.image}
                    title={listing.title}
                    location={listing.location}
                    price={listing.price}
                    rating={listing.rating}
                    type={listing.type}
                    id={listing.id}
                    description={listing.description}
                    delay={index * 0.04}
                  />
                ))}
              </div>
            ) : (
              <div
                className={`grid gap-4 ${
                  showMap
                    ? "grid-cols-2 sm:grid-cols-2"
                    : "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
                }`}
              >
                {filtered.map((listing, index) => (
                  <ListingCard
                    key={listing.id}
                    image={listing.image}
                    title={listing.title}
                    location={listing.location}
                    price={listing.price}
                    rating={listing.rating}
                    type={listing.type}
                    id={listing.id}
                    delay={index * 0.04}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Map panel - desktop: side panel; mobile: full screen when toggled */}
          {showMap && (
            <div className="hidden lg:block lg:w-1/2 xl:w-[45%] sticky top-0 border-l border-border">
              <ListingsMap
                markers={mapMarkers}
                center={coords ? [coords.lat, coords.lng] : undefined}
                zoom={12}
                className="w-full h-full"
              />
            </div>
          )}

          {/* Mobile map - full width when toggled */}
          {mobileShowMap && isMobile && (
            <div className="w-full h-full lg:hidden">
              <ListingsMap
                markers={mapMarkers}
                center={coords ? [coords.lat, coords.lng] : undefined}
                zoom={12}
                className="w-full h-full"
              />
            </div>
          )}
        </div>

        {/* Mobile floating toggle button */}
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[1100] lg:hidden">
          <Button
            onClick={() => setMobileShowMap(!mobileShowMap)}
            className="rounded-full shadow-lg shadow-primary/30 h-12 px-6 gap-2 text-sm font-semibold"
          >
            {mobileShowMap ? (
              <>
                <List className="h-4 w-4" />
                Show List
              </>
            ) : (
              <>
                <Map className="h-4 w-4" />
                Show Map
              </>
            )}
          </Button>
        </div>
      </section>

      {!showMap && !mobileShowMap && <Footer />}
    </div>
  );
};

export default DestinationDetail;
