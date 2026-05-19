import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const BackButton = () => {
  const navigate = useNavigate();

  return (
    <div className="container mx-auto px-4 pt-4 md:hidden">
      <button 
        onClick={() => navigate(-1)} 
        className="inline-flex items-center gap-2 text-sm font-medium text-foreground hover:text-primary transition-colors py-2"
        aria-label="Go back"
      >
        <ArrowLeft className="w-5 h-5" />
        Back
      </button>
    </div>
  );
};

export default BackButton;
