import { Heart, Star } from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";
import { Link } from "react-router-dom";

interface ListingCardProps {
  image: string;
  title: string;
  location: string;
  price: string;
  rating: number;
  delay?: number;
  type?: "stay" | "bike" | "car" | "experience" | "hotel" | "resort";
  id?: string;
  hostName?: string;
}

const ListingCard = ({ 
  image, 
  title, 
  location, 
  price, 
  rating, 
  delay = 0,
  type = "stay",
  id = "1",
  hostName
}: ListingCardProps) => {
  const [isWishlisted, setIsWishlisted] = useState(false);

  const getDetailPath = () => {
    switch(type) {
      case "bike": return `/bikes/${id}`;
      case "car": return `/cars/${id}`;
      case "experience": return `/experiences/${id}`;
      case "hotel": return `/hotels/${id}`;
      case "resort": return `/resorts/${id}`;
      default: return `/stays/${id}`;
    }
  };

  return (
    <Link to={getDetailPath()}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay }}
        className="group cursor-pointer"
      >
        {/* Image Container */}
        <div className="relative overflow-hidden rounded-2xl mb-3 aspect-square">
          <img
            src={image}
            alt={title}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
          />
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              setIsWishlisted(!isWishlisted);
            }}
            className="absolute top-3 right-3 p-2 rounded-full glass-effect hover:bg-background/80 transition-colors"
            aria-label="Add to wishlist"
          >
            <Heart
              className={`h-5 w-5 ${
                isWishlisted ? "fill-red-500 text-red-500" : "text-foreground"
              } transition-colors`}
            />
          </motion.button>
        </div>

        {/* Content */}
        <div className="space-y-1">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="font-semibold text-foreground line-clamp-1">{title}</h3>
              <div className="flex flex-col">
                <p className="text-sm text-muted-foreground">{location}</p>
                {hostName && (
                  <p className="text-[11px] text-muted-foreground/80 mt-0.5">
                    by <span className="font-medium">{hostName}</span>
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Star className="h-4 w-4 fill-primary-text text-primary-text" />
              <span className="text-sm font-medium">{rating}</span>
            </div>
          </div>
          <p className="text-sm">
            <span className="font-semibold text-foreground">{price}</span>
            <span className="text-muted-foreground">
              / {type === "experience" ? "person" : (type === "stay" || type === "hotel" || type === "resort") ? "night" : "day"}
            </span>
          </p>
        </div>
      </motion.div>
    </Link>
  );
};

export default ListingCard;
