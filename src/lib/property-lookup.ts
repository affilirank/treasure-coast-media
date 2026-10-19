import "server-only";

export type PropertyLookupResult = {
  address: string | null;
  city: string | null;
  zipCode: string | null;
  beds: number | null;
  baths: number | null;
  sqft: number | null;
  lotSize: string | null;
  yearBuilt: number | null;
  propertyType: string | null;
  listPrice: number | null;
  source: string | null;
  matches: number;
};

const COUNTY_LAYERS: Record<string, { layerId: number; state: string }> = {
  // Indian River County
  "VERO BEACH": { layerId: 29, state: "FL" },
  SEBASTIAN: { layerId: 29, state: "FL" },
  FELLSMERE: { layerId: 29, state: "FL" },
  "ORCHID ISLAND": { layerId: 29, state: "FL" },
  WABASSO: { layerId: 29, state: "FL" },
  "WINDMILL SHORES": { layerId: 29, state: "FL" },
  // Martin County
  STUART: { layerId: 41, state: "FL" },
  "JENSEN BEACH": { layerId: 41, state: "FL" },
  "PALM CITY": { layerId: 41, state: "FL" },
  HOBE_SOUND: { layerId: 41, state: "FL" },
  INDIANTOWN: { layerId: 41, state: "FL" },
  "PORT SALERNO": { layerId: 41, state: "FL" },
  // St. Lucie County
  "FORT PIERCE": { layerId: 55, state: "FL" },
  "PORT ST LUCIE": { layerId: 55, state: "FL" },
  "PORT SAINT LUCIE": { layerId: 55, state: "FL" },
  "ST LUCIE VILLAGE": { layerId: 55, state: "FL" },
  "WHITE CITY": { layerId: 55, state: "FL" },
};

const EHWATER_BASE = "https://gis.floridahealth.gov/server/rest/services/EHWATER/Parcels/MapServer";

const COUNTY_NAMES: Record<number, string> = {
  29: "Indian River County",
  41: "Martin County",
  55: "St. Lucie County",
};

const STREET_SUFFIXES = new Set([
  "STREET", "ST", "ROAD", "RD", "AVENUE", "AVE", "BOULEVARD", "BLVD", "DRIVE", "DR",
  "COURT", "CT", "CIRCLE", "CIR", "LANE", "LN", "PLACE", "PL", "TERRACE", "TER",
  "PARKWAY", "PKWY", "HIGHWAY", "HWY", "WAY", "TRAIL", "TR", "RUN", "CRES", "CRESCENT",
]);
const UNIT_WORDS = new Set(["UNIT", "APT", "STE", "SUITE", "BLDG"]);

/**
 * Builds a spacing-tolerant SQL predicate for PHY_ADDR1.
 * County records are messy ("149  25th St" with double spaces, "ST" vs "STREET"),
 * so we anchor on the leading house number and require every name token.
 */
