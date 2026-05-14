import { motion } from "framer-motion";
import { Link } from "react-router-dom";

interface CategoryCardProps {
  image: string;
  title: string;
  subtitle: string;
  link: string;
  bgColor: string;
  delay?: number;
  iconScale?: number;
  iconOffsetX?: number;
  iconOffsetY?: number;
}

const CategoryCard = ({ image, title, subtitle, link, bgColor, delay = 0, iconScale = 1, iconOffsetX = 0, iconOffsetY = 0 }: CategoryCardProps) => {
  const size = 120 * iconScale;
  return (
    <Link to={link} className="block">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay }}
        whileHover={{ scale: 1.05, y: -4 }}
        whileTap={{ scale: 0.97 }}
        className={`${bgColor} rounded-2xl px-6 py-5 flex items-center justify-between gap-4 cursor-pointer w-[286px] h-[114px] shadow-md hover:shadow-lg transition-shadow relative overflow-visible dark:border dark:border-white/10 dark:ring-1 dark:ring-white/5`}
      >
        <div className="flex flex-col gap-0.5">
          <span className="font-bold text-foreground text-base leading-tight">{title}</span>
          <span className="text-xs text-foreground/70">{subtitle}</span>
        </div>
        <div className="flex-shrink-0 flex items-center justify-center absolute drop-shadow-lg" style={{ width: size, height: size, right: -22 + iconOffsetX, top: `calc(50% + ${iconOffsetY}px)`, transform: 'translateY(calc(-50% - 10px))' }}>
          <img 
            src={image} 
            alt={title}
            className="object-contain"
            style={{ width: size, height: size }}
          />
        </div>
      </motion.div>
    </Link>
  );
};

export default CategoryCard;
