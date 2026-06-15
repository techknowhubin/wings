import Header from "@/components/Header";
import BackButton from "@/components/BackButton";
import Footer from "@/components/Footer";
import Marquee from "@/components/Marquee";
import CategoryCard from "@/components/CategoryCard";
import DestinationCard from "@/components/DestinationCard";
import ListingCard from "@/components/ListingCard";
import CustomerTestimonials from "@/components/CustomerTestimonials";
import HomeFAQ from "@/components/HomeFAQ";
import CabFareSection from "@/components/CabFareSection";
import CabDriverCTA from "@/components/CabDriverCTA";
import OffersSection from "@/components/OffersSection";
import WhatsNewSection from "@/components/WhatsNewSection";
import JourneyCTA from "@/components/JourneyCTA";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { ChevronRight, ChevronLeft, Calendar, User } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import heroImage from "@/assets/hero-travel.jpg";
import heroXplorwing from "@/assets/hero-xplorwing.jpg";
import heroTajmahal from "@/assets/hero-tajmahal.jpg";
import { format } from "date-fns";
import { BookOpen } from "lucide-react";

import heroOutstationCabs from "@/assets/hero-outstation-cabs.jpg";
import heroOutstationCabs1 from "@/assets/hero-outstation-cabs-1.jpg";
import heroOutstationCabs2 from "@/assets/hero-outstation-cabs-2.jpg";
import heroAirportCabs from "@/assets/airport-cabs.jpeg";
import homestaysIcon from "@/assets/categories/homestays-icon.png";
import bikesIcon from "@/assets/categories/bikes-icon.png";
import carsIcon from "@/assets/categories/cars-icon.png";
import cabsIcon from "@/assets/categories/cabs-icon.png";
import experiencesIcon from "@/assets/categories/experiences-icon.png";
import hotelsIcon from "@/assets/categories/hotels-icon.png";
import resortsIcon from "@/assets/categories/resorts-icon.png";
import bikeImage from "@/assets/bike-featured.jpg";
import experienceImage from "@/assets/experience-featured.jpg";
import homestayImage from "@/assets/homestay-featured.jpg";
import { resolveListingCardImage } from "@/lib/listing-images";
import goaDestImage from "@/assets/destinations/goa.jpg";
import manaliDestImage from "@/assets/destinations/manali.jpg";
import jaipurDestImage from "@/assets/destinations/jaipur.jpg";
import udaipurDestImage from "@/assets/destinations/udaipur.jpg";
import munnarDestImage from "@/assets/destinations/munnar.jpg";
import rishikeshDestImage from "@/assets/destinations/rishikesh.jpg";

const categories = [
  {
    image: homestaysIcon,
    title: "Stays",
    subtitle: "Unique homestays",
    link: "/stays",
    bgColor: "bg-pink-100 dark:bg-pink-950/60",
    iconOffsetX: 30,
    iconOffsetY: 15,
  },
  {
    image: bikesIcon,
    title: "Bike Rentals",
    subtitle: "Explore on two wheels",
    link: "/bikes",
    bgColor: "bg-green-100 dark:bg-green-950/60",
    iconScale: 1.05,
    iconOffsetX: 25,
    iconOffsetY: 0,
  },
  {
    image: carsIcon,
    title: "Car Rentals",
    subtitle: "Drive your adventure",
    link: "/cars",
    bgColor: "bg-cyan-100 dark:bg-cyan-950/60",
    iconScale: 1.4,
    iconOffsetX: 10,
    iconOffsetY: -10,
  },
  {
    image: cabsIcon,
    title: "Outstation Cabs",
    subtitle: "Intercity travel",
    link: "/cars",
    bgColor: "bg-purple-100 dark:bg-purple-950/60",
    iconScale: 1.45,
    iconOffsetX: 5,
    iconOffsetY: -15,
  },

  {
    image: hotelsIcon,
    title: "Hotels",
    subtitle: "Comfortable stays",
    link: "/hotels",
    bgColor: "bg-blue-100 dark:bg-blue-950/60",
    iconOffsetX: 10,
    iconOffsetY: 5,
    iconScale: 0.9,
  },
  {
    image: resortsIcon,
    title: "Resorts",
    subtitle: "Luxury getaways",
    link: "/resorts",
    bgColor: "bg-teal-100 dark:bg-teal-950/60",
    iconScale: 1.25,
    iconOffsetX: 10,
    iconOffsetY: -5,
  },
];

