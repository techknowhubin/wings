import { motion } from "framer-motion";
import { useTheme } from "@/components/ThemeProvider";
import logo from "@/assets/logo.png";
import logoLight from "@/assets/logo-light.png";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  lightHeightClass?: string;
  darkHeightClass?: string;
}

/**
 * A specialized logo component that handles the cross-fade animation between
 * light and dark theme logos, while also compensating for different aspect ratios.
 */
export const DynamicLogo = ({ 
  className, 
  lightHeightClass = "h-8", 
  darkHeightClass = "h-[42px]" 
}: LogoProps) => {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  return (
    <div className={cn("relative flex items-center", className)}>
      {/* Light Theme Logo */}
      <motion.img
        src={logo}
        alt="Xplorwing"
        initial={false}
        animate={{ opacity: isDark ? 0 : 1 }}
        transition={{ duration: 0.4, ease: "easeInOut" }}
        className={cn("w-auto", lightHeightClass, isDark && "pointer-events-none")}
      />
      
      {/* Dark Theme Logo (Overlaid) */}
      <motion.img
        src={logoLight}
        alt="Xplorwing"
        initial={false}
        animate={{ opacity: isDark ? 1 : 0 }}
        transition={{ duration: 0.4, ease: "easeInOut" }}
        className={cn(
          "absolute inset-0 w-auto", 
          darkHeightClass, 
          !isDark && "pointer-events-none"
        )}
      />
    </div>
  );
};
