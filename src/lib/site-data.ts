export type Track = "real-estate" | "commercial";

export type QuoteItem = {
  id: string;
  label: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  billing: "once" | "monthly";
  category?: "base-media" | "video" | "enhancement" | "retainer";
  badge?: string;
  detail?: string;
};

export type Quote = {
  items: QuoteItem[];
  total: number;
  recurring: number;
};

export const realEstateTiers = [
  { id: "under-1800", label: "Up to 1,800 SQFT" },
  { id: "1801-2800", label: "1,801–2,800 SQFT" },
  { id: "2801-3800", label: "2,801–3,800 SQFT" },
  { id: "over-3800", label: "3,801+ SQFT" },
] as const;

export type RealEstateTierId = (typeof realEstateTiers)[number]["id"];

export type RealEstatePackage = {
  id: string;
  name: string;
  target: string;
  badge?: string;
  features: readonly string[];
  prices: readonly number[];
  turnkey?: boolean;
  includedVideoId?: string;
  includedAddOns?: Readonly<Record<string, number>>;
};

export const realEstatePackages = [
  {
    id: "essentials",
    name: "Photo-Only Essentials",
    target: "Next-day HDR interior and exterior stills for a polished listing.",
    badge: undefined,
    features: ["Next-Day HDR Interior & Exterior Stills"],
    prices: [195, 235, 275, 315],
  },
  {
    id: "standard-mls-suite",
    name: "Full Media Suite (Photos + Drone + 2D Floor Plan)",
    target: "A complete listing-ready media foundation.",
    badge: undefined,
    features: ["HDR Stills", "5–8 4K Aerials", "Laser 2D Schematic Floor Plan"],
    prices: [275, 345, 425, 525],
  },
  {
    id: "complete-showcase-suite",
    name: "The Complete Showcase Suite",
    target: "A complete listing launch in one package.",
    badge: "MOST POPULAR · COMPLETE LISTING LAUNCH",
    turnkey: true,
    includedVideoId: "realtor-hosted-branding-reel",
    includedAddOns: { "zillow-tour": 1, "virtual-twilight": 1, "boundary-outline": 1, "social-post-pack": 1 },
    features: [
      "Standard Media Suite: ~35 HDR Stills, 5–8 4K Aerials, 2D Schematic Floor Plan",
      "60-Sec Realtor-Hosted Branding Reel (9:16 Vertical + MLS-compliant Cut)",
      "Zillow 3D Home Tour + Interactive Floor Plan",
      "1 Virtual Twilight Hero Still",
      "Drone Property Boundary Line Graphic",
      "30-Day Automated Social Post Pack (Pre-scheduled via GoHighLevel CSV)",
    ],
    prices: [795, 795, 895, 995],
  },
  {
    id: "waterfront-estate-luxury-suite",
    name: "The Waterfront & Estate Luxury Suite",
    target: "Waterfront estates, acreage, and signature luxury listings.",
    badge: "SIGNATURE LUXURY · WATERFRONT & ACREAGE",
    turnkey: true,
    includedVideoId: "cinematic-showcase-film",
    includedAddOns: { "amenities-suite": 1, "boundary-outline": 1, "zillow-tour": 1, "virtual-twilight": 1, "social-syndication-engine": 1 },
    features: [
      "Comprehensive Luxury Photo Suite: 50–60+ hand-blended master HDR stills (interiors, architectural details, exterior vignettes)",
      "Expanded 4K Drone Suite: 12–15+ aerials highlighting waterfront access, dock, canals, lot scale, and coastal geography",
      "Included Drone Boundary Graphic with lot line overlay",
      "Included Neighborhood, Waterfront & HOA Amenity Suite (marina, clubhouse, beach access, golf)",
      "Up to 2-Minute Cinematic Showcase Film (16:9 4K Master + Unbranded MLS Cut)",
      "Zillow 3D Home Tour + 2D Floor Plan",
      "1 Hand-Crafted Virtual Twilight Hero Still",
      "30-Day Premium Social Syndication Engine (automated via GHL): 4 vertical reels, one per week (Grand Arrival, Kitchen/Living, Waterfront/Patio, Primary Suite) and 8 branded feed/carousel posts with localized copy and hashtags",
      "Priority 9:00 AM Next-Day Delivery Guarantee",
    ],
    prices: [1195, 1195, 1295, 1395],
  },
] as const;

