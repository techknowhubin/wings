import { Search, MapPin, Calendar as CalendarIcon, Users, Home, Bike, Car, Building, Palmtree, Minus, Plus, ChevronDown, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useRef, useEffect, useMemo } from "react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useNavigate, useLocation } from "react-router-dom";
import { destinationCoordinates } from "@/lib/destination-coordinates";

const searchCategories = [
  { id: "stays", label: "Stays", icon: Home, path: "/stays" },
  { id: "bikes", label: "Bikes", icon: Bike, path: "/bikes" },
  { id: "cars", label: "Cars", icon: Car, path: "/cars" },
  { id: "hotels", label: "Hotels", icon: Building, path: "/hotels" },
  { id: "resorts", label: "Resorts", icon: Palmtree, path: "/resorts" },
];

const destinations = Object.keys(destinationCoordinates).sort();

interface SearchBarProps {
  defaultCategory?: string;
}

const SearchBar = ({ defaultCategory }: SearchBarProps) => {
  const navigate = useNavigate();
  const location = useLocation();

  const [checkIn, setCheckIn] = useState<Date>();
  const [checkOut, setCheckOut] = useState<Date>();
  const [checkInOpenDesktop, setCheckInOpenDesktop] = useState(false);
  const [checkOutOpenDesktop, setCheckOutOpenDesktop] = useState(false);
  const [travelersOpenDesktop, setTravelersOpenDesktop] = useState(false);
  const [checkInOpenMobile, setCheckInOpenMobile] = useState(false);
  const [checkOutOpenMobile, setCheckOutOpenMobile] = useState(false);
  const [travelersOpenMobile, setTravelersOpenMobile] = useState(false);
  const [activeCategory, setActiveCategory] = useState(defaultCategory || "stays");

  // Destination state
  const [destination, setDestination] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const destinationRef = useRef<HTMLDivElement>(null);
  const mobileDestinationRef = useRef<HTMLDivElement>(null);

  // Travelers state
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [rooms, setRooms] = useState(1);


  // Sync category from current route
  useEffect(() => {
    if (defaultCategory) {
      setActiveCategory(defaultCategory);
      return;
    }
    const path = location.pathname;
    if (path.includes("/stays")) setActiveCategory("stays");
    else if (path.includes("/bikes")) setActiveCategory("bikes");
    else if (path.includes("/cars")) setActiveCategory("cars");
    else if (path.includes("/experiences")) setActiveCategory("experiences");
  }, [location.pathname, defaultCategory]);

  // Filter destinations
  const filteredDestinations = useMemo(() => {
    if (!destination.trim()) return destinations.slice(0, 8);
    return destinations.filter((d) =>
      d.toLowerCase().includes(destination.toLowerCase())
    );
  }, [destination]);

  // Close suggestions on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        destinationRef.current && !destinationRef.current.contains(e.target as Node) &&
        mobileDestinationRef.current && !mobileDestinationRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
      if (!destinationRef.current && mobileDestinationRef.current && !mobileDestinationRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
      if (destinationRef.current && !destinationRef.current.contains(e.target as Node) && !mobileDestinationRef.current) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectDestination = (dest: string) => {
    setDestination(dest);
    setShowSuggestions(false);
  };

  const handleCategoryChange = (catId: string) => {
    setActiveCategory(catId);
  };

  const travelersLabel = `${rooms} room • ${adults} adult${adults > 1 ? "s" : ""} • ${children} child${children !== 1 ? "ren" : ""}`;

  const handleSearch = () => {
    const category = searchCategories.find((c) => c.id === activeCategory);
    if (!category) return;

    const params = new URLSearchParams();
    if (destination) params.set("destination", destination);
    if (checkIn) params.set("checkIn", format(checkIn, "yyyy-MM-dd"));
    if (checkOut) params.set("checkOut", format(checkOut, "yyyy-MM-dd"));
    if (adults > 1) params.set("adults", String(adults));
    if (children > 0) params.set("children", String(children));
    if (rooms > 1) params.set("rooms", String(rooms));

    // If destination matches a known location, go to destination detail
    if (destination && destinations.includes(destination)) {
      navigate(`/destinations/${encodeURIComponent(destination)}?${params.toString()}`);
    } else {
      navigate(`${category.path}?${params.toString()}`);
    }
  };

  const getDateLabels = () => {
    if (activeCategory === "bikes" || activeCategory === "cars") {
      return { start: "Pick-up date", end: "Drop-off date" };
    }
    return { start: "Check in", end: "Check out" };
  };

  const dateLabels = getDateLabels();

  const getGuestsLabel = () => {
    if (activeCategory === "bikes") return "Riders";
    if (activeCategory === "cars") return "Passengers";
    return "Travelers";
  };

  const destinationSuggestionsJSX = (
    <AnimatePresence>
      {showSuggestions && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.15 }}
          className="absolute left-0 right-0 top-full mt-1 bg-background border border-border rounded-xl shadow-lg z-50 max-h-60 overflow-y-auto"
        >
          {filteredDestinations.length === 0 ? (
            <div className="px-4 py-3 text-sm text-muted-foreground">No destinations found</div>
          ) : (
            filteredDestinations.map((dest) => (
              <button
                type="button"
                key={dest}
                onClick={() => selectDestination(dest)}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-muted transition-colors text-left"
              >
                <MapPin className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                {dest}
              </button>
            ))
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );

  const travelersContentJSX = (
    <div className="p-4 space-y-4 min-w-[240px]">
      {(activeCategory === "stays" || activeCategory === "hotels" || activeCategory === "resorts") && (
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-foreground">Rooms</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setRooms(Math.max(1, rooms - 1)); }}
              className="w-8 h-8 rounded-full border border-border flex items-center justify-center hover:bg-muted transition-colors disabled:opacity-40"
              disabled={rooms <= 1}
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
            <span className="text-sm font-medium w-4 text-center">{rooms}</span>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setRooms(Math.min(10, rooms + 1)); }}
              className="w-8 h-8 rounded-full border border-border flex items-center justify-center hover:bg-muted transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-foreground">Adults</p>
          <p className="text-xs text-muted-foreground">Age 13+</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setAdults(Math.max(1, adults - 1)); }}
            className="w-8 h-8 rounded-full border border-border flex items-center justify-center hover:bg-muted transition-colors disabled:opacity-40"
            disabled={adults <= 1}
          >
            <Minus className="h-3.5 w-3.5" />
          </button>
          <span className="text-sm font-medium w-4 text-center">{adults}</span>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setAdults(Math.min(20, adults + 1)); }}
            className="w-8 h-8 rounded-full border border-border flex items-center justify-center hover:bg-muted transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-foreground">Children</p>
          <p className="text-xs text-muted-foreground">Ages 2–12</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setChildren(Math.max(0, children - 1)); }}
            className="w-8 h-8 rounded-full border border-border flex items-center justify-center hover:bg-muted transition-colors disabled:opacity-40"
            disabled={children <= 0}
          >
            <Minus className="h-3.5 w-3.5" />
          </button>
          <span className="text-sm font-medium w-4 text-center">{children}</span>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setChildren(Math.min(10, children + 1)); }}
            className="w-8 h-8 rounded-full border border-border flex items-center justify-center hover:bg-muted transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <motion.div
      initial={{ y: 50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, delay: 0.2 }}
      className="bg-background rounded-2xl shadow-2xl max-w-4xl mx-auto border border-border overflow-visible"
    >
      {/* Category Tabs — Desktop: pill tabs | Mobile: icon tiles */}

      {/* Desktop pill tabs */}
      <div className="hidden md:flex items-center gap-1 px-4 pt-4 pb-2 overflow-x-auto scrollbar-hide">
        {searchCategories.map((cat) => {
          const Icon = cat.icon;
          const isActive = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => handleCategoryChange(cat.id)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-medium transition-all duration-200 whitespace-nowrap",
                isActive
                  ? "bg-foreground text-background shadow-sm"
                  : "bg-transparent text-muted-foreground hover:bg-muted"
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Mobile icon tiles */}
      <div className="flex md:hidden items-center justify-around gap-2 px-4 pt-4 pb-3">
        {searchCategories.map((cat) => {
          const Icon = cat.icon;
          const isActive = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => handleCategoryChange(cat.id)}
              className="flex flex-col items-center gap-1.5 flex-1"
            >
              <div
                className={cn(
                  "w-11 h-11 rounded-full flex items-center justify-center transition-all duration-200 shadow-sm",
                  isActive
                    ? "bg-primary text-primary-foreground scale-105 shadow-md"
                    : "bg-muted text-muted-foreground"
                )}
              >
                <Icon className="h-5 w-5" />
              </div>
              <span
                className={cn(
                  "text-[11px] font-medium text-center leading-tight",
                  isActive ? "text-foreground font-semibold" : "text-muted-foreground"
                )}
              >
                {cat.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Desktop Search Fields */}
      <div className="hidden md:flex items-center gap-2 px-4 pb-4 pt-2">
        {/* Location */}
        <div className="flex-1 relative" ref={destinationRef}>
          <div className="flex items-center gap-2.5 border border-border rounded-full px-4 py-2">
            <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <input
              type="text"
              value={destination}
              onChange={(e) => {
                setDestination(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              placeholder="Select destination"
              className="bg-transparent border-none outline-none text-sm text-foreground placeholder:text-muted-foreground w-full"
            />
            {destination && (
              <button onClick={() => { setDestination(""); setShowSuggestions(true); }} className="text-muted-foreground hover:text-foreground">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          {destinationSuggestionsJSX}
        </div>

        {/* Check-in / Pick-up */}
        <Popover open={checkInOpenDesktop} onOpenChange={setCheckInOpenDesktop}>
          <PopoverTrigger asChild>
            <button className="flex-1 flex items-center gap-2.5 border border-border rounded-full px-4 py-2 cursor-pointer hover:border-primary/40 transition-colors">
              <CalendarIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span className={cn("text-sm", checkIn ? "text-foreground" : "text-muted-foreground")}>
                {checkIn ? format(checkIn, "dd MMM yyyy") : dateLabels.start}
              </span>
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={checkIn}
              onSelect={(date) => {
                setCheckIn(date);
                setCheckInOpen(false);
                if (date && (!checkOut || checkOut <= date)) {
                  setCheckOut(undefined);
                  setTimeout(() => setCheckOutOpen(true), 200);
                }
              }}
              disabled={(date) => date < new Date()}
              initialFocus
            />
          </PopoverContent>
        </Popover>

        {/* Check-out / Drop-off */}
        {(activeCategory !== "bikes" && activeCategory !== "cars") || activeCategory === "stays" || activeCategory === "hotels" || activeCategory === "resorts" || true ? (
          <Popover open={checkOutOpenDesktop} onOpenChange={setCheckOutOpenDesktop}>
            <PopoverTrigger asChild>
              <button className="flex-1 flex items-center gap-2.5 border border-border rounded-full px-4 py-2 cursor-pointer hover:border-primary/40 transition-colors">
                <CalendarIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className={cn("text-sm", checkOut ? "text-foreground" : "text-muted-foreground")}>
                  {checkOut ? format(checkOut, "dd MMM yyyy") : dateLabels.end}
                </span>
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={checkOut}
                onSelect={(date) => {
                  setCheckOut(date);
                  setCheckOutOpenDesktop(false);
                }}
                disabled={(date) => date < (checkIn || new Date())}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        ) : null}

        {/* Travelers */}
        <Popover open={travelersOpenDesktop} onOpenChange={setTravelersOpenDesktop}>
          <PopoverTrigger asChild>
            <button className="flex-1 flex items-center gap-2.5 border border-border rounded-full px-4 py-2 cursor-pointer hover:border-primary/40 transition-colors">
              <Users className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span className="text-sm text-foreground truncate">
                {adults + children > 1 || rooms > 1 ? travelersLabel : getGuestsLabel()}
              </span>
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            {travelersContentJSX}
          </PopoverContent>
        </Popover>

        {/* Search Button */}
        <Button
          size="lg"
          onClick={handleSearch}
          className="rounded-full bg-primary hover:bg-primary/90 text-primary-foreground px-6 h-10 gap-2 font-semibold"
        >
          <Search className="h-4 w-4" />
          Search
        </Button>
      </div>

      {/* Mobile Search Fields */}
      <div className="flex md:hidden flex-col gap-3 px-4 pb-4 pt-2">
        {/* Location */}
        <div className="relative" ref={mobileDestinationRef}>
          <div className="flex items-center gap-2.5 border border-border rounded-full px-4 py-2.5">
            <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <input
              type="text"
              value={destination}
              onChange={(e) => {
                setDestination(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              placeholder="Select destination"
              className="bg-transparent border-none outline-none text-sm text-foreground placeholder:text-muted-foreground w-full"
            />
            {destination && (
              <button onClick={() => { setDestination(""); setShowSuggestions(true); }} className="text-muted-foreground hover:text-foreground">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          {destinationSuggestionsJSX}
        </div>

        {/* Dates Row */}
        <div className="flex gap-3">
          <Popover open={checkInOpenMobile} onOpenChange={setCheckInOpenMobile}>
            <PopoverTrigger asChild>
              <button className="flex-1 flex items-center gap-2.5 border border-border rounded-full px-4 py-2.5 cursor-pointer">
                <CalendarIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className={cn("text-sm", checkIn ? "text-foreground" : "text-muted-foreground")}>
                  {checkIn ? format(checkIn, "dd MMM") : dateLabels.start}
                </span>
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={checkIn}
                onSelect={(date) => {
                  setCheckIn(date);
                  setCheckInOpenMobile(false);
                  if (date && (!checkOut || checkOut <= date)) {
                    setCheckOut(undefined);
                    setTimeout(() => setCheckOutOpenMobile(true), 200);
                  }
                }}
                disabled={(date) => date < new Date()}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          {(activeCategory !== "bikes" && activeCategory !== "cars") || activeCategory === "stays" || activeCategory === "hotels" || activeCategory === "resorts" || true ? (
            <Popover open={checkOutOpenMobile} onOpenChange={setCheckOutOpenMobile}>
              <PopoverTrigger asChild>
                <button className="flex-1 flex items-center gap-2.5 border border-border rounded-full px-4 py-2.5 cursor-pointer">
                  <CalendarIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span className={cn("text-sm", checkOut ? "text-foreground" : "text-muted-foreground")}>
                    {checkOut ? format(checkOut, "dd MMM") : dateLabels.end}
                  </span>
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={checkOut}
                  onSelect={(date) => {
                    setCheckOut(date);
                    setCheckOutOpenMobile(false);
                  }}
                  disabled={(date) => date < (checkIn || new Date())}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          ) : null}
        </div>

        {/* Travelers */}
        <Popover open={travelersOpenMobile} onOpenChange={setTravelersOpenMobile}>
          <PopoverTrigger asChild>
            <button className="w-full flex items-center gap-2.5 border border-border rounded-full px-4 py-2.5 cursor-pointer">
              <Users className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span className="text-sm text-foreground">
                {adults + children > 1 || rooms > 1 ? travelersLabel : getGuestsLabel()}
              </span>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground ml-auto" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-[calc(100vw-2rem)] p-0" align="start">
            {travelersContentJSX}
          </PopoverContent>
        </Popover>

        {/* Search Button */}
        <Button
          size="lg"
          onClick={handleSearch}
          className="w-full rounded-full bg-primary hover:bg-primary/90 text-primary-foreground h-11 gap-2 font-semibold text-base"
        >
          <Search className="h-4 w-4" />
          Search
        </Button>
      </div>
    </motion.div>
  );
};

export default SearchBar;
