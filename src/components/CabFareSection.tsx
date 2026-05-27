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
  oneWaySedanPrice?: number;
  oneWaySedanDiscountedPrice?: number;
  oneWaySuvPrice?: number;
  oneWaySuvDiscountedPrice?: number;
  imageUrl?: string;
}

const emptyFares: Record<State, FareData[]> = { telangana: [], andhra: [], karnataka: [] };

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
      ? `tqx=responseHandler:${callbackName}&gid=${gid}&tq=select%20*`
      : `tqx=responseHandler:${callbackName}&tq=select%20*`;
    script.src = `${base}?${query}&_=${Date.now()}`;
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

// When a sheet uses only "discount" columns (leaving the base column empty),
// promote the discount value to the base price so the card renders correctly.
const normalizeFare = (fare: FareData): FareData => {
  let { sedanPrice, sedanDiscountedPrice, suvPrice, suvDiscountedPrice,
        oneWaySedanPrice, oneWaySedanDiscountedPrice, oneWaySuvPrice, oneWaySuvDiscountedPrice } = fare;
  if (sedanPrice === 0 && (sedanDiscountedPrice ?? 0) > 0) {
    sedanPrice = sedanDiscountedPrice!; sedanDiscountedPrice = 0;
  }
  if (suvPrice === 0 && (suvDiscountedPrice ?? 0) > 0) {
    suvPrice = suvDiscountedPrice!; suvDiscountedPrice = 0;
  }
  if ((oneWaySedanPrice ?? 0) === 0 && (oneWaySedanDiscountedPrice ?? 0) > 0) {
    oneWaySedanPrice = oneWaySedanDiscountedPrice!; oneWaySedanDiscountedPrice = 0;
  }
  if ((oneWaySuvPrice ?? 0) === 0 && (oneWaySuvDiscountedPrice ?? 0) > 0) {
    oneWaySuvPrice = oneWaySuvDiscountedPrice!; oneWaySuvDiscountedPrice = 0;
  }
  return { ...fare, sedanPrice, sedanDiscountedPrice, suvPrice, suvDiscountedPrice,
           oneWaySedanPrice, oneWaySedanDiscountedPrice, oneWaySuvPrice, oneWaySuvDiscountedPrice };
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
  const sedanPrice = toPrice(pick(row, ["roundtripsedan", "rtsedan", "sedanprice", "sedan", "sedanfare", "price_sedan"]));
  const sedanDiscountedPrice = toPrice(
    pick(row, ["roundtripsedandiscount", "roundtripsedandiscounted", "sedandiscounted", "sedandiscountedprice", "sedandiscount", "sedan_offer"]),
  );
  const suvPrice = toPrice(pick(row, ["roundtripsuv", "rtsuv", "suvprice", "suv", "suvfare", "price_suv"]));
  const suvDiscountedPrice = toPrice(
    pick(row, ["roundtripsuvdiscounted", "roundtripsuvdiscount", "suvdiscounted", "suvdiscountedprice", "suvdiscount", "suv_offer"]),
  );
  const oneWaySedanPrice = toPrice(pick(row, ["onewaysedan", "onewaysedanprice", "sedanoneway", "owsedan"]));
  const oneWaySedanDiscountedPrice = toPrice(pick(row, ["onewaysedandiscount", "onewaysedandiscounted", "owsedandiscount"]));
  const oneWaySuvPrice = toPrice(pick(row, ["onewaysuv", "onewaysuvprice", "suvoneway", "owsuv"]));
  const oneWaySuvDiscountedPrice = toPrice(pick(row, ["onewaysuvdiscount", "onewaysuvdiscounted", "onewaysuvdi", "owsuvdiscount"]));
  const imageUrl = pick(row, ["imageurl", "image", "imgurl", "photo", "photourl", "imagelink"]);

  return normalizeFare({
    fromCode,
    fromCity,
    toCode,
    toCity,
    distance,
    sedanPrice,
    sedanDiscountedPrice,
    suvPrice,
    suvDiscountedPrice,
    oneWaySedanPrice,
    oneWaySedanDiscountedPrice,
    oneWaySuvPrice,
    oneWaySuvDiscountedPrice,
    imageUrl,
  });
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
      // Sheet format: SOURCE(0), KM(1), DESTINATION(2),
      // one-way sedan(3), one-way sedan disc(4), round-trip sedan(5), round-trip sedan disc(6),
      // one-way suv(7), one-way suv disc(8), round-trip suv(9), round-trip suv disc(10), image(11)
      const source = splitCodeAndCity(cols[0] ?? "");
      const destination = splitCodeAndCity(cols[2] ?? "");
      const fromCity = source.city;
      const toCity = destination.city;
      const fromCode = source.code || cityToCode(fromCity);
      const toCode = destination.code || cityToCode(toCity);
      const distance = toDistance(cols[1] ?? "");
      const oneWaySedanPrice = toPrice(cols[3] ?? "");
      const oneWaySedanDiscountedPrice = toPrice(cols[4] ?? "");
      const sedanPrice = toPrice(cols[5] ?? "");
      const sedanDiscountedPrice = toPrice(cols[6] ?? "");
      const oneWaySuvPrice = toPrice(cols[7] ?? "");
      const oneWaySuvDiscountedPrice = toPrice(cols[8] ?? "");
      const suvPrice = toPrice(cols[9] ?? "");
      const suvDiscountedPrice = toPrice(cols[10] ?? "");
      const imageUrl = cols[11] ?? "";
      return normalizeFare({
        fromCode,
        fromCity,
        toCode,
        toCity,
        distance,
        sedanPrice,
        sedanDiscountedPrice,
        suvPrice,
        suvDiscountedPrice,
        oneWaySedanPrice,
        oneWaySedanDiscountedPrice,
        oneWaySuvPrice,
        oneWaySuvDiscountedPrice,
        imageUrl,
      });
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
    if (!rows.length) return [];

    const extractCell = (row: any, idx: number): string => {
      const cell = row?.c?.[idx];
      return cell?.v === null || cell?.v === undefined ? "" : String(cell.v).trim();
    };

    const isValid = (row: FareData) =>
      !!row.fromCity && !!row.toCity && !!row.distance && row.sedanPrice > 0 && row.suvPrice > 0;

    const makeRow = (r: any, destCol: number, kmCol: number, owSCol: number, owSDCol: number, rtSCol: number, rtSDCol: number, owUCol: number, owUDCol: number, rtUCol: number, rtUDCol: number, imgCol: number): FareData => {
      const src  = splitCodeAndCity(extractCell(r, 0));
      const dest = splitCodeAndCity(extractCell(r, destCol));
      return normalizeFare({
        fromCode: src.code  || cityToCode(src.city),  fromCity: src.city,
        toCode:   dest.code || cityToCode(dest.city),  toCity:   dest.city,
        distance:                   toDistance(extractCell(r, kmCol)),
        oneWaySedanPrice:           toPrice(extractCell(r, owSCol)),
        oneWaySedanDiscountedPrice: toPrice(extractCell(r, owSDCol)),
        sedanPrice:                 toPrice(extractCell(r, rtSCol)),
        sedanDiscountedPrice:       toPrice(extractCell(r, rtSDCol)),
        oneWaySuvPrice:             toPrice(extractCell(r, owUCol)),
        oneWaySuvDiscountedPrice:   toPrice(extractCell(r, owUDCol)),
        suvPrice:                   toPrice(extractCell(r, rtUCol)),
        suvDiscountedPrice:         toPrice(extractCell(r, rtUDCol)),
        imageUrl:                   extractCell(r, imgCol),
      });
    };

    // Header-based parsing
    if (cols.length > 0) {
      console.log("[CabFareSection] gviz columns:", cols.join(" | "));
      if (rows.length > 0) {
        console.log("[CabFareSection] gviz first row:", (rows[0]?.c ?? []).map((c: any) => c?.v ?? "—").join(" | "));
      }
      const mapped = rows.map((r) => {
        const rowObj: Record<string, string> = {};
        (r?.c ?? []).forEach((cell: any, idx: number) => {
          if (cols[idx]) rowObj[cols[idx]] = cell?.v === null || cell?.v === undefined ? "" : String(cell.v).trim();
        });
        return rowObj;
      });
      const headerParsed = mapped.map(mapRowToFare).filter(isValid);
      if (headerParsed.length > 0) {
        console.log(`[CabFareSection] header parse: ${headerParsed.length} rows`);
        return headerParsed;
      }
      console.warn("[CabFareSection] header parse: 0 rows — trying positional layouts");
    }

    // Positional fallbacks — tried in order, first layout that yields valid rows wins
    const layouts: Array<Parameters<typeof makeRow>> = [
      // Layout D (12-col, actual sheet): SRC | KM | DEST | OW-S | OW-SD | RT-S | RT-SD | OW-U | OW-UD | RT-U | RT-UD | IMG
      [null as any, 2, 1, 3, 4, 5, 6, 7, 8, 9, 10, 11],
      // Layout A (12-col, no "#"): SRC | DEST | KM | OW-S | OW-SD | RT-S | RT-SD | OW-U | OW-UD | RT-U | RT-UD | IMG
      [null as any, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
      // Layout B (13-col, with "#"): SRC | # | KM | DEST | OW-S | OW-SD | RT-S | RT-SD | OW-U | OW-UD | RT-U | RT-UD | IMG
      [null as any, 3, 2, 4, 5, 6, 7, 8, 9, 10, 11, 12],
      // Layout C (8-col, simple): SRC | DEST | KM | S | SD | U | UD | IMG
      [null as any, 1, 2, 0, 0, 3, 4, 0, 0, 5, 6, 7],
    ];

    for (const [, destCol, kmCol, owSCol, owSDCol, rtSCol, rtSDCol, owUCol, owUDCol, rtUCol, rtUDCol, imgCol] of layouts) {
      const result = rows.map((r) => makeRow(r, destCol, kmCol, owSCol, owSDCol, rtSCol, rtSDCol, owUCol, owUDCol, rtUCol, rtUDCol, imgCol)).filter(isValid);
      if (result.length > 0) {
        console.log(`[CabFareSection] positional parse (dest@${destCol}, rtS@${rtSCol}, rtU@${rtUCol}): ${result.length} rows`);
        return result;
      }
    }

    console.warn("[CabFareSection] all positional layouts returned 0 rows");
    return [];
  } catch {
    return [];
  }
};

