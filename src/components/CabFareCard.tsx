import { useState } from "react";
import { motion } from "framer-motion";
import carIcon from "@/assets/car-icon-5436.png";
import "./CabFareCard.css";

// Import local destination images for the ticket design
import goaImg from "@/assets/destinations/goa.jpg";
import manaliImg from "@/assets/destinations/manali.jpg";
import jaipurImg from "@/assets/destinations/jaipur.jpg";
import udaipurImg from "@/assets/destinations/udaipur.jpg";
import munnarImg from "@/assets/destinations/munnar.jpg";
import rishikeshImg from "@/assets/destinations/rishikesh.jpg";
import lonavalaImg from "@/assets/destinations/lonavala.jpg";
import mahabaleshwarImg from "@/assets/destinations/mahabaleshwar.jpg";
import hyderabadImg from "@/assets/destinations/hyderabad.jpg";
import warangalImg from "@/assets/destinations/warangal.jpg";
import visakhapatnamImg from "@/assets/destinations/visakhapatnam.jpg";
import tirupatiImg from "@/assets/destinations/tirupati.jpg";
import arakuImg from "@/assets/destinations/araku.jpg";
import nagarjunasagarImg from "@/assets/destinations/nagarjunasagar.jpg";
import coorgImg from "@/assets/destinations/coorg.jpg";
import wayanadImg from "@/assets/destinations/wayanad.jpg";

interface CabFareCardProps {
  fromCode: string;
  fromCity: string;
  toCode: string;
  toCity: string;
  distance: string;
  sedanPrice: number;
  sedanDiscountedPrice?: number;
  suvPrice: number;
  suvDiscountedPrice?: number;
  oneWaySedanPrice?: number;
  oneWaySedanDiscountedPrice?: number;
  oneWaySuvPrice?: number;
  oneWaySuvDiscountedPrice?: number;
  imageUrl?: string;
  delay?: number;
  variant?: "previous" | "ticket";
}

// Map destination codes to high-quality images for the ticket layout
const destinationImages: Record<string, string> = {
  WGL: warangalImg,
  KHM: nagarjunasagarImg,
  NZB: arakuImg,
  KRM: warangalImg,
  MHB: nagarjunasagarImg,
  SDD: nagarjunasagarImg,
  ADL: arakuImg,
  NLG: nagarjunasagarImg,
  VJA: visakhapatnamImg,
  VSK: visakhapatnamImg,
  TPT: tirupatiImg,
  GNT: visakhapatnamImg,
  NEL: visakhapatnamImg,
  KDP: tirupatiImg,
  RJM: visakhapatnamImg,
  KNL: tirupatiImg,
  BLR: coorgImg,
  MYS: coorgImg,
  HBL: coorgImg,
  BGM: coorgImg,
  MNG: coorgImg,
  GLP: coorgImg,
  DVG: coorgImg,
  BDR: coorgImg,
  GOA: goaImg,
  MNL: manaliImg,
  JAI: jaipurImg,
  UDP: udaipurImg,
  MNR: munnarImg,
  RSH: rishikeshImg,
  LNV: lonavalaImg,
  MHB_M: mahabaleshwarImg,
  WYD: wayanadImg,
};

const getDestinationImage = (code: string) => {
  return destinationImages[code.toUpperCase()] || hyderabadImg;
};

const extractDriveId = (url: string) => {
  const fileMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (fileMatch) return fileMatch[1];
  const idMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (idMatch && url.includes("drive.google.com")) return idMatch[1];
  return null;
};

const resolveImageUrl = (url: string) => {
  if (!url) return "";
  const driveId = extractDriveId(url);
  if (driveId) {
    return `https://drive.google.com/thumbnail?id=${driveId}&sz=w600`;
  }
  return url;
};

