import { useState, useEffect, useRef } from "react";
import { MapPin, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { loadGoogleMaps, isWithinHyderabad, HYDERABAD_BBOX } from "@/lib/googleMaps";

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
  restrictToHyderabad?: boolean;
  onError?: (error: string | null) => void;
}

interface PlacePrediction {
  description: string;
  placeId: string;
  // Pre-resolved coords (Nominatim results include these; avoids a second API call)
  lat?: number;
  lng?: number;
}

const SERVICE_AREA_ERROR =
  "Airport transfers and Local transfers are available only within Hyderabad city limits.";
const GEO_UNAVAILABLE_ERROR =
  "Unable to detect your current location. Please search manually.";

// Build a clean display label from Photon feature properties
function formatPhotonLabel(props: any): string {
  const parts: string[] = [];
  if (props.name) parts.push(props.name);
  if (props.street) {
    parts.push(props.housenumber ? `${props.housenumber} ${props.street}` : props.street);
  }
  const area = props.suburb || props.district || props.neighbourhood;
  if (area) parts.push(area);
  const city = props.city || props.town || props.village || props.municipality;
  if (city && city !== area) parts.push(city);
  if (props.state) parts.push(props.state);
  return parts.filter(Boolean).join(", ") || "Unknown location";
}

// Photon (Komoot) autocomplete — handles POIs, hospitals, landmarks, businesses
// Free, no API key, built on OpenStreetMap POI data
async function photonSearch(
  input: string,
  biasToHyderabad: boolean
): Promise<PlacePrediction[]> {
  const params = new URLSearchParams({ q: input, lang: "en", limit: "8" });
  if (biasToHyderabad) {
    params.set("lat", "17.3850");
    params.set("lon", "78.4867");
  }
  const res = await fetch(`https://photon.komoot.io/api/?${params.toString()}`);
  if (!res.ok) throw new Error(`Photon ${res.status}`);
  const data = await res.json();
  if (!data?.features?.length) return [];

  return (data.features as any[])
    .filter((f) => f.properties?.countrycode === "IN")
    .map((f) => {
      const [lng, lat] = f.geometry.coordinates as [number, number];
      return {
        description: formatPhotonLabel(f.properties),
        placeId: `photon-${f.properties.osm_id}-${f.properties.osm_type ?? ""}`,
        lat,
        lng,
      };
    });
}

