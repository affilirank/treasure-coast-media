"use client";

import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
} from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Camera,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleDollarSign,
  Clock3,
  FileCheck2,
  Film,
  Home,
  Mail,
  MapPin,
  Menu,
  Mic2,
  Plane,
  Play,
  Send,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import {
  useEffect,
  useState,
  type FormEvent,
} from "react";
import {
  commercialGallery,
  commercialGrowthServices,
  commercialPackages,
  commercialRetainers,
  imageUrl,
  money,
  quoteCommercial,
  quoteRealEstate,
  realEstateAddOnPrice,
  resolvePromoDiscount,
  realEstateAddOns,
  realEstateGallery,
  realEstatePackageList,
  realEstateRetainers,
  realEstateTiers,
  realEstateVideoOptions,
  stockImages,
  videoSources,
  type CommercialPackageId,
  type CommercialRetainerId,
  type GalleryItem,
  type QuoteItem,
  type RealEstateAddOnId,
  type RealEstatePackageId,
  type RealEstateRetainerId,
  type RealEstateTierId,
  type RealEstateVideoId,
  type Track,
} from "@/lib/site-data";

type BookingFields = {
  address: string;
  date: string;
  time: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  accessNotes: string;
};

type BookingReceipt = {
  referenceId: string;
  status: "preview" | "forwarded";
  total: number;
  originalTotal?: number;
  discountAmount?: number;
  appliedPromoCode?: string | null;
  recurring: number;
  items: QuoteItem[];
  booking: BookingFields;
};

const realEstateFilters = [
  "All",
  "Aerial Drone",
  "Interiors & HDR",
  "Cinematic Video",
  "Twilight & Staging",
];

const commercialFilters = [
  "All",
  "Founder Films",
  "People & Process",
  "Place & Detail",
];

const serviceIcons = [Camera, Plane, Film, FileCheck2, Sparkles, CircleDollarSign];

const initialBooking: BookingFields = {
  address: "",
  date: "",
  time: "",
  name: "",
  email: "",
  phone: "",
  company: "",
  accessNotes: "",
};

function createRealEstateQuantities(): Record<RealEstateAddOnId, number> {
  return Object.fromEntries(realEstateAddOns.map(({ id }) => [id, 0])) as Record<
    RealEstateAddOnId,
    number
  >;
}

function createCommercialRetainers(): Record<CommercialRetainerId, boolean> {
  return Object.fromEntries(
    commercialRetainers.map(({ id }) => [id, false]),
  ) as Record<CommercialRetainerId, boolean>;
}

function createRealEstateRetainers(): Record<RealEstateRetainerId, boolean> {
  return Object.fromEntries(
    realEstateRetainers.map(({ id }) => [id, false]),
  ) as Record<RealEstateRetainerId, boolean>;
}

function Brand({ track }: { track: Track }) {
  return (
    <a className="brand-lockup" href={track === "commercial" ? "/commercial" : "/real-estate"} aria-label="Merit Media & Marketing home">
      <span className="brand-mark" aria-hidden="true"><Image className="brand-mark-image" src="/images/merit-logo.png" alt="" width={36} height={36} /></span>
      <span className="brand-type">
        <span>Merit</span>
        <span>Media &amp; Marketing</span>
      </span>
    </a>
  );
}

function TrackSelector({
  track,
  onChange,
}: {
  track: Track;
  onChange: (next: Track) => void;
}) {
  const choices: {
    id: Track;
    icon: typeof Home;
    title: string;
    audience: string;
    services: string;
  }[] = [
    {
      id: "real-estate",
      icon: Home,
      title: "REAL ESTATE & LISTINGS",
      audience: "For Realtors, Brokers & Property Managers",
      services: "Next-Day MLS Delivery · HDR Photos · Drone · Floor Plans",
    },
    {
      id: "commercial",
      icon: Camera,
      title: "COMMERCIAL & BRAND PRODUCTION",
      audience: "For Local Businesses, Contractors & Med Spas",
      services: "Brand Films · Direct-Response Ads · Growth Retainers",
    },
  ];

  return (
    <div className="track-selector" aria-label="Choose a service track">
      {choices.map(({ id, icon: Icon, title, audience, services }) => (
        <button
          key={id}
          type="button"
          className={`track-option${track === id ? " is-active" : ""}`}
          aria-pressed={track === id}
          onClick={() => onChange(id)}
        >
          <span className="track-option-icon"><Icon size={23} strokeWidth={1.5} /></span>
          <span className="track-option-copy">
            <strong>{title}</strong>
            <small>{audience}</small>
            <span>{services}</span>
          </span>
          <span className="track-option-check" aria-hidden="true">
            {track === id && <Check size={11} strokeWidth={2.5} />}
          </span>
        </button>
      ))}
    </div>
  );
}

function SectionHeading({
  kicker,
  title,
  intro,
}: {
  kicker: string;
  title: React.ReactNode;
  intro?: string;
}) {
  return (
    <div className="section-heading">
      <div>
        <span className="section-kicker">{kicker}</span>
        <h2>{title}</h2>
      </div>
      {intro && <p className="section-intro">{intro}</p>}
    </div>
  );
}

function GallerySection({
  track,
  filter,
  onFilterChange,
  onOpen,
}: {
  track: Track;
  filter: string;
  onFilterChange: (filter: string) => void;
  onOpen: (item: GalleryItem) => void;
}) {
  const gallery = track === "real-estate" ? realEstateGallery : commercialGallery;
  const filters = track === "real-estate" ? realEstateFilters : commercialFilters;
  const visibleGallery = gallery.filter(
    (item) => filter === "All" || item.category === filter,
  );

  return (
    <section className="section section-white" id="showcase">
      <div className="shell">
        <SectionHeading
          kicker={track === "real-estate" ? "Selected property work" : "Selected brand work"}
          title={
            track === "real-estate" ? (
              <>Made for the <em>first impression.</em></>
            ) : (
              <>Real people. <em>Remarkable work.</em></>
            )
          }
          intro={
            track === "real-estate"
              ? "A considered visual standard across the Treasure Coast and Palm Beaches, from first frame to final delivery."
              : "Photography and film with enough personality to stop a scroll, and enough craft to earn the next click."
          }
        />
        <div className="filter-bar" role="group" aria-label="Filter portfolio">
          {filters.map((item) => (
            <button
              key={item}
              className={`filter-button${filter === item ? " is-selected" : ""}`}
              type="button"
              aria-pressed={filter === item}
              onClick={() => onFilterChange(item)}
            >
              {item}
            </button>
          ))}
        </div>
        <div className="gallery-grid">
          {visibleGallery.map((item) => (
            <button
              className="gallery-card"
              key={item.id}
              type="button"
              aria-label={`Open ${item.title} portfolio image`}
              onClick={() => onOpen(item)}
            >
              <span className="gallery-image">
                <Image
                  src={imageUrl(item.image, 1100)}
                  alt={item.title}
                  fill
                  sizes="(max-width: 760px) 50vw, 42vw"
                  unoptimized
                />
              </span>
              <span className="gallery-overlay" />
              <span className="gallery-category">{item.category}</span>
              <span className="gallery-copy">
                <span>
                  <strong>{item.title}</strong>
                  <small>{item.detail}</small>
                </span>
                <ArrowUpRight size={17} aria-hidden="true" />
              </span>
            </button>
          ))}
          {visibleGallery.length === 0 && (
            <p className="gallery-empty">New work in this collection is on the way.</p>
          )}
        </div>
      </div>
    </section>
  );
}

