import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Marquee from "@/components/Marquee";
import DestinationCard from "@/components/DestinationCard";
import { motion } from "framer-motion";
import { useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

// Destination images - existing
import goaImg from "@/assets/destinations/goa.jpg";
import manaliImg from "@/assets/destinations/manali.jpg";
import jaipurImg from "@/assets/destinations/jaipur.jpg";
import udaipurImg from "@/assets/destinations/udaipur.jpg";
import munnarImg from "@/assets/destinations/munnar.jpg";
import rishikeshImg from "@/assets/destinations/rishikesh.jpg";

// New destination images
import jodhpurImg from "@/assets/destinations/jodhpur.jpg";
import jaisalmerImg from "@/assets/destinations/jaisalmer.jpg";
import pushkarImg from "@/assets/destinations/pushkar.jpg";
import shimlaImg from "@/assets/destinations/shimla.jpg";
import dharamshalaImg from "@/assets/destinations/dharamshala.jpg";
import kasolImg from "@/assets/destinations/kasol.jpg";
import spitiImg from "@/assets/destinations/spiti.jpg";
import alleppeyImg from "@/assets/destinations/alleppey.jpg";
import wayanadImg from "@/assets/destinations/wayanad.jpg";
import kochiImg from "@/assets/destinations/kochi.jpg";
import mussoorieImg from "@/assets/destinations/mussoorie.jpg";
import nainitalImg from "@/assets/destinations/nainital.jpg";
import auliImg from "@/assets/destinations/auli.jpg";
import coorgImg from "@/assets/destinations/coorg.jpg";
import hampiImg from "@/assets/destinations/hampi.jpg";
import gokarnaImg from "@/assets/destinations/gokarna.jpg";
import srinagarImg from "@/assets/destinations/srinagar.jpg";
import gulmargImg from "@/assets/destinations/gulmarg.jpg";
import pahalgamImg from "@/assets/destinations/pahalgam.jpg";
import ootyImg from "@/assets/destinations/ooty.jpg";
import kodaikanalImg from "@/assets/destinations/kodaikanal.jpg";
import pondicherryImg from "@/assets/destinations/pondicherry.jpg";
import shillongImg from "@/assets/destinations/shillong.jpg";
import cherrapunjiImg from "@/assets/destinations/cherrapunji.jpg";
import lonavalaImg from "@/assets/destinations/lonavala.jpg";
import mahabaleshwarImg from "@/assets/destinations/mahabaleshwar.jpg";
import gangtokImg from "@/assets/destinations/gangtok.jpg";
import pellingImg from "@/assets/destinations/pelling.jpg";
import lehImg from "@/assets/destinations/leh.jpg";
import nubraImg from "@/assets/destinations/nubra.jpg";
// Telangana
import hyderabadImg from "@/assets/destinations/hyderabad.jpg";
import warangalImg from "@/assets/destinations/warangal.jpg";
// Andhra Pradesh
import visakhapatnamImg from "@/assets/destinations/visakhapatnam.jpg";
import tirupatiImg from "@/assets/destinations/tirupati.jpg";
import arakuImg from "@/assets/destinations/araku.jpg";
import nagarjunasagarImg from "@/assets/destinations/nagarjunasagar.jpg";

const allDestinations = [
  // Goa
  { image: goaImg, title: "North Goa", subtitle: "Beaches & nightlife", rating: 4.8, priceRange: "Starting ₹1,500/night", state: "Goa", link: "/stays" },
  { image: goaImg, title: "South Goa", subtitle: "Serene beaches & heritage", rating: 4.7, priceRange: "Starting ₹1,800/night", state: "Goa", link: "/stays" },
  // Rajasthan
  { image: jaipurImg, title: "Jaipur", subtitle: "The Pink City", rating: 4.9, priceRange: "Starting ₹1,000/night", state: "Rajasthan", link: "/stays" },
  { image: udaipurImg, title: "Udaipur", subtitle: "City of Lakes", rating: 4.8, priceRange: "Starting ₹1,800/night", state: "Rajasthan", link: "/stays" },
  { image: jodhpurImg, title: "Jodhpur", subtitle: "The Blue City", rating: 4.7, priceRange: "Starting ₹900/night", state: "Rajasthan", link: "/stays" },
  { image: jaisalmerImg, title: "Jaisalmer", subtitle: "The Golden City", rating: 4.6, priceRange: "Starting ₹1,200/night", state: "Rajasthan", link: "/stays" },
  { image: pushkarImg, title: "Pushkar", subtitle: "Sacred lake town", rating: 4.5, priceRange: "Starting ₹800/night", state: "Rajasthan", link: "/stays" },
  // Himachal Pradesh
  { image: manaliImg, title: "Manali", subtitle: "Mountain paradise", rating: 4.7, priceRange: "Starting ₹1,200/night", state: "Himachal Pradesh", link: "/stays" },
  { image: shimlaImg, title: "Shimla", subtitle: "Queen of Hills", rating: 4.6, priceRange: "Starting ₹1,100/night", state: "Himachal Pradesh", link: "/stays" },
  { image: dharamshalaImg, title: "Dharamshala", subtitle: "Home of Dalai Lama", rating: 4.7, priceRange: "Starting ₹900/night", state: "Himachal Pradesh", link: "/stays" },
  { image: kasolImg, title: "Kasol", subtitle: "Mini Israel of India", rating: 4.5, priceRange: "Starting ₹800/night", state: "Himachal Pradesh", link: "/stays" },
  { image: spitiImg, title: "Spiti Valley", subtitle: "Cold desert wonderland", rating: 4.9, priceRange: "Starting ₹1,500/night", state: "Himachal Pradesh", link: "/stays" },
  // Kerala
  { image: munnarImg, title: "Munnar", subtitle: "Tea gardens & mist", rating: 4.6, priceRange: "Starting ₹900/night", state: "Kerala", link: "/stays" },
  { image: alleppeyImg, title: "Alleppey", subtitle: "Backwater houseboat capital", rating: 4.8, priceRange: "Starting ₹2,000/night", state: "Kerala", link: "/stays" },
  { image: wayanadImg, title: "Wayanad", subtitle: "Lush green wilderness", rating: 4.5, priceRange: "Starting ₹1,200/night", state: "Kerala", link: "/stays" },
  { image: kochiImg, title: "Kochi", subtitle: "Historic port city", rating: 4.4, priceRange: "Starting ₹800/night", state: "Kerala", link: "/stays" },
  // Uttarakhand
  { image: rishikeshImg, title: "Rishikesh", subtitle: "Yoga capital of the world", rating: 4.7, priceRange: "Starting ₹800/night", state: "Uttarakhand", link: "/stays" },
  { image: mussoorieImg, title: "Mussoorie", subtitle: "Queen of the Hills", rating: 4.5, priceRange: "Starting ₹1,000/night", state: "Uttarakhand", link: "/stays" },
  { image: nainitalImg, title: "Nainital", subtitle: "Lake district of India", rating: 4.6, priceRange: "Starting ₹900/night", state: "Uttarakhand", link: "/stays" },
  { image: auliImg, title: "Auli", subtitle: "Skiing paradise", rating: 4.7, priceRange: "Starting ₹1,500/night", state: "Uttarakhand", link: "/stays" },
  // Karnataka
  { image: coorgImg, title: "Coorg", subtitle: "Scotland of India", rating: 4.7, priceRange: "Starting ₹1,300/night", state: "Karnataka", link: "/stays" },
  { image: hampiImg, title: "Hampi", subtitle: "Ancient ruins & boulders", rating: 4.6, priceRange: "Starting ₹600/night", state: "Karnataka", link: "/stays" },
  { image: gokarnaImg, title: "Gokarna", subtitle: "Pristine beaches & temples", rating: 4.5, priceRange: "Starting ₹800/night", state: "Karnataka", link: "/stays" },
  // Jammu & Kashmir
  { image: srinagarImg, title: "Srinagar", subtitle: "Paradise on Earth", rating: 4.9, priceRange: "Starting ₹2,000/night", state: "Jammu & Kashmir", link: "/stays" },
  { image: gulmargImg, title: "Gulmarg", subtitle: "Meadow of flowers", rating: 4.8, priceRange: "Starting ₹2,500/night", state: "Jammu & Kashmir", link: "/stays" },
  { image: pahalgamImg, title: "Pahalgam", subtitle: "Valley of shepherds", rating: 4.7, priceRange: "Starting ₹1,800/night", state: "Jammu & Kashmir", link: "/stays" },
  // Tamil Nadu
  { image: ootyImg, title: "Ooty", subtitle: "Queen of Nilgiris", rating: 4.5, priceRange: "Starting ₹1,000/night", state: "Tamil Nadu", link: "/stays" },
  { image: kodaikanalImg, title: "Kodaikanal", subtitle: "Princess of hill stations", rating: 4.6, priceRange: "Starting ₹1,100/night", state: "Tamil Nadu", link: "/stays" },
  { image: pondicherryImg, title: "Pondicherry", subtitle: "French colonial charm", rating: 4.7, priceRange: "Starting ₹1,200/night", state: "Tamil Nadu", link: "/stays" },
  // Meghalaya
  { image: shillongImg, title: "Shillong", subtitle: "Scotland of the East", rating: 4.6, priceRange: "Starting ₹1,000/night", state: "Meghalaya", link: "/stays" },
  { image: cherrapunjiImg, title: "Cherrapunji", subtitle: "Wettest place on Earth", rating: 4.7, priceRange: "Starting ₹1,200/night", state: "Meghalaya", link: "/stays" },
  // Maharashtra
  { image: lonavalaImg, title: "Lonavala", subtitle: "Misty hills & chikkis", rating: 4.3, priceRange: "Starting ₹1,200/night", state: "Maharashtra", link: "/stays" },
  { image: mahabaleshwarImg, title: "Mahabaleshwar", subtitle: "Strawberry country", rating: 4.5, priceRange: "Starting ₹1,000/night", state: "Maharashtra", link: "/stays" },
  // Sikkim
  { image: gangtokImg, title: "Gangtok", subtitle: "Gateway to the Himalayas", rating: 4.7, priceRange: "Starting ₹1,300/night", state: "Sikkim", link: "/stays" },
  { image: pellingImg, title: "Pelling", subtitle: "Kanchenjunga views", rating: 4.6, priceRange: "Starting ₹1,100/night", state: "Sikkim", link: "/stays" },
  // Ladakh
  { image: lehImg, title: "Leh", subtitle: "Land of high passes", rating: 4.9, priceRange: "Starting ₹2,000/night", state: "Ladakh", link: "/stays" },
  { image: nubraImg, title: "Nubra Valley", subtitle: "Desert in the mountains", rating: 4.8, priceRange: "Starting ₹2,500/night", state: "Ladakh", link: "/stays" },
  // Telangana
  { image: hyderabadImg, title: "Hyderabad", subtitle: "City of Pearls & Biryani", rating: 4.8, priceRange: "Starting ₹1,200/night", state: "Telangana", link: "/stays" },
  { image: warangalImg, title: "Warangal", subtitle: "Kakatiya heritage city", rating: 4.4, priceRange: "Starting ₹800/night", state: "Telangana", link: "/stays" },
  // Andhra Pradesh
  { image: visakhapatnamImg, title: "Visakhapatnam", subtitle: "City of Destiny", rating: 4.6, priceRange: "Starting ₹1,100/night", state: "Andhra Pradesh", link: "/stays" },
  { image: tirupatiImg, title: "Tirupati", subtitle: "Sacred temple town", rating: 4.7, priceRange: "Starting ₹900/night", state: "Andhra Pradesh", link: "/stays" },
  { image: arakuImg, title: "Araku Valley", subtitle: "Coffee plantations & tribal culture", rating: 4.5, priceRange: "Starting ₹1,000/night", state: "Andhra Pradesh", link: "/stays" },
  { image: nagarjunasagarImg, title: "Nagarjuna Sagar", subtitle: "Massive dam & Buddhist ruins", rating: 4.3, priceRange: "Starting ₹700/night", state: "Andhra Pradesh", link: "/stays" },
];

const states = [...new Set(allDestinations.map((d) => d.state))].sort();

const Destinations = () => {
  const [selectedState, setSelectedState] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");

  const filtered = allDestinations.filter((d) => {
    const matchesState = selectedState === "All" || d.state === selectedState;
    const matchesSearch =
      d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.state.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesState && matchesSearch;
  });

  return (
    <div className="min-h-screen">
      <Marquee />
      <Header />

      {/* Hero */}
      <section className="container mx-auto px-4 pt-10 pb-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-2">
            Explore Destinations
          </h1>
          <p className="text-muted-foreground text-lg mb-8">
            Discover stunning tourist places across India
          </p>
        </motion.div>

        {/* Search + Filters */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="flex flex-col gap-4 mb-8"
        >
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search destinations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedState("All")}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 backdrop-blur-md border ${
                selectedState === "All"
                  ? "bg-gradient-to-r from-primary/80 to-primary/60 text-white border-primary/30 shadow-lg shadow-primary/20"
                  : "bg-muted/80 text-foreground border-border hover:bg-muted"
              }`}
            >
              All States
            </button>
            {states.map((state) => (
              <button
                key={state}
                onClick={() => setSelectedState(state)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 backdrop-blur-md border ${
                  selectedState === state
                    ? "bg-gradient-to-r from-primary/80 to-primary/60 text-white border-primary/30 shadow-lg shadow-primary/20"
                    : "bg-muted/80 text-foreground border-border hover:bg-muted"
                }`}
              >
                {state}
              </button>
            ))}
          </div>
        </motion.div>
      </section>

      {/* Results */}
      <section className="container mx-auto px-4 pb-16">
        <p className="text-sm text-muted-foreground mb-6">
          Showing {filtered.length} destination{filtered.length !== 1 ? "s" : ""}
          {selectedState !== "All" ? ` in ${selectedState}` : ""}
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {filtered.map((dest, index) => (
            <DestinationCard
              key={`${dest.title}-${dest.state}`}
              image={dest.image}
              title={dest.title}
              subtitle={dest.subtitle}
              rating={dest.rating}
              priceRange={dest.priceRange}
              link={dest.link}
              delay={index * 0.03}
            />
          ))}
        </div>
        {filtered.length === 0 && (
          <div className="text-center py-20">
            <p className="text-muted-foreground text-lg">No destinations found. Try a different filter.</p>
          </div>
        )}
      </section>

      <Footer />
    </div>
  );
};

export default Destinations;
