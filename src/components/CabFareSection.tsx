import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import CabFareCard from "./CabFareCard";

type State = "telangana" | "andhra" | "karnataka";

interface FareData {
  fromCode: string;
  fromCity: string;
  toCode: string;
  toCity: string;
  distance: string;
  sedanPrice: number;
  suvPrice: number;
}

const cabFares: Record<State, FareData[]> = {
  telangana: [
    { fromCode: "HYD", fromCity: "Hyderabad", toCode: "WGL", toCity: "Warangal", distance: "350 km", sedanPrice: 7900, suvPrice: 10000 },
    { fromCode: "HYD", fromCity: "Hyderabad", toCode: "KHM", toCity: "Khammam", distance: "450 km", sedanPrice: 9700, suvPrice: 13000 },
    { fromCode: "HYD", fromCity: "Hyderabad", toCode: "NZB", toCity: "Nizamabad", distance: "400 km", sedanPrice: 9000, suvPrice: 12000 },
    { fromCode: "HYD", fromCity: "Hyderabad", toCode: "KRM", toCity: "Karimnagar", distance: "400 km", sedanPrice: 8700, suvPrice: 11700 },
    { fromCode: "HYD", fromCity: "Hyderabad", toCode: "MHB", toCity: "Mahbubnagar", distance: "250 km", sedanPrice: 7000, suvPrice: 8700 },
    { fromCode: "HYD", fromCity: "Hyderabad", toCode: "SDD", toCity: "Siddipet", distance: "250 km", sedanPrice: 7200, suvPrice: 9000 },
    { fromCode: "HYD", fromCity: "Hyderabad", toCode: "ADL", toCity: "Adilabad", distance: "650 km", sedanPrice: 14500, suvPrice: 20000 },
    { fromCode: "HYD", fromCity: "Hyderabad", toCode: "NLG", toCity: "Nalgonda", distance: "250 km", sedanPrice: 6900, suvPrice: 8600 },
  ],
  andhra: [
    { fromCode: "HYD", fromCity: "Hyderabad", toCode: "VJA", toCity: "Vijayawada", distance: "600 km", sedanPrice: 12500, suvPrice: 16500 },
    { fromCode: "HYD", fromCity: "Hyderabad", toCode: "VSK", toCity: "Visakhapatnam", distance: "1300 km", sedanPrice: 25500, suvPrice: 32000 },
    { fromCode: "HYD", fromCity: "Hyderabad", toCode: "TPT", toCity: "Tirupati", distance: "1200 km", sedanPrice: 22000, suvPrice: 28500 },
    { fromCode: "HYD", fromCity: "Hyderabad", toCode: "GNT", toCity: "Guntur", distance: "650 km", sedanPrice: 13000, suvPrice: 17200 },
    { fromCode: "HYD", fromCity: "Hyderabad", toCode: "NEL", toCity: "Nellore", distance: "1000 km", sedanPrice: 19500, suvPrice: 25000 },
    { fromCode: "HYD", fromCity: "Hyderabad", toCode: "KDP", toCity: "Kadapa", distance: "900 km", sedanPrice: 17500, suvPrice: 22500 },
    { fromCode: "HYD", fromCity: "Hyderabad", toCode: "RJM", toCity: "Rajahmundry", distance: "850 km", sedanPrice: 16800, suvPrice: 21500 },
    { fromCode: "HYD", fromCity: "Hyderabad", toCode: "KNL", toCity: "Kurnool", distance: "500 km", sedanPrice: 10500, suvPrice: 14000 },
  ],
  karnataka: [
    { fromCode: "HYD", fromCity: "Hyderabad", toCode: "BLR", toCity: "Bangalore", distance: "1200 km", sedanPrice: 23500, suvPrice: 29500 },
    { fromCode: "HYD", fromCity: "Hyderabad", toCode: "MYS", toCity: "Mysore", distance: "1500 km", sedanPrice: 27500, suvPrice: 35000 },
    { fromCode: "HYD", fromCity: "Hyderabad", toCode: "HBL", toCity: "Hubli", distance: "900 km", sedanPrice: 18000, suvPrice: 23500 },
    { fromCode: "HYD", fromCity: "Hyderabad", toCode: "BGM", toCity: "Belgaum", distance: "1100 km", sedanPrice: 21000, suvPrice: 27000 },
    { fromCode: "HYD", fromCity: "Hyderabad", toCode: "MNG", toCity: "Mangalore", distance: "1600 km", sedanPrice: 30500, suvPrice: 39000 },
    { fromCode: "HYD", fromCity: "Hyderabad", toCode: "GLP", toCity: "Gulbarga", distance: "500 km", sedanPrice: 10800, suvPrice: 14500 },
    { fromCode: "HYD", fromCity: "Hyderabad", toCode: "DVG", toCity: "Davangere", distance: "1000 km", sedanPrice: 19800, suvPrice: 26000 },
    { fromCode: "HYD", fromCity: "Hyderabad", toCode: "BDR", toCity: "Bidar", distance: "350 km", sedanPrice: 7800, suvPrice: 10200 },
  ],
};

const stateLabels: Record<State, string> = {
  telangana: "Telangana",
  andhra: "Andhra Pradesh",
  karnataka: "Karnataka",
};

const CabFareSection = () => {
  const [selectedState, setSelectedState] = useState<State>("telangana");

  return (
    <section className="py-16 px-4 bg-muted/30">
      <div className="container mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-8"
        >
          <h2 className="text-3xl font-bold text-foreground mb-4">
            Premium Outstation Cabs at Unbeatable Rates
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            Curated outstation rentals for the modern explorer. Don't just book a cab, Book an experience with our handpicked outstation rides.
          </p>

          <div className="flex flex-wrap justify-center gap-3">
            {(Object.keys(stateLabels) as State[]).map((state) => (
              <button
                key={state}
                onClick={() => setSelectedState(state)}
                className={`px-6 py-2.5 rounded-full font-medium transition-all ${
                  selectedState === state
                    ? "bg-primary text-primary-foreground shadow-lg"
                    : "bg-card text-foreground border border-border hover:bg-accent"
                }`}
              >
                {stateLabels[state]}
              </button>
            ))}
          </div>
        </motion.div>

        <AnimatePresence mode="wait">
          <motion.div
            key={selectedState}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-4"
          >
            {cabFares[selectedState].map((fare, index) => (
              <CabFareCard
                key={`${selectedState}-${fare.toCode}`}
                {...fare}
                delay={index * 0.05}
              />
            ))}
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
};

export default CabFareSection;