export const realEstatePackageList: readonly RealEstatePackage[] = realEstatePackages;

export type RealEstatePackageId = (typeof realEstatePackages)[number]["id"];

export const realEstateVideoOptions = [
  {
    id: "no-video",
    name: "No Video Needed",
    price: 0,
    detail: "Photos and selected enhancements only.",
  },
  {
    id: "cinematic-b-roll-reel",
    name: "60-Sec Cinematic B-Roll Reel (9:16)",
    price: 275,
    detail: "Fast-paced vertical property walkthrough, 4K Sony gimbal glides, aerial cuts, licensed music. (No speaking).",
  },
  {
    id: "realtor-hosted-branding-reel",
    name: "60-Sec Realtor-Hosted Branding Reel (9:16)",
    price: 395,
    detail: "Agent on-camera hook & outro, wireless lapel audio, animated lower-third branding, kinetic subtitles, plus an unbranded MLS cut.",
  },
  {
    id: "cinematic-showcase-film",
    name: "Up to 2-Minute Cinematic Showcase Film (16:9 + Drone)",
    price: 645,
    detail: "Full architectural narrative tour, continuous agent guidance, full aerial storytelling, 16:9 4K YouTube master + unbranded MLS link + 60s vertical teaser.",
  },
] as const;

export type RealEstateVideoId = (typeof realEstateVideoOptions)[number]["id"];

export type RealEstateAddOn = {
  id: string;
  label: string;
  price: number;
  unit: string;
  badge?: string;
  included?: string;
};

export const realEstateAddOns: RealEstateAddOn[] = [
  { id: "amenities-suite", label: "Neighborhood, Waterfront & HOA Amenities Suite", price: 65, unit: "property", included: "Dedicated coverage of community clubhouse, resort pool, golf courses, marina, private boat ramps, or beach access." },
  { id: "boundary-outline", label: "Drone Property Boundary Line Graphic", price: 25, unit: "property" },
  { id: "virtual-twilight", label: "Virtual Twilight Conversion", price: 25, unit: "photo" },
  { id: "virtual-staging", label: "Virtual Staging", price: 35, unit: "room" },
  { id: "decluttering", label: "Virtual Decluttering / Object Removal", price: 20, unit: "photo" },
  { id: "zillow-tour", label: "Zillow 3D Home Tour + Interactive Floor Plan", price: 85, unit: "property" },
  { id: "rush-delivery", label: "Same-Day Rush Delivery (by 9:00 PM)", price: 75, unit: "property" },
  { id: "social-post-pack", label: "30-Day Automated Social Post Pack", price: 150, unit: "property", included: "Pre-scheduled via GoHighLevel CSV over 30 days." },
  { id: "social-syndication-engine", label: "30-Day Premium Social Syndication Engine", price: 395, unit: "property", included: "4 vertical reels (1 per week: Grand Arrival, Kitchen/Living, Waterfront/Patio, Primary Suite) + 8 branded feed/carousel posts, automated via GHL." },
] as const;

export type RealEstateAddOnId = (typeof realEstateAddOns)[number]["id"];