const CabFareCard = ({
  fromCode,
  fromCity,
  toCode,
  toCity,
  distance,
  sedanPrice,
  sedanDiscountedPrice,
  suvPrice,
  suvDiscountedPrice,
  oneWaySedanPrice,
  oneWaySedanDiscountedPrice,
  oneWaySuvPrice,
  oneWaySuvDiscountedPrice,
  imageUrl,
  delay = 0,
  variant = "previous",
}: CabFareCardProps) => {
  // ────────────────────────────────────────────────────────────────
  // PREVIOUS (ORIGINAL) STYLE RENDERER
  // ────────────────────────────────────────────────────────────────
  if (variant === "previous") {
    const effectiveSedanPrice =
      sedanDiscountedPrice && sedanDiscountedPrice > 0 && sedanDiscountedPrice < sedanPrice
        ? sedanDiscountedPrice
        : sedanPrice;
    const effectiveSuvPrice =
      suvDiscountedPrice && suvDiscountedPrice > 0 && suvDiscountedPrice < suvPrice
        ? suvDiscountedPrice
        : suvPrice;

    const buildWhatsAppUrl = (vehicleType: string, fare: number) => {
      const message = `Hi, I'd like to book a cab.\n\n*From:* ${fromCity} (${fromCode})\n*To:* ${toCity} (${toCode})\n*Distance:* ${distance}\n*Trip Type:* \n*Vehicle Type:* ${vehicleType}\n*Fare:* ₹${fare.toLocaleString()}\n*Booking Person:* `;
      return `https://wa.me/919492986412?text=${encodeURIComponent(message)}`;
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
              <p
                className={`text-[9px] md:text-sm text-emerald-100/70 line-through h-[14px] md:h-[18px] ${
                  effectiveSedanPrice !== sedanPrice ? "opacity-100" : "opacity-0"
                }`}
              >
                ₹{sedanPrice.toLocaleString()}
              </p>
              <p className="text-xs md:text-xl font-bold text-[#FFFFF0]">₹{effectiveSedanPrice.toLocaleString()}</p>
              <a
                href={buildWhatsAppUrl("Sedan", effectiveSedanPrice)}
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
              <p
                className={`text-[9px] md:text-sm text-emerald-100/70 line-through h-[14px] md:h-[18px] ${
                  effectiveSuvPrice !== suvPrice ? "opacity-100" : "opacity-0"
                }`}
              >
                ₹{suvPrice.toLocaleString()}
              </p>
              <p className="text-xs md:text-xl font-bold text-[#FFFFF0]">₹{effectiveSuvPrice.toLocaleString()}</p>
              <a
                href={buildWhatsAppUrl("SUV", effectiveSuvPrice)}
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
  }

  // ────────────────────────────────────────────────────────────────
  // TICKET STYLE RENDERER (variant === "ticket")
  // ────────────────────────────────────────────────────────────────
  const [isOpen, setIsOpen] = useState(false);

  // Round-trip effective pricing
  const effectiveSedanRound =
    sedanDiscountedPrice && sedanDiscountedPrice > 0 && sedanDiscountedPrice < sedanPrice
      ? sedanDiscountedPrice
      : sedanPrice;
  const displaySedanRoundOriginal =
    sedanDiscountedPrice && sedanDiscountedPrice > 0
      ? sedanPrice
      : Math.round(effectiveSedanRound * 1.15 / 10) * 10;

  const effectiveSuvRound =
    suvDiscountedPrice && suvDiscountedPrice > 0 && suvDiscountedPrice < suvPrice
      ? suvDiscountedPrice
      : suvPrice;
  const displaySuvRoundOriginal =
    suvDiscountedPrice && suvDiscountedPrice > 0
      ? suvPrice
      : Math.round(effectiveSuvRound * 1.15 / 10) * 10;

  // One-way: use sheet values when available, otherwise fall back to 70% of round-trip
  const effectiveSedanOneWay =
    oneWaySedanDiscountedPrice && oneWaySedanDiscountedPrice > 0
      ? oneWaySedanDiscountedPrice
      : oneWaySedanPrice && oneWaySedanPrice > 0
        ? oneWaySedanPrice
        : Math.round((effectiveSedanRound * 0.7) / 10) * 10;
  const displaySedanOneWayOriginal =
    oneWaySedanPrice && oneWaySedanPrice > 0 && oneWaySedanDiscountedPrice && oneWaySedanDiscountedPrice > 0
      ? oneWaySedanPrice
      : Math.round((displaySedanRoundOriginal * 0.7) / 10) * 10;

  const effectiveSuvOneWay =
    oneWaySuvDiscountedPrice && oneWaySuvDiscountedPrice > 0
      ? oneWaySuvDiscountedPrice
      : oneWaySuvPrice && oneWaySuvPrice > 0
        ? oneWaySuvPrice
        : Math.round((effectiveSuvRound * 0.7) / 10) * 10;
  const displaySuvOneWayOriginal =
    oneWaySuvPrice && oneWaySuvPrice > 0 && oneWaySuvDiscountedPrice && oneWaySuvDiscountedPrice > 0
      ? oneWaySuvPrice
      : Math.round((displaySuvRoundOriginal * 0.7) / 10) * 10;

  // Distance values
  const numericDistance = parseInt(distance) || 300;
  const bufferDistance = 50;
  const oneWayDistance = Math.round(numericDistance / 2);
  const oneWayBuffer = Math.round(bufferDistance / 2);
  const totalCovered = numericDistance + bufferDistance;
  const minToll = Math.max(150, Math.round((numericDistance * 0.5) / 50) * 50);
  const maxToll = minToll + 150;

  const buildWhatsAppUrl = (vehicleType: string) => {
    const owFare = vehicleType === "Sedan" ? effectiveSedanOneWay : effectiveSuvOneWay;
    const rtFare = vehicleType === "Sedan" ? effectiveSedanRound : effectiveSuvRound;
    const message = `Hi Xplorwing! I would like to book a Cab.\n\n🚗 *Booking Details:*\n• *Route:* ${fromCity} (${fromCode}) → ${toCity} (${toCode})\n• *Vehicle:* ${vehicleType}\n• *One Way:* ₹${owFare.toLocaleString()}* | *Round Trip:* ₹${rtFare.toLocaleString()}*\n\nPlease confirm trip type and availability. Thank you!`;
    return `https://wa.me/919492986412?text=${encodeURIComponent(message)}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className={`ticket-wrap ${isOpen ? "open" : ""}`}
    >
      <div className="ticket">
        {/* LEFT PANEL */}
        <div className="ticket-left">
          <img
            src={resolveImageUrl(imageUrl || "") || getDestinationImage(toCode)}
            alt={toCity}
            onError={(e) => {
              const img = e.target as HTMLImageElement;
              const driveId = imageUrl ? extractDriveId(imageUrl) : null;
              if (driveId && !img.src.includes("lh3") && !img.src.includes("uc?export")) {
                img.src = `https://lh3.googleusercontent.com/d/${driveId}`;
              } else if (driveId && !img.src.includes("uc?export")) {
                img.src = `https://drive.google.com/uc?export=view&id=${driveId}`;
              } else {
                img.src = getDestinationImage(toCode);
              }
            }}
          />
          <div className="dest-label">
            <div className="dest-code">{toCode}</div>
            <div className="dest-city">{toCity}</div>
          </div>
        </div>

        <div className="divider-line"></div>

        {/* RIGHT PANEL */}
        <div className="ticket-right">
          {/* ROUTE */}
          <div className="route-row">
            <div className="city-block" style={{ alignSelf: "flex-start" }}>
              <div className="city-c">{fromCode}</div>
              <div className="city-n">{fromCity}</div>
            </div>
            <div className="route-mid">
              <span className="dist-chip-ow">
                One Way · {oneWayDistance} km <span className="dist-buf">+{oneWayBuffer}</span>
              </span>
              <div className="route-line">
                <div className="rdot"></div>
                <div className="rline"></div>
                <svg className="car-svg" viewBox="0 0 32 16" fill="none">
                  <path
                    d="M4 10h24M7 10V7.5L10 4h12l3 3.5V10"
                    stroke="#1a5c3a"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <circle cx="9" cy="11.5" r="1.8" fill="#1a5c3a" />
                  <circle cx="23" cy="11.5" r="1.8" fill="#1a5c3a" />
                </svg>
                <div className="rline"></div>
                <div className="rdot"></div>
              </div>
              <span className="dist-chip-rt">
                Round Trip · {numericDistance} km <span className="dist-buf">+{bufferDistance}</span>
              </span>
            </div>
            <div className="city-block right" style={{ alignSelf: "flex-end" }}>
              <div className="city-c">{toCode}</div>
              <div className="city-n">{toCity}</div>
            </div>
          </div>

          {/* VEHICLE CARDS */}
          <div className="vehicle-row">
            {/* SEDAN */}
            <div className="v-card">
              <div className="v-type">Sedan</div>
              <div className="v-prices-inner">
                <div className="v-price-col">
                  <div className="v-trip-label">One Way</div>
                  <div className="v-price-struck">₹{displaySedanOneWayOriginal.toLocaleString()}</div>
                  <div className="v-price">₹{effectiveSedanOneWay.toLocaleString()}<sup>*</sup></div>
                </div>
                <div className="v-price-col">
                  <div className="v-trip-label">Round Trip</div>
                  <div className="v-price-struck">₹{displaySedanRoundOriginal.toLocaleString()}</div>
                  <div className="v-price">₹{effectiveSedanRound.toLocaleString()}<sup>*</sup></div>
                </div>
              </div>
              <a href={buildWhatsAppUrl("Sedan")} target="_blank" rel="noopener noreferrer" className="v-btn">
                Book Now
              </a>
            </div>

            {/* SUV */}
            <div className="v-card">
              <div className="v-type">SUV</div>
              <div className="v-prices-inner">
                <div className="v-price-col">
                  <div className="v-trip-label">One Way</div>
                  <div className="v-price-struck">₹{displaySuvOneWayOriginal.toLocaleString()}</div>
                  <div className="v-price">₹{effectiveSuvOneWay.toLocaleString()}<sup>*</sup></div>
                </div>
                <div className="v-price-col">
                  <div className="v-trip-label">Round Trip</div>
                  <div className="v-price-struck">₹{displaySuvRoundOriginal.toLocaleString()}</div>
                  <div className="v-price">₹{effectiveSuvRound.toLocaleString()}<sup>*</sup></div>
                </div>
              </div>
              <a href={buildWhatsAppUrl("SUV")} target="_blank" rel="noopener noreferrer" className="v-btn">
                Book Now
              </a>
            </div>
          </div>

          {/* FOOTER */}
          <div className="ticket-footer">
            <span className="footer-note">* Excl. tolls & driver night charges</span>
            <button onClick={() => setIsOpen(!isOpen)} className="acc-toggle" aria-label="Show details">
              <span className="plus-icon">
                <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                  <path d="M6 1v10M1 6h10" strokeWidth="1.8" strokeLinecap="round" fill="none" />
                </svg>
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* ACCORDION */}
      <div className="acc-panel">
        <div className="acc-inner">
          <div>
            <div className="acc-section-title">Fare Breakdown</div>
            <div className="acc-trip-header">One Way</div>
            <div className="acc-row"><span className="acc-key">Distance</span><span className="acc-val">{oneWayDistance} km</span></div>
            <div className="acc-row"><span className="acc-key">Buffer</span><span className="acc-val">+{oneWayBuffer} km</span></div>
            <div className="acc-row"><span className="acc-key">Total</span><span className="acc-val">{oneWayDistance + oneWayBuffer} km</span></div>
            <div className="acc-trip-header">Round Trip</div>
            <div className="acc-row"><span className="acc-key">Distance</span><span className="acc-val">{numericDistance} km</span></div>
            <div className="acc-row"><span className="acc-key">Buffer</span><span className="acc-val">+{bufferDistance} km</span></div>
            <div className="acc-row"><span className="acc-key">Total</span><span className="acc-val">{totalCovered} km</span></div>
            <div className="acc-trip-header">Extra KM</div>
            <div className="acc-row"><span className="acc-key">Sedan</span><span className="acc-val">₹14 / km</span></div>
            <div className="acc-row"><span className="acc-key">SUV</span><span className="acc-val">₹18 / km</span></div>
          </div>
          <div>
            <div className="acc-section-title">What's Included</div>
            <div className="acc-row"><span className="acc-key">Fuel</span><span className="acc-val">✓ Included</span></div>
            <div className="acc-row"><span className="acc-key">GST</span><span className="acc-val">✓ Included</span></div>
            <div className="acc-row"><span className="acc-key">Driver night</span><span className="acc-val">₹300 / night</span></div>
            <div className="acc-row"><span className="acc-key">Toll est.</span><span className="acc-val">₹{minToll}–₹{maxToll}</span></div>
            <div className="acc-section-title" style={{ marginTop: "10px" }}>Policy</div>
            <div className="acc-note">Fixed · No surge · No disputes · Beyond buffer at base rate</div>
            <div className="acc-highlight">✓ No penalty charges</div>
          </div>
          <div className="acc-divider"></div>
          <div className="acc-full">
            <div className="acc-section-title">Cancellation</div>
            <div className="acc-note">Free up to 24 hrs before pickup · 50% within 12 hrs · Full charge on no-show</div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default CabFareCard;