interface CabFareSectionProps {
  variant?: "previous" | "ticket";
  withContainer?: boolean;
}

const CabFareSection = ({ variant = "previous", withContainer = false }: CabFareSectionProps) => {
  const [selectedState, setSelectedState] = useState<State>("telangana");
  const [cabFares, setCabFares] = useState<Record<State, FareData[]>>(emptyFares);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSheetFares = async () => {
      const entries = await Promise.all(
        (Object.keys(sheetUrls) as State[]).map(async (state) => {
          const exportUrl = toCsvExportUrl(sheetUrls[state]);
          const gvizUrl = toGvizUrl(sheetUrls[state]);
          if (!exportUrl && !gvizUrl) return [state, [] as FareData[]] as const;

          try {
            let parsed: FareData[] = [];

            const jsonpPayload = await loadGvizWithJsonp(sheetUrls[state]);
            if (jsonpPayload) {
              parsed = parseGvizPayload(jsonpPayload);
              console.log(`[CabFareSection] JSONP ${state}: ${parsed.length} rows`);
            } else {
              console.warn(`[CabFareSection] JSONP ${state}: no payload`);
            }

            if (parsed.length === 0 && gvizUrl) {
              try {
                const gvizRes = await fetch(`${gvizUrl}&_=${Date.now()}`, { cache: "no-store" });
                if (gvizRes.ok) {
                  parsed = parseGvizJson(await gvizRes.text());
                  console.log(`[CabFareSection] gviz fetch ${state}: ${parsed.length} rows`);
                }
              } catch {
                console.warn(`[CabFareSection] gviz fetch ${state}: CORS blocked`);
              }
            }

            if (parsed.length === 0 && exportUrl) {
              try {
                const csvRes = await fetch(`${exportUrl}&_=${Date.now()}`, { cache: "no-store" });
                if (csvRes.ok) {
                  parsed = parseFareCsv(await csvRes.text());
                  console.log(`[CabFareSection] CSV ${state}: ${parsed.length} rows`);
                }
              } catch {
                console.warn(`[CabFareSection] CSV ${state}: CORS blocked`);
              }
            }

            return [state, parsed] as const;
          } catch (error) {
            console.error(`[CabFareSection] ${state} failed`, error);
            return [state, [] as FareData[]] as const;
          }
        }),
      );

      setCabFares((current) => ({
        ...current,
        ...(Object.fromEntries(entries) as Record<State, FareData[]>),
      }));
      setLoading(false);
    };

    loadSheetFares();
    const interval = window.setInterval(loadSheetFares, 60_000);
    return () => window.clearInterval(interval);
  }, []);

  return (
    <section className="py-8 md:py-16 px-[5%] md:px-4 bg-muted/30">
      <div className={withContainer ? "container mx-auto px-4" : "md:container md:mx-auto md:max-w-6xl"}>
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

        {loading && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-28 rounded-2xl bg-muted/50 animate-pulse" />
            ))}
          </div>
        )}

        {!loading && cabFares[selectedState].length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <p className="text-lg font-medium mb-1">No fares available</p>
            <p className="text-sm">Could not load fare data from the sheet. Please check the sheet is shared publicly.</p>
          </div>
        )}

        <AnimatePresence mode="wait">
          {!loading && cabFares[selectedState].length > 0 && variant === "ticket" ? (
            /* Two independent flex columns so opening one card doesn't shift the other column */
            <motion.div
              key={selectedState}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col lg:flex-row gap-4"
            >
              {/* Desktop: left column (even indices) */}
              <div className="hidden lg:flex flex-col gap-4 flex-1">
                {cabFares[selectedState]
                  .filter((_, i) => i % 2 === 0)
                  .map((fare, index) => (
                    <CabFareCard
                      key={`${selectedState}-${fare.toCode}`}
                      {...fare}
                      delay={index * 0.05}
                      variant={variant}
                    />
                  ))}
              </div>
              {/* Desktop: right column (odd indices) */}
              <div className="hidden lg:flex flex-col gap-4 flex-1">
                {cabFares[selectedState]
                  .filter((_, i) => i % 2 !== 0)
                  .map((fare, index) => (
                    <CabFareCard
                      key={`${selectedState}-${fare.toCode}`}
                      {...fare}
                      delay={index * 0.05}
                      variant={variant}
                    />
                  ))}
              </div>
              {/* Mobile: all cards in a single column */}
              <div className="flex flex-col gap-4 flex-1 lg:hidden">
                {cabFares[selectedState].map((fare, index) => (
                  <CabFareCard
                    key={`${selectedState}-${fare.toCode}-mobile`}
                    {...fare}
                    delay={index * 0.05}
                    variant={variant}
                  />
                ))}
              </div>
            </motion.div>
          ) : !loading && cabFares[selectedState].length > 0 ? (
            <motion.div
              key={selectedState}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="grid grid-cols-1 lg:grid-cols-2 lg:items-start gap-4"
            >
              {cabFares[selectedState].map((fare, index) => (
                <CabFareCard
                  key={`${selectedState}-${fare.toCode}`}
                  {...fare}
                  delay={index * 0.05}
                  variant={variant}
                />
              ))}
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </section>
  );
};

export default CabFareSection;