// Nominatim address search — fallback when Photon is unavailable
async function nominatimSearch(
  input: string,
  biasToHyderabad: boolean
): Promise<PlacePrediction[]> {
  const params = new URLSearchParams({
    format: "jsonv2",
    q: input,
    countrycodes: "in",
    limit: "6",
    addressdetails: "1",
  });
  if (biasToHyderabad) {
    params.set("viewbox", `${HYDERABAD_BBOX.lngMin},${HYDERABAD_BBOX.latMax},${HYDERABAD_BBOX.lngMax},${HYDERABAD_BBOX.latMin}`);
    params.set("bounded", "1");
  }
  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?${params.toString()}`,
    { headers: { "Accept-Language": "en" } }
  );
  const data = await res.json();
  if (!Array.isArray(data) || !data.length) return [];
  return data.map((item: any) => ({
    description: item.display_name,
    placeId: `nominatim-${item.place_id}`,
    lat: parseFloat(item.lat),
    lng: parseFloat(item.lon),
  }));
}

// Primary search: Photon with Nominatim fallback
async function openStreetMapSearch(
  input: string,
  biasToHyderabad: boolean
): Promise<PlacePrediction[]> {
  try {
    const results = await photonSearch(input, biasToHyderabad);
    if (results.length > 0) return results;
    // Photon returned nothing — try Nominatim for pure address queries
    return nominatimSearch(input, biasToHyderabad);
  } catch {
    return nominatimSearch(input, biasToHyderabad);
  }
}

async function reverseGeocode(lat: number, lng: number): Promise<string> {
  const googleLoaded = typeof window !== "undefined" && (window as any).google?.maps?.Geocoder;
  if (googleLoaded) {
    return new Promise((resolve) => {
      const geocoder = new (window as any).google.maps.Geocoder();
      geocoder.geocode({ location: { lat, lng } }, (results: any, status: any) => {
        if (status === "OK" && results?.[0]) {
          resolve(results[0].formatted_address);
        } else {
          resolve(`Pinned location near ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
        }
      });
    });
  }
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`,
      { headers: { "Accept-Language": "en" } }
    );
    const data = await res.json();
    return data.display_name || `Pinned location near ${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  } catch {
    return `Pinned location near ${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  }
}

export default function LocationAutocomplete({
  label,
  value,
  onChange,
  placeholder = "Search location...",
  restrictToHyderabad = false,
  onError,
}: LocationAutocompleteProps) {
  const [query, setQuery] = useState(value);
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<LocationData | null>(null);
  // Service area error: blocks booking, red styling
  const [serviceAreaError, setServiceAreaError] = useState<string | null>(null);
  // GPS error: informational only, clears on next successful action
  const [geoError, setGeoError] = useState<string | null>(null);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cacheRef = useRef<Record<string, PlacePrediction[]>>({});
  const googleServiceRef = useRef<{ autocomplete: any; places: any } | null>(null);

  // Stable refs for props accessed inside map closures
  const onChangeRef = useRef(onChange);
  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);

  const restrictToHyderabadRef = useRef(restrictToHyderabad);
  useEffect(() => { restrictToHyderabadRef.current = restrictToHyderabad; }, [restrictToHyderabad]);

  const onErrorRef = useRef(onError);
  useEffect(() => { onErrorRef.current = onError; }, [onError]);

  // Imperatively pan/zoom the map (Google or Leaflet)
  const panMapTo = (lat: number, lng: number, zoom = 16) => {
    const map = mapInstanceRef.current;
    if (!map) return;
    if (typeof map.panTo === "function") {
      map.panTo({ lat, lng });
      map.setZoom(zoom);
      markerRef.current?.setPosition({ lat, lng });
    } else if (typeof map.setView === "function") {
      map.setView([lat, lng], zoom);
      markerRef.current?.setLatLng([lat, lng]);
    }
  };

  // Validate location against Hyderabad boundary, commit to parent if valid
  const commitLocation = async (locData: LocationData): Promise<boolean> => {
    setGeoError(null); // clear any prior GPS error on new selection
    if (restrictToHyderabadRef.current) {
      const valid = await isWithinHyderabad(locData.lat, locData.lng);
      if (!valid) {
        setServiceAreaError(SERVICE_AREA_ERROR);
        onErrorRef.current?.(SERVICE_AREA_ERROR);
        return false;
      }
    }
    setSelectedLocation(locData);
    setServiceAreaError(null);
    onErrorRef.current?.(null);
    onChangeRef.current(locData);
    return true;
  };

  const handleLocateUser = () => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      setGeoError(GEO_UNAVAILABLE_ERROR);
      return; // GPS unavailable is NOT a service area error — don't call onError
    }
    setIsSearching(true);
    setGeoError(null);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        const address = await reverseGeocode(latitude, longitude);
        setIsSearching(false);
        setQuery(address);
        const locData: LocationData = { address, lat: latitude, lng: longitude };
        const valid = await commitLocation(locData);
        panMapTo(latitude, longitude, 16);
        if (!valid) {
          markerRef.current?.setPosition?.({ lat: latitude, lng: longitude });
          markerRef.current?.setLatLng?.([latitude, longitude]);
        }
      },
      (error) => {
        setIsSearching(false);
        console.warn("Geolocation error:", error);
        setGeoError(GEO_UNAVAILABLE_ERROR);
        // GPS failure is NOT a service area violation — don't call onError
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Sync if external value resets (e.g. trip type toggle clears locations)
  useEffect(() => {
    if (!value) {
      setQuery("");
      setSelectedLocation(null);
      setServiceAreaError(null);
      setGeoError(null);
      onErrorRef.current?.(null);
    } else {
      setQuery(value);
    }
  }, [value]);

  // Load Google Maps & Places services
  useEffect(() => {
    loadGoogleMaps().then(() => {
      const isLoaded = typeof window !== "undefined" && (window as any).google?.maps?.places;
      if (isLoaded) {
        const autocomplete = new (window as any).google.maps.places.AutocompleteService();
        const dummy = document.createElement("div");
        const places = new (window as any).google.maps.places.PlacesService(dummy);
        googleServiceRef.current = { autocomplete, places };
      }
    });
  }, []);

  const getPredictions = (input: string) => {
    if (!input.trim() || input.length < 3) {
      setPredictions([]);
      setShowDropdown(false);
      return;
    }
    const cacheKey = input.trim().toLowerCase();
    if (cacheRef.current[cacheKey]) {
      setPredictions(cacheRef.current[cacheKey]);
      setShowDropdown(true);
      return;
    }
    setIsSearching(true);
    if (googleServiceRef.current?.autocomplete) {
      googleServiceRef.current.autocomplete.getPlacePredictions(
        { input, componentRestrictions: { country: "in" } },
        (results: any[], status: any) => {
          setIsSearching(false);
          if (status === "OK" && results) {
            const formatted = results.map((r) => ({ description: r.description, placeId: r.place_id }));
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
      // No Google Maps API key — use Photon → Nominatim fallback
      openStreetMapSearch(input, restrictToHyderabadRef.current)
        .then((results) => {
          setIsSearching(false);
          cacheRef.current[cacheKey] = results;
          setPredictions(results);
          setShowDropdown(results.length > 0);
        })
        .catch(() => {
          setIsSearching(false);
          setPredictions([]);
          setShowDropdown(false);
        });
    }
  };

  // Enter key / "Show on Map": commit first available prediction or do a fresh search
  const handleSearchSubmit = async () => {
    const q = query.trim();
    if (!q) return;
    setShowDropdown(false);
    if (predictions.length > 0) {
      await handleSelectPrediction(predictions[0]);
      return;
    }
    // No cached predictions yet — search now and pick the top result
    setIsSearching(true);
    try {
      const results = googleServiceRef.current
        ? [] // Google Places path handled via handleSelectPrediction
        : await openStreetMapSearch(q, restrictToHyderabadRef.current);
      setIsSearching(false);
      if (results.length > 0) {
        await handleSelectPrediction(results[0]);
      }
    } catch {
      setIsSearching(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    setGeoError(null); // typing a new address clears stale GPS error
    if (!val) {
      setServiceAreaError(null);
      onErrorRef.current?.(null);
    }
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => getPredictions(val), 400);
  };

  const handleSelectPrediction = async (prediction: PlacePrediction) => {
    setQuery(prediction.description);
    setShowDropdown(false);

    // Nominatim (and future pre-resolved) results already carry coords
    if (prediction.lat !== undefined && prediction.lng !== undefined) {
      const locData: LocationData = {
        address: prediction.description,
        lat: prediction.lat,
        lng: prediction.lng,
        placeId: prediction.placeId,
      };
      const valid = await commitLocation(locData);
      panMapTo(prediction.lat, prediction.lng, 16);
      if (!valid) {
        markerRef.current?.setPosition?.({ lat: prediction.lat, lng: prediction.lng });
        markerRef.current?.setLatLng?.([prediction.lat, prediction.lng]);
      }
      return;
    }

    // Google Places — need a second call to resolve coords
    setIsSearching(true);
    if (googleServiceRef.current?.places) {
      googleServiceRef.current.places.getDetails(
        { placeId: prediction.placeId, fields: ["geometry", "formatted_address", "name"] },
        async (place: any, status: any) => {
          setIsSearching(false);
          if (status === "OK" && place?.geometry?.location) {
            const lat = place.geometry.location.lat();
            const lng = place.geometry.location.lng();
            const address = place.formatted_address || place.name || prediction.description;
            setQuery(address);
            const locData: LocationData = { address, lat, lng, placeId: prediction.placeId };
            const valid = await commitLocation(locData);
            panMapTo(lat, lng, 16);
            if (!valid) {
              markerRef.current?.setPosition?.({ lat, lng });
              markerRef.current?.setLatLng?.([lat, lng]);
            }
          } else {
            setIsSearching(false);
            console.error("Failed to get place details:", status);
          }
        }
      );
    } else {
      setIsSearching(false);
    }
  };

  // Map initialisation / update (depends on selectedLocation for re-centering after valid selections)
  useEffect(() => {
    if (!mapContainerRef.current) return;

    const lat = selectedLocation?.lat ?? 17.385;
    const lng = selectedLocation?.lng ?? 78.4867;
    const googleLoaded = typeof window !== "undefined" && (window as any).google?.maps?.Map;

    if (googleLoaded) {
      const mapCenter = { lat, lng };

      if (!mapInstanceRef.current || typeof mapInstanceRef.current.setView === "function") {
        // First init or switching from Leaflet → Google
        if (mapInstanceRef.current && typeof mapInstanceRef.current.remove === "function") {
          try { mapInstanceRef.current.remove(); } catch (_) {}
        }
        mapContainerRef.current.innerHTML = "";

        const map = new (window as any).google.maps.Map(mapContainerRef.current, {
          center: mapCenter,
          zoom: 12,
          zoomControl: true,
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: false,
          restriction: restrictToHyderabadRef.current ? {
            latLngBounds: {
              north: HYDERABAD_BBOX.latMax,
              south: HYDERABAD_BBOX.latMin,
              east: HYDERABAD_BBOX.lngMax,
              west: HYDERABAD_BBOX.lngMin,
            },
            strictBounds: true,
          } : undefined,
        });

        const marker = new (window as any).google.maps.Marker({
          position: mapCenter,
          map,
          draggable: true,
        });

        // Defined inside useEffect so it captures stable refs, not stale closures
        const handleMapUpdate = async (newLat: number, newLng: number) => {
          setIsSearching(true);
          const address = await reverseGeocode(newLat, newLng);
          setIsSearching(false);
          setQuery(address);

          const locData: LocationData = { address, lat: newLat, lng: newLng };

          if (restrictToHyderabadRef.current) {
            const valid = await isWithinHyderabad(newLat, newLng);
            if (!valid) {
              setServiceAreaError(SERVICE_AREA_ERROR);
              onErrorRef.current?.(SERVICE_AREA_ERROR);
              return;
            }
          }

          setSelectedLocation(locData);
          setServiceAreaError(null);
          onErrorRef.current?.(null);
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
        // Map already initialised — pan to updated location if significantly different
        const currentCenter = mapInstanceRef.current.getCenter();
        if (
          Math.abs(currentCenter.lat() - lat) > 0.0001 ||
          Math.abs(currentCenter.lng() - lng) > 0.0001
        ) {
          mapInstanceRef.current.panTo(mapCenter);
          mapInstanceRef.current.setZoom(16);
          markerRef.current.setPosition(mapCenter);
        }
      }
    } else {
      // Leaflet fallback
      if (!mapInstanceRef.current || typeof mapInstanceRef.current.setCenter === "function") {
        mapContainerRef.current.innerHTML = "";

        const mapOptions: L.MapOptions = { zoomControl: true };
        if (restrictToHyderabadRef.current) {
          mapOptions.maxBounds = [
            [HYDERABAD_BBOX.latMin, HYDERABAD_BBOX.lngMin],
            [HYDERABAD_BBOX.latMax, HYDERABAD_BBOX.lngMax]
          ];
          mapOptions.maxBoundsViscosity = 1.0;
        }
        const map = L.map(mapContainerRef.current, mapOptions).setView([lat, lng], 12);
        setTimeout(() => map.invalidateSize(), 100);

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: "&copy; OpenStreetMap contributors",
        }).addTo(map);

        const marker = L.marker([lat, lng], { draggable: true }).addTo(map);

        const handleMapUpdate = async (newLat: number, newLng: number) => {
          setIsSearching(true);
          const address = await reverseGeocode(newLat, newLng);
          setIsSearching(false);
          setQuery(address);

          const locData: LocationData = { address, lat: newLat, lng: newLng };

          if (restrictToHyderabadRef.current) {
            const valid = await isWithinHyderabad(newLat, newLng);
            if (!valid) {
              setServiceAreaError(SERVICE_AREA_ERROR);
              onErrorRef.current?.(SERVICE_AREA_ERROR);
              return;
            }
          }

          setSelectedLocation(locData);
          setServiceAreaError(null);
          onErrorRef.current?.(null);
          onChangeRef.current(locData);
        };

        map.on("click", (e: L.LeafletMouseEvent) => {
          marker.setLatLng(e.latlng);
          handleMapUpdate(e.latlng.lat, e.latlng.lng);
        });

        marker.on("dragend", (e: any) => {
          const ll = e.target.getLatLng();
          handleMapUpdate(ll.lat, ll.lng);
        });

        mapInstanceRef.current = map;
        markerRef.current = marker;
      } else {
        const currentCenter = mapInstanceRef.current.getCenter();
        if (
          Math.abs(currentCenter.lat - lat) > 0.0001 ||
          Math.abs(currentCenter.lng - lng) > 0.0001
        ) {
          mapInstanceRef.current.setView([lat, lng], 16);
          markerRef.current?.setLatLng([lat, lng]);
        }
      }
    }
  }, [selectedLocation]);

  // Only service area failures drive red styling + block booking
  const hasServiceError = !!serviceAreaError;

  return (
    <div className="relative space-y-2">
      <div className="flex justify-between items-center">
        <Label className="text-sm font-semibold text-[#013220]">{label}</Label>
        {restrictToHyderabad && (
          <span className="text-[10px] font-bold text-white bg-[#013220] px-2 py-0.5 rounded-md">Service Area: Hyderabad Only</span>
        )}
      </div>

      <div className="relative flex items-center">
        <MapPin className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none ${hasServiceError ? "text-red-400" : "text-muted-foreground"}`} />
        <Input
          value={query}
          onChange={handleInputChange}
          onFocus={() => { if (predictions.length > 0) setShowDropdown(true); }}
          onKeyDown={(e) => {
            if (e.key === "Enter") { e.preventDefault(); handleSearchSubmit(); }
            if (e.key === "Escape") { setShowDropdown(false); }
          }}
          placeholder={placeholder}
          className={`pl-9 pr-24 h-10 text-sm rounded-xl transition-colors ${hasServiceError ? "border-red-400 focus-visible:ring-red-400" : "border-[#e2e8f0]"}`}
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

        {showDropdown && predictions.length > 0 && (
          <div className="absolute top-full z-[2000] w-full mt-1 bg-white border border-[#e2e8f0] rounded-xl shadow-xl max-h-64 overflow-y-auto">
            {predictions.map((p, idx) => (
              <div
                key={idx}
                onClick={() => handleSelectPrediction(p)}
                className="px-3 py-3 text-sm hover:bg-muted cursor-pointer border-b last:border-0 border-[#e2e8f0] flex items-start gap-2 active:bg-muted"
              >
                <MapPin className="h-4 w-4 mt-0.5 shrink-0 text-[#013220]" />
                <span className="leading-snug">{p.description}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* GPS / locate error — informational only, does not block booking */}
      {geoError && !hasServiceError && !showDropdown && (
        <p className="text-[11px] text-amber-600 flex items-start gap-1 px-1 leading-snug">
          <span className="shrink-0 mt-0.5">📍</span>
          <span>{geoError} You can still search an address above.</span>
        </p>
      )}

      {/* Service area error — blocks booking */}
      {hasServiceError && !showDropdown && (
        <p className="text-[11px] text-red-500 flex items-start gap-1 px-1 leading-snug">
          <span className="shrink-0 mt-0.5">⚠️</span>
          <span>{serviceAreaError}</span>
        </p>
      )}

      {/* Map panel — hidden while suggestions dropdown is open */}
      <div className={`rounded-xl border p-1.5 md:p-2.5 space-y-1 md:space-y-2 mt-1 transition-colors ${showDropdown ? "hidden" : ""} ${hasServiceError ? "border-red-300 bg-red-50/30" : "border-border bg-muted/20"}`}>
        <p className={`text-xs flex gap-1.5 items-start leading-snug ${hasServiceError ? "text-red-500" : "text-muted-foreground"}`}>
          <span className="text-sm shrink-0 leading-none">📍</span>
          <span>{query || "Search or drag the pin to set your exact location"}</span>
        </p>

        <div className="relative h-[180px] md:h-48 w-full rounded-lg overflow-hidden border border-border">
          <div ref={mapContainerRef} className="w-full h-full" />

          <button
            type="button"
            onClick={handleLocateUser}
            title="Use my current location"
            className="absolute bottom-2.5 right-2.5 z-[1000] p-2 rounded-full bg-white shadow-md border border-[#e2e8f0] hover:bg-muted text-[#013220] hover:scale-105 active:scale-95 transition-all"
          >
            <span className="text-base leading-none block">🎯</span>
          </button>

          {!selectedLocation && !isSearching && (
            <div className="absolute inset-x-0 bottom-0 pointer-events-none">
              <div className="mx-auto mb-2 w-fit bg-black/60 text-white text-[10px] font-medium px-2.5 py-1 rounded-full">
                Drag pin · Tap map · Or search above
              </div>
            </div>
          )}
        </div>

        {/* "Service not available" footer — only for actual out-of-Telangana locations */}
        {hasServiceError && (
          <p className="text-[11px] text-red-500 font-semibold text-center">
            Service not available in this location
          </p>
        )}
      </div>

      {showDropdown && (
        <div className="fixed inset-0 z-40" onClick={() => setShowDropdown(false)} />
      )}
    </div>
  );
}
