export interface AirportConfig {
  id?: string;
  name: string;
  code: string;
  latitude: number;
  longitude: number;
  place_id: string;
  geofence_radius_meters: number;
  included_distance_km: number;
  base_fares: Record<string, number>;
  extra_km_rates: Record<string, number>;
}

export const DEFAULT_AIRPORTS: AirportConfig[] = [
  {
    name: "Rajiv Gandhi International Airport (HYD)",
    code: "HYD",
    latitude: 17.2403,
    longitude: 78.4294,
    place_id: "ChIJ76h6xLKTyzsR27R742b78gA",
    geofence_radius_meters: 3000,
    included_distance_km: 35,
    base_fares: { Sedan: 1099, MUV: 1699, SUV: 2299 },
    extra_km_rates: { Sedan: 14, MUV: 18, SUV: 24 },
  },
  {
    name: "Kempegowda International Airport (BLR)",
    code: "BLR",
    latitude: 13.1986,
    longitude: 77.7066,
    place_id: "ChIJx8sCqU0RrjsR2Z_eAEv-B4g",
    geofence_radius_meters: 3000,
    included_distance_km: 35,
    base_fares: { Sedan: 1299, MUV: 1899, SUV: 2499 },
    extra_km_rates: { Sedan: 14, MUV: 18, SUV: 24 },
  },
  {
    name: "Indira Gandhi International Airport (DEL)",
    code: "DEL",
    latitude: 28.5562,
    longitude: 77.1000,
    place_id: "ChIJj83p92QBDTQR4zQj6sM_B4o",
    geofence_radius_meters: 3000,
    included_distance_km: 35,
    base_fares: { Sedan: 1199, MUV: 1799, SUV: 2399 },
    extra_km_rates: { Sedan: 14, MUV: 18, SUV: 24 },
  },
  {
    name: "Chennai International Airport (MAA)",
    code: "MAA",
    latitude: 12.9941,
    longitude: 80.1709,
    place_id: "ChIJd_6R8FBUUjoRyRxeAEv-B4g",
    geofence_radius_meters: 3000,
    included_distance_km: 35,
    base_fares: { Sedan: 1099, MUV: 1699, SUV: 2299 },
    extra_km_rates: { Sedan: 14, MUV: 18, SUV: 24 },
  },
  {
    name: "Chhatrapati Shivaji Maharaj International Airport (BOM)",
    code: "BOM",
    latitude: 19.0896,
    longitude: 72.8656,
    place_id: "ChIJ_yS8lXv55zsR2RxeAEv-B4g",
    geofence_radius_meters: 3000,
    included_distance_km: 35,
    base_fares: { Sedan: 1299, MUV: 1899, SUV: 2499 },
    extra_km_rates: { Sedan: 14, MUV: 18, SUV: 24 },
  }
];

let loadPromise: Promise<void> | null = null;

/**
 * Dynamically loads the Google Maps JavaScript API script.
 * Resolves immediately if already loaded or if no API key is set (Mock Mode).
 */
export function loadGoogleMaps(): Promise<void> {
  if (loadPromise) return loadPromise;

  loadPromise = new Promise((resolve, reject) => {
    if (typeof window !== "undefined" && (window as any).google?.maps) {
      resolve();
      return;
    }

    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";
    if (!apiKey || apiKey.includes("your-google-maps-api-key")) {
      console.warn("VITE_GOOGLE_MAPS_API_KEY is not defined. Google Maps components will run in Mock Fallback Mode.");
      resolve();
      return;
    }

    // Check if script is already present in document
    const existingScript = document.querySelector('script[src*="maps.googleapis.com/maps/api/js"]');
    if (existingScript) {
      resolve();
      return;
    }

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      console.log("Google Maps API script loaded successfully.");
      resolve();
    };
    script.onerror = (err) => {
      console.error("Failed to load Google Maps API script:", err);
      reject(err);
    };
    document.head.appendChild(script);
  });

  return loadPromise;
}

/**
 * Calculates Haversine distance in meters between two GPS coordinates.
 */
export function haversineDistance(
  coords1: { lat: number; lng: number },
  coords2: { lat: number; lng: number }
): number {
  const R = 6371e3; // Earth radius in meters
  const phi1 = (coords1.lat * Math.PI) / 180;
  const phi2 = (coords2.lat * Math.PI) / 180;
  const deltaPhi = ((coords2.lat - coords1.lat) * Math.PI) / 180;
  const deltaLambda = ((coords2.lng - coords1.lng) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) *
    Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // in meters
}

export interface RouteInfo {
  distanceKm: number;
  durationMins: number;
}

/**
 * Query the Google Distance Matrix API for road distance & duration.
 * Falls back to Haversine * 1.3 approximation if API fails, is blocked, or no key is present.
 */
export function getGoogleRouteDistance(
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number }
): Promise<RouteInfo> {
  return new Promise((resolve, reject) => {
    const isGoogleLoaded = typeof window !== "undefined" && (window as any).google?.maps?.DistanceMatrixService;

    if (!isGoogleLoaded) {
      // Fallback Mock Mode calculation
      const meters = haversineDistance(origin, destination);
      const km = (meters / 1000) * 1.3; // Road winding multiplier
      const duration = Math.max(Math.round(km * 1.4), 5); // 1.4 min/km speed approximation
      console.log(`[Mock Route] Distance approximation: ${km.toFixed(1)} km, ${duration} mins`);
      resolve({ distanceKm: Number(km.toFixed(1)), durationMins: duration });
      return;
    }

    const service = new (window as any).google.maps.DistanceMatrixService();
    service.getDistanceMatrix(
      {
        origins: [new (window as any).google.maps.LatLng(origin.lat, origin.lng)],
        destinations: [new (window as any).google.maps.LatLng(destination.lat, destination.lng)],
        travelMode: (window as any).google.maps.TravelMode.DRIVING,
        unitSystem: (window as any).google.maps.UnitSystem.METRIC,
      },
      (response: any, status: any) => {
        if (status !== "OK") {
          console.error("Distance Matrix API returned status:", status);
          reject(new Error(`Distance calculation failed: ${status}`));
          return;
        }

        const element = response.rows[0]?.elements[0];
        if (element?.status !== "OK") {
          console.error("Distance Matrix Element status error:", element?.status);
          reject(new Error("Unable to calculate road distance between these locations."));
          return;
        }

        const distanceMeters = element.distance.value;
        const durationSeconds = element.duration.value;

        resolve({
          distanceKm: Number((distanceMeters / 1000).toFixed(1)),
          durationMins: Math.round(durationSeconds / 60),
        });
      }
    );
  });
}
