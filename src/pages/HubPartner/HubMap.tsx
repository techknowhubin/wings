import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Navigation } from "lucide-react";

// Fix for default marker icon in Leaflet with bundlers
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Dummy drivers for demonstration of live tracking in assigned state
const DUMMY_DRIVERS = [
  { id: 1, name: "Raju Driver", type: "Sedan", status: "Online", lat: 17.3850, lng: 78.4867 },
  { id: 2, name: "Venkat Sai", type: "SUV", status: "On Trip", lat: 17.4120, lng: 78.4410 },
  { id: 3, name: "Arif Khan", type: "Hatchback", status: "Offline", lat: 17.4400, lng: 78.3489 },
];

export default function HubMap() {
  const { profile } = useAuth();
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<L.Map | null>(null);
  const markers = useRef<{ [key: string]: L.Marker }>({});

  useEffect(() => {
    if (!mapRef.current || leafletMap.current) return;

    // Initialize map
    leafletMap.current = L.map(mapRef.current).setView([17.3850, 78.4867], 11);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(leafletMap.current);

    return () => {
      leafletMap.current?.remove();
      leafletMap.current = null;
    };
  }, []);

  useEffect(() => {
    if (!leafletMap.current) return;

    // Plot drivers
    DUMMY_DRIVERS.forEach(driver => {
      if (!markers.current[driver.id]) {
        const marker = L.marker([driver.lat, driver.lng]).addTo(leafletMap.current!);
        markers.current[driver.id] = marker;
      }
      
      const marker = markers.current[driver.id];
      marker.bindPopup(`
        <div style="font-family: inherit; min-width: 150px;">
          <h3 style="font-weight: 600; margin: 0 0 5px 0;">${driver.name}</h3>
          <p style="margin: 0; color: #666; font-size: 13px;">${driver.type}</p>
          <div style="margin-top: 5px; font-weight: bold; color: ${
            driver.status === 'Online' ? '#10b981' : 
            driver.status === 'On Trip' ? '#f59e0b' : '#6b7280'
          }">
            ● ${driver.status}
          </div>
        </div>
      `);
    });
  }, []);

  return (
    <div className="space-y-6 flex flex-col h-[calc(100vh-6rem)]">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Live Driver Tracking</h2>
        <p className="text-muted-foreground">Real-time driver locations in {profile?.assigned_state}.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 flex-1 min-h-0">
        <Card className="md:col-span-1 flex flex-col overflow-hidden">
          <CardHeader className="bg-gray-50 dark:bg-gray-900/50 border-b">
            <CardTitle className="text-sm font-semibold flex items-center">
              <Navigation className="w-4 h-4 mr-2" /> Active Drivers
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto p-0">
            <div className="divide-y">
              {DUMMY_DRIVERS.map(driver => (
                <div key={driver.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-900/50 cursor-pointer transition-colors"
                  onClick={() => leafletMap.current?.flyTo([driver.lat, driver.lng], 14)}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-medium text-sm">{driver.name}</span>
                    <Badge variant={
                      driver.status === 'Online' ? 'default' : 
                      driver.status === 'On Trip' ? 'outline' : 'secondary'
                    } className={driver.status === 'On Trip' ? 'border-amber-500 text-amber-600' : ''}>
                      {driver.status}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">{driver.type}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="md:col-span-3 rounded-xl overflow-hidden border shadow-sm relative h-[400px] md:h-full">
          <div ref={mapRef} className="absolute inset-0" />
        </div>
      </div>
    </div>
  );
}
