import { motion } from "framer-motion";
import { Star, MapPin, Home, Car, Bike, Compass, Heart } from "lucide-react";
import { Link } from "react-router-dom";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";

interface ListingListCardProps {
  image: string;
  title: string;
  location: string;
  price: string;
  rating: number;
  type: "stay" | "car" | "bike" | "experience";
  id?: string;
  description?: string;
  delay?: number;
}

const typeConfig = {
  stay: { icon: Home, label: "Stay", route: "/stays", color: "bg-primary" },
  car: { icon: Car, label: "Car", route: "/cars", color: "bg-blue-700" },
  bike: { icon: Bike, label: "Bike", route: "/bikes", color: "bg-amber-700" },
  experience: { icon: Compass, label: "Experience", route: "/experiences", color: "bg-violet-700" },
};

const ListingListCard = ({
  image,
  title,
  location,
  price,
  rating,
  type,
  id,
  description,
  delay = 0,
}: ListingListCardProps) => {
  const [wishlisted, setWishlisted] = useState(false);
  const config = typeConfig[type];
  const Icon = config.icon;
  const detailLink = id ? `${config.route}/${id}` : config.route;

  return (
    <Link to={detailLink}>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay }}
        className="flex gap-4 p-3 rounded-xl border border-border bg-card hover:shadow-md transition-shadow group"
      >
        {/* Image */}
        <div className="relative w-[180px] h-[130px] flex-shrink-0 rounded-lg overflow-hidden">
          <img
            src={image}
            alt={title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          <Badge
            className={`absolute top-2 left-2 ${config.color} text-white text-[10px] px-1.5 py-0.5 gap-1`}
          >
            <Icon className="h-3 w-3" />
            {config.label}
          </Badge>
          <button
            onClick={(e) => {
              e.preventDefault();
              setWishlisted(!wishlisted);
            }}
            className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center hover:bg-white transition-colors"
          >
            <Heart
              className={`h-3.5 w-3.5 ${wishlisted ? "fill-red-500 text-red-500" : "text-foreground/60"}`}
            />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col justify-between min-w-0 py-0.5">
          <div>
            <h3 className="font-semibold text-foreground text-sm truncate">{title}</h3>
            <div className="flex items-center gap-1 text-muted-foreground text-xs mt-0.5">
              <MapPin className="h-3 w-3" />
              <span className="truncate">{location}</span>
            </div>
            {description && (
              <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">{description}</p>
            )}
          </div>

          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-1">
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
              <span className="text-sm font-medium text-foreground">{rating}</span>
            </div>
            <span className="font-bold text-foreground text-sm">{price}</span>
          </div>
        </div>
      </motion.div>
    </Link>
  );
};

export default ListingListCard;