export function realEstatePackageValue(packageId: string, tierId: string) {
  const pkg = realEstatePackageList.find((item) => item.id === packageId);
  const tierIndex = realEstateTiers.findIndex((item) => item.id === tierId);
  if (!pkg?.turnkey || tierIndex < 0) return null;
  const baseSuite = realEstatePackageList.find((item) => item.id === "standard-mls-suite")!;
  const video = realEstateVideoOptions.find((item) => item.id === pkg.includedVideoId);
  const lines = [
    { label: "Full Media Suite (photos + drone + 2D floor plan)", amount: baseSuite.prices[tierIndex] },
    ...(video ? [{ label: video.name, amount: video.price }] : []),
    ...Object.entries(pkg.includedAddOns ?? {}).map(([id, qty]) => {
      const addOn = realEstateAddOns.find((item) => item.id === id)!;
      return { label: addOn.label, amount: addOn.price * qty };
    }),
  ];
  const value = lines.reduce((sum, line) => sum + line.amount, 0);
  const price = pkg.prices[tierIndex];
  return { lines, value, price, savings: Math.max(0, value - price) };
}

export function realEstateAddOnPrice(id: RealEstateAddOnId) {
  const addOn = realEstateAddOns.find((item) => item.id === id);
  return addOn?.price ?? 0;
}

export const commercialPackages = [
  {
    id: "brand-story",
    name: "Brand Story Film",
    detail: "60–90 second widescreen 4K film",
    price: 1495,
    featured: false,
    features: [
      "2-hour on-site production",
      "Founder interview + cinematic b-roll",
      "Key lighting, 32-bit float audio + licensed music",
    ],
  },
  {
    id: "ad-suite",
    name: "Direct-Response Ad Suite",
    detail: "1 master brand film + 3 vertical ads",
    price: 2495,
    featured: true,
    features: [
      "One widescreen 4K master film",
      "Three high-hook 9:16 ads with captions",
      "Facility drone b-roll + raw footage library",
    ],
  },
  {
    id: "market-dominance",
    name: "Market Dominance Production",
    detail: "Half-day, multi-camera production",
    price: 3950,
    featured: false,
    features: [
      "One master film + five vertical ads",
      "Two customer video case studies",
      "Executive portraits, team + facility photography",
    ],
  },
] as const;

export type CommercialPackageId = (typeof commercialPackages)[number]["id"];

export type MarketingRetainer = {
  id: string;
  name: string;
  detail: string;
  price: number;
  billing: "once" | "monthly";
  unit?: string;
  featured?: boolean;
  tag?: string;
  included?: string[];
};

export const commercialRetainers: MarketingRetainer[] = [
  { id: "maps-review-growth", name: "Google Maps 3-Pack & Review Growth", detail: "Local SEO audit, weekly geotagged media uploads, citation sync, and automated SMS review capture.", price: 275, billing: "monthly" },
  { id: "short-form-ad-engine", name: "Short-Form Social Video Ad Engine", detail: "Eight vertical commercial reels with problem/solution hooks, behind-the-scenes, and customer stories for Meta and TikTok.", price: 450, billing: "monthly" },
  { id: "database-reactivation", name: "Database Reactivation Sprint", detail: "Re-engage old customer lists via targeted SMS and email to spark immediate booking surges.", price: 495, billing: "once" },
  { id: "paid-ad-management", name: "Meta & TikTok Paid Ad Campaign Management", detail: "Creative testing, audience targeting, and weekly ad-spend optimization. Ad spend is paid directly to Meta.", price: 650, billing: "monthly" },
  { id: "social-media-management", name: "Social Media Management", detail: "Consistent branded posts, publishing, content calendar management, and community engagement across Instagram, Facebook, and LinkedIn.", price: 650, billing: "monthly", included: ["12 custom posts per month", "Monthly content calendar and scheduling", "Community comment and message monitoring"] },
  { id: "ai-call-receptionist", name: "AI Calling & Virtual Receptionist", detail: "An AI phone assistant answers common questions, captures caller details, and routes qualified inquiries to your team.", price: 399, billing: "monthly", included: ["24/7 call answering and lead capture", "Appointment and callback request collection", "Call summaries delivered to your team"] },
  { id: "email-campaigns", name: "Email Campaigns & Customer Newsletter", detail: "Branded promotional and educational email campaigns that keep your customer list engaged and bring past buyers back.", price: 350, billing: "monthly", included: ["Two campaign sends per month", "Copy, layout, and audience-ready creative", "Campaign performance summary"] },
  { id: "crm-lead-nurture", name: "CRM Lead Nurture Automation", detail: "Fast, helpful SMS and email follow-up for new inquiries, with lead routing and appointment reminders.", price: 450, billing: "monthly", included: ["Lead-response sequences and reminders", "CRM pipeline and routing setup", "Monthly workflow review"] },
  { id: "google-search-management", name: "Google Search Lead Campaigns", detail: "High-intent local search campaign setup, keyword optimization, and monthly performance improvements.", price: 650, billing: "monthly", included: ["Search campaign structure and ad copy", "Local keyword and conversion review", "Ad spend paid directly to Google"] },
  { id: "ai-clone-voice-promo", name: "AI Clone + Voice Promo Video", detail: "A consent-based 30-second customer-acquisition video using your approved likeness and voice when you prefer not to record on camera.", price: 495, billing: "once", unit: "30-second promo", included: ["Scripted offer-focused promo", "Approved likeness and voice only", "Social-ready 9:16 delivery"] },
  {
    id: "turnkey-growth-engine",
    name: "The Turnkey Business Growth Engine",
    detail: "A full customer-acquisition system with managed content, a conversion funnel, speed-to-lead automation, paid campaign management, and monthly production.",
    price: 1250,
    billing: "monthly",
    featured: true,
    tag: "BEST VALUE · FULL SYSTEM",
    included: [
      "40 custom monthly posts across Meta, Google Business, and LinkedIn",
      "One fast appointment or quote-capture landing page",
      "Instant SMS and email lead notifications in under 60 seconds",
      "Meta and Google local lead-generation campaign management",
      "One monthly 90-minute on-site capture session for b-roll, founder updates, and testimonials",
    ],
  },
] as const;

