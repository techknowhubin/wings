import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import CabFareCard from "./CabFareCard";
import CabFareKPIs from "./CabFareKPIs";

type State = "telangana" | "andhra" | "karnataka";

interface FareData {
  fromCode: string;
  fromCity: string;
  toCode: string;
  toCity: string;
  distance: string;
  sedanPrice: number;
  sedanDiscountedPrice?: number;
  suvPrice: number;
  suvDiscountedPrice?: number;
}

const fallbackCabFares: Record<State, FareData[]> = {
  telangana: [
    { fromCode: "HYD", fromCity: "Hyderabad", toCode: "WGL", toCity: "Warangal", distance: "350 km", sedanPrice: 7900, suvPrice: 10000 },
    { fromCode: "HYD", fromCity: "Hyderabad", toCode: "KHM", toCity: "Khammam", distance: "450 km", sedanPrice: 9700, suvPrice: 13000 },
    { fromCode: "HYD", fromCity: "Hyderabad", toCode: "NZB", toCity: "Nizamabad", distance: "400 km", sedanPrice: 9000, suvPrice: 12000 },
    { fromCode: "HYD", fromCity: "Hyderabad", toCode: "KRM", toCity: "Karimnagar", distance: "400 km", sedanPrice: 8700, suvPrice: 11700 },
    { fromCode: "HYD", fromCity: "Hyderabad", toCode: "MHB", toCity: "Mahbubnagar", distance: "250 km", sedanPrice: 7000, suvPrice: 8700 },
    { fromCode: "HYD", fromCity: "Hyderabad", toCode: "SDD", toCity: "Siddipet", distance: "250 km", sedanPrice: 7200, suvPrice: 9000 },
    { fromCode: "HYD", fromCity: "Hyderabad", toCode: "ADL", toCity: "Adilabad", distance: "650 km", sedanPrice: 14500, suvPrice: 20000 },
    { fromCode: "HYD", fromCity: "Hyderabad", toCode: "NLG", toCity: "Nalgonda", distance: "250 km", sedanPrice: 6900, suvPrice: 8600 },
  ],
  andhra: [
    { fromCode: "HYD", fromCity: "Hyderabad", toCode: "VJA", toCity: "Vijayawada", distance: "600 km", sedanPrice: 12500, suvPrice: 16500 },
    { fromCode: "HYD", fromCity: "Hyderabad", toCode: "VSK", toCity: "Visakhapatnam", distance: "1300 km", sedanPrice: 25500, suvPrice: 32000 },
    { fromCode: "HYD", fromCity: "Hyderabad", toCode: "TPT", toCity: "Tirupati", distance: "1200 km", sedanPrice: 22000, suvPrice: 28500 },
    { fromCode: "HYD", fromCity: "Hyderabad", toCode: "GNT", toCity: "Guntur", distance: "650 km", sedanPrice: 13000, suvPrice: 17200 },
    { fromCode: "HYD", fromCity: "Hyderabad", toCode: "NEL", toCity: "Nellore", distance: "1000 km", sedanPrice: 19500, suvPrice: 25000 },
    { fromCode: "HYD", fromCity: "Hyderabad", toCode: "KDP", toCity: "Kadapa", distance: "900 km", sedanPrice: 17500, suvPrice: 22500 },
    { fromCode: "HYD", fromCity: "Hyderabad", toCode: "RJM", toCity: "Rajahmundry", distance: "850 km", sedanPrice: 16800, suvPrice: 21500 },
    { fromCode: "HYD", fromCity: "Hyderabad", toCode: "KNL", toCity: "Kurnool", distance: "500 km", sedanPrice: 10500, suvPrice: 14000 },
  ],
  karnataka: [
    { fromCode: "HYD", fromCity: "Hyderabad", toCode: "BLR", toCity: "Bangalore", distance: "1200 km", sedanPrice: 23500, suvPrice: 29500 },
    { fromCode: "HYD", fromCity: "Hyderabad", toCode: "MYS", toCity: "Mysore", distance: "1500 km", sedanPrice: 27500, suvPrice: 35000 },
    { fromCode: "HYD", fromCity: "Hyderabad", toCode: "HBL", toCity: "Hubli", distance: "900 km", sedanPrice: 18000, suvPrice: 23500 },
    { fromCode: "HYD", fromCity: "Hyderabad", toCode: "BGM", toCity: "Belgaum", distance: "1100 km", sedanPrice: 21000, suvPrice: 27000 },
    { fromCode: "HYD", fromCity: "Hyderabad", toCode: "MNG", toCity: "Mangalore", distance: "1600 km", sedanPrice: 30500, suvPrice: 39000 },
    { fromCode: "HYD", fromCity: "Hyderabad", toCode: "GLP", toCity: "Gulbarga", distance: "500 km", sedanPrice: 10800, suvPrice: 14500 },
    { fromCode: "HYD", fromCity: "Hyderabad", toCode: "DVG", toCity: "Davangere", distance: "1000 km", sedanPrice: 19800, suvPrice: 26000 },
    { fromCode: "HYD", fromCity: "Hyderabad", toCode: "BDR", toCity: "Bidar", distance: "350 km", sedanPrice: 7800, suvPrice: 10200 },
  ],
};