const destinations = [
  { image: goaDestImage, title: "Goa", subtitle: "Over 200 stays", rating: 4.8, priceRange: "Starting ₹1,500/night", link: "/stays" },
  { image: manaliDestImage, title: "Manali", subtitle: "Over 150 stays", rating: 4.7, priceRange: "Starting ₹1,200/night", link: "/stays" },
  { image: jaipurDestImage, title: "Jaipur", subtitle: "Over 180 stays", rating: 4.9, priceRange: "Starting ₹1,000/night", link: "/stays" },
  { image: udaipurDestImage, title: "Udaipur", subtitle: "Over 120 stays", rating: 4.8, priceRange: "Starting ₹1,800/night", link: "/stays" },
  { image: munnarDestImage, title: "Munnar", subtitle: "Over 100 stays", rating: 4.6, priceRange: "Starting ₹900/night", link: "/stays" },
  { image: rishikeshDestImage, title: "Rishikesh", subtitle: "Over 90 stays", rating: 4.7, priceRange: "Starting ₹800/night", link: "/stays" },
];

const OutstationCabs = () => {
  const [stays, setStays] = useState<any[]>([]);
  const [bikes, setBikes] = useState<any[]>([]);
  const [cars, setCars] = useState<any[]>([]);
  const [hotels, setHotels] = useState<any[]>([]);
  const [resorts, setResorts] = useState<any[]>([]);
  const [blogs, setBlogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [categoryPage, setCategoryPage] = useState(0);
  const [heroSlide, setHeroSlide] = useState(0);
  const heroImages = [heroXplorwing, heroOutstationCabs1, heroOutstationCabs2, heroAirportCabs];
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  // Determine cards per page based on screen width
  const getCardsPerPage = useCallback(() => {
    if (typeof window === "undefined") return categories.length;
    if (window.innerWidth < 640) return 1; // mobile
    if (window.innerWidth < 1024) return 2; // tablet
    return categories.length; // desktop: show all
  }, []);

  const [cardsPerPage, setCardsPerPage] = useState(getCardsPerPage);
  const totalPages = Math.ceil(categories.length / cardsPerPage);
  const isMobileOrTablet = cardsPerPage < categories.length;

  useEffect(() => {
    const handleResize = () => {
      const newPerPage = getCardsPerPage();
      setCardsPerPage(newPerPage);
      setCategoryPage(0);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [getCardsPerPage]);

  // Auto-slide for hero banner
  useEffect(() => {
    const interval = setInterval(() => {
      setHeroSlide(p => (p + 1) % heroImages.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [heroImages.length]);

  // Auto-slide for mobile/tablet
  useEffect(() => {
    if (!isMobileOrTablet) return;
    const interval = setInterval(() => {
      setCategoryPage(p => (p + 1) % totalPages);
    }, 3000);
    return () => clearInterval(interval);
  }, [isMobileOrTablet, totalPages]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  };
  const handleTouchEnd = () => {
    const diff = touchStartX.current - touchEndX.current;
    if (Math.abs(diff) > 50) {
      if (diff > 0 && categoryPage < totalPages - 1) setCategoryPage(p => p + 1);
      if (diff < 0 && categoryPage > 0) setCategoryPage(p => p - 1);
    }
  };

  const visibleCategories = isMobileOrTablet
    ? categories.slice(categoryPage * cardsPerPage, categoryPage * cardsPerPage + cardsPerPage)
    : categories;

  const fetchStays = async () => {
    const { data } = await supabase.from("stays").select("*").eq("availability_status", true).eq("marketplace_visible", true).order("featured", { ascending: false }).order("created_at", { ascending: false });
    return data || [];
  };
  const fetchBikes = async () => {
    const { data } = await supabase.from("bikes").select("*").eq("availability_status", true).eq("marketplace_visible", true).order("featured", { ascending: false }).order("created_at", { ascending: false });
    return data || [];
  };
  const fetchCars = async () => {
    const { data } = await supabase.from("cars").select("*").eq("availability_status", true).eq("marketplace_visible", true).order("featured", { ascending: false }).order("created_at", { ascending: false });
    return data || [];
  };
  const fetchHotels = async () => {
    const { data } = await supabase.from("hotels").select("*").eq("availability_status", true).eq("marketplace_visible", true).order("featured", { ascending: false }).order("created_at", { ascending: false });
    return data || [];
  };
  const fetchResorts = async () => {
    const { data } = await supabase.from("resorts").select("*").eq("availability_status", true).eq("marketplace_visible", true).order("featured", { ascending: false }).order("created_at", { ascending: false });
    return data || [];
  };
  const fetchBlogs = async () => {
    const { data, error } = await supabase
      .from("blog_posts")
      .select("id, title, excerpt, featured_image, published_at, slug, tags, status")
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .limit(3);

    if (error) {
      console.error("[fetchBlogs] Error:", error.message);
      return [];
    }

    // Return only real posts from the database — no hardcoded fallbacks
    return (data || []).map((p: any) => ({
      id: p.id,
      title: p.title,
      excerpt: p.excerpt,
      image: p.featured_image,
      date: p.published_at ? format(new Date(p.published_at), "MMMM d, yyyy") : "",
      author: "Xplorwing Team",
      category: Array.isArray(p.tags) && p.tags.length > 0 ? p.tags[0] : "Travel",
      slug: p.slug
    }));
  };

  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true);
      const [staysData, bikesData, carsData, hotelsData, resortsData, blogsData] = await Promise.all([
        fetchStays(), fetchBikes(), fetchCars(), fetchHotels(), fetchResorts(), fetchBlogs(),
      ]);
      setStays(staysData);
      setBikes(bikesData);
      setCars(carsData);
      setHotels(hotelsData);
      setResorts(resortsData);
      setBlogs(blogsData);
      setLoading(false);
    };
    loadInitialData();
  }, []);

  const processedDestinations = useMemo(() => {
    const allListings = [
      ...stays.map(s => ({ ...s, price: s.price_per_night })),
      ...bikes.map(b => ({ ...b, price: b.price_per_day })),
      ...cars.map(c => ({ ...c, price: c.price_per_day })),
      ...hotels.map(h => ({ ...h, price: h.price_per_night })),
      ...resorts.map(r => ({ ...r, price: r.price_per_night }))
    ];
    
    return destinations.map(dest => {
      const destListings = allListings.filter(l => 
        l.location?.toLowerCase().includes(dest.title.toLowerCase())
      );
      
      if (destListings.length === 0) return null;

      const prices = destListings
        .map(l => Number(l.price))
        .filter(p => !isNaN(p) && p > 0);
      
      const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
      
      return {
        ...dest,
        subtitle: `Over ${destListings.length} stays and vehicles`,
        priceRange: minPrice > 0 ? `Starting ₹${minPrice.toLocaleString()}/night` : dest.priceRange
      };
    }).filter(Boolean);
  }, [stays, bikes, cars, hotels, resorts]);

  return (
    <div className="min-h-screen bg-slate-50/50">
      <Marquee />
      <Header />
      <BackButton />

      {/* Hero Section with Slider — desktop only */}
      <section className="hidden md:block w-full max-w-[1440px] mx-auto pt-4 px-4">
        <div className="relative w-full rounded-2xl overflow-hidden">
          {/* Invisible anchor image — sets the natural height based on actual image ratio */}
          <img src={heroImages[0]} alt="" className="w-full block opacity-0 pointer-events-none" />

          {/* Slides — stacked absolutely over the anchor */}
          {heroImages.map((img, i) => (
            <motion.div
              key={i}
              initial={false}
              animate={{ opacity: i === heroSlide ? 1 : 0 }}
              transition={{ duration: 1.2, ease: "easeInOut" }}
              className="absolute inset-0"
            >
              <img src={img} alt={`Slide ${i + 1}`} className="w-full h-full object-fill" />
            </motion.div>
          ))}

          {/* Navigation Arrows */}
          <button
            onClick={() => setHeroSlide((heroSlide - 1 + heroImages.length) % heroImages.length)}
            aria-label="Previous slide"
            className="absolute left-4 top-1/2 -translate-y-1/2 z-20 bg-black/30 hover:bg-black/50 text-white rounded-full p-2 backdrop-blur-sm transition-all duration-200"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <button
            onClick={() => setHeroSlide((heroSlide + 1) % heroImages.length)}
            aria-label="Next slide"
            className="absolute right-4 top-1/2 -translate-y-1/2 z-20 bg-black/30 hover:bg-black/50 text-white rounded-full p-2 backdrop-blur-sm transition-all duration-200"
          >
            <ChevronRight className="h-6 w-6" />
          </button>

          {/* Slide indicators */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex gap-2">
            {heroImages.map((_, i) => (
              <button
                key={i}
                onClick={() => setHeroSlide(i)}
                aria-label={`Go to slide ${i + 1}`}
                className={`h-2 rounded-full transition-all duration-300 ${
                  i === heroSlide ? "w-6 bg-white" : "w-2 bg-white/50"
                }`}
              />
            ))}
          </div>
        </div>
      </section>


      <main className="flex-grow flex flex-col">
        <div className="pt-2 md:pt-16">
          <CabFareSection />
        </div>
        <CabDriverCTA />
      </main>

      {/* Offers Section */}
      <OffersSection variant="outstation-cabs" />

      {/* What's New Section */}
      <WhatsNewSection variant="outstation-cabs" />













      {/* Blog Section — only rendered when there are published posts */}
      {blogs.length > 0 && <section className="container mx-auto px-4 py-16">
        <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} transition={{ duration: 0.5 }} viewport={{ once: true }}>
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-bold text-foreground">From Our Blog</h2>
            <Link to="/blog" className="flex items-center gap-1 text-sm font-medium text-primary-text hover:underline">
              Read more <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {blogs.map((post, index) => (
              <Link key={post.id} to={`/blog/${post.slug}`}>
                <motion.article
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                  viewport={{ once: true }}
                  className="glass-effect rounded-2xl overflow-hidden hover-lift cursor-pointer group h-full"
                >
                  <div className="relative h-48 overflow-hidden bg-muted">
                    {post.image ? (
                      <img src={post.image} alt={post.title} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110" loading="lazy" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <BookOpen className="h-10 w-10 text-muted-foreground/40" />
                      </div>
                    )}
                    <div className="absolute top-4 left-4">
                      <span className="bg-primary text-primary-foreground px-3 py-1 rounded-full text-xs font-semibold">{post.category}</span>
                    </div>
                  </div>
                  <div className="p-5">
                    <h3 className="text-lg font-bold text-foreground mb-2 group-hover:text-primary-text transition-colors line-clamp-2">{post.title}</h3>
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{post.excerpt}</p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><User className="h-3.5 w-3.5" />{post.author}</span>
                      <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{post.date}</span>
                    </div>
                  </div>
                </motion.article>
              </Link>
            ))}
          </div>
        </motion.div>
      </section>}

      {/* Customer Testimonials */}
      <CustomerTestimonials variant="outstation-cabs" />

      {/* FAQ Section */}
      <HomeFAQ variant="outstation-cabs" />

      {/* Footer CTA */}
      <section className="container mx-auto px-4 py-24">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} viewport={{ once: true }}>
          <JourneyCTA />
        </motion.div>
      </section>

      <Footer />
    </div>
  );
};

export default OutstationCabs;