export type CommercialRetainerId = (typeof commercialRetainers)[number]["id"];
export const commercialGrowthServices = commercialRetainers;

export const realEstateRetainers: MarketingRetainer[] = [
  { id: "open-house-lead-surge", name: "Open House Lead Surge Sprint", detail: "A 7-day geo-fenced Meta listing ad campaign with a digital sign-in landing page.", price: 195, billing: "once", unit: "property" },
  { id: "sphere-email-engine", name: "Sphere of Influence & Past-Client Email Engine", detail: "Two localized, branded email newsletters each month for past clients and your database.", price: 245, billing: "monthly" },
  { id: "google-local-reviews", name: "Google Local & 5-Star Review Automation", detail: "Geotagged listing photo uploads, weekly citation maintenance, and automated review collection.", price: 225, billing: "monthly" },
  { id: "reel-cutdown-sprint", name: "Short-Form Reel Cutdown Sprint", detail: "Eight vertical reels with dynamic kinetic captions cut directly from your listing shoots.", price: 350, billing: "monthly" },
  { id: "agent-social-management", name: "Agent Social Media Management", detail: "A consistent branded social presence built from listing launches, local market updates, and Treasure Coast community content.", price: 495, billing: "monthly", included: ["12 custom posts per month across Instagram and Facebook", "Monthly posting calendar and scheduling", "Community engagement and profile upkeep"] },
  { id: "agent-ai-receptionist", name: "AI Calling & Listing Receptionist", detail: "An AI phone assistant answers listing and buyer inquiries, captures lead details, and routes urgent calls to you.", price: 299, billing: "monthly", included: ["24/7 call answering and inquiry capture", "Showing and callback request intake", "Call summaries sent to your preferred inbox"] },
  { id: "agent-email-campaign-launch", name: "Listing & Open House Email Campaigns", detail: "A branded email campaign for a new listing or open house, sent to the right segments in your client database.", price: 195, billing: "once", included: ["Campaign copy and branded layout", "Audience segmentation and scheduled send", "Click and response summary"] },
  { id: "agent-paid-search", name: "Google Buyer & Seller Lead Campaigns", detail: "Local Google Search campaigns for homeowners and buyers actively looking in your service area.", price: 450, billing: "monthly", included: ["Local keyword and service-area setup", "Lead-focused search ad copy", "Ad spend paid directly to Google"] },
  { id: "agent-crm-automation", name: "AI Lead Follow-Up & CRM Automation", detail: "Fast SMS and email responses for new listing and buyer inquiries, connected to your existing CRM workflow.", price: 350, billing: "monthly", included: ["Instant lead acknowledgement and follow-up", "Showing reminders and lead routing", "Works with Follow Up Boss, KVCore, or Lofty"] },
  {
    id: "complete-realtor-growth-partner",
    name: "The Complete Realtor Growth Partner",
    detail: "A connected monthly marketing system for consistent visibility and listing lead generation.",
    price: 995,
    billing: "monthly",
    featured: true,
    tag: "MOST POPULAR · BEST VALUE",
    included: [
      "40 custom posts monthly across Instagram, Facebook, and LinkedIn",
      "One dedicated Next.js lead-generation page with lead capture, instant SMS alerts, and KVCore, Follow Up Boss, or Lofty CRM sync",
      "Monthly listing and buyer campaign execution; ad spend paid directly to Meta",
      "Two branded local newsletters each month for your sphere",
      "One free base listing shoot each month up to 1,800 SQFT: photos, drone, and floor plan, or a $225 shoot credit",
    ],
  },
] as const;
export type RealEstateRetainerId = (typeof realEstateRetainers)[number]["id"];

