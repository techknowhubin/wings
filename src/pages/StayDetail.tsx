import { useParams } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Marquee from "@/components/Marquee";
import { Star, MapPin, Wifi, Car, Check, Shield, X, Users, BedDouble, Bath, Tv, Coffee, Wind, Utensils, Snowflake, Dumbbell, ParkingCircle, Camera, Heart, Share2, MoreHorizontal, Map, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import StayBreadcrumb from "@/components/stay-detail/StayBreadcrumb";
import StayImageGallery from "@/components/stay-detail/StayImageGallery";
import VehicleSelectionModal from "@/components/stay-detail/VehicleSelectionModal";
import StayFeatureHighlights from "@/components/stay-detail/StayFeatureHighlights";
import StayBookingPanel from "@/components/stay-detail/StayBookingPanel";
import { parseListingDiscountConfig } from "@/lib/discounts";
import { parseRichAmenities, getAmenityNames } from "@/lib/listing-helpers";
import manaliImage from "@/assets/stays/manali-mountain-homestay.jpg";
import goaImage from "@/assets/stays/goa-beach-villa.jpg";
import jaipurImage from "@/assets/stays/jaipur-heritage-haveli.jpg";
import munnarImage from "@/assets/stays/munnar-tea-cottage.jpg";
import udaipurImage from "@/assets/stays/udaipur-lakeside-palace.jpg";
import kasolImage from "@/assets/stays/kasol-valley-home.jpg";
import royalEnfieldImage from "@/assets/vehicles/royal-enfield-classic.jpg";
import hondaCityImage from "@/assets/vehicles/honda-city.jpg";

const imageMap: Record<string, string> = {
  "manali-mountain-homestay.jpg": manaliImage,
  "goa-beach-villa.jpg": goaImage,
  "jaipur-heritage-haveli.jpg": jaipurImage,
  "munnar-tea-cottage.jpg": munnarImage,
  "udaipur-lakeside-palace.jpg": udaipurImage,
  "kasol-valley-home.jpg": kasolImage,
};

const getAmenityIcon = (amenity: string): LucideIcon => {
  const amenityLower = amenity.toLowerCase();
  if (amenityLower.includes('wifi') || amenityLower.includes('internet')) return Wifi;
  if (amenityLower.includes('tv') || amenityLower.includes('television')) return Tv;
  if (amenityLower.includes('coffee') || amenityLower.includes('kitchen')) return Coffee;
  if (amenityLower.includes('air') || amenityLower.includes('ac')) return Wind;
  if (amenityLower.includes('breakfast') || amenityLower.includes('meal')) return Utensils;
  if (amenityLower.includes('refrigerator') || amenityLower.includes('fridge')) return Snowflake;
  if (amenityLower.includes('gym') || amenityLower.includes('fitness')) return Dumbbell;
  if (amenityLower.includes('parking')) return ParkingCircle;
  if (amenityLower.includes('security') || amenityLower.includes('camera')) return Camera;
  return Wifi;
};

interface Stay {
  id: string;
  host_id?: string;
  title: string;
  description: string;
  location: string;
  price_per_night: number;
  currency: string;
  rating: number;
  total_reviews: number;
  max_guests: number;
  bedrooms: number;
  bathrooms: number;
  property_type: string;
  check_in_time: string;
  check_out_time: string;
  cancellation_policy: string;
  amenities: any;
  images: string[];
}

interface StayDetailProps {
  tableType?: "stays" | "hotels" | "resorts";
}

const StayDetail = ({ tableType = "stays" }: StayDetailProps) => {
  const { id } = useParams();
  const [stay, setStay] = useState<Stay | null>(null);
  const [loading, setLoading] = useState(true);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [modalVehicleType, setModalVehicleType] = useState<"car" | "bike" | null>(null);
  const [hostProfile, setHostProfile] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    const fetchStay = async () => {
      if (!id) return;

      try {
        const { data, error } = await supabase
          .from(tableType)
          .select("*")
          .eq("id", id)
          .single();
        if (error) throw error;
        setStay(data);

        // Fetch host profile
        if (data.host_id) {
          const { data: profileData } = await supabase
            .from("profiles")
            .select("full_name, created_at, bio, profile_image, phone")
            .eq("id", data.host_id)
            .single();
          if (profileData) setHostProfile(profileData);
        }
      } catch (error) {
        console.error("Error fetching stay:", error);
        toast({ title: "Error", description: "Failed to load homestay details.", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };
    fetchStay();
  }, [id, toast, tableType]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Marquee />
        <Header />
        <div className="container mx-auto px-4 py-8 flex-grow flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!stay) {
    return (
      <div className="min-h-screen flex flex-col">
        <Marquee />
        <Header />
        <div className="container mx-auto px-4 py-8 flex-grow flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-foreground mb-2">Homestay Not Found</h2>
            <p className="text-muted-foreground">The homestay you're looking for doesn't exist.</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const richAmenities = parseRichAmenities(stay.amenities);
  const amenitiesList = getAmenityNames(stay.amenities);
  const resolvedImages = stay.images?.length > 0
    ? stay.images.map((img: string) => img.startsWith('http') ? img : (imageMap[img] || manaliImage))
    : [manaliImage];
  const resolvedRoomImages = (richAmenities.roomImages ?? [])
    .filter(img => img.startsWith('http'));
  const currencySymbol = stay.currency === 'INR' ? '₹' : '$';
  const discountConfig = parseListingDiscountConfig(stay.discounts);

  const hostName = richAmenities.hostInfo?.name || hostProfile?.full_name || "Host Name";
  const hostPhoto = richAmenities.hostInfo?.photo || hostProfile?.profile_image || "";
  const hostBio = richAmenities.hostInfo?.description || hostProfile?.bio || "";
  const isSuperhost = richAmenities.hostInfo?.isSuperhost || hostProfile?.is_superhost || false;

  const isHotel = tableType === "hotels";
  const isResort = tableType === "resorts";
  
  let categoryName = "Homestays";
  let categoryLink = "/stays";
  let listingCouponType: "stays" | "hotels" | "resorts" = "stays";
  
  if (isHotel) {
    categoryName = "Hotels";
    categoryLink = "/hotels";
    listingCouponType = "hotels";
  } else if (isResort) {
    categoryName = "Resorts";
    categoryLink = "/resorts";
    listingCouponType = "resorts";
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Marquee />
      <Header />

      <div className="max-w-7xl mx-auto px-4 py-6 flex-grow">
        {/* Breadcrumb */}
        <StayBreadcrumb title={stay.title} categoryName={categoryName} categoryLink={categoryLink} />

        {/* Title & Meta */}
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
              {stay.title}
            </h1>
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant="outline" className="bg-accent/10 text-accent border-accent/30 font-medium">
                {stay.property_type || "Homestay"}
              </Badge>
              {richAmenities.propertyCategory && (
                <Badge variant="secondary" className="bg-[#D4E034] text-black border-none font-medium">
                  {richAmenities.propertyCategory}
                </Badge>
              )}
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                {stay.location}
              </span>
              <div className="flex items-center gap-1.5">
                <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                <span className="text-sm font-semibold text-foreground">{stay.rating}</span>
                <span className="text-sm text-muted-foreground">({stay.total_reviews} reviews)</span>
              </div>
            </div>
          </div>
          {/* Action Buttons */}
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

        {/* Image Gallery */}
        <StayImageGallery images={resolvedImages} title={stay.title} />

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-8">
            {/* Property Specs */}
            <div className="pb-8 border-b border-border">
              <h2 className="text-xl font-semibold text-foreground mb-2">
                Entire {stay.property_type || "Homestay"} Details
              </h2>
              {richAmenities.shortDescription && (
                <p className="text-muted-foreground text-sm mb-4">{richAmenities.shortDescription}</p>
              )}
              <div className="flex flex-wrap items-center gap-6 text-sm text-muted-foreground">
                <span className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  {stay.max_guests} Guests
                </span>
                <span className="flex items-center gap-2">
                  <BedDouble className="h-4 w-4" />
                  {stay.bedrooms} {stay.bedrooms === 1 ? "Bedroom" : "Bedrooms"}
                </span>
                {richAmenities.beds && (
                  <span className="flex items-center gap-2">
                    <BedDouble className="h-4 w-4" />
                    {richAmenities.beds} {richAmenities.beds === 1 ? "Bed" : "Beds"}
                  </span>
                )}
                <span className="flex items-center gap-2">
                  <Bath className="h-4 w-4" />
                  {stay.bathrooms} Private {stay.bathrooms === 1 ? "bath" : "baths"}
                </span>
                {richAmenities.propertySize && (
                  <span className="flex items-center gap-2">
                    <Map className="h-4 w-4" />
                    {richAmenities.propertySize}
                  </span>
                )}
              </div>
              {(richAmenities.city || richAmenities.state || richAmenities.fullAddress) && (
                <div className="mt-3 text-sm text-muted-foreground flex items-start gap-1.5">
                  <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>
                    {[richAmenities.fullAddress, richAmenities.city, richAmenities.state].filter(Boolean).join(', ')}
                  </span>
                </div>
              )}
            </div>

            {/* Host Info */}
            <div className="pb-8 border-b border-border">
              <p className="text-sm text-muted-foreground mb-2">Hosted by:</p>
              <div className="flex items-center gap-3">
                {hostPhoto ? (
                  <img
                    src={hostPhoto}
                    alt={hostName}
                    className="w-12 h-12 rounded-full object-cover border border-border"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center text-accent font-bold text-lg">
                    {(hostName)[0].toUpperCase()}
                  </div>
                )}
                <div>
                  <h4 className="font-semibold text-foreground flex items-center gap-1.5">
                    {hostName}
                    {isSuperhost && (
                      <Badge variant="outline" className="text-[10px] bg-amber-400/10 text-amber-400 border-amber-400/20 py-0 px-1 font-normal">Superhost</Badge>
                    )}
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    Joined in{" "}
                    {hostProfile?.created_at
                      ? new Date(hostProfile.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" })
                      : "June 2026"}
                  </p>
                </div>
              </div>
            </div>

            {/* Feature Highlights */}
            <StayFeatureHighlights cancellationPolicy={stay.cancellation_policy} />

            {/* Room Description */}
            <div className="pb-8 border-b border-border">
              <Badge className="bg-accent text-accent-foreground mb-4">Room Description</Badge>
              <p className="text-foreground leading-relaxed mb-3">
                {stay.description}
              </p>
              <button className="text-sm font-semibold text-accent hover:underline">
                Read More
              </button>
            </div>

            {/* Sleeping Arrangements */}
            <div className="pb-8 border-b border-border">
              <h2 className="text-2xl font-semibold text-foreground mb-6">Where you'll sleep</h2>
              <div className="flex gap-4 overflow-x-auto pb-2">
                {richAmenities.bedroomDetails && richAmenities.bedroomDetails.length > 0
                  ? richAmenities.bedroomDetails.map((room, i) => (
                      <Card key={i} className="min-w-[260px] p-5 border-border shrink-0 bg-secondary/10 flex flex-col justify-between">
                        <div>
                          <BedDouble className="h-8 w-8 text-foreground mb-3" />
                          <h3 className="font-semibold text-foreground mb-1">{room.name || `Bedroom ${i + 1}`}</h3>
                          <p className="text-sm text-muted-foreground">
                            {room.count} {room.bedType} {room.count === 1 ? "bed" : "beds"}
                          </p>
                          {room.sizeSqFt && <p className="text-xs text-muted-foreground mt-1">{room.sizeSqFt} sq ft</p>}
                          {room.bathrooms !== undefined && <p className="text-xs text-muted-foreground">{room.bathrooms} {room.bathrooms === 1 ? "Bathroom" : "Bathrooms"}</p>}
                          {room.occupancyCapacity && <p className="text-xs text-muted-foreground">Up to {room.occupancyCapacity} guests</p>}
                          {room.description && <p className="text-xs text-muted-foreground italic mt-2 border-t border-border pt-2">{room.description}</p>}
                        </div>
                        {room.amenities && room.amenities.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-3 pt-2 border-t border-border">
                            {room.amenities.map((amenity, idx) => (
                              <Badge key={idx} variant="outline" className="text-[9px] px-1 py-0">{amenity}</Badge>
                            ))}
                          </div>
                        )}
                      </Card>
                    ))
                  : Array.from({ length: Math.max(stay.bedrooms || 1, 1) }).map((_, i) => (
                      <Card key={i} className="min-w-[200px] p-6 border-border shrink-0">
                        <BedDouble className="h-8 w-8 text-foreground mb-3" />
                        <h3 className="font-semibold text-foreground mb-1">Bedroom {i + 1}</h3>
                        <p className="text-sm text-muted-foreground">1 queen bed</p>
                      </Card>
                    ))
                }
              </div>
              {/* Room Photos */}
              {resolvedRoomImages.length > 0 && (
                <div className="mt-4 flex gap-3 overflow-x-auto pb-2">
                  {resolvedRoomImages.map((img, i) => (
                    <img key={i} src={img} alt={`Room ${i + 1}`} className="h-32 w-48 rounded-xl object-cover shrink-0 border border-border" />
                  ))}
                </div>
              )}
            </div>

            {/* Amenities */}
            <div className="pb-8 border-b border-border">
              <h2 className="text-2xl font-semibold text-foreground mb-6">What this place offers</h2>
              <div className="grid grid-cols-2 gap-4">
                {amenitiesList.map((amenity: string, index: number) => {
                  const IconComponent = getAmenityIcon(amenity);
                  return (
                    <div key={index} className="flex items-center gap-3 text-foreground">
                      <IconComponent className="h-5 w-5" />
                      <span>{amenity}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Videos & Virtual Tour */}
            {(richAmenities.virtualTourUrl || (richAmenities.videos && richAmenities.videos.length > 0)) && (
              <div className="pb-8 border-b border-border">
                <h2 className="text-2xl font-semibold text-foreground mb-4">Videos & Virtual Tours</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {richAmenities.virtualTourUrl && (
                    <Card className="p-4 border-border bg-secondary/20 flex flex-col justify-between">
                      <div>
                        <h4 className="font-semibold text-foreground mb-1">3D Virtual Tour</h4>
                        <p className="text-xs text-muted-foreground mb-4">Explore the property in a 3D immersive walk-through.</p>
                      </div>
                      <Button asChild className="w-full bg-[#013220] hover:bg-[#013220]/90 text-white">
                        <a href={richAmenities.virtualTourUrl} target="_blank" rel="noreferrer">Launch Virtual Tour</a>
                      </Button>
                    </Card>
                  )}
                  {richAmenities.videos && richAmenities.videos.map((vid, i) => (
                    <Card key={i} className="p-4 border-border bg-secondary/20 flex flex-col justify-between">
                      <div>
                        <h4 className="font-semibold text-foreground mb-1">Video Walkthrough #{i + 1}</h4>
                        <p className="text-xs text-muted-foreground mb-4">Watch a video showcase of the space.</p>
                      </div>
                      <Button asChild variant="outline" className="w-full">
                        <a href={vid} target="_blank" rel="noreferrer">Watch Video</a>
                      </Button>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Room Plans */}
            {richAmenities.roomPlans && (
              <div className="pb-8 border-b border-border">
                <h2 className="text-2xl font-semibold text-foreground mb-4">Available Room Plans</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {richAmenities.roomPlans.roomOnly && (
                    <div className="p-3 rounded-xl border border-border bg-secondary/10 flex items-center gap-2">
                      <Check className="h-4 w-4 text-[#D4E034]" />
                      <span className="text-sm font-medium">Room Only</span>
                    </div>
                  )}
                  {richAmenities.roomPlans.freeBreakfast && (
                    <div className="p-3 rounded-xl border border-border bg-secondary/10 flex items-center gap-2">
                      <Check className="h-4 w-4 text-[#D4E034]" />
                      <span className="text-sm font-medium">Free Breakfast</span>
                    </div>
                  )}
                  {richAmenities.roomPlans.halfBoard && (
                    <div className="p-3 rounded-xl border border-border bg-secondary/10 flex items-center gap-2">
                      <Check className="h-4 w-4 text-[#D4E034]" />
                      <span className="text-sm font-medium">Half Board</span>
                    </div>
                  )}
                  {richAmenities.roomPlans.allInclusive && (
                    <div className="p-3 rounded-xl border border-border bg-secondary/10 flex items-center gap-2">
                      <Check className="h-4 w-4 text-[#D4E034]" />
                      <span className="text-sm font-medium">All Inclusive</span>
                    </div>
                  )}
                  {richAmenities.roomPlans.customPlans?.map((plan, i) => (
                    <div key={i} className="p-3 rounded-xl border border-border bg-secondary/10 flex items-center gap-2">
                      <Check className="h-4 w-4 text-[#D4E034]" />
                      <span className="text-sm font-medium">{plan}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Nearby attractions */}
            {richAmenities.nearbyInfo && (
              <div className="pb-8 border-b border-border">
                <h2 className="text-2xl font-semibold text-foreground mb-4">What's Nearby</h2>
                <div className="grid grid-cols-2 gap-6">
                  {richAmenities.nearbyInfo.restaurants && (
                    <div>
                      <h4 className="font-semibold text-sm text-foreground mb-2">Dining & Cafes</h4>
                      <ul className="space-y-1">
                        {richAmenities.nearbyInfo.restaurants.map((item, idx) => (
                          <li key={idx} className="text-xs text-muted-foreground flex items-center gap-1.5">
                            <span className="h-1.5 w-1.5 rounded-full bg-accent" /> {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {richAmenities.nearbyInfo.attractions && (
                    <div>
                      <h4 className="font-semibold text-sm text-foreground mb-2">Attractions & Sightseeing</h4>
                      <ul className="space-y-1">
                        {richAmenities.nearbyInfo.attractions.map((item, idx) => (
                          <li key={idx} className="text-xs text-muted-foreground flex items-center gap-1.5">
                            <span className="h-1.5 w-1.5 rounded-full bg-accent" /> {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {richAmenities.nearbyInfo.transport && (
                    <div>
                      <h4 className="font-semibold text-sm text-foreground mb-2">Transport Stations</h4>
                      <ul className="space-y-1">
                        {richAmenities.nearbyInfo.transport.map((item, idx) => (
                          <li key={idx} className="text-xs text-muted-foreground flex items-center gap-1.5">
                            <span className="h-1.5 w-1.5 rounded-full bg-accent" /> {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {richAmenities.nearbyInfo.hospitals && (
                    <div>
                      <h4 className="font-semibold text-sm text-foreground mb-2">Hospitals & Medical Care</h4>
                      <ul className="space-y-1">
                        {richAmenities.nearbyInfo.hospitals.map((item, idx) => (
                          <li key={idx} className="text-xs text-muted-foreground flex items-center gap-1.5">
                            <span className="h-1.5 w-1.5 rounded-full bg-accent" /> {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Vehicle Rentals */}
            <div className="pb-8 border-b border-border relative">
              <h2 className="text-2xl font-semibold text-foreground mb-6">Rent a vehicle</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {[
                  { type: "bike" as const, name: "Royal Enfield Classic", rating: 4.8, price: 1200, km: 100, image: royalEnfieldImage },
                  { type: "car" as const, name: "Honda City", rating: 4.9, price: 2500, km: 150, image: hondaCityImage },
                ].map((vehicle, i) => (
                  <div key={i} className="group flex flex-col">
                    <div className="relative overflow-hidden rounded-2xl mb-3 aspect-square">
                      <img
                        src={vehicle.image}
                        alt={vehicle.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                    </div>
                    
                    <div className="space-y-1 mb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 pr-2">
                          <h3 className="font-semibold text-foreground line-clamp-1">{vehicle.name}</h3>
                          <p className="text-sm text-muted-foreground line-clamp-1">{vehicle.km} KM limit · {currencySymbol}15/KM</p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Star className="h-4 w-4 fill-primary-text text-primary-text" />
                          <span className="text-sm font-medium">{vehicle.rating}</span>
                        </div>
                      </div>
                      <p className="text-sm">
                        <span className="font-semibold text-foreground">{currencySymbol}{vehicle.price}</span>
                        <span className="text-muted-foreground">/day</span>
                      </p>
                    </div>

                    <div className="flex flex-col gap-2 mt-auto">
                      <Button variant="outline" size="sm" className="w-full font-medium" onClick={() => setModalVehicleType(vehicle.type)}>
                        Choose other vehicle
                      </Button>
                      <Button size="sm" className="w-full font-medium bg-primary hover:bg-primary/90 text-primary-foreground">
                        Add to Reserve
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              
              <VehicleSelectionModal 
                isOpen={modalVehicleType !== null}
                onClose={() => setModalVehicleType(null)}
                vehicleType={modalVehicleType}
                location={stay.location}
              />
            </div>

            {/* Detailed Ratings */}
            <div className="pb-8 border-b border-border">
              <h2 className="text-2xl font-semibold text-foreground mb-6 flex items-center gap-2">
                <Star className="h-6 w-6 fill-amber-400 text-amber-400" />
                {stay.rating} · {stay.total_reviews} reviews
              </h2>
              <div className="grid grid-cols-2 gap-x-12 gap-y-4">
                {[
                  { name: "Cleanliness", score: 4.9 },
                  { name: "Accuracy", score: 4.8 },
                  { name: "Check-in", score: 5.0 },
                  { name: "Communication", score: 4.9 },
                  { name: "Location", score: 4.7 },
                  { name: "Value", score: 4.8 },
                ].map((rating) => (
                  <div key={rating.name}>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm text-foreground">{rating.name}</span>
                      <span className="text-sm font-semibold text-foreground">{rating.score}</span>
                    </div>
                    <div className="h-1 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-accent" style={{ width: `${(rating.score / 5) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Location Map */}
            <div className="pb-8 border-b border-border">
              <h2 className="text-2xl font-semibold text-foreground mb-4">Where you'll be</h2>
              <p className="text-muted-foreground mb-4">{stay.location}</p>
              {richAmenities.googleMapsUrl ? (
                <a href={richAmenities.googleMapsUrl} target="_blank" rel="noreferrer" className="block group">
                  <div className="aspect-[16/9] bg-muted hover:bg-muted/80 transition-colors rounded-2xl border border-border flex flex-col items-center justify-center gap-2">
                    <MapPin className="h-12 w-12 text-[#D4E034] group-hover:scale-110 transition-transform" />
                    <span className="text-sm font-semibold text-foreground">Open in Google Maps</span>
                    <span className="text-xs text-muted-foreground">Click to view location map</span>
                  </div>
                </a>
              ) : (
                <div className="aspect-[16/9] bg-muted rounded-2xl border border-border flex items-center justify-center">
                  <MapPin className="h-16 w-16 text-muted-foreground" />
                </div>
              )}
            </div>

            {/* Host Profile */}
            <Card className="bg-secondary/30 border-border p-6">
              <div className="flex gap-4 mb-4">
                {hostPhoto ? (
                  <img
                    src={hostPhoto}
                    alt={hostName}
                    className="w-16 h-16 rounded-full object-cover border border-border shrink-0"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-accent/20 flex items-center justify-center text-accent font-bold text-xl shrink-0">
                    {(hostName)[0].toUpperCase()}
                  </div>
                )}
                <div>
                  <h3 className="text-xl font-semibold text-foreground">Hosted by {hostName}</h3>
                  <p className="text-sm text-muted-foreground">
                    Joined in{" "}
                    {hostProfile?.created_at
                      ? new Date(hostProfile.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" })
                      : "June 2026"}
                  </p>
                  {isSuperhost && (
                    <div className="flex items-center gap-2 mt-1">
                      <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                      <span className="text-sm font-semibold">Superhost</span>
                    </div>
                  )}
                </div>
              </div>
              {hostBio && (
                <p className="text-muted-foreground mb-4">{hostBio}</p>
              )}
              <Button variant="outline" className="w-full">Contact host</Button>
            </Card>

            {/* Things to Know */}
            <div>
              <h2 className="text-2xl font-semibold text-foreground mb-6">Things to know</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div>
                  <h3 className="font-semibold text-foreground mb-3">House rules</h3>
                  <ul className="space-y-2">
                    {stay.check_in_time && (
                      <li className="flex items-start gap-2 text-sm text-muted-foreground">
                        <Check className="h-4 w-4 mt-0.5 text-green-500 flex-shrink-0" />
                        Check-in: {stay.check_in_time}
                      </li>
                    )}
                    {stay.check_out_time && (
                      <li className="flex items-start gap-2 text-sm text-muted-foreground">
                        <Check className="h-4 w-4 mt-0.5 text-green-500 flex-shrink-0" />
                        Checkout: {stay.check_out_time}
                      </li>
                    )}
                    
                    {/* Smoking allowed rule */}
                    <li className="flex items-start gap-2 text-sm text-muted-foreground">
                      {richAmenities.policySmokingAllowed ? (
                        <>
                          <Check className="h-4 w-4 mt-0.5 text-green-500 flex-shrink-0" />
                          Smoking allowed
                        </>
                      ) : (
                        <>
                          <X className="h-4 w-4 mt-0.5 text-destructive flex-shrink-0" />
                          No smoking
                        </>
                      )}
                    </li>

                    {/* Pets allowed rule */}
                    <li className="flex items-start gap-2 text-sm text-muted-foreground">
                      {richAmenities.policyPetAllowed ? (
                        <>
                          <Check className="h-4 w-4 mt-0.5 text-green-500 flex-shrink-0" />
                          Pets allowed
                        </>
                      ) : (
                        <>
                          <X className="h-4 w-4 mt-0.5 text-destructive flex-shrink-0" />
                          No pets allowed
                        </>
                      )}
                    </li>

                    {/* Children allowed rule */}
                    <li className="flex items-start gap-2 text-sm text-muted-foreground flex-col">
                      <div className="flex items-start gap-2">
                        {richAmenities.policyChildAllowed ? (
                          <>
                            <Check className="h-4 w-4 mt-0.5 text-green-500 flex-shrink-0" />
                            Children allowed
                          </>
                        ) : (
                          <>
                            <X className="h-4 w-4 mt-0.5 text-destructive flex-shrink-0" />
                            No children allowed
                          </>
                        )}
                      </div>
                      {richAmenities.policyChildDescription && (
                        <span className="text-xs text-muted-foreground italic ml-6 mt-0.5">
                          {richAmenities.policyChildDescription}
                        </span>
                      )}
                    </li>

                    {richAmenities.houseRules && richAmenities.houseRules.split('\n').filter(Boolean).map((rule, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <Check className="h-4 w-4 mt-0.5 text-green-500 flex-shrink-0" />
                        {rule}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-3">Health & safety</h3>
                  <ul className="space-y-2">
                    {richAmenities.healthSafety
                      ? richAmenities.healthSafety.split('\n').filter(Boolean).map((item, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                            <Shield className="h-4 w-4 mt-0.5 flex-shrink-0" />
                            {item}
                          </li>
                        ))
                      : (
                          <>
                            <li className="flex items-start gap-2 text-sm text-muted-foreground">
                              <Shield className="h-4 w-4 mt-0.5 flex-shrink-0" />
                              Smoke alarm installed
                            </li>
                            <li className="flex items-start gap-2 text-sm text-muted-foreground">
                              <Shield className="h-4 w-4 mt-0.5 flex-shrink-0" />
                              First aid kit available
                            </li>
                          </>
                        )
                    }
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-3">Cancellation policy</h3>
                  <p className="text-sm text-muted-foreground capitalize">{stay.cancellation_policy || "Moderate"}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Booking Panel */}
          <div className="lg:col-span-1">
            <StayBookingPanel
              listingId={stay.id}
              pricePerNight={stay.price_per_night}
              currencySymbol={currencySymbol}
              maxGuests={stay.max_guests}
              title={stay.title}
              imageUrl={resolvedImages[0]}
              hostId={stay.host_id}
              listingCouponType={listingCouponType}
              hostDiscountPercent={discountConfig.hostDiscountPercent}
              availableCoupons={discountConfig.coupons}
              weeklyPrice={richAmenities.weeklyPrice}
              monthlyPrice={richAmenities.monthlyPrice}
              cleaningFee={richAmenities.cleaningFee}
              securityDeposit={richAmenities.securityDeposit}
            />
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default StayDetail;
