import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export interface MapMarker {
  lat: number;
  lng: number;
  title: string;
  price: string;
  type: "stay" | "car" | "bike" | "experience";
  id?: string;
}

interface ListingsMapProps {
  markers: MapMarker[];
  center?: [number, number];
  zoom?: number;
  className?: string;
}

const serviceColors: Record<string, string> = {
  stay: "#013220",
  car: "#1e40af",
  bike: "#b45309",
  experience: "#7c3aed",
};

const serviceIconSvgs: Record<string, string> = {
  stay: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
  car: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-2-2.2-3.3C13 5.6 12 5 11 5H5c-1.1 0-2.1.6-2.7 1.4L1 8v8c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/></svg>`,
  bike: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18.5" cy="17.5" r="3.5"/><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="15" cy="5" r="1"/><path d="M12 17.5V14l-3-3 4-3 2 3h2"/></svg>`,
  experience: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>`,
};

function createMarkerIcon(type: string) {
  const color = serviceColors[type] || "#013220";
  const iconSvg = serviceIconSvgs[type] || serviceIconSvgs.stay;

  return L.divIcon({
    className: "custom-map-marker",
    html: `<div style="
      background: ${color};
      width: 32px;
      height: 32px;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      border: 2px solid white;
    ">
      <div style="transform: rotate(45deg); color: white; display: flex; align-items: center; justify-content: center;">
        ${iconSvg}
      </div>
    </div>`,
    iconSize: [32, 40],
    iconAnchor: [16, 40],
    popupAnchor: [0, -40],
  });
}

const ListingsMap = ({ markers, center, zoom = 10, className = "" }: ListingsMapProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapRef.current) return;

    // Clean up previous map
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const defaultCenter: [number, number] = center || [20.5937, 78.9629];

    const map = L.map(mapRef.current, {
      center: defaultCenter,
      zoom,
      scrollWheelZoom: true,
      zoomControl: true,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    const bounds = L.latLngBounds([]);

    markers.forEach((marker) => {
      const icon = createMarkerIcon(marker.type);
      const m = L.marker([marker.lat, marker.lng], { icon }).addTo(map);

      m.bindPopup(`
        <div style="font-family: system-ui; min-width: 140px;">
          <strong style="font-size: 13px;">${marker.title}</strong>
          <div style="font-size: 12px; color: #666; margin-top: 2px;">${marker.price}</div>
          <div style="font-size: 10px; color: ${serviceColors[marker.type]}; margin-top: 4px; text-transform: capitalize; font-weight: 600;">${marker.type}</div>
        </div>
      `);

      bounds.extend([marker.lat, marker.lng]);
    });

    if (markers.length > 0 && bounds.isValid()) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 13 });
    }

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [markers, center, zoom]);

  return (
    <div className={`relative ${className}`}>
      <div ref={mapRef} className="w-full h-full rounded-xl" />
      {/* Legend */}
      <div className="absolute bottom-3 left-3 z-[1000] bg-background/90 backdrop-blur-md rounded-lg border border-border p-2.5 shadow-md">
        <div className="flex flex-wrap gap-3 text-[11px]">
          {Object.entries(serviceColors).map(([type, color]) => (
            <div key={type} className="flex items-center gap-1.5">
              <div
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: color }}
              />
              <span className="capitalize text-foreground/70">{type === "stay" ? "Stays" : type === "car" ? "Cars" : type === "bike" ? "Bikes" : "Experiences"}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ListingsMap;
