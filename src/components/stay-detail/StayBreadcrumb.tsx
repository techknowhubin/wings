import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";

interface StayBreadcrumbProps {
  title: string;
  categoryName?: string;
  categoryLink?: string;
}

const StayBreadcrumb = ({ title, categoryName = "Homestays", categoryLink = "/stays" }: StayBreadcrumbProps) => {
  return (
    <nav className="flex items-center gap-1.5 text-sm text-muted-foreground mb-6">
      <Link to="/" className="hover:text-foreground transition-colors">Home</Link>
      <ChevronRight className="h-3.5 w-3.5" />
      <Link to={categoryLink} className="hover:text-foreground transition-colors">{categoryName}</Link>
      <ChevronRight className="h-3.5 w-3.5" />
      <span className="text-foreground font-medium truncate max-w-[200px]">{title}</span>
    </nav>
  );
};

export default StayBreadcrumb;
