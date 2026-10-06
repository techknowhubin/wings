const fs = require('fs');
let code = fs.readFileSync('src/components/LocationAutocomplete.tsx', 'utf8');

// Replace imports
code = code.replace(/isWithinHyderabad, HYDERABAD_BBOX/, 'isWithinCityArea, HYDERABAD_BBOX, BANGALORE_BBOX');

// Props
code = code.replace(/restrictToHyderabad\?: boolean;/, 'restrictToCity?: string | null;');
code = code.replace(/restrictToHyderabad = false,/g, 'restrictToCity = null,');

// Service error string
code = code.replace(
  /const SERVICE_AREA_ERROR =[\s\S]*?limits\.";/,
  'const getServiceAreaError = (city: string | null | undefined) => `Airport transfers and Local transfers are available only within ${city === "bangalore" ? "Bangalore" : "Hyderabad"} city limits.`;'
);

// photonSearch
code = code.replace(/biasToHyderabad: boolean/g, 'biasCity: string | null | undefined');
code = code.replace(
  /if \(biasToHyderabad\) \{/,
  'if (biasCity === "bangalore") { params.set("lat", "12.9716"); params.set("lon", "77.5946"); } else if (biasCity) {'
);

// nominatimSearch viewbox
code = code.replace(
  /if \(biasToHyderabad\) \{[\s\S]*?bounded", "1"\);\n  \}/g,
  'if (biasCity) { const bbox = biasCity === "bangalore" ? BANGALORE_BBOX : HYDERABAD_BBOX; params.set("viewbox", `${bbox.lngMin},${bbox.latMax},${bbox.lngMax},${bbox.latMin}`); params.set("bounded", "1"); }'
);

// refs
code = code.replace(/restrictToHyderabadRef/g, 'restrictToCityRef');
code = code.replace(/restrictToHyderabad/g, 'restrictToCity');

// validation calls
code = code.replace(/isWithinHyderabad\(/g, 'isWithinCityArea(');
code = code.replace(/isWithinCityArea\(([^,]+), ([^,)]+)\)/g, 'isWithinCityArea($1, $2, restrictToCityRef.current || "")');
code = code.replace(/setServiceAreaError\(SERVICE_AREA_ERROR\);/g, 'const err = getServiceAreaError(restrictToCityRef.current); setServiceAreaError(err);');
code = code.replace(/onErrorRef\.current\?\.\(SERVICE_AREA_ERROR\);/g, 'onErrorRef.current?.(err);');

// UI notice
code = code.replace(/Service Area: Hyderabad Only/g, 'Service Area: {restrictToCity === "bangalore" ? "Bangalore" : "Hyderabad"} Only');

// Google maps restriction bounds for autocomplete
code = code.replace(
  /restriction: restrictToCityRef\.current \? \{[\s\S]*?\} : undefined,/g,
  'restriction: restrictToCityRef.current ? { latLngBounds: restrictToCityRef.current === "bangalore" ? { north: BANGALORE_BBOX.latMax, south: BANGALORE_BBOX.latMin, east: BANGALORE_BBOX.lngMax, west: BANGALORE_BBOX.lngMin } : { north: HYDERABAD_BBOX.latMax, south: HYDERABAD_BBOX.latMin, east: HYDERABAD_BBOX.lngMax, west: HYDERABAD_BBOX.lngMin } } : undefined,'
);

fs.writeFileSync('src/components/LocationAutocomplete.tsx', code);
console.log("Successfully replaced LocationAutocomplete.tsx");
