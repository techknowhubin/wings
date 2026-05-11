import { motion } from "framer-motion";
import carIcon from "@/assets/car-icon-5436.png";

interface CabFareCardProps {
  fromCode: string;
  fromCity: string;
  toCode: string;
  toCity: string;
  distance: string;
  sedanPrice: number;
  suvPrice: number;
  delay?: number;
}

const CabFareCard = ({
  fromCode,
  fromCity,
  toCode,
  toCity,
  distance,
  sedanPrice,
  suvPrice,
  delay = 0,
}: CabFareCardProps) => {
  const buildWhatsAppUrl = (vehicleType: string, fare: number) => {
    const message = `Hi, I'd like to book a cab.\n\n*From:* ${fromCity} (${fromCode})\n*To:* ${toCity} (${toCode})\n*Distance:* ${distance}\n*Trip Type:* \n*Vehicle Type:* ${vehicleType}\n*Fare:* ₹${fare.toLocaleString()}\n*Booking Person:* `;
    return `https://wa.me/916362986420?text=${encodeURIComponent(message)}`;
  };
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className="bg-card border border-border rounded-2xl shadow-sm hover:shadow-md transition-shadow overflow-hidden w-full max-w-full"
    >
      <div className="flex items-center w-full relative min-h-[100px] md:min-h-[120px]">
        <div className="flex-1 p-1 md:p-5 flex flex-col items-center justify-center text-center min-w-[60px] md:min-w-[110px]">
          <p className="text-sm md:text-2xl font-bold text-foreground leading-tight">{fromCode}</p>
          <p className="text-[9px] md:text-sm text-muted-foreground leading-tight mt-0.5">{fromCity}</p>
        </div>

        <div className="flex flex-col items-center px-0.5 md:px-2 py-4 shrink-0">
          <p className="text-[7px] md:text-[10px] font-bold text-muted-foreground tracking-tighter md:tracking-widest uppercase mb-1">Round Trip</p>
          <div className="flex items-center gap-0.5 md:gap-1">
            <div className="w-2 md:w-8 h-[1px] border-t border-dashed border-primary/30" />
            <img src={carIcon} alt="Car" className="h-5 w-8 md:h-10 md:w-16 object-contain shrink-0" />
            <div className="w-2 md:w-8 h-[1px] border-t border-dashed border-primary/30" />
          </div>
          <p className="text-[8px] md:text-xs text-muted-foreground mt-1 font-medium whitespace-nowrap">{distance}</p>
        </div>

        <div className="flex-1 p-1 md:p-5 flex flex-col items-center justify-center text-center min-w-[60px] md:min-w-[110px]">
          <p className="text-sm md:text-2xl font-bold text-foreground leading-tight">{toCode}</p>
          <p className="text-[9px] md:text-sm text-muted-foreground leading-tight mt-0.5">{toCity}</p>
        </div>

        <div className="p-2 md:p-5 min-w-[100px] md:min-w-[160px] self-stretch flex flex-col justify-center text-center bg-[#064e3b] border-l border-emerald-900 shadow-inner shrink-0">
          <div className="mb-0.5 md:mb-1">
            <p className="text-[8px] md:text-xs text-emerald-100/70 uppercase tracking-wider font-medium">Sedan</p>
            <p className="text-xs md:text-xl font-bold text-[#FFFFF0]">₹{sedanPrice.toLocaleString()}</p>
            <a
              href={buildWhatsAppUrl("Sedan", sedanPrice)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block mt-0.5 md:mt-1 px-2 md:px-3 py-0.5 md:py-1 bg-[#E5F76E] text-gray-900 text-[7px] md:text-[10px] font-semibold rounded-full hover:bg-[#d4e85e] transition-colors"
            >
              Book Now
            </a>
          </div>
          <div className="h-[1px] bg-[#FFFFF0] w-full mb-0.5 md:mb-1 opacity-20" />
          <div>
            <p className="text-[8px] md:text-xs text-emerald-100/70 uppercase tracking-wider font-medium">SUV</p>
            <p className="text-xs md:text-xl font-bold text-[#FFFFF0]">₹{suvPrice.toLocaleString()}</p>
            <a
              href={buildWhatsAppUrl("SUV", suvPrice)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block mt-0.5 md:mt-1 px-2 md:px-3 py-0.5 md:py-1 bg-[#E5F76E] text-gray-900 text-[7px] md:text-[10px] font-semibold rounded-full hover:bg-[#d4e85e] transition-colors"
            >
              Book Now
            </a>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default CabFareCard;
