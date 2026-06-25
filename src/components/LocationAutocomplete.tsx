import { useState, useEffect, useRef } from "react";
import { MapPin, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { loadGoogleMaps } from "@/lib/googleMaps";

// Fix Leaflet default icon missing in bundled apps
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

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

interface PlacePrediction {
  description: string;
  placeId: string;
}

// Predefined mock database for Mock Fallback Mode
const MOCK_PLACES = [
  { description: "Madhapur, Hyderabad, Telangana, India", lat: 17.4483, lng: 78.3915, placeId: "mock-madhapur" },
  { description: "Gachibowli, Hyderabad, Telangana, India", lat: 17.4401, lng: 78.3489, placeId: "mock-gachibowli" },
  { description: "Jubilee Hills, Hyderabad, Telangana, India", lat: 17.4312, lng: 78.4006, placeId: "mock-jubilee" },
  { description: "Secunderabad, Hyderabad, Telangana, India", lat: 17.4399, lng: 78.4983, placeId: "mock-secunderabad" },
  { description: "Rajiv Gandhi International Airport (HYD), Shamshabad, Hyderabad", lat: 17.2403, lng: 78.4294, placeId: "ChIJ76h6xLKTyzsR27R742b78gA" },
  
  { description: "Indiranagar, Bengaluru, Karnataka, India", lat: 12.9719, lng: 77.6412, placeId: "mock-indiranagar" },
  { description: "Koramangala, Bengaluru, Karnataka, India", lat: 12.9352, lng: 77.6244, placeId: "mock-koramangala" },
  { description: "Kempegowda International Airport (BLR), Devanahalli, Bengaluru", lat: 13.1986, lng: 77.7066, placeId: "ChIJx8sCqU0RrjsR2Z_eAEv-B4g" },
  
  { description: "Connaught Place, New Delhi, Delhi, India", lat: 28.6304, lng: 77.2177, placeId: "mock-connaught" },
  { description: "Indira Gandhi International Airport (DEL), New Delhi, Delhi", lat: 28.5562, lng: 77.1000, placeId: "ChIJj83p92QBDTQR4zQj6sM_B4o" },
  
  { description: "T Nagar, Chennai, Tamil Nadu, India", lat: 13.0405, lng: 80.2337, placeId: "mock-tnagar" },
  { description: "Chennai International Airport (MAA), Chennai, Tamil Nadu", lat: 12.9941, lng: 80.1709, placeId: "ChIJd_6R8FBUUjoRyRxeAEv-B4g" },
  
  { description: "Andheri West, Mumbai, Maharashtra, India", lat: 19.1363, lng: 72.8277, placeId: "mock-andheri" },
  { description: "Chhatrapati Shivaji Maharaj International Airport (BOM), Mumbai, Maharashtra", lat: 19.0896, lng: 72.8656, placeId: "ChIJ_yS8lXv55zsR2RxeAEv-B4g" }
];

// Helper: Performs reverse geocoding to retrieve address string from coordinates
async function reverseGeocode(lat: number, lng: number): Promise<string> {
  const googleLoaded = typeof window !== "undefined" && (window as any).google?.maps?.Geocoder;
  if (googleLoaded) {
    return new Promise((resolve) => {
      const geocoder = new (window as any).google.maps.Geocoder();
      geocoder.geocode({ location: { lat, lng } }, (results: any, status: any) => {
        if (status === "OK" && results && results[0]) {
          resolve(results[0].formatted_address);
        } else {
          resolve(`Pinned location near ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
        }
      });
    });
  } else {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`, {
        headers: { "Accept-Language": "en" }
      });
      const data = await res.json();
      return data.display_name || `Pinned location near ${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    } catch (e) {
      return `Pinned location near ${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    }
  }
}

export default function LocationAutocomplete({
  label,
  value,
  onChange,
  placeholder = "Search location...",
}: LocationAutocompleteProps) {
  const [query, setQuery] = useState(value);
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<LocationData | null>(null);
  
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cacheRef = useRef<Record<string, PlacePrediction[]>>({});
  const googleServiceRef = useRef<{
    autocomplete: any;
    places: any;
  } | null>(null);

  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const handleLocateUser = () => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }

    setIsSearching(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        const address = await reverseGeocode(latitude, longitude);
        setIsSearching(false);
        const locData = { address, lat: latitude, lng: longitude };
        setSelectedLocation(locData);
        onChangeRef.current(locData);

        // Center map to new coordinates
        if (mapInstanceRef.current) {
          const googleLoaded = typeof window !== "undefined" && (window as any).google?.maps?.Map;
          if (googleLoaded && typeof mapInstanceRef.current.setCenter === 'function') {
            mapInstanceRef.current.setCenter({ lat: latitude, lng: longitude });
            markerRef.current.setPosition({ lat: latitude, lng: longitude });
          } else if (typeof mapInstanceRef.current.setView === 'function') {
            mapInstanceRef.current.setView([latitude, longitude], 15);
            markerRef.current?.setLatLng([latitude, longitude]);
          }
        }
      },
      (error) => {
        setIsSearching(false);
        console.warn("Geolocation error:", error);
        alert("Unable to retrieve location. Please check browser permissions.");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Sync state if initial value changes (e.g. prefill or reset)
  useEffect(() => {
    if (!value) {
      setQuery("");
      setSelectedLocation(null);
    } else {
      setQuery(value);
    }
  }, [value]);

  // Load Google Maps API on mount
  useEffect(() => {
    loadGoogleMaps().then(() => {
      const isLoaded = typeof window !== "undefined" && (window as any).google?.maps?.places;
      if (isLoaded) {
        // AutocompleteService is script-only
        const autocomplete = new (window as any).google.maps.places.AutocompleteService();
        // PlacesService needs an HTML element context, we use a dummy div
        const dummy = document.createElement("div");
        const places = new (window as any).google.maps.places.PlacesService(dummy);
        googleServiceRef.current = { autocomplete, places };
      }
    });
  }, []);

  // Performs Places Autocomplete prediction lookup
  const getPredictions = (input: string) => {
    if (!input.trim() || input.length < 3) {
      setPredictions([]);
      setShowDropdown(false);
      return;
    }

    // Check query cache
    const cacheKey = input.trim().toLowerCase();
    if (cacheRef.current[cacheKey]) {
      setPredictions(cacheRef.current[cacheKey]);
      setShowDropdown(true);
      return;
    }

    setIsSearching(true);

    if (googleServiceRef.current?.autocomplete) {
      // Use Real Google Autocomplete Service
      googleServiceRef.current.autocomplete.getPlacePredictions(
        {
          input: input,
          componentRestrictions: { country: "in" }, // Restrict to India
        },
        (results: any[], status: any) => {
          setIsSearching(false);
          if (status === "OK" && results) {
            const formatted = results.map((r) => ({
              description: r.description,
              placeId: r.place_id,
            }));
            cacheRef.current[cacheKey] = formatted;
            setPredictions(formatted);
            setShowDropdown(true);
          } else {
            setPredictions([]);
            setShowDropdown(false);
          }
        }
      );
    } else {
      // Fallback Mock Mode suggestions
      setTimeout(() => {
        setIsSearching(false);
        const filtered = MOCK_PLACES.filter((p) =>
          p.description.toLowerCase().includes(input.toLowerCase())
        ).map((p) => ({
          description: p.description,
          placeId: p.placeId,
        }));
        cacheRef.current[cacheKey] = filtered;
        setPredictions(filtered);
        setShowDropdown(true);
      }, 300);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);

    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      getPredictions(val);
    }, 400); // 400ms debounce
  };

  const handleSelectPrediction = (prediction: PlacePrediction) => {
    setQuery(prediction.description);
    setShowDropdown(false);
    setIsSearching(true);

    if (googleServiceRef.current?.places && !prediction.placeId.startsWith("mock-")) {
      // Fetch details from Google Places Service
      googleServiceRef.current.places.getDetails(
        {
          placeId: prediction.placeId,
          fields: ["geometry", "formatted_address", "name"],
        },
        (place: any, status: any) => {
          setIsSearching(false);
          if (status === "OK" && place?.geometry?.location) {
            const lat = place.geometry.location.lat();
            const lng = place.geometry.location.lng();
            const address = place.formatted_address || place.name || prediction.description;
            const locData: LocationData = {
              address,
              lat,
              lng,
              placeId: prediction.placeId,
            };
            setSelectedLocation(locData);
            onChange(locData);
          } else {
            console.error("Failed to get place details:", status);
          }
        }
      );
    } else {
      // Fallback Mock Details
      setIsSearching(false);
      const match = MOCK_PLACES.find((p) => p.placeId === prediction.placeId);
      if (match) {
        const locData: LocationData = {
          address: match.description,
          lat: match.lat,
          lng: match.lng,
          placeId: match.placeId,
        };
        setSelectedLocation(locData);
        onChange(locData);
      } else {
        // Fallback dummy coords
        const locData: LocationData = {
          address: prediction.description,
          lat: 17.3850,
          lng: 78.4867,
          placeId: prediction.placeId,
        };
        setSelectedLocation(locData);
        onChange(locData);
      }
    }
  };

  // Try to set initial location to user's geolocation on mount if value is empty
  useEffect(() => {
    if (!value && typeof window !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          setIsSearching(true);
          const address = await reverseGeocode(latitude, longitude);
          setIsSearching(false);
          const locData = { address, lat: latitude, lng: longitude };
          setSelectedLocation(locData);
          onChangeRef.current(locData);
        },
        (error) => {
          console.warn("Geolocation permission denied or error:", error);
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    }
  }, [value]);

  // Initialise / update map preview
  useEffect(() => {
    if (!mapContainerRef.current) return;

    const lat = selectedLocation?.lat ?? 17.3850;
    const lng = selectedLocation?.lng ?? 78.4867;

    const googleLoaded = typeof window !== "undefined" && (window as any).google?.maps?.Map;

    if (googleLoaded) {
      const mapCenter = { lat, lng };
      if (!mapInstanceRef.current || typeof mapInstanceRef.current.setView === 'function') {
        if (mapInstanceRef.current && typeof mapInstanceRef.current.remove === 'function') {
          try {
            mapInstanceRef.current.remove();
          } catch (e) {
            console.error("Error removing leaflet map:", e);
          }
        }
        
        // Ensure container is empty before Google Map initialization
        mapContainerRef.current.innerHTML = "";

        const map = new (window as any).google.maps.Map(mapContainerRef.current, {
          center: mapCenter,
          zoom: 13,
          zoomControl: true,
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: false,
        });

        const marker = new (window as any).google.maps.Marker({
          position: mapCenter,
          map: map,
          draggable: true,
        });

        const handleMapUpdate = async (newLat: number, newLng: number) => {
          setIsSearching(true);
          const address = await reverseGeocode(newLat, newLng);
          setIsSearching(false);
          const locData = { address, lat: newLat, lng: newLng };
          setSelectedLocation(locData);
          onChangeRef.current(locData);
        };

        map.addListener("click", (e: any) => {
          const cLat = e.latLng.lat();
          const cLng = e.latLng.lng();
          marker.setPosition(e.latLng);
          handleMapUpdate(cLat, cLng);
        });

        marker.addListener("dragend", (e: any) => {
          const dLat = e.latLng.lat();
          const dLng = e.latLng.lng();
          handleMapUpdate(dLat, dLng);
        });

        mapInstanceRef.current = map;
        markerRef.current = marker;
      } else {
        const currentCenter = mapInstanceRef.current.getCenter();
        const mapLat = currentCenter.lat();
        const mapLng = currentCenter.lng();
        if (Math.abs(mapLat - lat) > 0.0001 || Math.abs(mapLng - lng) > 0.0001) {
          mapInstanceRef.current.setCenter(mapCenter);
          markerRef.current.setPosition(mapCenter);
        }
      }
    } else {
      if (!mapInstanceRef.current || typeof mapInstanceRef.current.setCenter === 'function') {
        // Ensure container is empty before Leaflet map initialization
        mapContainerRef.current.innerHTML = "";

        const map = L.map(mapContainerRef.current, { zoomControl: true }).setView(
          [lat, lng],
          13
        );
        
        setTimeout(() => {
          map.invalidateSize();
        }, 100);

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: "&copy; OpenStreetMap contributors",
        }).addTo(map);

        const marker = L.marker([lat, lng], {
          draggable: true,
        }).addTo(map);

        const handleMapUpdate = async (newLat: number, newLng: number) => {
          setIsSearching(true);
          const address = await reverseGeocode(newLat, newLng);
          setIsSearching(false);
          const locData = { address, lat: newLat, lng: newLng };
          setSelectedLocation(locData);
          onChangeRef.current(locData);
        };

        map.on("click", (e: L.LeafletMouseEvent) => {
          const { lat: cLat, lng: cLng } = e.latlng;
          marker.setLatLng(e.latlng);
          handleMapUpdate(cLat, cLng);
        });

        marker.on("dragend", (e: any) => {
          const latLng = e.target.getLatLng();
          handleMapUpdate(latLng.lat, latLng.lng);
        });
        
        mapInstanceRef.current = map;
        markerRef.current = marker;
      } else {
        const currentCenter = mapInstanceRef.current.getCenter();
        const mapLat = currentCenter.lat;
        const mapLng = currentCenter.lng;
        if (Math.abs(mapLat - lat) > 0.0001 || Math.abs(mapLng - lng) > 0.0001) {
          mapInstanceRef.current.setView([lat, lng], 13);
          markerRef.current?.setLatLng([lat, lng]);
        }
      }
    }
  }, [selectedLocation]);

  return (
    <div className="relative space-y-2">
      <Label className="text-sm font-semibold text-[#013220]">{label}</Label>

      <div className="relative flex items-center">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          value={query}
          onChange={handleInputChange}
          onFocus={() => {
            if (predictions.length > 0) setShowDropdown(true);
          }}
          placeholder={placeholder}
          className="pl-9 pr-24 h-10 text-sm rounded-xl border-[#e2e8f0]"
        />
        {isSearching && (
          <Loader2 className="absolute right-20 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
        <button
          type="button"
          onClick={handleLocateUser}
          className="absolute right-2 px-2.5 py-1 text-[11px] font-semibold text-[#013220] bg-emerald-50 hover:bg-[#013220]/10 border border-[#013220]/20 rounded-lg flex items-center gap-1 transition-all"
        >
          📍 Locate
        </button>

        {/* Dropdown Suggestions */}
        {showDropdown && predictions.length > 0 && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-[#e2e8f0] rounded-xl shadow-lg max-h-56 overflow-y-auto">
            {predictions.map((p, idx) => (
              <div
                key={idx}
                onClick={() => handleSelectPrediction(p)}
                className="px-3 py-2.5 text-sm hover:bg-muted cursor-pointer border-b last:border-0 border-[#e2e8f0] flex items-start gap-2"
              >
                <MapPin className="h-4 w-4 mt-0.5 shrink-0 text-[#013220]" />
                <span className="line-clamp-2 leading-snug">{p.description}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Mini Map View - Always Visible */}
      <div className="rounded-xl border border-border bg-muted/20 p-2.5 space-y-2 mt-1">
        <p className="text-xs text-muted-foreground flex gap-1.5 items-start">
          <span className="text-sm leading-none shrink-0">📍</span>
          <span className="leading-snug">
            {selectedLocation?.address || "Click/drag marker to select address directly on map"}
          </span>
        </p>
        <div className="relative h-40 w-full rounded-lg overflow-hidden border border-border">
          <div ref={mapContainerRef} className="w-full h-full" />
          <button
            type="button"
            onClick={handleLocateUser}
            className="absolute bottom-2.5 right-2.5 z-[1000] p-2 rounded-full bg-white shadow-md border border-[#e2e8f0] hover:bg-muted text-[#013220] hover:scale-105 active:scale-95 transition-all flex items-center justify-center"
            title="Locate my position"
          >
            <span className="text-base leading-none block">🎯</span>
          </button>
        </div>
      </div>

      {/* Backdrop to close dropdown on click outside */}
      {showDropdown && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowDropdown(false)}
        />
      )}
    </div>
  );
}
