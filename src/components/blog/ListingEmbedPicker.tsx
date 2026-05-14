import { useEffect, useState } from "react";
import { Search, X, Star, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { resolveListingCardImage } from "@/lib/listing-images";
import type { ListingEmbedType } from "./types";

interface ListingEmbedPickerProps {
  onSelect: (data: {
    listing_type: ListingEmbedType;
    listing_id: string;
    snapshot: {
      title: string;
      image: string;
      price: string;
      location: string;
      rating: number;
    };
  }) => void;
  onCancel: () => void;
}

const LISTING_TYPES: { value: ListingEmbedType; label: string; table: string }[] = [
  { value: "stay", label: "Homestays", table: "stays" },
  { value: "hotel", label: "Hotels", table: "hotels" },
  { value: "resort", label: "Resorts", table: "resorts" },
  { value: "bike", label: "Bikes", table: "bikes" },
  { value: "car", label: "Cars", table: "cars" },
  { value: "experience", label: "Experiences", table: "experiences" },
];

export default function ListingEmbedPicker({ onSelect, onCancel }: ListingEmbedPickerProps) {
  const [selectedType, setSelectedType] = useState<ListingEmbedType>("stay");
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const currentType = LISTING_TYPES.find((t) => t.value === selectedType)!;

  // Fetch listings on type change or search
  useEffect(() => {
    let cancelled = false;
    const fetchListings = async () => {
      setLoading(true);
      setSelectedId(null);
      let query = supabase
        .from(currentType.table as any)
        .select("*")
        .eq("availability_status", true)
        .order("created_at", { ascending: false })
        .limit(20);

      if (searchQuery.trim()) {
        query = query.ilike("title", `%${searchQuery.trim()}%`);
      }

      const { data } = await query;
      if (!cancelled) {
        setResults(data || []);
        setLoading(false);
      }
    };

    const timer = setTimeout(fetchListings, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [selectedType, searchQuery, currentType.table]);

  const handleConfirm = () => {
    const listing = results.find((r) => r.id === selectedId);
    if (!listing) return;

    const price = listing.price_per_night || listing.price_per_day || listing.price_per_person || 0;

    onSelect({
      listing_type: selectedType,
      listing_id: listing.id,
      snapshot: {
        title: listing.title || "",
        image: resolveListingCardImage(listing.images, selectedType),
        price: `₹${price}`,
        location: listing.location || "",
        rating: Number(listing.rating) || 0,
      },
    });
  };

  return (
    <div className="rounded-xl border border-primary/30 bg-card p-5 space-y-4 shadow-lg">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-bold text-foreground">Embed a Listing</h4>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onCancel}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Type selector */}
      <div className="space-y-1.5">
        <Label className="text-xs">Listing Type</Label>
        <div className="flex flex-wrap gap-1.5">
          {LISTING_TYPES.map((lt) => (
            <button
              key={lt.value}
              onClick={() => setSelectedType(lt.value)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                selectedType === lt.value
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {lt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={`Search ${currentType.label.toLowerCase()}...`}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 h-9 text-sm"
        />
      </div>

      {/* Results */}
      <div className="max-h-[260px] overflow-y-auto space-y-1.5 rounded-lg">
        {loading && (
          <div className="py-8 text-center text-sm text-muted-foreground">
            Searching...
          </div>
        )}
        {!loading && results.length === 0 && (
          <div className="py-8 text-center text-sm text-muted-foreground">
            No listings found.
          </div>
        )}
        {!loading &&
          results.map((listing) => {
            const price =
              listing.price_per_night || listing.price_per_day || listing.price_per_person || 0;
            const image = resolveListingCardImage(listing.images, selectedType);
            const isSelected = selectedId === listing.id;

            return (
              <button
                key={listing.id}
                onClick={() => setSelectedId(listing.id)}
                className={`w-full flex items-center gap-3 p-2.5 rounded-lg text-left transition-colors ${
                  isSelected
                    ? "bg-primary/10 border border-primary/30 ring-1 ring-primary/20"
                    : "hover:bg-muted/50 border border-transparent"
                }`}
              >
                <img
                  src={image}
                  alt={listing.title}
                  className="w-14 h-14 rounded-lg object-cover flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">
                    {listing.title}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {listing.location}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs font-bold text-foreground">₹{price}</span>
                    {Number(listing.rating) > 0 && (
                      <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                        <Star className="h-3 w-3 fill-primary-text text-primary-text" />
                        {listing.rating}
                      </span>
                    )}
                  </div>
                </div>
                {isSelected && (
                  <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                    <svg className="h-3 w-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </button>
            );
          })}
      </div>

      {/* Confirm */}
      <div className="flex gap-2 pt-2 border-t border-border">
        <Button
          size="sm"
          disabled={!selectedId}
          onClick={handleConfirm}
          className="flex-1"
        >
          Insert Listing
        </Button>
        <Button size="sm" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