const stateLabels: Record<State, string> = {
  telangana: "Telangana",
  andhra: "Andhra Pradesh",
  karnataka: "Karnataka",
};

const sheetUrls: Record<State, string> = {
  telangana: "https://docs.google.com/spreadsheets/d/1V8IvrFbXqy4y1z3Lj1jLTqSGevQFKlut5w8aHsZbWT8/edit?usp=sharing",
  andhra: "https://docs.google.com/spreadsheets/d/1z8eXpn_WqChYEx-ZbWWQiPRaYZ3NhkmHYio_d5RF1UA/edit?usp=sharing",
  karnataka: "https://docs.google.com/spreadsheets/d/19QHm9BcPK_DHs6t2bd2znn84TjOv4UtrfUFgQbnHUfc/edit?usp=sharing",
};

const normalizeHeader = (value: string) =>
  value
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[^a-z0-9]/g, "");

const parseCsvLine = (line: string): string[] => {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"' && inQuotes && next === '"') {
      current += '"';
      i += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === "," && !inQuotes) {
      values.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  values.push(current.trim());
  return values;
};

const extractSheetId = (sheetUrl: string) => {
  const match = sheetUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return match?.[1] ?? "";
};

const toCsvExportUrl = (sheetUrl: string) => {
  const sheetId = extractSheetId(sheetUrl);
  if (!sheetId) return "";
  try {
    const url = new URL(sheetUrl);
    const gid = url.searchParams.get("gid");
    return gid
      ? `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`
      : `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;
  } catch {
    return `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;
  }
};

const toGvizUrl = (sheetUrl: string) => {
  const sheetId = extractSheetId(sheetUrl);
  if (!sheetId) return "";
  try {
    const url = new URL(sheetUrl);
    const gid = url.searchParams.get("gid");
    return gid
      ? `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&gid=${gid}`
      : `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json`;
  } catch {
    return `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json`;
  }
};