function buildAddressWhere(raw: string): string {
  const clean = raw.toUpperCase().replace(/[^A-Z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
  if (!clean) return "";
  const tokens = clean.split(" ");
  const clauses: string[] = [];
  if (/^\d+$/.test(tokens[0])) {
    clauses.push(`PHY_ADDR1 LIKE '${tokens[0]} %'`);
    tokens.shift();
  }
  for (const token of tokens) {
    if (STREET_SUFFIXES.has(token) || UNIT_WORDS.has(token)) continue;
    clauses.push(`PHY_ADDR1 LIKE '%${token}%'`);
  }
  return clauses.join(" AND ");
}

function inferLotSizeAcres(lndSqft: number | null | undefined): string | null {
  if (lndSqft === null || lndSqft === undefined || Number.isNaN(lndSqft) || lndSqft <= 0) return null;
  const acres = lndSqft / 43560;
  if (acres < 0.01) return `${Math.round(lndSqft)} sq ft`;
  // Round to 3 decimals for small lots, 2 for typical, 1 for large
  if (acres < 0.1) return `${acres.toFixed(3)} acres`;
  if (acres < 10) return `${acres.toFixed(2)} acres`;
  if (acres < 100) return `${acres.toFixed(1)} acres`;
  return `${Math.round(acres)} acres`;
}

function mapPropertyType(dorUc: string | null | undefined): string | null {
  if (!dorUc) return null;
  const code = dorUc.trim();
  switch (code) {
    case "001":
      return "Single Family";
    case "002":
      return "Mobile Home";
    case "003":
      return "Multi-Family";
    case "004":
      return "Condominium";
    case "005":
      return "Cooperative";
    case "006":
      return "Retirement Home";
    case "007":
      return "Misc Residential";
    case "008":
      return "Multi-Family <10";
    case "009":
      return "Vacant Residential";
    case "010":
      return "Vacant Commercial";
    case "011":
      return "Stores";
    case "012":
      return "Mixed Use";
    case "013":
      return "Department Store";
    case "014":
      return "Supermarket";
    case "015":
      return "Regional Mall";
    case "016":
      return "Community Shopping Center";
    case "017":
      return "Office";
    case "018":
      return "Financial";
    case "019":
      return "Medical";
    case "020":
      return "Parking";
    case "021":
      return "Restaurant";
    case "022":
      return "Industrial";
    case "023":
      return "Warehouse";
    case "024":
      return "Lumber Yard";
    case "025":
      return "Hotel";
    case "026":
      return "Motel";
    case "027":
      return "Other";
    default:
      return dorUc;
  }
}

function toNum(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export async function lookupPropertyByAddress(
  address: string,
  city?: string,
  zipCode?: string
): Promise<PropertyLookupResult> {
  // Support a single "Street, city, ZIP" field: street drives the match.
  const segments = address.split(",").map((part) => part.trim()).filter(Boolean);
  const streetOnly = segments[0] ?? address;
  const derivedCity = segments[1]?.replace(/\s+\d{5}(?:-\d{4})?\b.*$/, "").trim() || undefined;
  const derivedZip = address.match(/\b\d{5}(?:-\d{4})?\b/)?.[0];
  city = city || derivedCity;
  zipCode = zipCode || derivedZip;

  const addressWhere = buildAddressWhere(streetOnly);
  if (!addressWhere) {
    return {
      address: address || null,
      city: city || null,
      zipCode: zipCode || null,
      beds: null,
      baths: null,
      sqft: null,
      lotSize: null,
      yearBuilt: null,
      propertyType: null,
      listPrice: null,
      source: null,
      matches: 0,
    };
  }

  // Choose which county layers to search: city is authoritative, ZIP disambiguates
  // the shared 349xx range (Martin + St. Lucie), then fall back to all three.
  const layersToTry: number[] = [];
  const push = (layerId: number | undefined) => {
    if (layerId && !layersToTry.includes(layerId)) layersToTry.push(layerId);
  };
  if (city) push(COUNTY_LAYERS[city.toUpperCase().trim()]?.layerId);
  const zipDigits = (zipCode ?? "").replace(/[^0-9]/g, "");
  if (zipDigits.startsWith("329")) push(29);
  else if (zipDigits.startsWith("349")) { push(41); push(55); }
  if (layersToTry.length === 0) { push(29); push(41); push(55); }

  // Pass 1 scopes by the record's own ZIP when known (stops cross-county street-name
  // collisions); pass 2 retries without the ZIP in case of a typo or a blank record ZIP.
  const attempts: { layerId: number; zipScoped: boolean }[] = [
    ...(zipDigits ? layersToTry.map((layerId) => ({ layerId, zipScoped: true })) : []),
    ...layersToTry.map((layerId) => ({ layerId, zipScoped: false })),
  ];

  for (const attempt of attempts) {
    try {
      const url = new URL(`${EHWATER_BASE}/${attempt.layerId}/query`);
      const zipClause = attempt.zipScoped ? ` AND PHY_ZIPCD = ${Number(zipDigits)}` : "";
      url.searchParams.set("where", `${addressWhere}${zipClause}`);
      url.searchParams.set(
        "outFields",
        "PHY_ADDR1,PHY_CITY,PHY_ZIPCD,TOT_LVG_AR,ACT_YR_BLT,EFF_YR_BLT,LND_SQFOOT,DOR_UC,SALE_PRC1,SALE_YR1,JV,OWN_NAME"
      );
      url.searchParams.set("returnGeometry", "false");
      url.searchParams.set("resultRecordCount", "5");
      url.searchParams.set("f", "json");

      const res = await fetch(url.toString(), { next: { revalidate: 3600 }, signal: AbortSignal.timeout(12000) });
      if (!res.ok) continue;
      const data = await res.json();
      const features = data?.features || [];
      if (features.length === 0) continue;

      // take first match
      const attrs = features[0].attributes || {};
      const lotSize = inferLotSizeAcres(toNum(attrs.LND_SQFOOT));
      const yearBuilt = toNum(attrs.ACT_YR_BLT) || toNum(attrs.EFF_YR_BLT);
      const sqft = toNum(attrs.TOT_LVG_AR);
      const propertyType = mapPropertyType(attrs.DOR_UC);

      return {
        address: attrs.PHY_ADDR1 || address,
        city: attrs.PHY_CITY || city || null,
        zipCode: zipCode || (attrs.PHY_ZIPCD ? String(attrs.PHY_ZIPCD) : null),
        beds: null,
        baths: null,
        sqft: sqft || null,
        lotSize,
        yearBuilt,
        propertyType,
        listPrice: toNum(attrs.SALE_PRC1) || null,
        source: `County Property Appraiser records · ${COUNTY_NAMES[attempt.layerId] ?? "Florida"}`,
        matches: features.length,
      };
    } catch {
      continue;
    }
  }

  return {
    address: address || null,
    city: city || null,
    zipCode: zipCode || null,
    beds: null,
    baths: null,
    sqft: null,
    lotSize: null,
    yearBuilt: null,
    propertyType: null,
    listPrice: null,
    source: null,
    matches: 0,
  };
}