function ComparisonSection() {
  const [position, setPosition] = useState(53);
  const [scene, setScene] = useState<"interior" | "exterior">("interior");
  const isInterior = scene === "interior";
  const image = imageUrl(isInterior ? stockImages.comparisonInterior : stockImages.comparisonExterior, 1600);

  return (
    <section className="section section-paper">
      <div className="shell proof-grid">
        <div>
          <div className="comparison-scene-switch" role="group" aria-label="Choose photo edit comparison">
            <button type="button" aria-pressed={isInterior} className={isInterior ? "is-selected" : ""} onClick={() => { setScene("interior"); setPosition(53); }}>Interior HDR</button>
            <button type="button" aria-pressed={!isInterior} className={!isInterior ? "is-selected" : ""} onClick={() => { setScene("exterior"); setPosition(53); }}>Exterior Twilight</button>
          </div>
          <div className={`comparison-frame ${isInterior ? "is-interior" : "is-exterior"}`}>
          <div className="comparison-photo comparison-before">
            <Image src={image} alt={isInterior ? "Expansive luxury kitchen with a large island, before HDR exposure balancing" : "Luxury Florida home exterior in natural late-afternoon daylight before virtual twilight"} fill sizes="(max-width: 760px) 100vw, 45vw" unoptimized />
          </div>
          <div className="comparison-photo comparison-after" style={{ clipPath: `inset(0 0 0 ${position}%)` }}>
            <Image src={image} alt={isInterior ? "Brightened HDR luxury kitchen with balanced window light and crisp interior detail" : "Same Florida home digitally enhanced with a warm sunset twilight sky"} fill sizes="(max-width: 760px) 100vw, 45vw" unoptimized />
            {!isInterior && <span className="twilight-sunset-wash" aria-hidden="true" />}
          </div>
          <span className="comparison-label before">{isInterior ? "Original exposure" : "Daylight"}</span>
          <span className="comparison-label after">{isInterior ? "HDR + window pull" : "Virtual twilight"}</span>
          <span className="comparison-divider" style={{ left: `${position}%` }} />
          <label className="sr-only" htmlFor="comparison-slider">Compare {isInterior ? "the original kitchen exposure with the bright HDR edit" : "the daylight exterior with the sunset virtual twilight edit"}</label>
          <input
            id="comparison-slider"
            className="comparison-range"
            type="range"
            min="0"
            max="100"
            value={position}
            onChange={(event) => setPosition(Number(event.target.value))}
            aria-valuetext={`${position}% edited ${isInterior ? "HDR kitchen" : "virtual twilight"} image shown`}
          />
          <span className="comparison-caption">Drag the divider to reveal the {isInterior ? "brighter HDR finish" : "warm sunset conversion"}.</span>
          </div>
        </div>
        <div className="proof-copy">
          <span className="section-kicker">The difference is in the detail</span>
          <h2 className="text-display">{isInterior ? <>Interior light, <em>beautifully balanced.</em></> : <>A warm twilight, <em>without the wait.</em></>}</h2>
          <p>
            {isInterior
              ? "Our bracketed kitchen exposures are blended by hand: interiors stay bright, windows retain their view, and color stays natural instead of looking over-processed."
              : "A virtual twilight treatment turns a daytime exterior into a warm, sunset-inspired hero image while preserving the actual property and its surroundings."}
          </p>
          <div className="proof-points">
            {(isInterior
              ? ["Bright HDR interiors with balanced window pulls", "Natural color, crisp detail and corrected architectural lines", "MLS-ready kitchen photography delivered the next day"]
              : ["Sunset-inspired sky and warm exterior illumination", "No reshoot or evening property access required", "MLS-ready twilight edit delivered with your photo set"]
            ).map((point) => (
              <div className="proof-point" key={point}><CheckCircle2 size={15} />{point}</div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function RealEstateVideo() {
  return (
    <section className="section section-dark">
      <div className="shell">
        <SectionHeading
          kicker="More than a room-by-room tour"
          title={<>A listing with <em>its own point of view.</em></>}
          intro="Two agent-led coastal walkthroughs, ready to play without extra overlays or controls." 
        />
        <div className="walkthrough-pair">
          <iframe
            className="walkthrough-embed"
            src={`${videoSources.propertyTourEmbed}?autoplay=1&muted=1`}
            title="Golden Hour Luxury Mansion Tour"
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
          />
          <iframe
            className="walkthrough-embed"
            src={`${videoSources.propertyTourSecondEmbed}?autoplay=1&muted=1`}
            title="Golden Hour Coastal Luxury"
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
          />
        </div>
      </div>
    </section>
  );
}

function AiPresenterSection({ track, onDiscuss }: { track: Track; onDiscuss: (service: string) => void }) {
  const videoSource = track === "real-estate" ? videoSources.realtorAiPresenterEmbed : videoSources.commercialAiPresenterEmbed;
  const videoTitle = track === "real-estate" ? "Vero Beach Market Update AI presenter example" : "Commercial AI presenter example";
  return (
    <section className="section section-paper ai-presenter-section" id="ai-presenter" aria-labelledby="ai-presenter-title">
      <div className="shell ai-presenter-grid">
        <div className="ai-presenter-copy">
          <span className="section-kicker">No camera crew required</span>
          <h2 id="ai-presenter-title" className="text-display">Not comfortable on camera? <em>We can still make you the face of the brand.</em></h2>
          <p>With your permission, we can create a digital presenter using your approved likeness and voice, then produce polished promos without another on-site recording day.</p>
          <div className="ai-presenter-price"><strong>$495</strong><span>30 seconds</span></div>
          <div className="ai-presenter-price ai-presenter-price-secondary"><strong>$695</strong><span>up to 90 seconds</span></div>
          <ul className="ai-presenter-points">
            <li>Scripted promo built around your offer and audience</li>
            <li>Approved likeness and voice use only, with written consent</li>
            <li>Vertical 9:16 social delivery ready for paid or organic campaigns</li>
          </ul>
          <button className="button-dark" type="button" onClick={() => onDiscuss("AI Clone + Voice Promo Video · $495 / 30 seconds or $695 / up to 90 seconds")}>Create my promo <ArrowUpRight size={15} /></button>
        </div>
        <div className="ai-presenter-video">
          <iframe
            src={`${videoSource}?autoplay=1&muted=1`}
            title={videoTitle}
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
          />
          <span className="ai-presenter-caption">Example presenter video · your approved likeness, your message</span>
        </div>
      </div>
    </section>
  );
}

function CommercialShowcase({ onPlay }: { onPlay: () => void }) {
  const socialCards = [
    { label: "Hook A · Problem / solution", line: "Need a contractor you can count on in Vero?", image: stockImages.commercialCraft, video: videoSources.contractorCrew },
    { label: "Hook B · Behind the scenes", line: "A closer look at the care in every cut.", image: stockImages.commercialCraft, video: videoSources.craftProcess },
    { label: "Hook C · Customer story", line: "See what a thoughtful visit feels like.", image: stockImages.commercialSalon, video: videoSources.clientExperience },
  ];
  const stills = [
    { title: "Executive portrait", image: stockImages.commercialFounder },
    { title: "The people behind the work", image: stockImages.commercialTeam },
    { title: "Craft & equipment", image: stockImages.commercialCraft },
    { title: "A place of your own", image: stockImages.commercialSpace },
  ];

  return (
    <>
      <section className="section section-dark">
        <div className="shell">
          <SectionHeading
            kicker="Commercial film · Vero Beach"
            title={<>A good story earns <em>the next conversation.</em></>}
            intro="A founder-led brand film is the anchor. Purpose-built vertical edits give your best story room to travel."
          />
          <div className="commercial-showcase-grid">
            <div className="video-feature">
              <div className="video-feature-media">
                <video autoPlay loop muted playsInline preload="metadata" poster={imageUrl(stockImages.commercialFounder, 1300)} aria-label="Looping cinematic commercial brand film">
                  <source src={videoSources.founderStory} type="video/mp4" />
                </video>
              </div>
              <div className="video-feature-shade" />
              <div className="video-topline">
                <span className="video-chip"><Film size={13} /> Founder story · 4K</span>
                <span className="video-chip"><Mic2 size={13} /> 32-bit float audio</span>
              </div>
              <button className="video-center-play" type="button" aria-label="Play brand film" onClick={onPlay}>
                <Play size={22} fill="currentColor" />
              </button>
              <div className="video-feature-copy">
                <h3>The founder’s point of view.</h3>
                <p>A brand film for the website, Google profile and the people who have not met you yet.</p>
              </div>
            </div>
            <details className="case-study" open>
              <summary>Case study breakdown <ChevronDown size={17} /></summary>
              <div className="case-study-content">
                <div><strong>The goal</strong><span>Modernize brand identity and attract high-ticket local clientele.</span></div>
                <div><strong>The deliverable</strong><span>One 90-sec master film plus three vertical ad hooks.</span></div>
                <div><strong>Illustrative result</strong><span>+42% increase in online appointment bookings in 30 days.*</span></div>
              </div>
              <p className="quote-note">*Sample case-study outcome for presentation. Replace with verified client data before publishing.</p>
            </details>
          </div>
          <div className="section-heading" style={{ marginTop: 68, marginBottom: 25 }}>
            <div><span className="section-kicker">Built for the vertical feed</span><h2>Three hooks. <em>One clear offer.</em></h2></div>
            <p className="section-intro">A social ad suite made for the way local customers discover, compare and choose.</p>
          </div>
          <div className="social-grid">
            {socialCards.map((card) => (
              <article className="social-card" key={card.label}>
                <video autoPlay loop muted playsInline preload="none" poster={imageUrl(card.image, 500)} aria-hidden="true">
                  <source src={card.video} type="video/mp4" />
                </video>
                <div className="social-hook"><small>{card.label}</small><strong>{card.line}</strong><span>BOOK YOUR CONSULTATION</span></div>
              </article>
            ))}
          </div>
          <div className="stills-grid">
            {stills.map((still) => (
              <div className="still-card" key={still.title}>
                <Image className={still.title === "Executive portrait" ? "still-image still-image-portrait" : "still-image"} src={imageUrl(still.image, 700)} alt={still.title} width={700} height={480} sizes="(max-width: 760px) 50vw, 25vw" unoptimized />
                <span>{still.title}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

function CommercialVslSection({
  onBook,
  onCalculate,
}: {
  onBook: () => void;
  onCalculate: () => void;
}) {
  const painPoints = [
    "Hiring a cameraman who hands you raw video files with zero strategy on how to get paying customers from it.",
    "Running ads to a slow, generic website that leaks 90% of visitors before they ever call or fill out a form.",
    "Inconsistent posting and outdated social feeds that make your business look closed or amateur to high-ticket clients.",
  ];
  const stats = [
    { value: "86%", label: "of consumers state high-quality video convinced them to purchase a local service or high-ticket product." },
    { value: "2.6×", label: "higher conversion rates on dedicated custom landing pages compared to standard multi-page websites." },
    { value: "400%", label: "higher lead conversion rate when lead response occurs within the first 60 seconds via automated SMS." },
    { value: "9:00 AM", label: "next-day delivery standard on commercial social cutdowns so your campaigns never stall." },
  ];

  return (
    <section className="commercial-vsl section section-dark" aria-labelledby="commercial-vsl-title">
      <div className="shell">
        <div className="commercial-vsl-heading">
          <span className="section-kicker">Commercial growth · Executive briefing</span>
          <h2 id="commercial-vsl-title">How Treasure Coast Businesses Use High-Impact Video &amp; Growth Funnels to Out-Convert Competitors.</h2>
          <p>Watch this executive breakdown before spending another dollar on fragmented advertising.</p>
        </div>
        <div className="commercial-vsl-frame">
          <iframe
            src={videoSources.commercialVslEmbed}
            title="Commercial growth strategy video"
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
          />
        </div>
        <div className="commercial-vsl-actions">
          <button className="button-primary" type="button" onClick={onBook}>Book a 15-Minute Strategy Call <ArrowUpRight size={15} /></button>
          <button className="vsl-secondary-action" type="button" onClick={onCalculate}>Calculate Campaign Pricing <ArrowRight size={15} /></button>
        </div>

        <div className="commercial-pain-card">
          <div>
            <span className="section-kicker">Where budgets disappear</span>
            <h3>The Local Marketing Trap That Wastes Thousands:</h3>
          </div>
          <ul>{painPoints.map((point) => <li key={point}>{point}</li>)}</ul>
        </div>
        <div className="commercial-pain-video">
          <iframe
            src={`${videoSources.commercialPainPointEmbed}?autoplay=1&muted=1`}
            title="Commercial marketing strategy example"
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
          />
        </div>
        <div className="commercial-stats" aria-label="Commercial marketing performance claims">
          {stats.map((stat) => (
            <article className="commercial-stat" key={stat.value}>
              <strong>{stat.value}</strong>
              <p>{stat.label}</p>
            </article>
          ))}
        </div>
        <p className="commercial-stats-note">Performance figures are supplied marketing claims; verify and cite primary sources before using them in paid campaigns.</p>
      </div>
    </section>
  );
}

function ServicesSection({
  track,
  onDiscuss,
}: {
  track: Track;
  onDiscuss: (service: string) => void;
}) {
  const services: { title: string; detail: string; price?: string; badge?: string; specs?: string[] }[] = track === "real-estate"
    ? [
        { title: "Architectural HDR", detail: "Carefully blended exposures, clean verticals and natural window detail." },
        { title: "4K Aerial Stills", detail: "FAA Part 107 drone perspectives that make the setting easy to understand." },
        { title: "Listing Films", detail: "Stabilized walkthroughs, licensed music and 9:16 social cutdowns." },
        { title: "Measured Floor Plans", detail: "Readable 2D floor plans included with every standard media package." },
        { title: "Twilight & Staging", detail: "On-site sunset capture, virtual dusk and thoughtful virtual furnishing." },
        { title: "Brokerage Campaigns", detail: "Reels, neighborhood pages, listing launches and agent branding." },
        { title: "AI Clone + Voice Promo Video", detail: "A 30-second promo using an approved digital likeness and voice for agents who prefer not to record on camera.", price: "$495 / 30 seconds", badge: "Consent-based AI presenter", specs: ["Scripted offer-focused promo", "Approved likeness and voice only", "Social-ready 9:16 delivery"] },
        { title: "60-Second Realtor Walkthrough Reel", detail: "A guided, social-ready listing story recorded to convert attention into showing requests.", price: "$695", badge: "High-Yield Personal Brand & Listing Asset", specs: ["On-camera wireless lapel mic audio", "4K Sony gimbal interior glide and 4K aerial cutaways", "Dynamic kinetic captions and licensed background track", "Unbranded MLS link plus social 9:16 vertical and 16:9 widescreen files"] },
        { title: "Up to 2-Minute Realtor Walkthrough Film", detail: "A fuller agent-led property story, up to two minutes, for luxury listings, landing pages, and long-form social campaigns.", price: "$995", badge: "Signature Listing Story", specs: ["Agent-led narrative and full property journey", "4K interior glide and aerial context", "Licensed music with MLS and social delivery"] },
        { title: "Up to 90-Second AI Presenter Video", detail: "A consent-based presenter video up to 90 seconds using an approved likeness and voice for listing, market, or seller campaigns.", price: "$695 / up to 90 seconds", badge: "Consent-based AI presenter", specs: ["Approved likeness and voice only", "Scripted presenter promo", "Branded captions for social and landing pages"] },
      ]
    : [
        { title: "Brand Films", detail: "Founder interviews and cinematic b-roll built around a clear point of view." },
        { title: "Direct-Response Ads", detail: "Concepted vertical creative with audience-aware hooks and captions." },
        { title: "Commercial Photography", detail: "People, process, facilities and products photographed as they really are." },
        { title: "Landing Page Funnels", detail: "Fast campaign pages with a single next step and clear conversion tracking." },
        { title: "Paid Search & Social", detail: "Managed Meta, TikTok, Google Search and Local Services campaigns." },
        { title: "CRM & Lead Nurture", detail: "Useful automations that help local businesses respond while intent is high." },
        { title: "AI Clone + Voice Promo Video", detail: "A 30-second customer-acquisition promo using an approved digital likeness and voice when you prefer not to record on camera.", price: "$495 / 30 seconds", badge: "Consent-based AI presenter", specs: ["Scripted direct-response promo", "Approved likeness and voice only", "Social-ready 9:16 delivery"] },
        { title: "Up to 90-Second AI Presenter Video", detail: "A consent-based presenter video up to 90 seconds using an approved likeness and voice for longer commercial offers and campaigns.", price: "$695 / up to 90 seconds", badge: "Consent-based AI presenter", specs: ["Approved likeness and voice only", "Scripted presenter promo", "Branded captions for social and landing pages"] },
      ];
  const [expandedService, setExpandedService] = useState<string | null>(services[0]?.title ?? null);

  return (
    <section className="section section-paper" id="services">
      <div className="shell">
        <SectionHeading
          kicker={track === "real-estate" ? "Listing media, considered" : "Production meets performance"}
          title={track === "real-estate" ? <>Every detail, <em>working together.</em></> : <>From first frame to <em>follow-up.</em></>}
          intro="One local production partner for the visual craft and practical delivery that move good work forward."
        />
        <div className="service-grid">
          {services.map((service, index) => {
            const Icon = serviceIcons[index % serviceIcons.length];
            const isExpanded = expandedService === service.title;
            return (
                <article className={`service-item${isExpanded ? " is-expanded" : ""}`} key={service.title}>
                  <button
                    className="service-toggle"
                    type="button"
                    aria-expanded={isExpanded}
                    aria-controls={`service-detail-${index}`}
                    onClick={() => setExpandedService(isExpanded ? null : service.title)}
                  >
                    <Icon size={25} strokeWidth={1.5} />
                    <span className="service-toggle-title">{service.title}</span>
                    <span className="service-toggle-hint">{isExpanded ? "Close details" : "Explore service"}</span>
                    <ChevronDown className="service-toggle-chevron" size={18} />
                  </button>
                  <div className="service-detail" id={`service-detail-${index}`} hidden={!isExpanded}>
                    <p>{service.detail}</p>
                    {service.badge && <div className="service-featured-meta"><span>{service.badge}</span><strong>{service.price}</strong></div>}
                    {service.specs && <ul className="service-specs">{service.specs.map((spec) => <li key={spec}>{spec}</li>)}</ul>}
                    <button className="service-discuss" type="button" onClick={() => onDiscuss(service.title)}>
                      Discuss this service <ArrowUpRight size={15} />
                    </button>
                  </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function QuoteDrawer({
  quote,
  track,
  onBook,
  booking,
  originalTotal,
  discountAmount,
  promoInput,
  promoMessage,
  promoApplied,
  onPromoInputChange,
  onApplyPromo,
}: {
  quote: ReturnType<typeof quoteRealEstate>;
  track: Track;
  onBook: () => void;
  booking: boolean;
  originalTotal: number;
  discountAmount: number;
  promoInput: string;
  promoMessage: string;
  promoApplied: boolean;
  onPromoInputChange: (value: string) => void;
  onApplyPromo: () => void;
}) {
  const quoteCategories: { id: NonNullable<QuoteItem["category"]>; label: string }[] = [
    { id: "base-media", label: "Selected Package / Base Media" },
    { id: "video", label: "Video Choice" },
    { id: "enhancement", label: "Enhancements" },
    { id: "retainer", label: "Retainers" },
  ];
  const renderQuoteItem = (item: QuoteItem) => (
    <div className="quote-line" key={item.id}>
      <span>{item.label}{item.quantity > 1 ? ` × ${item.quantity}` : ""}{item.billing === "monthly" ? " / mo" : ""}{item.detail && <small className="quote-item-detail">{item.detail}</small>}{item.badge && <small className="quote-bundle-badge">{item.badge}</small>}</span>
      <strong>{money(item.amount)}</strong>
    </div>
  );

  return (
    <aside className="quote-card" aria-live="polite" aria-label="Live itemized quote">
      <div className="quote-card-head"><span>Live project estimate</span><CircleDollarSign size={18} /></div>
      <div className="quote-items">
        {track === "real-estate" && quote ? (
          <>
            <p className="quote-equation">Package / Base Media + Video Choice + Enhancements + Retainers = Estimated Total</p>
            {quoteCategories.map((category) => {
              const items = quote.items.filter((item) => item.category === category.id);
              const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
              return (
                <section className="quote-group" key={category.id}>
                  <div className="quote-group-head"><span>{category.label}</span><strong>{money(subtotal)}</strong></div>
                  {items.length ? items.map(renderQuoteItem) : <small className="quote-group-empty">None selected</small>}
                </section>
              );
            })}
          </>
        ) : quote?.items.map(renderQuoteItem)}
        {!quote && <p className="quote-empty">Choose a valid package and options to see your estimate.</p>}
      </div>
      <div className="promo-control">
        <label className="sr-only" htmlFor="promo-code">Promo or referral code</label>
        <div className="promo-input-row">
          <input
            id="promo-code"
            value={promoInput}
            onChange={(event) => onPromoInputChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                onApplyPromo();
              }
            }}
            placeholder="Enter promo or referral code (e.g. FIRST50)"
            autoComplete="off"
          />
          <button type="button" onClick={onApplyPromo}>Apply Code</button>
        </div>
        {promoMessage && <p className={`promo-message${promoApplied ? " is-success" : " is-error"}`} role="status">{promoApplied ? "✓ " : ""}{promoMessage}</p>}
      </div>
      <div className="quote-total">
        <span>{track === "commercial" ? "Project + first month" : "Estimated total"}</span>
        <strong>{discountAmount > 0 && <del>{money(originalTotal)}</del>}{money(Math.max(0, originalTotal - discountAmount))}</strong>
      </div>
      {quote && quote.recurring > 0 && <p className="quote-note">Includes {money(quote.recurring)} in monthly services after the initial production.</p>}
      {track === "real-estate" && <p className="quote-note">No Florida sales tax on eligible electronic media delivery. Final scope confirmed before capture.</p>}
      <button className="button-primary" type="button" onClick={onBook} disabled={booking || !quote}>
        {booking ? "Sending request…" : "Continue to booking"}<ArrowUpRight size={15} />
      </button>
    </aside>
  );
}

function MeritClub() {
  const rewards = [
    { level: "Silver", count: "1–4 shoots", perk: "Next-morning 9:00 AM MLS delivery & dedicated scheduling." },
    { level: "Gold", count: "5–9 shoots", perk: "5% lifetime account discount + 1 free virtual twilight per listing." },
    { level: "Platinum", count: "10–19 shoots", perk: "10% lifetime discount + free 2D floor plans + 2 rush credits." },
    { level: "Black Label", count: "20+ shoots / teams", perk: "15% discount + free quarterly agent branding/headshot session." },
  ];

  return (
    <section className="merit-club" aria-labelledby="merit-club-title">
      <div className="merit-club-heading">
        <div>
          <span className="section-kicker">Built for repeat partners</span>
          <h3 id="merit-club-title">The Merit Club <span>| Partner Volume Rewards</span></h3>
        </div>
        <p>Earn rewards on every listing. Tracked automatically by your agent email.</p>
      </div>
      <div className="merit-rewards-grid">
        {rewards.map((reward) => (
          <article className="merit-reward" key={reward.level}>
            <span>{reward.count}</span>
            <h4>{reward.level}</h4>
            <p>{reward.perk}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function RealEstateCalculator({
  packageId,
  onPackageChange,
  tierId,
  onTierChange,
  videoId,
  onVideoChange,
  quantities,
  onQuantityChange,
  retainers,
  onRetainerChange,
}: {
  packageId: RealEstatePackageId;
  onPackageChange: (packageId: RealEstatePackageId) => void;
  tierId: RealEstateTierId;
  onTierChange: (tier: RealEstateTierId) => void;
  videoId: RealEstateVideoId;
  onVideoChange: (videoId: RealEstateVideoId) => void;
  quantities: Record<RealEstateAddOnId, number>;
  onQuantityChange: (id: RealEstateAddOnId, quantity: number) => void;
  retainers: Record<RealEstateRetainerId, boolean>;
  onRetainerChange: (id: RealEstateRetainerId, selected: boolean) => void;
}) {
  const selectedPackage = realEstatePackageList.find((item) => item.id === packageId);
  const includedAddOns = selectedPackage?.includedAddOns ?? {};
  const turnkeyPackages = realEstatePackageList.filter((item) => item.turnkey);
  const basePackages = realEstatePackageList.filter((item) => !item.turnkey);

  return (
    <div className="calculator">
      <div className="calculator-section turnkey-section">
        <div className="step-heading"><span className="step-number">★</span><h3>Quick-select turnkey packages</h3></div>
        <div className="turnkey-grid" role="radiogroup" aria-label="Turnkey packages">
          {turnkeyPackages.map((item) => (
            <button
              type="button"
              className={`turnkey-card${packageId === item.id ? " is-selected" : ""}`}
              role="radio"
              aria-checked={packageId === item.id}
              key={item.id}
              onClick={() => onPackageChange(item.id as RealEstatePackageId)}
            >
              {item.badge && <span className="turnkey-tag">{item.badge}</span>}
              <strong>{item.name}</strong>
              <span className="turnkey-price">{money(item.prices[0])} base</span>
              <ul>{item.features.map((feature) => <li key={feature}>{feature}</li>)}</ul>
              <small>Base covers up to 2,800 SQFT; +$100 for 2,801–3,800; +$200 for 3,801+.</small>
              <span className="video-choice-status">{packageId === item.id ? "Selected" : "Select package"}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="calculator-section">
        <div className="step-heading"><span className="step-number">01</span><h3>Base property media · Select one</h3></div>
        <div className="real-estate-package-grid" role="radiogroup" aria-label="Base property media">
          {basePackages.map((item) => (
            <button
              type="button"
              className={`real-estate-package-card${packageId === item.id ? " is-selected" : ""}`}
              role="radio"
              aria-checked={packageId === item.id}
              key={item.id}
              onClick={() => onPackageChange(item.id as RealEstatePackageId)}
            >
              {item.badge && <span className="production-featured-badge">{item.badge}</span>}
              <strong>{item.name}</strong>
              <small>{item.target}</small>
              <ul>{item.features.map((feature) => <li key={feature}>{feature}</li>)}</ul>
              <span>From {money(item.prices[0])}</span>
            </button>
          ))}
        </div>
        <div className="tier-heading"><strong>Choose the home’s square footage</strong><span>{selectedPackage?.turnkey ? "Turnkey base covers up to 2,800 SQFT; +$100 / +$200 above." : "Photo-Only Essentials increases by $40 per tier."}</span></div>
        <div className="tier-grid" role="radiogroup" aria-label="Property square footage">
          {realEstateTiers.map((tier) => (
            <label className={`tier-option${tierId === tier.id ? " is-selected" : ""}`} key={tier.id}>
              <input type="radio" name="sqft-tier" value={tier.id} checked={tierId === tier.id} onChange={() => onTierChange(tier.id)} />
              <span>{tier.label}</span><strong>{money(selectedPackage?.prices[realEstateTiers.findIndex((item) => item.id === tier.id)] ?? 0)}</strong>
            </label>
          ))}
        </div>
      </div>
      <div className="calculator-section">
        <div className="step-heading"><span className="step-number">02</span><h3>Add video production · Choose one</h3></div>
        <div className="video-choice-grid" role="radiogroup" aria-label="Video production">
          {realEstateVideoOptions.map((video) => (
            <button
              type="button"
              className={`video-choice-card${videoId === video.id ? " is-selected" : ""}${video.price === 0 ? " is-no-video" : ""}`}
              role="radio"
              aria-checked={videoId === video.id}
              key={video.id}
              onClick={() => onVideoChange(video.id)}
            >
              <span className="video-choice-price">{video.price === 0 ? "$0" : selectedPackage?.includedVideoId === video.id ? "Included" : `+${money(video.price)}`}</span>
              <strong>{video.name}</strong>
              <small>{video.detail}</small>
              <span className="video-choice-status">{videoId === video.id ? "Selected" : "Select video"}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="calculator-section">
        <div className="step-heading"><span className="step-number">03</span><h3>Quick utility enhancements</h3></div>
        <div className="addon-list">
          {realEstateAddOns.map((addOn) => {
            const quantity = quantities[addOn.id];
            const isSelected = quantity > 0;
            const unitLabel = addOn.unit === "photo" ? "photo" : addOn.unit === "room" ? "room" : addOn.unit;
            return (
              <div className={`addon-row${isSelected ? " is-selected" : ""}`} key={addOn.id}>
                <label className="addon-label">
                  <input
                    className="sr-only"
                    type="checkbox"
                    checked={isSelected}
                    onChange={(event) => onQuantityChange(addOn.id, event.target.checked ? Math.max(quantity, 1) : 0)}
                  />
                  <span className="check-box" aria-hidden="true">{isSelected && <Check size={11} />}</span>
                  <span><strong>{addOn.label}</strong><small>{money(realEstateAddOnPrice(addOn.id))} / {unitLabel}</small>{addOn.included && <small>{addOn.included}</small>}</span>
                </label>
                {(addOn.unit === "photo" || addOn.unit === "room") && isSelected ? (
                  <label className="sr-only" htmlFor={`quantity-${addOn.id}`}>{addOn.label} quantity</label>
                ) : null}
                {(addOn.unit === "photo" || addOn.unit === "room") && isSelected ? (
                  <input
                    id={`quantity-${addOn.id}`}
                    className="addon-quantity"
                    type="number"
                    min="1"
                    max="40"
                    value={quantity}
                    aria-label={`${addOn.label} quantity`}
                    onChange={(event) => onQuantityChange(addOn.id, Math.min(40, Math.max(0, Number(event.target.value))))}
                  />
                ) : <strong className="addon-price">{isSelected ? (quantity <= (includedAddOns[addOn.id] ?? 0) ? "Included" : money(realEstateAddOnPrice(addOn.id) * (quantity - (includedAddOns[addOn.id] ?? 0)))) : "+" + money(realEstateAddOnPrice(addOn.id))}</strong>}
              </div>
            );
          })}
        </div>
      </div>
      <div className="calculator-section">
        <div className="step-heading"><span className="step-number">04</span><h3>Add ongoing marketing retainers</h3></div>
        <div className="addon-list calculator-retainers">
          {realEstateRetainers.map((item) => (
            <div className={`addon-row${retainers[item.id] ? " is-selected" : ""}${item.featured ? " is-featured" : ""}`} key={item.id}>
              <label className="addon-label">
                <input className="sr-only" type="checkbox" checked={retainers[item.id]} onChange={(event) => onRetainerChange(item.id, event.target.checked)} />
                <span className="check-box" aria-hidden="true">{retainers[item.id] && <Check size={11} />}</span>
                <span><strong>{item.name}{item.featured && <small className="retainer-feature-tag">{item.tag}</small>}</strong><small>{item.detail}</small></span>
              </label>
              <strong className="addon-price">+{money(item.price)}{item.billing === "monthly" ? " / mo" : item.unit ? ` / ${item.unit}` : " one-time"}</strong>
            </div>
          ))}
        </div>
        {realEstateRetainers.find((item) => item.featured && retainers[item.id])?.included && (
          <ul className="calculator-includes">
            {realEstateRetainers.find((item) => item.featured && retainers[item.id])?.included?.map((feature) => <li key={feature}>{feature}</li>)}
          </ul>
        )}
      </div>
    </div>
  );
}

function CommercialCalculator({
  packageId,
  onPackageChange,
  retainers,
  onRetainerChange,
}: {
  packageId: CommercialPackageId;
  onPackageChange: (packageId: CommercialPackageId) => void;
  retainers: Record<CommercialRetainerId, boolean>;
  onRetainerChange: (id: CommercialRetainerId, selected: boolean) => void;
}) {
  return (
    <div className="calculator">
      <div className="calculator-section">
        <div className="step-heading"><span className="step-number">01</span><h3>Choose a production package</h3></div>
        <div className="production-tiers" role="radiogroup" aria-label="Commercial production package">
          {commercialPackages.map((item) => (
            <div
              role="radio"
              tabIndex={0}
              aria-checked={packageId === item.id}
              className={`production-card${packageId === item.id ? " is-featured" : ""}`}
              key={item.id}
              onClick={() => onPackageChange(item.id)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onPackageChange(item.id);
                }
              }}
            >
              {item.featured && <span className="production-tag">Most popular</span>}
              <span>Production tier</span>
              <h3>{item.name}</h3>
              <span className="production-price">{money(item.price)}</span>
              <ul>{item.features.map((feature) => <li key={feature}><Check size={13} />{feature}</li>)}</ul>
              <span className="button-dark">{packageId === item.id ? "Selected" : "Select package"}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="calculator-section">
        <div className="step-heading"><span className="step-number">02</span><h3>Add ongoing growth services</h3></div>
        <div className="addon-list">
          {commercialRetainers.map((item) => (
            <div className={`addon-row${retainers[item.id] ? " is-selected" : ""}`} key={item.id}>
              <label className="addon-label">
                <input className="sr-only" type="checkbox" checked={retainers[item.id]} onChange={(event) => onRetainerChange(item.id, event.target.checked)} />
                <span className="check-box" aria-hidden="true">{retainers[item.id] && <Check size={11} />}</span>
                <span><strong>{item.name}</strong><small>{item.detail}</small></span>
              </label>
              <strong className="addon-price">+{money(item.price)}{item.billing === "monthly" ? " / mo" : " one-time"}</strong>
            </div>
          ))}
        </div>
        {commercialRetainers.find((item) => item.featured && retainers[item.id])?.included && (
          <ul className="calculator-includes">
            {commercialRetainers.find((item) => item.featured && retainers[item.id])?.included?.map((feature) => <li key={feature}>{feature}</li>)}
          </ul>
        )}
      </div>
    </div>
  );
}

function RetainersSection({
  track,
  onDiscuss,
}: {
  track: Track;
  onDiscuss: (service: string) => void;
}) {
  const items = track === "real-estate" ? realEstateRetainers : commercialGrowthServices;
  const [expandedItem, setExpandedItem] = useState<string | null>(items[0]?.name ?? null);
  return (
    <section className="section section-white retainer-section" id="retainers">
      <div className="shell">
        <SectionHeading
          kicker="Keep the momentum"
          title={<>A stronger presence, <em>month after month.</em></>}
          intro={track === "real-estate" ? "Repeatable campaigns and client touchpoints for agents who want their marketing to keep pace." : "Production is the start. Stay visible, follow up sooner and turn more local intent into booked work."}
        />
        <div className="retainer-grid">
          {items.map((item, index) => (
            <article className={`retainer-item${expandedItem === item.name ? " is-expanded" : ""}${item.featured ? " is-featured" : ""}`} key={item.name}>
              <button
                className="retainer-toggle"
                type="button"
                aria-expanded={expandedItem === item.name}
                aria-controls={`retainer-detail-${index}`}
                onClick={() => setExpandedItem(expandedItem === item.name ? null : item.name)}
              >
                <span className="retainer-number">{String(index + 1).padStart(2, "0")}</span>
                <span className="retainer-title">{item.name}{item.featured && <small className="retainer-feature-tag">{item.tag}</small>}</span>
                <span className="retainer-price">{money(item.price)}{item.billing === "monthly" ? " / mo" : " / property"}</span>
                <ChevronDown className="retainer-chevron" size={18} />
              </button>
              <div className="retainer-detail" id={`retainer-detail-${index}`} hidden={expandedItem !== item.name}>
                <p>{item.detail}</p>
                {item.included && <ul>{item.included.map((feature) => <li key={feature}>{feature}</li>)}</ul>}
                <button className="retainer-discuss" type="button" onClick={() => onDiscuss(item.name)}>
                  Discuss this offer <ArrowUpRight size={15} />
                </button>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function ProductionWorkflow({ track }: { track: Track }) {
  const steps = track === "real-estate"
    ? [
        { day: "DAY 1", title: "Precision capture", detail: "Cinema-grade Sony 4K bodies, wireless audio and FAA-certified drone passes. A quiet, efficient shoot with zero operational disruption." },
        { day: "NIGHT 1", title: "Overnight polish", detail: "Bracketed stills and S-Log footage move through our dedicated edit pipeline. Straight lines, natural color and carefully resolved windows." },
        { day: "DAY 2 · 9:00 AM", title: "Ready to go live", detail: "Unbranded MLS links, print-quality HDR JPEGs and cinematic files, ready for the listing, the feed or your next campaign." },
      ]
    : [
        { day: "STEP 01", title: "Find the signal", detail: "We define the customer, the offer and the next action before cameras or campaigns enter the picture." },
        { day: "STEP 02", title: "Make it matter", detail: "A focused production day captures the interviews, people, proof and moments your brand needs to show up." },
        { day: "STEP 03", title: "Measure what moves", detail: "Assets are delivered ready for launch. We refine creative and follow-up around qualified leads, not vanity metrics." },
      ];

  return (
    <section className="section section-dark">
      <div className="shell">
        <SectionHeading
          kicker={track === "real-estate" ? "Merit Media & Marketing 24-Hour Guarantee" : "The Merit Precision Workflow"}
          title={<>A clear process. <em>Room to do great work.</em></>}
          intro="Every step is designed around your business, your people and a delivery you can put to work."
        />
        <div className="workflow-grid">
          {steps.map((step, index) => (
            <article className="workflow-step" key={step.day}>
              <span className="workflow-step-number">0{index + 1}<span style={{ marginLeft: 10, color: "var(--gold-light)", fontSize: 8, letterSpacing: ".12em" }}>{step.day}</span></span>
              <h3>{step.title}</h3><p>{step.detail}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function BookingSection({
  track,
  quote,
  booking,
  values,
  onBookingChange,
  onSubmit,
  error,
}: {
  track: Track;
  quote: ReturnType<typeof quoteRealEstate>;
  booking: boolean;
  values: BookingFields;
  onBookingChange: (field: keyof BookingFields, value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  error: string;
}) {
  const fields: { id: keyof BookingFields; label: string; type: string; placeholder: string; required?: boolean }[] = [
    { id: "address", label: track === "real-estate" ? "Property address" : "Business name & location", type: "text", placeholder: "Street, city, ZIP", required: true },
    { id: "date", label: "Preferred shoot date", type: "date", placeholder: "", required: true },
    { id: "time", label: "Preferred arrival time", type: "time", placeholder: "", required: true },
    { id: "name", label: "Your name", type: "text", placeholder: "Full name", required: true },
    { id: "email", label: "Email address", type: "email", placeholder: "you@company.com", required: true },
    { id: "phone", label: "Phone number", type: "tel", placeholder: "(772) 555-0100", required: true },
    { id: "company", label: "Brokerage / company", type: "text", placeholder: "Company name" },
  ];

  return (
    <section className="section section-paper booking-section" id="booking">
      <div className="shell booking-layout">
        <div className="booking-aside">
          <span className="section-kicker">A good place to start</span>
          <h2 className="text-display">Let’s make <em>the next one count.</em></h2>
          <p>Share the essentials. We’ll send your itemized scope to our booking workflow and follow up to confirm access and timing.</p>
          <div className="booking-contact-line"><MapPin size={15} />Treasure Coast & Palm Beaches</div>
          <div className="booking-contact-line"><Mail size={15} /><a href="mailto:hello@meritmediafl.com">hello@meritmediafl.com</a></div>
        </div>
        <form className="booking-form" onSubmit={onSubmit}>
          {fields.map((field) => (
            <div className={`form-field${field.id === "address" || field.id === "company" ? " is-wide" : ""}`} key={field.id}>
              <label htmlFor={`booking-${field.id}`}>{field.label}{field.required ? " *" : ""}</label>
              <input
                id={`booking-${field.id}`}
                name={field.id}
                type={field.type}
                value={values[field.id]}
                placeholder={field.placeholder}
                required={field.required}
                onChange={(event) => onBookingChange(field.id, event.target.value)}
              />
            </div>
          ))}
          <div className="form-field is-wide">
            <label htmlFor="booking-accessNotes">Gate code, access details or notes</label>
            <textarea id="booking-accessNotes" name="accessNotes" value={values.accessNotes} placeholder="Optional details for the production team" onChange={(event) => onBookingChange("accessNotes", event.target.value)} />
          </div>
          {error && <p className="form-error" role="alert">{error}</p>}
          <div className="booking-form-footer">
            <p>A secure Stripe deposit confirms your selected production date. Your receipt and next steps will be emailed after payment.</p>
            <button className="button-primary" type="submit" disabled={booking || !quote}>
              {booking ? "Opening secure checkout…" : "Continue to secure deposit"}<Send size={14} />
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}

function FaqSection({ track }: { track: Track }) {
  const items = [
    {
      question: "When will my media be ready?",
      answer: track === "real-estate" ? "Standard listing photos and floor plans are delivered by 9:00 AM the day after your shoot. Same-day rush delivery is available as an add-on." : "Delivery timing depends on the production scope. We confirm the edit and review schedule with your project brief before the shoot.",
    },
    {
      question: "Can I use the finished assets in paid advertising?",
      answer: "Yes. Your finished deliverables include unrestricted commercial usage rights for your own marketing, listings and campaigns. Third-party music and talent remain subject to their license terms.",
    },
    {
      question: "Where do you travel?",
      answer: "We serve Indian River, St. Lucie, Martin and Palm Beach Counties, including Vero Beach, Fort Pierce, Port St. Lucie, Stuart and Jupiter.",
    },
    {
      question: "How does the estimate become a confirmed booking?",
      answer: "Choose a package, add the scope you need and send a preferred date. We confirm availability, property access and the final production details with you directly.",
    },
  ];

  return (
    <section className="section section-white">
      <div className="shell faq-grid">
        <div>
          <span className="section-kicker">A few useful details</span>
          <h2 className="text-display">Good to <em>know.</em></h2>
        </div>
        <div className="faq-list">
          {items.map((item) => (
            <details className="faq-item" key={item.question}>
              <summary>{item.question}<Sparkles size={14} /></summary>
              <p>{item.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

function SiteFooter({ track }: { track: Track }) {
  return (
    <footer className="site-footer" id="footer">
      <div className="shell footer-main">
        <div className="footer-brand">
          <Brand track={track} />
          <p>Architectural listing media and commercial growth marketing for ambitious local businesses on Florida’s east coast.</p>
        </div>
        <div className="footer-column">
          <h3>Service territory</h3>
          <p>Indian River County</p><p>St. Lucie County</p><p>Martin County</p><p>Palm Beach County</p>
        </div>
        <div className="footer-column">
          <h3>Start a conversation</h3>
          <a href="mailto:hello@meritmediafl.com">hello@meritmediafl.com</a>
          <a href="#booking">Request a production date</a>
          <a href="/client-portal">Open client portal</a>
          <p>{track === "real-estate" ? "Property media · Listings · Agent growth" : "Brand films · Commercial media · Growth"}</p>
        </div>
      </div>
      <div className="shell footer-tax">
        All deliverables are provided exclusively via secure electronic transmission. Purchases are exempt from Florida sales and use tax pursuant to Rule 12A-1.001, F.A.C. FAA Part 107 commercial remote pilot certified for applicable drone operations. Aerial flights are weather-, airspace- and site-authorization dependent. Stock video courtesy of Coverr under its commercial-use license.
      </div>
      <div className="shell footer-bottom"><span>© {new Date().getFullYear()} Merit Media &amp; Marketing LLC. All rights reserved.</span><span>Indian River · St. Lucie · Martin · Palm Beach</span></div>
    </footer>
  );
}

export default function MediaExperience({ initialTrack }: { initialTrack: Track }) {
  const reduceMotion = useReducedMotion();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const track: Track = pathname === "/commercial"
    ? "commercial"
    : pathname === "/real-estate"
      ? "real-estate"
      : searchParams.get("track") === "commercial"
        ? "commercial"
        : searchParams.get("track") === "real-estate"
          ? "real-estate"
          : initialTrack;
  const [filter, setFilter] = useState("All");
  const [menuOpen, setMenuOpen] = useState(false);
  const [tierId, setTierId] = useState<RealEstateTierId>("under-1800");
  const [realEstatePackageId, setRealEstatePackageId] = useState<RealEstatePackageId>("standard-mls-suite");
  const [realEstateVideoId, setRealEstateVideoId] = useState<RealEstateVideoId>("no-video");
  const [quantities, setQuantities] = useState<Record<RealEstateAddOnId, number>>(createRealEstateQuantities);
  const [packageId, setPackageId] = useState<CommercialPackageId>("brand-story");
  const [retainers, setRetainers] = useState<Record<CommercialRetainerId, boolean>>(createCommercialRetainers);
  const [realEstateRetainersSelected, setRealEstateRetainersSelected] = useState<Record<RealEstateRetainerId, boolean>>(createRealEstateRetainers);
  const [bookingFields, setBookingFields] = useState<BookingFields>(initialBooking);
  const [booking, setBooking] = useState(false);
  const [bookingError, setBookingError] = useState("");
  const [promoInput, setPromoInput] = useState("");
  const [appliedPromoCode, setAppliedPromoCode] = useState<string | null>(null);
  const [promoMessage, setPromoMessage] = useState("");
  const [promoApplied, setPromoApplied] = useState(false);
  const [receipt, setReceipt] = useState<BookingReceipt | null>(null);
  const [selectedGallery, setSelectedGallery] = useState<GalleryItem | null>(null);
  const [videoOpen, setVideoOpen] = useState(false);
  const pricing = track === "real-estate"
    ? quoteRealEstate(realEstatePackageId, tierId, quantities, Object.entries(realEstateRetainersSelected).filter(([, selected]) => selected).map(([id]) => id), realEstateVideoId)
    : quoteCommercial(packageId, Object.entries(retainers).filter(([, selected]) => selected).map(([id]) => id));
  const oneTimeTotal = pricing?.items.filter((item) => item.billing === "once").reduce((sum, item) => sum + item.amount, 0) ?? 0;
  const recurringTotal = pricing?.recurring ?? 0;
  const promo = appliedPromoCode
    ? resolvePromoDiscount(appliedPromoCode, oneTimeTotal, recurringTotal)
    : null;
  const discountAmount = promo?.amount ?? 0;
  const selectedTier = realEstateTiers.find((tier) => tier.id === tierId);
  const basePrice = pricing?.items[0]?.amount ?? 0;
  const selectedAddOns = pricing?.items.slice(1) ?? [];
  const addOnsSubtotal = selectedAddOns.reduce((sum, item) => sum + item.amount, 0);
  const originalTotal = basePrice + addOnsSubtotal;
  const finalPrice = Math.max(0, originalTotal - discountAmount);

  useEffect(() => {
    if (!selectedGallery && !videoOpen && !receipt) return;
    const previousOverflow = document.body.style.overflow;
    const moveByKeyboard = (direction: number) => {
      if (!selectedGallery) return;
      const gallery = (track === "real-estate" ? realEstateGallery : commercialGallery).filter(
        (item) => filter === "All" || item.category === filter,
      );
      const currentIndex = gallery.findIndex((item) => item.id === selectedGallery.id);
      if (gallery.length > 0) {
        setSelectedGallery(gallery[(currentIndex + direction + gallery.length) % gallery.length]);
      }
    };
    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSelectedGallery(null);
        setVideoOpen(false);
        setReceipt(null);
      }
      if (selectedGallery && event.key === "ArrowLeft") moveByKeyboard(-1);
      if (selectedGallery && event.key === "ArrowRight") moveByKeyboard(1);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeydown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeydown);
    };
  }, [selectedGallery, videoOpen, receipt, track, filter]);

  function changeTrack(next: Track) {
    setFilter("All");
    setMenuOpen(false);
    setAppliedPromoCode(null);
    setPromoMessage("");
    setPromoApplied(false);
    router.push(next === "commercial" ? "/commercial" : "/real-estate");
  }

  function moveGallery(direction: number) {
    if (!selectedGallery) return;
    const gallery = (track === "real-estate" ? realEstateGallery : commercialGallery).filter(
      (item) => filter === "All" || item.category === filter,
    );
    const currentIndex = gallery.findIndex((item) => item.id === selectedGallery.id);
    if (gallery.length === 0) return;
    setSelectedGallery(gallery[(currentIndex + direction + gallery.length) % gallery.length]);
  }

  function selectRealEstatePackage(nextId: RealEstatePackageId) {
    const next = realEstatePackageList.find((item) => item.id === nextId);
    const previous = realEstatePackageList.find((item) => item.id === realEstatePackageId);
    if (next?.turnkey) {
      setRealEstateVideoId((next.includedVideoId ?? "no-video") as RealEstateVideoId);
      setQuantities({ ...createRealEstateQuantities(), ...next.includedAddOns } as Record<RealEstateAddOnId, number>);
    } else if (previous?.turnkey) {
      setRealEstateVideoId("no-video");
      setQuantities(createRealEstateQuantities());
    }
    setRealEstatePackageId(nextId);
  }

  function updateQuantity(id: RealEstateAddOnId, quantity: number) {
    setQuantities((current) => ({ ...current, [id]: quantity }));
  }

  function updateBookingField(field: keyof BookingFields, value: string) {
    setBookingFields((current) => ({ ...current, [field]: value }));
  }

  function applyPromoCode() {
    const resolved = resolvePromoDiscount(promoInput, oneTimeTotal, recurringTotal);
    if (!resolved) {
      setAppliedPromoCode(null);
      setPromoApplied(false);
      setPromoMessage("Invalid or expired code. Try FIRST50 for your first shoot.");
      return;
    }
    setAppliedPromoCode(resolved.code);
    setPromoApplied(true);
    setPromoMessage(resolved.message);
  }

  function scrollToBooking() {
    document.getElementById("booking")?.scrollIntoView({ behavior: reduceMotion ? "instant" : "smooth" });
  }
  function scrollToPricing() {
    document.getElementById("pricing")?.scrollIntoView({ behavior: reduceMotion ? "instant" : "smooth" });
  }

  function discussService(service: string) {
    setBookingFields((current) => ({
      ...current,
      accessNotes: current.accessNotes ? `${current.accessNotes}\nInterested in: ${service}` : `Interested in: ${service}`,
    }));
    scrollToBooking();
  }

  async function submitBooking(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBookingError("");
    if (!pricing) {
      setBookingError("Choose a valid package and options before submitting your request.");
      return;
    }

    setBooking(true);
    const selection = {
      ...(track === "real-estate"
        ? { packageId: realEstatePackageId, tierId, videoId: realEstateVideoId, quantities, retainerIds: Object.entries(realEstateRetainersSelected).filter(([, selected]) => selected).map(([id]) => id) }
        : { packageId, retainerIds: Object.entries(retainers).filter(([, selected]) => selected).map(([id]) => id) }),
      selectedSqftTier: track === "real-estate" ? selectedTier?.label ?? "" : "Commercial production",
      basePrice,
      appliedPromoCode,
      discountAmount,
      finalPrice,
      selectedAddOns,
    };

    try {
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ track, booking: bookingFields, selection }),
      });
      const result = await response.json() as Omit<BookingReceipt, "booking"> & { error?: string; checkoutUrl?: string; status?: string; depositAmount?: number; depositPercent?: number };
      if (!response.ok) throw new Error(result.error ?? "Your request could not be sent. Please try again.");
      if (result.checkoutUrl) {
        window.location.href = result.checkoutUrl;
        return;
      }
      setReceipt({ ...result, booking: bookingFields });
    } catch (error) {
      setBookingError(error instanceof Error ? error.message : "Your request could not be sent. Please try again.");
    } finally {
      setBooking(false);
    }
  }

  return (
    <main id="top">
      <div className="announcement"><ShieldCheck size={13} />Locally owned · FAA Part 107 certified · Treasure Coast to Palm Beach</div>
      <header className="site-header">
        <div className="shell nav-shell">
          <Brand track={track} />
          <nav className="desktop-nav" aria-label="Main navigation">
            <a href="#services">Services</a><a href="#showcase">Portfolio</a><a href="#pricing">Pricing</a><a href="#retainers">Retainers</a><a href="/client-portal" onClick={() => setMenuOpen(false)}>Client portal</a><a className="nav-book" href="#booking">Free consult <ArrowUpRight size={13} /></a>
          </nav>
          <button className="mobile-menu-toggle" type="button" aria-label={menuOpen ? "Close menu" : "Open menu"} aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)}>
            {menuOpen ? <X size={19} /> : <Menu size={19} />}
          </button>
        </div>
        <nav className={`mobile-nav${menuOpen ? " is-open" : ""}`} aria-label="Mobile navigation">
          <a href="#services" onClick={() => setMenuOpen(false)}>Services</a><a href="#showcase" onClick={() => setMenuOpen(false)}>Portfolio showcase</a><a href="#pricing" onClick={() => setMenuOpen(false)}>Pricing calculator</a><a href="#retainers" onClick={() => setMenuOpen(false)}>Retainers</a><a href="/client-portal" onClick={() => setMenuOpen(false)}>Client portal</a><a href="#booking" onClick={() => setMenuOpen(false)}>Free consult <ArrowUpRight size={12} /></a>
        </nav>
      </header>

      <section className="hero">
        <div className="hero-photo"><Image src={imageUrl(stockImages.hero, 2200)} alt="Aerial view of a waterfront estate on Florida’s Treasure Coast" fill priority sizes="100vw" unoptimized /></div>
        <div className="hero-shade" />
        <div className="shell hero-layout">
          <div>
            <span className="eyebrow">Treasure Coast · Palm Beaches · Florida</span>
            <h1>{track === "real-estate" ? <>Real Estate Listing Media &amp; <em>Agent Marketing.</em></> : <>Commercial Video &amp; <em>Local Growth.</em></>}</h1>
            <p className="hero-copy">{track === "real-estate" ? "Standout listing photography, 4K aerials, floor plans, walkthrough films, and marketing that keeps your name in front of Treasure Coast buyers and sellers." : "Founder videos, direct-response ads, AI presenter promos, and lead-generation campaigns built to help Treasure Coast businesses earn more customers."}</p>
            <TrackSelector track={track} onChange={changeTrack} />
            <div className="hero-track-bridge">
              <span className="hero-track-bridge-icon" aria-hidden="true">{track === "real-estate" ? <Camera size={17} /> : <Home size={17} />}</span>
              <span className="hero-track-bridge-copy">
                <strong>{track === "real-estate" ? "Also growing a local business?" : "Also marketing a property listing?"}</strong>
                <small>{track === "real-estate" ? "Explore brand films, paid ads, sales funnels, and customer-growth services." : "Explore next-day listing photos, aerials, floor plans, and agent marketing."}</small>
              </span>
              <button type="button" onClick={() => changeTrack(track === "real-estate" ? "commercial" : "real-estate")}>
                {track === "real-estate" ? "Explore Commercial" : "Explore Real Estate"}<ArrowRight size={14} />
              </button>
            </div>
          </div>
          <div className="hero-aside"><span>26°07′ N</span> · Made for the place you work</div>
        </div>
      </section>

      {track === "commercial" && <CommercialVslSection onBook={scrollToBooking} onCalculate={scrollToPricing} />}

      <section className="trust-strip shell" aria-label="Service commitments">
        <div className="trust-item"><Plane size={19} />FAA Part 107 commercial remote pilot certified</div>
        <div className="trust-item"><Clock3 size={19} />Guaranteed 24-hour digital delivery</div>
        <div className="trust-item"><FileCheck2 size={19} />Florida sales-tax exempt digital delivery</div>
        <div className="trust-item"><ShieldCheck size={19} />100% unrestricted commercial usage rights</div>
      </section>

      <div className="modebar">
        <div className="shell modebar-inner">
          <span className="modebar-status"><span />Currently viewing: {track === "real-estate" ? "Real Estate & Property Media" : "Commercial & Brand Production"}</span>
          <button className="modebar-switch" type="button" onClick={() => changeTrack(track === "real-estate" ? "commercial" : "real-estate")}>
            Switch to {track === "real-estate" ? "commercial" : "real estate"}<ArrowRight size={13} />
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={track}
          initial={reduceMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduceMotion ? undefined : { opacity: 0, y: -8 }}
          transition={{ duration: reduceMotion ? 0 : 0.28 }}
        >
          <GallerySection track={track} filter={filter} onFilterChange={setFilter} onOpen={setSelectedGallery} />
          {track === "real-estate" ? <ComparisonSection /> : <CommercialShowcase onPlay={() => setVideoOpen(true)} />}
          {track === "real-estate" && <RealEstateVideo />}
          <ServicesSection track={track} onDiscuss={discussService} />

          <section className="section section-paper" id="pricing">
            <div className="shell">
              <SectionHeading
                kicker="Clear scope. Clear numbers."
                title={track === "real-estate" ? <>A better listing starts <em>with the right package.</em></> : <>Choose the production <em>your next stage needs.</em></>}
                intro={track === "real-estate" ? "Start with the property media essentials, then choose professional video as a separate production upgrade. Add utility enhancements and retainers only when they fit your listing." : "Build a first-month estimate from a clear production tier and the ongoing support you actually need."}
              />
              <div className="pricing-layout">
                {track === "real-estate" ? (
                  <RealEstateCalculator
                    packageId={realEstatePackageId}
                    onPackageChange={selectRealEstatePackage}
                    tierId={tierId}
                    onTierChange={setTierId}
                    videoId={realEstateVideoId}
                    onVideoChange={setRealEstateVideoId}
                    quantities={quantities}
                    onQuantityChange={updateQuantity}
                    retainers={realEstateRetainersSelected}
                    onRetainerChange={(id, selected) => setRealEstateRetainersSelected((current) => ({ ...current, [id]: selected }))}
                  />
                ) : (
                  <CommercialCalculator
                    packageId={packageId}
                    onPackageChange={setPackageId}
                    retainers={retainers}
                    onRetainerChange={(id, selected) => setRetainers((current) => ({ ...current, [id]: selected }))}
                  />
                )}
                <QuoteDrawer
                  quote={pricing}
                  track={track}
                  onBook={scrollToBooking}
                  booking={booking}
                  originalTotal={originalTotal}
                  discountAmount={discountAmount}
                  promoInput={promoInput}
                  promoMessage={promoApplied && !promo ? "" : promoMessage}
                  promoApplied={promoApplied && Boolean(promo)}
                  onPromoInputChange={setPromoInput}
                  onApplyPromo={applyPromoCode}
                />
              </div>
              {track === "real-estate" && <MeritClub />}
            </div>
          </section>

          <RetainersSection track={track} onDiscuss={discussService} />
          <AiPresenterSection track={track} onDiscuss={discussService} />
          <ProductionWorkflow track={track} />
          <BookingSection
            track={track}
            quote={pricing}
            booking={booking}
            values={bookingFields}
            onBookingChange={updateBookingField}
            onSubmit={submitBooking}
            error={bookingError}
          />
          <FaqSection track={track} />
          <SiteFooter track={track} />
        </motion.div>
      </AnimatePresence>

      <AnimatePresence>
        {selectedGallery && (
          <motion.div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setSelectedGallery(null)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.section className="lightbox" role="dialog" aria-modal="true" aria-labelledby="lightbox-title" initial={{ opacity: 0, scale: .98, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: .98 }}>
              <button className="icon-button lightbox-close" type="button" aria-label="Close image viewer" onClick={() => setSelectedGallery(null)}><X size={17} /></button>
              <button className="icon-button lightbox-arrow previous" type="button" aria-label="Previous image" onClick={() => moveGallery(-1)}><ArrowLeft size={17} /></button>
              <button className="icon-button lightbox-arrow next" type="button" aria-label="Next image" onClick={() => moveGallery(1)}><ArrowRight size={17} /></button>
              <div className="lightbox-image"><Image src={imageUrl(selectedGallery.image, 1700)} alt={selectedGallery.title} fill sizes="(max-width: 760px) 100vw, 70vw" unoptimized /></div>
              <div className="lightbox-copy"><span className="section-kicker">{selectedGallery.category}</span><h2 id="lightbox-title">{selectedGallery.title}</h2><p>{selectedGallery.description}</p><span className="lightbox-meta">SONY MIRRORLESS · DJI COMMERCIAL DRONE · TREASURE COAST, FL</span><p style={{ marginTop: 12, marginBottom: 0 }}>{selectedGallery.detail}</p></div>
            </motion.section>
          </motion.div>
        )}
        {videoOpen && (
          <motion.div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setVideoOpen(false)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.section className="video-modal" role="dialog" aria-modal="true" aria-label="Cinematic production video" initial={{ opacity: 0, y: 9 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <button className="icon-button lightbox-close" type="button" aria-label="Close video" onClick={() => setVideoOpen(false)}><X size={17} /></button>
              {track === "real-estate" ? (
                <iframe
                  className="video-modal-embed"
                  src={videoSources.propertyTourEmbed}
                  title="Golden Hour Luxury Mansion Tour"
                  allow="autoplay; fullscreen; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <video autoPlay controls playsInline poster={imageUrl(stockImages.commercialFounder, 1600)}><source src={videoSources.founderStory} type="video/mp4" /></video>
              )}
              <div className="video-modal-title">{track === "real-estate" ? "Golden Hour Luxury Mansion Tour · Agent walkthrough" : "Founder story · 4K brand film"}</div>
            </motion.section>
          </motion.div>
        )}
        {receipt && (
          <motion.div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setReceipt(null)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.section className="confirmation-modal" role="dialog" aria-modal="true" aria-labelledby="confirmation-title" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <button className="icon-button lightbox-close" type="button" aria-label="Close booking summary" onClick={() => setReceipt(null)}><X size={17} /></button>
              <span className="confirmation-icon"><CheckCircle2 size={21} /></span>
              <h2 id="confirmation-title">{receipt.status === "forwarded" ? "Request received." : "Free consult ready."}</h2>
              <p>{receipt.status === "forwarded" ? "Your preferred shoot time and itemized scope have been sent to the booking team. We’ll be in touch to confirm." : "Your itemized request is ready for free review. This demo version does not send live data until a webhook is configured."}</p>
              <div className="confirmation-summary">
                <div><span>Reference</span><strong>{receipt.referenceId.slice(0, 8).toUpperCase()}</strong></div>
                <div><span>Location</span><strong>{receipt.booking.address}</strong></div>
                <div><span>Preferred date</span><strong>{receipt.booking.date} · {receipt.booking.time}</strong></div>
                {receipt.items.map((item) => <div key={item.id}><span>{item.label}{item.billing === "monthly" ? " / mo" : ""}</span><strong>{money(item.amount)}</strong></div>)}
                {receipt.discountAmount ? <div><span>Promo credit{receipt.appliedPromoCode ? ` · ${receipt.appliedPromoCode}` : ""}</span><strong>−{money(receipt.discountAmount)}</strong></div> : null}
                <div className="confirmation-total"><span>Estimated total</span><strong>{money(receipt.total)}</strong></div>
                {receipt.recurring > 0 && <div><span>Recurring after production</span><strong>{money(receipt.recurring)} / mo</strong></div>}
              </div>
              {receipt.status === "preview" && <p className="confirmation-status">Free demo mode · No request was transmitted or stored. Add a webhook later if you want live submissions.</p>}
              <button className="button-dark" type="button" onClick={() => setReceipt(null)}>Back to your estimate</button>
            </motion.section>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}