export const realEstateGallery = [
  { id: "vero-oceanfront", title: "Vero Beach Oceanfront", detail: "4,800 SQFT · Direct ocean view", category: "Interiors & HDR", image: "photo-1600607687939-ce8a6c25118c", description: "A light-filled coastal residence photographed for a clean, true-to-life MLS presentation." },
  { id: "intracoastal-aerial", title: "Palm Beach Intracoastal", detail: "4K drone · Waterway estate", category: "Aerial Drone", image: "photo-1600596542815-ffad4c1539a9", description: "Elevated property context with a clear view of the surrounding waterfront and approach." },
  { id: "port-st-lucie-kitchen", title: "Port St. Lucie Modern", detail: "2,860 SQFT · Interior detail", category: "Interiors & HDR", image: "photo-1600566753086-00f18fb6b3ea", description: "Balanced interior exposure, corrected verticals and carefully retained window detail." },
  { id: "jupiter-twilight", title: "Jupiter Island at Dusk", detail: "Twilight finish · Waterfront", category: "Twilight & Staging", image: "photo-1600607687644-c7171b42498f", description: "A refined dusk conversion for a listing that deserves a distinctive first impression." },
  { id: "stuart-coastal", title: "Stuart Coastal Residence", detail: "Cinematic walkthrough · 4K", category: "Cinematic Video", image: "photo-1600607687920-4e2a09cf159d", description: "An editorial interior sequence paired with stabilized camera movement and aerial cutaways." },
  { id: "fort-pierce-estate", title: "Fort Pierce Estate", detail: "Virtual staging · Living room", category: "Twilight & Staging", image: "photo-1600210492486-724fe5c67fb0", description: "A considered furnishing concept that helps buyers understand scale and possibility." },
] as const;

export const commercialGallery = [
  { id: "founder-portrait", title: "The Founder Portrait", detail: "Portrait suite · Vero Beach", category: "People & Process", image: "photo-1560250097-0b93528c311a", description: "Natural, modern founder imagery created to make a brand feel unmistakably human." },
  { id: "craft-in-motion", title: "Craft in Motion", detail: "Behind the scenes · 4K", category: "People & Process", image: "photo-1521737711867-e3b97375f902", description: "A working team captured in motion, with image-making designed for story-led campaigns." },
  { id: "modern-studio", title: "Modern Studio", detail: "Commercial interiors · Palm Beach", category: "Place & Detail", image: "photo-1497366754035-f200968a6e72", description: "A contemporary workspace documented with clean lines, natural light and usable detail." },
  { id: "wellness-brand", title: "A Better Kind of Wellness", detail: "Brand film still · Jupiter", category: "Founder Films", image: "photo-1540555700478-4be289fbecef", description: "A calm visual language for a boutique wellness team and its local clientele." },
  { id: "retail-detail", title: "Retail, Considered", detail: "Storefront · Stuart", category: "Place & Detail", image: "photo-1441986300917-64674bd600d8", description: "Storefront imagery built for local discovery and brand-led digital campaigns." },
  { id: "brand-interview", title: "The Brand Interview", detail: "Founder story · Fort Pierce", category: "Founder Films", image: "photo-1516321318423-f06f85e504b3", description: "A founder-led interview shaped into a polished story for web, social and paid media." },
] as const;

