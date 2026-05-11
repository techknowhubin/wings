import { useState, useRef } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown,
  Home,
  Car,
  Bike,
  Compass,
  MapPin,
  ArrowUpRight,
  Star,
} from "lucide-react";

import homestaysImage from "@/assets/categories/homestays.jpg";
import bikesImage from "@/assets/categories/bikes.jpg";
import carsImage from "@/assets/categories/cars.jpg";
import experiencesImage from "@/assets/categories/experiences.jpg";

import manaliImg from "@/assets/destinations/manali.jpg";
import goaImg from "@/assets/destinations/goa.jpg";
import jaipurImg from "@/assets/destinations/jaipur.jpg";
import munnarImg from "@/assets/destinations/munnar.jpg";
import udaipurImg from "@/assets/destinations/udaipur.jpg";
import rishikeshImg from "@/assets/destinations/rishikesh.jpg";

const categories = [
  {
    title: "Stays",
    subtitle: "Homestays, hotels & resorts",
    icon: Home,
    link: "/stays",
    image: homestaysImage,
    stats: "500+ properties",
  },
  {
    title: "Experiences",
    subtitle: "Treks, tours & activities",
    icon: Compass,
    link: "/experiences",
    image: experiencesImage,
    stats: "200+ activities",
  },
  {
    title: "Bike Rentals",
    subtitle: "Enfields, KTMs & scooters",
    icon: Bike,
    link: "/bikes",
    image: bikesImage,
    stats: "150+ bikes",
  },
  {
    title: "Car Rentals",
    subtitle: "Self-drive & chauffeur",
    icon: Car,
    link: "/cars",
    image: carsImage,
    stats: "300+ vehicles",
  },
];

const destinations = [
  { name: "Manali", image: manaliImg, label: "Mountains" },
  { name: "Goa", image: goaImg, label: "Beaches" },
  { name: "Jaipur", image: jaipurImg, label: "Heritage" },
  { name: "Munnar", image: munnarImg, label: "Hills" },
  { name: "Udaipur", image: udaipurImg, label: "Lakes" },
  { name: "Rishikesh", image: rishikeshImg, label: "Adventure" },
];

const MegaMenu = () => {
  const [isOpen, setIsOpen] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => setIsOpen(false), 200);
  };

  return (
    <div
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button className="flex items-center gap-1.5 text-sm font-medium text-foreground hover:text-primary-text transition-colors px-3 py-2 rounded-lg nav-link-hover">
        Explore
        <ChevronDown
          className={`h-3.5 w-3.5 transition-transform duration-300 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Bridge */}
            <div className="absolute top-full left-0 right-0 h-4" />

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="fixed top-[68px] left-0 right-0 mx-auto w-[92vw] max-w-4xl z-50"
            >
              <div className="bg-card rounded-2xl border border-border shadow-[0_24px_60px_-12px_hsl(var(--foreground)/0.15)] overflow-hidden">
                {/* Top row: Categories */}
                <div className="p-6 pb-5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground mb-4">
                    Browse by category
                  </p>
                  <div className="grid grid-cols-4 gap-3">
                    {categories.map((cat) => (
                      <Link
                        key={cat.title}
                        to={cat.link}
                        onClick={() => setIsOpen(false)}
                        className="group"
                      >
                        <div className="relative rounded-xl overflow-hidden aspect-[4/3] mb-3">
                          <img
                            src={cat.image}
                            alt={cat.title}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-foreground/60 via-foreground/10 to-transparent" />
                          <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between">
                            <div>
                              <p className="text-white text-sm font-bold leading-tight">
                                {cat.title}
                              </p>
                              <p className="text-white/70 text-[11px] mt-0.5">
                                {cat.stats}
                              </p>
                            </div>
                            <div className="w-7 h-7 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
                              <ArrowUpRight className="h-3.5 w-3.5 text-white" />
                            </div>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">
                          {cat.subtitle}
                        </p>
                      </Link>
                    ))}
                  </div>
                </div>

                {/* Divider */}
                <div className="mx-6 h-px bg-border" />

                {/* Bottom row: Trending destinations */}
                <div className="p-6 pt-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Star className="h-3.5 w-3.5 text-primary-text" />
                      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                        Popular destinations
                      </p>
                    </div>
                    <Link
                      to="/destinations"
                      onClick={() => setIsOpen(false)}
                      className="text-xs font-medium text-primary-text hover:underline flex items-center gap-1"
                    >
                      View all
                      <ArrowUpRight className="h-3 w-3" />
                    </Link>
                  </div>

                  <div className="flex items-center gap-2.5">
                    {destinations.map((dest) => (
                      <Link
                        key={dest.name}
                        to={`/destinations/${dest.name.toLowerCase()}`}
                        onClick={() => setIsOpen(false)}
                        className="group flex-1"
                      >
                        <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-border bg-background hover:border-primary/30 hover:bg-primary/5 transition-all duration-200">
                          <div className="w-8 h-8 rounded-lg overflow-hidden flex-shrink-0">
                            <img
                              src={dest.image}
                              alt={dest.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-foreground group-hover:text-primary-text transition-colors truncate">
                              {dest.name}
                            </p>
                            <p className="text-[10px] text-muted-foreground truncate">
                              {dest.label}
                            </p>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MegaMenu;