const loadGvizWithJsonp = (sheetUrl: string): Promise<any | null> => {
  return new Promise((resolve) => {
    const sheetId = extractSheetId(sheetUrl);
    if (!sheetId) {
      resolve(null);
      return;
    }

    const callbackName = `__cabFareCb_${Math.random().toString(36).slice(2)}`;
    const cleanup = (script?: HTMLScriptElement) => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        delete (window as any)[callbackName];
      } catch {
        // ignore
      }
      if (script?.parentNode) script.parentNode.removeChild(script);
    };

    const timeoutId = window.setTimeout(() => {
      cleanup(script);
      resolve(null);
    }, 8000);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any)[callbackName] = (payload: any) => {
      window.clearTimeout(timeoutId);
      cleanup(script);
      resolve(payload ?? null);
    };

    const script = document.createElement("script");
    const gid = (() => {
      try {
        const parsed = new URL(sheetUrl);
        return parsed.searchParams.get("gid");
      } catch {
        return null;
      }
    })();
    const base = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq`;
    const query = gid
      ? `tqx=responseHandler:${callbackName}&gid=${gid}`
      : `tqx=responseHandler:${callbackName}`;
    script.src = `${base}?${query}`;
    script.async = true;
    script.onerror = () => {
      window.clearTimeout(timeoutId);
      cleanup(script);
      resolve(null);
    };
    document.body.appendChild(script);
  });
};

const toPrice = (value: string) => {
  const numeric = Number(String(value).replace(/[^\d.]/g, ""));
  return Number.isFinite(numeric) ? numeric : 0;
};

const toDistance = (value: string) => {
  const trimmed = String(value ?? "").trim();
  if (!trimmed) return "";
  return /km/i.test(trimmed) ? trimmed : `${trimmed} km`;
};

const cityToCode = (city: string) => {
  const letters = city
    .replace(/[^a-zA-Z\s]/g, "")
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
  return letters.slice(0, 3) || "NA";
};

const pick = (row: Record<string, string>, keys: string[]) => {
  for (const key of keys) {
    if (row[key]) return row[key];
  }
  return "";
};

const splitCodeAndCity = (value: string) => {
  const raw = String(value ?? "").trim();
  if (!raw) return { code: "", city: "" };
  const [left, ...rest] = raw.split("/");
  if (rest.length === 0) {
    return { code: cityToCode(raw), city: raw };
  }
  return { code: left.trim().toUpperCase(), city: rest.join("/").trim() };
};

const mapRowToFare = (row: Record<string, string>): FareData => {
  const sourceCombined = pick(row, ["source", "from", "pickup", "sourcecity"]);
  const destinationCombined = pick(row, ["destination", "to", "drop", "destinationcity"]);
  const sourceSplit = splitCodeAndCity(sourceCombined);
  const destinationSplit = splitCodeAndCity(destinationCombined);

  const fromCity = pick(row, ["fromcity", "sourcecity", "pickupcity"]) || sourceSplit.city;
  const toCity = pick(row, ["tocity", "destinationcity", "dropcity"]) || destinationSplit.city;
  const fromCode =
    pick(row, ["fromcode", "fromshort", "sourcecode", "pickupcode"]) || sourceSplit.code || cityToCode(fromCity);
  const toCode =
    pick(row, ["tocode", "toshort", "destinationcode", "dropcode"]) || destinationSplit.code || cityToCode(toCity);
  const distance = toDistance(pick(row, ["distance", "distancekm", "kms", "km"]));
  const sedanPrice = toPrice(pick(row, ["sedanprice", "sedan", "sedanfare", "price_sedan"]));
  const sedanDiscountedPrice = toPrice(
    pick(row, ["sedandiscounted", "sedandiscountedprice", "sedandiscount", "sedan_offer"]),
  );
  const suvPrice = toPrice(pick(row, ["suvprice", "suv", "suvfare", "price_suv"]));
  const suvDiscountedPrice = toPrice(
    pick(row, ["suvdiscounted", "suvdiscountedprice", "suvdiscount", "suv_offer"]),
  );

  return {
    fromCode,
    fromCity,
    toCode,
    toCity,
    distance,
    sedanPrice,
    sedanDiscountedPrice,
    suvPrice,
    suvDiscountedPrice,
  };
};

const parseFareCsv = (csv: string): FareData[] => {
  const lines = csv.split(/\r?\n/).filter((line) => line.trim().length > 0);

  if (lines.length < 2) return [];

  const rawHeaders = parseCsvLine(lines[0]);
  const headers = rawHeaders.map(normalizeHeader);

  const rows = lines.slice(1).map((line) => {
    const cols = parseCsvLine(line);
    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header] = cols[index] ?? "";
    });
    return row;
  });

  const parsedRows = rows
    .map(mapRowToFare)
    .filter(
      (row) =>
        row.fromCode &&
        row.fromCity &&
        row.toCode &&
        row.toCity &&
        row.distance &&
        row.sedanPrice > 0 &&
        row.suvPrice > 0,
    );

  if (parsedRows.length > 0) return parsedRows;

  // Fallback to fixed column positions:
  // fromCode, fromCity, toCode, toCity, distance, sedanPrice, suvPrice
  return lines
    .slice(1)
    .map(parseCsvLine)
    .map((cols) => {
      // Supports sheet format: SOURCE, KM, DESTINATION, SEDAN, Sedan discounted, SUV, Suv discounted
      const source = splitCodeAndCity(cols[0] ?? "");
      const destination = splitCodeAndCity(cols[2] ?? "");
      const fromCity = source.city;
      const toCity = destination.city;
      const fromCode = source.code || cityToCode(fromCity);
      const toCode = destination.code || cityToCode(toCity);
      const distance = toDistance(cols[1] ?? "");
      const sedanPrice = toPrice(cols[3] ?? "");
      const sedanDiscountedPrice = toPrice(cols[4] ?? "");
      const suvPrice = toPrice(cols[5] ?? "");
      const suvDiscountedPrice = toPrice(cols[6] ?? "");
      return {
        fromCode,
        fromCity,
        toCode,
        toCity,
        distance,
        sedanPrice,
        sedanDiscountedPrice,
        suvPrice,
        suvDiscountedPrice,
      };
    })
    .filter(
      (row) =>
        row.fromCity &&
        row.toCity &&
        row.distance &&
        row.sedanPrice > 0 &&
        row.suvPrice > 0,
    );
};

const parseGvizJson = (raw: string): FareData[] => {
  const prefix = "google.visualization.Query.setResponse(";
  const start = raw.indexOf(prefix);
  if (start === -1) return [];
  const jsonStart = start + prefix.length;
  const jsonEnd = raw.lastIndexOf(");");
  if (jsonEnd === -1) return [];

  try {
    const payload = JSON.parse(raw.slice(jsonStart, jsonEnd));
    const table = payload?.table;
    const cols: string[] = (table?.cols ?? []).map((c: any) =>
      normalizeHeader(String(c?.label || c?.id || "")),
    );
    const rows: any[] = table?.rows ?? [];
    if (!cols.length || !rows.length) return [];

    const mappedCsvLike = rows.map((r) => {
      const rowObj: Record<string, string> = {};
      const cells: any[] = r?.c ?? [];
      cols.forEach((header, idx) => {
        const cell = cells[idx];
        const val =
          cell?.v === null || cell?.v === undefined
            ? ""
            : typeof cell.v === "number"
              ? String(cell.v)
              : String(cell.v);
        rowObj[header] = val.trim();
      });
      return rowObj;
    });

    const parsed = mappedCsvLike
      .map(mapRowToFare)
      .filter(
        (row) =>
          row.fromCity &&
          row.toCity &&
          row.distance &&
          row.sedanPrice > 0 &&
          row.suvPrice > 0,
      );

    return parsed;
  } catch {
    return [];
  }
};

const parseGvizPayload = (payload: any): FareData[] => {
  try {
    const table = payload?.table;
    const cols: string[] = (table?.cols ?? []).map((c: any) =>
      normalizeHeader(String(c?.label || c?.id || "")),
    );
    const rows: any[] = table?.rows ?? [];
    if (!cols.length || !rows.length) return [];

    const mapped = rows.map((r) => {
      const rowObj: Record<string, string> = {};
      const cells: any[] = r?.c ?? [];
      cols.forEach((header, idx) => {
        const cell = cells[idx];
        rowObj[header] = cell?.v === null || cell?.v === undefined ? "" : String(cell.v).trim();
      });
      return rowObj;
    });

    return mapped
      .map(mapRowToFare)
      .filter(
        (row) =>
          row.fromCity &&
          row.toCity &&
          row.distance &&
          row.sedanPrice > 0 &&
          row.suvPrice > 0,
      );
  } catch {
    return [];
  }
};

const CabFareSection = () => {
  const [selectedState, setSelectedState] = useState<State>("telangana");
  const [cabFares, setCabFares] = useState<Record<State, FareData[]>>(fallbackCabFares);

  useEffect(() => {
    const loadSheetFares = async () => {
      const entries = await Promise.all(
        (Object.keys(sheetUrls) as State[]).map(async (state) => {
          const exportUrl = toCsvExportUrl(sheetUrls[state]);
          const gvizUrl = toGvizUrl(sheetUrls[state]);
          if (!exportUrl && !gvizUrl) return [state, fallbackCabFares[state]] as const;

          try {
            let parsed: FareData[] = [];

            const jsonpPayload = await loadGvizWithJsonp(sheetUrls[state]);
            if (jsonpPayload) {
              parsed = parseGvizPayload(jsonpPayload);
            }

            if (parsed.length === 0 && gvizUrl) {
              const gvizRes = await fetch(`${gvizUrl}&_=${Date.now()}`, { cache: "no-store" });
              if (gvizRes.ok) {
                const raw = await gvizRes.text();
                parsed = parseGvizJson(raw);
              }
            }

            if (parsed.length === 0 && exportUrl) {
              const csvRes = await fetch(`${exportUrl}&_=${Date.now()}`, { cache: "no-store" });
              if (csvRes.ok) {
                const csv = await csvRes.text();
                parsed = parseFareCsv(csv);
              }
            }

            return [state, parsed.length > 0 ? parsed : fallbackCabFares[state]] as const;
          } catch (error) {
            console.error(`[CabFareSection] Failed to load ${state} fares from sheet`, error);
            return [state, fallbackCabFares[state]] as const;
          }
        }),
      );

      setCabFares((current) => ({
        ...current,
        ...(Object.fromEntries(entries) as Record<State, FareData[]>),
      }));
    };

    loadSheetFares();
    const interval = window.setInterval(loadSheetFares, 60_000);
    return () => window.clearInterval(interval);
  }, []);

  return (
    <section className="py-8 md:py-16 px-4 bg-muted/30">
      <div className="container mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-8"
        >
          <h2 className="text-3xl font-bold text-foreground mb-4">
            Premium Outstation Cabs at Unbeatable Rates
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            Curated outstation rentals for the modern explorer. Don't just book a cab, Book an experience with our handpicked outstation rides.
          </p>

          <CabFareKPIs />

          <div className="flex flex-wrap justify-center gap-3">
            {(Object.keys(stateLabels) as State[]).map((state) => (
              <button
                key={state}
                onClick={() => setSelectedState(state)}
                className={`px-6 py-2.5 rounded-full font-medium transition-all ${
                  selectedState === state
                    ? "bg-primary text-primary-foreground shadow-lg"
                    : "bg-card text-foreground border border-border hover:bg-accent"
                }`}
              >
                {stateLabels[state]}
              </button>
            ))}
          </div>
        </motion.div>

        <AnimatePresence mode="wait">
          <motion.div
            key={selectedState}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-4"
          >
            {cabFares[selectedState].map((fare, index) => (
              <CabFareCard
                key={`${selectedState}-${fare.toCode}`}
                {...fare}
                delay={index * 0.05}
              />
            ))}
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
};

export default CabFareSection;