export type GalleryItem =
  | (typeof realEstateGallery)[number]
  | (typeof commercialGallery)[number];

export const stockImages = {
  hero: "photo-1600596542815-ffad4c1539a9",
  comparison: "photo-1600596542815-ffad4c1539a9",
  comparisonInterior: "photo-1600566753086-00f18fb6b3ea",
  comparisonExterior: "photo-1600585154340-be6161a56a0c",
  commercialFounder: "photo-1500648767791-00dcc994a43e",
  commercialTeam: "photo-1521737711867-e3b97375f902",
  commercialCraft: "photo-1621905251918-48416bd8575a",
  commercialSpace: "photo-1497366754035-f200968a6e72",
  commercialSalon: "photo-1560066984-138dadb4c035",
} as const;

export const videoSources = {
  propertyTour: "https://cdn.coverr.co/videos/coverr-house-tour-4608/360p.mp4",
  propertyTourEmbed: "https://app.heygen.com/embeds/37a2682267c64f27979292528005ad35",
  propertyTourSecondEmbed: "https://app.heygen.com/embeds/f98d15d6f3a740c4ac4a529db533928f",
  realtorAiPresenterEmbed: "https://app.heygen.com/embeds/23590520d9d74f758b3c299ce6acff70",
  commercialAiPresenterEmbed: "https://app.heygen.com/embeds/e16aa7eb30d6420b80c6c14d1cb6aad9",
  commercialVslEmbed: "https://app.heygen.com/embeds/39f1ebb7c97945b2925c602a8ac6cef7",
  commercialPainPointEmbed: "https://app.heygen.com/embeds/a084195a226641109e17fcb5136f1177",
  founderStory: "https://cdn.coverr.co/videos/coverr-a-man-talking-on-camera-9858/360p.mp4",
  contractorCrew: "https://cdn.coverr.co/videos/coverr-construction-workers-454/360p.mp4",
  craftProcess: "https://cdn.coverr.co/videos/coverr-carpenter-sawing-wood-6348/360p.mp4",
  clientExperience: "https://cdn.coverr.co/videos/coverr-beauty-salon-6561/360p.mp4",
} as const;

export function imageUrl(id: string, width = 1200) {
  return `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${width}&q=85`;
}

