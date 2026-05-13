import { Button } from "@/components/ui/button";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface ButtonWithIconProps {
  className?: string;
  onClick?: () => void;
  label?: string;
}

const ButtonWithIcon = ({ className, onClick, label = "Become a host" }: ButtonWithIconProps) => {
  return (
    <Button 
      onClick={onClick}
      className={cn(
        "relative text-sm font-medium rounded-full h-10 p-1 ps-6 pe-12 group transition-all duration-500 hover:ps-12 hover:pe-6 w-fit overflow-hidden cursor-pointer bg-primary text-primary-foreground border-none",
        className
      )}
    >
      <span className="relative z-10 transition-all duration-500 whitespace-nowrap">
        {label}
      </span>
      <div className="absolute right-1 w-8 h-8 bg-background text-foreground rounded-full flex items-center justify-center transition-all duration-500 group-hover:right-[calc(100%-36px)] group-hover:rotate-45">
        <ArrowUpRight size={14} />
      </div>
    </Button>
  );
};

export default ButtonWithIcon;
