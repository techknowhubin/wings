import { useState, useEffect } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface StayImageGalleryProps {
  images: string[];
  title: string;
}

const StayImageGallery = ({ images, title }: StayImageGalleryProps) => {
  // Ensure we have an array that represents exactly what is shown in the grid
  const displayImages = !images || images.length === 0 
    ? [] 
    : images.length > 1 ? images : [images[0], images[0], images[0]];

  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  // Close lightbox or navigate with arrows
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (selectedIndex !== null) {
        if (e.key === "Escape") setSelectedIndex(null);
        if (e.key === "ArrowLeft") handlePrevious();
        if (e.key === "ArrowRight") handleNext();
      }
    };

    if (selectedIndex !== null) {
      window.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "auto";
    };
  }, [selectedIndex, displayImages.length]);

  const handleNext = () => {
    if (selectedIndex !== null && displayImages.length > 0) {
      setSelectedIndex((selectedIndex + 1) % displayImages.length);
    }
  };

  const handlePrevious = () => {
    if (selectedIndex !== null && displayImages.length > 0) {
      setSelectedIndex((selectedIndex - 1 + displayImages.length) % displayImages.length);
    }
  };

  const safeSetIndex = (idx: number) => {
    if (displayImages.length === 0) return;
    setSelectedIndex(idx < displayImages.length ? idx : 0);
  };

  if (displayImages.length === 0) return null;

  const mainImg = displayImages[0];
  const secondImg = displayImages[1];
  const thirdImg = displayImages[2] || displayImages[1];

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-10 h-auto md:h-[480px]">
        {/* Large main image */}
        <div className="md:col-span-2 aspect-[4/3] md:aspect-auto h-full w-full rounded-2xl md:rounded-none md:rounded-l-2xl overflow-hidden relative">
          <img
            src={mainImg}
            alt={title}
            className="absolute inset-0 w-full h-full object-cover hover:opacity-95 transition-opacity cursor-pointer"
            onClick={() => safeSetIndex(0)}
          />
        </div>
        {/* Two stacked smaller images */}
        <div className="hidden md:flex flex-col gap-3 h-full min-h-0">
          <div className="flex-1 overflow-hidden rounded-tr-2xl w-full h-full relative min-h-0">
            <img
              src={secondImg}
              alt={`${title} view 2`}
              className="absolute inset-0 w-full h-full object-cover hover:opacity-95 transition-opacity cursor-pointer"
              onClick={() => safeSetIndex(1)}
            />
          </div>
          <div className="flex-1 overflow-hidden rounded-br-2xl w-full h-full relative min-h-0">
            <img
              src={thirdImg}
              alt={`${title} view 3`}
              className="absolute inset-0 w-full h-full object-cover hover:opacity-95 transition-opacity cursor-pointer"
              onClick={() => safeSetIndex(2)}
            />
          </div>
        </div>
      </div>

      {/* Lightbox Overlay */}
      {selectedIndex !== null && (
        <div className="fixed inset-0 z-[100] flex flex-col bg-black/95 animate-in fade-in duration-200">
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 text-white hover:bg-white/20 z-[110] rounded-full h-12 w-12"
            onClick={() => setSelectedIndex(null)}
          >
            <X className="h-6 w-6" />
          </Button>

          {/* Main Image Area */}
          <div
            className="flex-1 relative w-full p-4 flex items-center justify-center cursor-pointer"
            onClick={() => setSelectedIndex(null)}
          >
            {displayImages.length > 1 && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 z-[110] rounded-full h-14 w-14"
                  onClick={(e) => { e.stopPropagation(); handlePrevious(); }}
                >
                  <ChevronLeft className="h-8 w-8" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 z-[110] rounded-full h-14 w-14"
                  onClick={(e) => { e.stopPropagation(); handleNext(); }}
                >
                  <ChevronRight className="h-8 w-8" />
                </Button>
              </>
            )}

            <img
              src={displayImages[selectedIndex]}
              alt={`${title} - expanded view ${selectedIndex + 1}`}
              className="max-w-full max-h-[85vh] object-contain select-none cursor-default"
              onClick={(e) => e.stopPropagation()}
            />
            
            {displayImages.length > 1 && (
              <div className="absolute top-6 left-1/2 -translate-x-1/2 text-white/90 text-sm font-medium bg-black/40 px-3 py-1 rounded-full drop-shadow-md">
                {selectedIndex + 1} / {displayImages.length}
              </div>
            )}
          </div>

          {/* Thumbnails Strip */}
          {displayImages.length > 1 && (
            <div className="h-20 w-full flex items-center justify-center gap-2 p-2 bg-black/60 border-t border-white/10 backdrop-blur-md">
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin max-w-full px-4">
                {displayImages.map((img, idx) => (
                  <div
                    key={idx}
                    className={`shrink-0 overflow-hidden rounded-sm cursor-pointer transition-all duration-300 w-16 h-12 bg-black/40 ${
                      idx === selectedIndex 
                        ? 'ring-1 ring-white ring-offset-1 ring-offset-black opacity-100 scale-105' 
                        : 'opacity-50 hover:opacity-100 grayscale-[0.3] hover:grayscale-0'
                    }`}
                    onClick={(e) => { e.stopPropagation(); setSelectedIndex(idx); }}
                  >
                    <img 
                      src={img} 
                      alt={`Thumbnail ${idx + 1}`} 
                      className="w-full h-full object-cover" 
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
};

export default StayImageGallery;