export function money(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function quoteRealEstate(
  packageId: string,
  tierId: string,
  quantities: Record<string, number>,
  retainerIds: string[] = [],
  videoId: string = "no-video",
): Quote | null {
  const tier = realEstateTiers.find((item) => item.id === tierId);
  const selectedPackage = realEstatePackageList.find((item) => item.id === packageId);
  const selectedVideo = realEstateVideoOptions.find((item) => item.id === videoId);
  if (!tier || !selectedPackage || !selectedVideo) return null;

  const selectedRetainers = retainerIds.map((id) => realEstateRetainers.find((item) => item.id === id));
  if (selectedRetainers.some((item) => !item)) return null;
  const tierIndex = realEstateTiers.findIndex((item) => item.id === tier.id);
  const base = selectedPackage.prices[tierIndex];
  const videoIncluded = selectedPackage.includedVideoId === selectedVideo.id;
  const items: QuoteItem[] = [
    {
      id: selectedPackage.id,
      label: `${selectedPackage.name} · ${tier.label}`,
      quantity: 1,
      unitPrice: base,
      amount: base,
      billing: "once",
      category: "base-media",
    },
    {
      id: selectedVideo.id,
      label: selectedVideo.name,
      quantity: 1,
      unitPrice: selectedVideo.price,
      amount: videoIncluded ? 0 : selectedVideo.price,
      billing: "once",
      category: "video",
      detail: selectedVideo.detail,
      badge: videoIncluded ? "Included in package" : undefined,
    },
  ];

  for (const addOn of realEstateAddOns) {
    const quantity = quantities[addOn.id] ?? 0;
    if (!Number.isInteger(quantity) || quantity < 0 || quantity > 40) return null;
    if (quantity === 0) continue;
    const unitPrice = realEstateAddOnPrice(addOn.id);
    const includedQuantity = selectedPackage.includedAddOns?.[addOn.id] ?? 0;
    items.push({
      id: addOn.id,
      label: addOn.label,
      quantity,
      unitPrice,
      amount: unitPrice * Math.max(0, quantity - includedQuantity),
      billing: "once",
      category: "enhancement",
      badge: includedQuantity > 0 ? `${Math.min(quantity, includedQuantity)} included in package` : undefined,
    });
  }

  for (const retainer of selectedRetainers) {
    if (!retainer) continue;
    items.push({
      id: retainer.id,
      label: retainer.name,
      quantity: 1,
      unitPrice: retainer.price,
      amount: retainer.price,
      billing: retainer.billing,
      category: "retainer",
    });
  }

  if (retainerIds.includes("complete-realtor-growth-partner")) {
    const shootCredit = Math.min(225, base);
    items.push({
      id: "realtor-growth-shoot-credit",
      label: "Monthly base listing shoot credit",
      quantity: 1,
      unitPrice: -shootCredit,
      amount: -shootCredit,
      billing: "once",
      category: "retainer",
    });
  }

  const recurring = items
    .filter((item) => item.billing === "monthly")
    .reduce((sum, item) => sum + item.amount, 0);
  return {
    items,
    total: items.reduce((sum, item) => sum + item.amount, 0),
    recurring,
  };
}

export function resolvePromoDiscount(code: string, oneTimeTotal = 0, recurringTotal = 0) {
  const normalizedCode = code.trim().toUpperCase();
  if (normalizedCode === "FIRST50" && oneTimeTotal > 0) return { code: normalizedCode, amount: 50, message: "FIRST50 Applied — $50 Off One-Time Shoot" };
  if (/^[A-Z0-9_-]+50$/.test(normalizedCode) && normalizedCode !== "FIRST50" && oneTimeTotal > 0) {
    return { code: normalizedCode, amount: 50, message: "Referral Applied: $50 Partner Credit" };
  }
  if (normalizedCode === "GROWTH300" && recurringTotal > 0) {
    const amount = Math.min(300, recurringTotal);
    return { code: normalizedCode, amount, message: `GROWTH300 Applied — $${amount} Off First Month of Retainers` };
  }
  return null;
}

export function quoteCommercial(
  packageId: string,
  retainerIds: string[],
): Quote | null {
  const selectedPackage = commercialPackages.find((item) => item.id === packageId);
  const selectedRetainers = retainerIds.map((id) =>
    commercialRetainers.find((item) => item.id === id),
  );

  if (!selectedPackage || selectedRetainers.some((item) => !item)) return null;

  const items: QuoteItem[] = [
    {
      id: selectedPackage.id,
      label: selectedPackage.name,
      quantity: 1,
      unitPrice: selectedPackage.price,
      amount: selectedPackage.price,
      billing: "once",
    },
    ...selectedRetainers.map((item) => ({
      id: item!.id,
      label: item!.name,
      quantity: 1,
      unitPrice: item!.price,
      amount: item!.price,
      billing: item!.billing,
    })),
  ];
  const recurring = items
    .filter((item) => item.billing === "monthly")
    .reduce((sum, item) => sum + item.amount, 0);

  return {
    items,
    total: items.reduce((sum, item) => sum + item.amount, 0),
    recurring,
  };
}