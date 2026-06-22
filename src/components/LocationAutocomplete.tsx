import { useState, useEffect, useRef } from "react";
import { MapPin, Navigation, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix Leaflet default icon missing in bundled apps
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

interface LocationResult {
  display_name: string;
  lat: string;
  lon: string;
  place_id: number;
}

export interface LocationData {
  address: string;
  lat: number;
  lng: number;
  placeId?: string;
}

interface LocationAutocompleteProps {
  label: string;
  value: string;
  onChange: (data: LocationData) => void;
  placeholder?: string;
}

export default function LocationAutocomplete({
  label,
  value,
  onChange,
  placeholder = "Search location",
}: LocationAutocompleteProps) {
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<LocationResult[]>([]);
  const [isGpsLoading, setIsGpsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<LocationData | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync if value cleared externally
  useEffect(() => {
    if (!value && query) {
      setQuery("");
      setSelectedLocation(null);
    }
  }, [value]);

  const reverseGeocode = async (lat: number, lng: number): Promise<string> => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
        { headers: { "Accept-Language": "en" } }
      );
      const data = await res.json();
      return data?.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    } catch {
      return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    }
  };

  const searchPlaces = async (text: string) => {
    if (!text.trim() || text.length < 3) {
      setResults([]);
      setShowResults(false);
      return;
    }
    setIsSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(text)}&countrycodes=in&limit=5`,
        { headers: { "Accept-Language": "en" } }
      );
      const data: LocationResult[] = await res.json();
      setResults(data);
      setShowResults(true);
    } catch {
      // silent fail — user can still type manually
    } finally {
      setIsSearching(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => searchPlaces(val), 500);
  };

  const handleSelect = (item: LocationResult) => {
    const lat = parseFloat(item.lat);
    const lng = parseFloat(item.lon);
    const address = item.display_name;
    setQuery(address);
    setShowResults(false);
    const locData: LocationData = { address, lat, lng, placeId: String(item.place_id) };
    setSelectedLocation(locData);
    onChange(locData);
  };

  const getCurrentLocation = () => {
    setIsGpsLoading(true);
    if (!("geolocation" in navigator)) {
      alert("Geolocation is not supported by your browser.");
      setIsGpsLoading(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        const address = await reverseGeocode(lat, lng);
        setQuery(address);
        const locData: LocationData = { address, lat, lng, placeId: "gps" };
        setSelectedLocation(locData);
        onChange(locData);
        setIsGpsLoading(false);
      },
      () => {
        alert("Could not get your location. Please check browser permissions.");
        setIsGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Initialise / update mini map when a location is picked
  useEffect(() => {
    if (!selectedLocation || !mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, { zoomControl: false }).setView(
        [selectedLocation.lat, selectedLocation.lng],
        15
      );
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors",
      }).addTo(map);

      const marker = L.marker([selectedLocation.lat, selectedLocation.lng]).addTo(map);
      marker.dragging?.enable();
      marker.on("dragend", async () => {
        const pos = marker.getLatLng();
        setIsGpsLoading(true);
        const newAddress = await reverseGeocode(pos.lat, pos.lng);
        setQuery(newAddress);
        const locData: LocationData = { address: newAddress, lat: pos.lat, lng: pos.lng, placeId: "pin" };
        setSelectedLocation(locData);
        onChange(locData);
        setIsGpsLoading(false);
      });

      mapInstanceRef.current = map;
      markerRef.current = marker;
    } else {
      mapInstanceRef.current.setView([selectedLocation.lat, selectedLocation.lng], 15);
      markerRef.current?.setLatLng([selectedLocation.lat, selectedLocation.lng]);
    }
  }, [selectedLocation]);

  return (
    <div className="relative space-y-2">
      {/* Label row */}
      <div className="flex justify-between items-center">
        <Label className="text-sm font-semibold text-[#013220]">{label}</Label>
        <button
          type="button"
          onClick={getCurrentLocation}
          disabled={isGpsLoading}
          className="text-xs font-semibold text-[#25D366] hover:text-[#013220] flex items-center gap-1 transition-colors disabled:opacity-60"
        >
          {isGpsLoading ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Navigation className="h-3 w-3" />
          )}
          Use Current Location
        </button>
      </div>

      {/* Search input */}
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          value={query}
          onChange={handleInputChange}
          onFocus={() => { if (results.length > 0) setShowResults(true); }}
          placeholder={placeholder}
          className="pl-9 h-10 text-sm rounded-xl border-[#e2e8f0]"
        />
        {isSearching && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}

        {/* Dropdown results */}
        {showResults && results.length > 0 && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-[#e2e8f0] rounded-xl shadow-lg max-h-48 overflow-y-auto">
            {results.map((item, idx) => (
              <div
                key={idx}
                onClick={() => handleSelect(item)}
                className="px-3 py-2.5 text-sm hover:bg-muted cursor-pointer border-b last:border-0 border-[#e2e8f0] flex items-start gap-2"
              >
                <MapPin className="h-4 w-4 mt-0.5 shrink-0 text-[#013220]" />
                <span className="line-clamp-2 leading-snug">{item.display_name}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Mini map preview after selection */}
      {selectedLocation && (
        <div className="rounded-xl border border-border bg-muted/20 p-2.5 space-y-2 mt-1">
          <p className="text-xs text-muted-foreground flex gap-1.5 items-start">
            <span className="text-base leading-none shrink-0">📍</span>
            <span className="leading-snug">{selectedLocation.address}</span>
          </p>
          <div className="relative h-28 w-full rounded-lg overflow-hidden border border-border">
            <div ref={mapContainerRef} className="w-full h-full" />
            {isGpsLoading && (
              <div className="absolute inset-0 bg-white/60 backdrop-blur-sm z-[1000] flex items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-[#013220]" />
              </div>
            )}
          </div>
          <p className="text-[10px] text-center text-muted-foreground">Drag pin to fine-tune exact location</p>
        </div>
      )}

      {/* Backdrop to close dropdown on outside click */}
      {showResults && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowResults(false)}
        />
      )}
    </div>
  );
}
