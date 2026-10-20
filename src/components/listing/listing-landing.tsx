"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowDown, Bath, BedDouble, CalendarDays, Check, ChevronLeft, ChevronRight,
  Download, Expand, LandPlot, Mail, MapPin, Maximize2, Pause, Phone, Play, Ruler, Sparkles, X,
} from "lucide-react";

type Facts = {
  beds: number | null;
  baths: number | null;
  sqft: number | null;
  lotSize: string | null;
  yearBuilt: number | null;
  listPrice: number | null;
  propertyType: string | null;
  mlsNumber: string | null;
  headline: string | null;
  description: string | null;
  features: string[];
  agentBio: string | null;
  showingUrl: string | null;
};

type Image = { id: string; src: string };

type Props = {
  branded: boolean;
  address: string;
  city: string;
  state: string;
  zip: string;
  price: number | null;
  facts: Facts;
  images: Image[];
  videoUrl: string | null;
  floorPlanUrl: string | null;
  floorPlanPdfUrl: string | null;
  agent: { name: string; email: string; phone: string | null; brokerage: string | null; headshot: string | null };
  memberBadgeSlot?: React.ReactNode;
};

const SLIDE_MS = 5500;

function money(value: number) {
  return value.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

export default function ListingLanding({ branded, address, city, state, zip, price, facts, images, videoUrl, floorPlanUrl, floorPlanPdfUrl, agent, memberBadgeSlot }: Props) {
  const [active, setActive] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [lightbox, setLightbox] = useState<number | null>(null);
  const [filmOpen, setFilmOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const heroRef = useRef<HTMLElement>(null);

  const total = images.length;
  const location = [city, state].filter(Boolean).join(", ") + (zip ? ` ${zip}` : "");

  const step = useCallback((delta: number) => setActive((current) => (total ? (current + delta + total) % total : 0)), [total]);
  const stepLightbox = useCallback((delta: number) => setLightbox((current) => (current === null || !total ? current : (current + delta + total) % total)), [total]);

  useEffect(() => {
    if (!playing || total <= 1 || lightbox !== null || filmOpen) return;
    const timer = setInterval(() => setActive((current) => (current + 1) % total), SLIDE_MS);
    return () => clearInterval(timer);
  }, [playing, total, lightbox, filmOpen]);

  useEffect(() => {
    if (lightbox === null && !filmOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setLightbox(null);
        setFilmOpen(false);
      }
      if (lightbox !== null && event.key === "ArrowRight") stepLightbox(1);
      if (lightbox !== null && event.key === "ArrowLeft") stepLightbox(-1);
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [lightbox, filmOpen, stepLightbox]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > window.innerHeight * 0.75);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const stats = [
    facts.beds != null && { icon: BedDouble, label: facts.beds === 1 ? "Bedroom" : "Bedrooms", value: String(facts.beds) },
    facts.baths != null && { icon: Bath, label: facts.baths === 1 ? "Bathroom" : "Bathrooms", value: String(facts.baths) },
    facts.sqft != null && { icon: Ruler, label: "Interior", value: `${facts.sqft.toLocaleString()} sqft` },
    facts.lotSize && { icon: LandPlot, label: "Lot", value: facts.lotSize },
    facts.yearBuilt != null && { icon: CalendarDays, label: "Built", value: String(facts.yearBuilt) },
    facts.propertyType && { icon: Sparkles, label: "Type", value: facts.propertyType },
  ].filter(Boolean) as { icon: typeof BedDouble; label: string; value: string }[];

  const showingHref = branded ? (facts.showingUrl || `mailto:${agent.email}?subject=${encodeURIComponent(`Showing request: ${address}`)}`) : null;

  return (
    <div className="bg-[#0b0d0e] text-neutral-100">
      {/* ---------------- HERO ---------------- */}
      <section ref={heroRef} className="relative h-[94vh] min-h-[560px] w-full overflow-hidden">
        {images.map((image, index) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={image.id}
            src={image.src}
            alt={`${address} — photo ${index + 1}`}
            draggable={false}
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-[1200ms] ease-out ${index === active ? "ll-zoom opacity-100" : "opacity-0"}`}
          />
        ))}
        {total === 0 && <div className="absolute inset-0 bg-gradient-to-br from-[#14201e] to-black" />}

        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-black/55" />

        <div className="relative z-10 mx-auto flex h-full max-w-6xl flex-col justify-end px-5 pb-24">
          {branded && agent.brokerage && <p className="ll-rise mb-2 text-xs uppercase tracking-[0.35em] text-[#e1c697]">{agent.brokerage}</p>}
          {!branded && <p className="ll-rise mb-2 text-xs uppercase tracking-[0.35em] text-[#e1c697]">Property Tour</p>}
          <h1 className="ll-rise ll-rise-1 max-w-4xl text-4xl font-semibold leading-tight sm:text-6xl">{facts.headline || address}</h1>
          <p className="ll-rise ll-rise-2 mt-3 flex items-center gap-2 text-sm text-neutral-200 sm:text-base">
            <MapPin className="h-4 w-4 text-[#c4a16a]" /> {address}{location ? `, ${location}` : ""}
          </p>
          <div className="ll-rise ll-rise-3 mt-6 flex flex-wrap items-center gap-4">
            {price != null && <span className="text-3xl font-bold sm:text-4xl">{money(price)}</span>}
            {stats.slice(0, 4).map((stat) => (
              <span key={stat.label} className="hidden items-center gap-2 border-l border-white/20 pl-4 text-sm text-neutral-200 sm:inline-flex">
                <stat.icon className="h-4 w-4 text-[#c4a16a]" /> {stat.value} <span className="text-neutral-400">{stat.label}</span>
              </span>
            ))}
          </div>
          <div className="mt-7 flex flex-wrap gap-3">
            {videoUrl && (
              <button onClick={() => setFilmOpen(true)} className="flex items-center gap-2 rounded-md bg-gradient-to-b from-[#e1c697] to-[#c4a16a] px-6 py-3 text-sm font-bold text-[#14201e]">
                <Play className="h-4 w-4" /> Watch the film
              </button>
            )}
            {showingHref && (
              <a href={showingHref} className="flex items-center gap-2 rounded-md border border-white/30 px-6 py-3 text-sm font-semibold text-white backdrop-blur hover:bg-white/10">
                <CalendarDays className="h-4 w-4" /> Schedule a showing
              </a>
            )}
            <button onClick={() => heroRef.current?.nextElementSibling?.scrollIntoView({ behavior: "smooth" })} className="flex items-center gap-2 rounded-md border border-white/20 px-6 py-3 text-sm font-semibold text-neutral-200 hover:bg-white/10">
              Explore <ArrowDown className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* slideshow controls */}
        {total > 1 && (
          <div className="absolute bottom-6 left-1/2 z-10 flex w-[min(92%,640px)] -translate-x-1/2 items-center gap-3">
            <button aria-label="Previous photo" onClick={() => step(-1)} className="rounded-full bg-black/50 p-2 backdrop-blur transition hover:bg-black/80"><ChevronLeft className="h-4 w-4" /></button>
            <div className="flex flex-1 gap-1">
              {images.map((image, index) => (
                <button key={image.id} aria-label={`Go to photo ${index + 1}`} onClick={() => setActive(index)} className="group relative h-1 flex-1 overflow-hidden rounded-full bg-white/25">
                  {index === active ? <span key={active} className="ll-progress absolute inset-y-0 left-0 rounded-full bg-[#e1c697]" /> : null}
                </button>
              ))}
            </div>
            <button aria-label={playing ? "Pause slideshow" : "Play slideshow"} onClick={() => setPlaying((value) => !value)} className="rounded-full bg-black/50 p-2 backdrop-blur transition hover:bg-black/80">
              {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </button>
            <button aria-label="Next photo" onClick={() => step(1)} className="rounded-full bg-black/50 p-2 backdrop-blur transition hover:bg-black/80"><ChevronRight className="h-4 w-4" /></button>
          </div>
        )}
      </section>

      {/* ---------------- FACTS ---------------- */}
      {stats.length > 0 && (
        <section className="border-b border-white/10 bg-[#111516]">
          <div className="mx-auto grid max-w-6xl grid-cols-2 gap-px px-5 py-6 sm:grid-cols-3 lg:grid-cols-6">
            {stats.map((stat) => (
              <div key={stat.label} className="flex flex-col items-center gap-1 px-3 py-3 text-center">
                <stat.icon className="h-5 w-5 text-[#c4a16a]" />
                <span className="text-lg font-semibold">{stat.value}</span>
                <span className="text-[11px] uppercase tracking-wider text-neutral-400">{stat.label}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ---------------- OVERVIEW ---------------- */}
      <section className="mx-auto grid max-w-6xl gap-10 px-5 py-16 lg:grid-cols-[1.6fr_1fr]">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-[#c4a16a]">The residence</p>
          <h2 className="mt-2 text-3xl font-semibold sm:text-4xl">{facts.headline || "A closer look"}</h2>
          {facts.description ? (
            <div className="mt-6 space-y-4 text-[15px] leading-relaxed text-neutral-300">
              {facts.description.split(/\n\n+/).map((paragraph, index) => <p key={index}>{paragraph}</p>)}
            </div>
          ) : (
            <p className="mt-6 text-[15px] leading-relaxed text-neutral-400">Full property details are being prepared. Browse the gallery below for a complete look at this listing.</p>
          )}
          {facts.features.length > 0 && (
            <ul className="mt-8 grid gap-x-8 gap-y-3 sm:grid-cols-2">
              {facts.features.map((feature) => (
                <li key={feature} className="flex items-start gap-2 text-sm text-neutral-200">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#c4a16a]" /> {feature}
                </li>
              ))}
            </ul>
          )}
        </div>

        <aside className="h-fit rounded-xl border border-white/10 bg-white/[0.03] p-6">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-neutral-400">At a glance</h3>
          <dl className="mt-4 space-y-3 text-sm">
            {facts.beds != null && <Row label="Bedrooms" value={String(facts.beds)} />}
            {facts.baths != null && <Row label="Bathrooms" value={String(facts.baths)} />}
            {facts.sqft != null && <Row label="Interior" value={`${facts.sqft.toLocaleString()} sqft`} />}
            {facts.lotSize && <Row label="Lot size" value={facts.lotSize} />}
            {facts.yearBuilt != null && <Row label="Year built" value={String(facts.yearBuilt)} />}
            {facts.propertyType && <Row label="Property type" value={facts.propertyType} />}
            {facts.mlsNumber && <Row label="MLS #" value={facts.mlsNumber} />}
          </dl>
          {showingHref && (
            <a href={showingHref} className="mt-6 flex items-center justify-center gap-2 rounded-md bg-gradient-to-b from-[#e1c697] to-[#c4a16a] px-5 py-3 text-sm font-bold text-[#14201e]">
              <CalendarDays className="h-4 w-4" /> Schedule a showing
            </a>
          )}
        </aside>
      </section>

      {/* ---------------- GALLERY ---------------- */}
      {total > 0 && (
        <section className="mx-auto max-w-6xl px-5 pb-16">
          <div className="mb-6 flex items-end justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-[#c4a16a]">Gallery</p>
              <h2 className="mt-2 text-3xl font-semibold">Every angle</h2>
            </div>
            <button onClick={() => setLightbox(0)} className="hidden items-center gap-2 rounded-md border border-white/20 px-4 py-2 text-sm font-semibold text-neutral-200 hover:bg-white/10 sm:flex">
              <Expand className="h-4 w-4" /> Full screen
            </button>
          </div>
          <div className="grid auto-rows-[180px] grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {images.map((image, index) => (
              <button
                key={image.id}
                onClick={() => setLightbox(index)}
                className={`group relative overflow-hidden rounded-lg ${index % 7 === 0 ? "col-span-2 row-span-2" : ""}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={image.src} alt={`${address} photo ${index + 1}`} loading="lazy" className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-110" />
                <span className="absolute inset-0 bg-black/0 transition group-hover:bg-black/20" />
                <span className="absolute bottom-2 right-2 flex items-center gap-1 rounded bg-black/60 px-2 py-1 text-[11px] font-semibold opacity-0 transition group-hover:opacity-100">
                  <Expand className="h-3 w-3" /> view
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* ---------------- VIDEO ---------------- */}
      {videoUrl && (
        <section className="border-y border-white/10 bg-[#111516]">
          <div className="mx-auto max-w-5xl px-5 py-16">
            <p className="text-xs uppercase tracking-[0.3em] text-[#c4a16a]">Cinematic tour</p>
            <h2 className="mb-6 mt-2 text-3xl font-semibold">Watch the property film</h2>
            <div className="overflow-hidden rounded-xl border border-white/10 bg-black">
              <video src={videoUrl} controls playsInline preload="metadata" poster={images[0]?.src} className="aspect-video w-full" />
            </div>
          </div>
        </section>
      )}

      {/* ---------------- FLOOR PLAN ---------------- */}
      {floorPlanUrl && (
        <section className="mx-auto max-w-6xl px-5 py-16">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-[#c4a16a]">Floor plan</p>
              <h2 className="mt-2 text-3xl font-semibold">Layout &amp; dimensions</h2>
            </div>
            <div className="flex gap-2">
              <a href={floorPlanUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-md border border-white/20 px-4 py-2 text-sm font-semibold text-neutral-200 hover:bg-white/10">
                <Maximize2 className="h-4 w-4" /> Open full size
              </a>
              {floorPlanPdfUrl && (
                <a href={floorPlanPdfUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-md border border-white/20 px-4 py-2 text-sm font-semibold text-neutral-200 hover:bg-white/10">
                  <Download className="h-4 w-4" /> Download PDF
                </a>
              )}
            </div>
          </div>
          <div className="overflow-hidden rounded-xl border border-white/10 bg-white">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={floorPlanUrl} alt={`${address} floor plan`} className="mx-auto block h-auto w-full max-w-4xl" />
          </div>
        </section>
      )}

      {/* ---------------- AGENT (branded only) ---------------- */}
      {branded && (
        <section className="border-t border-white/10 bg-[#111516]">
          <div className="mx-auto flex max-w-4xl flex-col items-center gap-6 px-5 py-16 text-center sm:flex-row sm:text-left">
            {agent.headshot && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={agent.headshot} alt={agent.name} referrerPolicy="no-referrer" className="h-28 w-28 shrink-0 rounded-full object-cover ring-2 ring-[#c4a16a]/60" />
            )}
            <div className="flex-1">
              <p className="text-xs uppercase tracking-[0.3em] text-[#c4a16a]">Presented by</p>
              <h2 className="mt-1 text-2xl font-semibold">{agent.name}</h2>
              {agent.brokerage && <p className="text-[#e1c697]">{agent.brokerage}</p>}
              {facts.agentBio && <p className="mt-3 text-sm leading-relaxed text-neutral-300">{facts.agentBio}</p>}
              <div className="mt-3 flex flex-wrap justify-center gap-4 text-sm text-neutral-300 sm:justify-start">
                {agent.phone && <a href={`tel:${agent.phone.replace(/[^\d+]/g, "")}`} className="flex items-center gap-1 hover:text-white"><Phone className="h-4 w-4" />{agent.phone}</a>}
                <a href={`mailto:${agent.email}`} className="flex items-center gap-1 hover:text-white"><Mail className="h-4 w-4" />{agent.email}</a>
              </div>
            </div>
            {showingHref && (
              <a href={showingHref} className="rounded-md bg-gradient-to-b from-[#e1c697] to-[#c4a16a] px-6 py-3 font-bold text-[#14201e]">
                Schedule Showing
              </a>
            )}
          </div>
          {memberBadgeSlot && <div className="mx-auto max-w-4xl px-5 pb-12">{memberBadgeSlot}</div>}
        </section>
      )}

      <footer className="px-5 py-10 text-center text-xs text-neutral-500">
        {branded ? `© ${new Date().getFullYear()} ${agent.brokerage || agent.name}. Equal Housing Opportunity.` : "Equal Housing Opportunity. Information deemed reliable but not guaranteed."}
      </footer>

      {/* ---------------- STICKY CTA ---------------- */}
      {branded && showingHref && scrolled && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-[#0d0f10]/95 px-4 py-3 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{address}</p>
              {price != null && <p className="text-sm text-[#e1c697]">{money(price)}</p>}
            </div>
            <a href={showingHref} className="shrink-0 rounded-md bg-gradient-to-b from-[#e1c697] to-[#c4a16a] px-5 py-2.5 text-sm font-bold text-[#14201e]">
              Schedule Showing
            </a>
          </div>
        </div>
      )}

      {/* ---------------- FILM MODAL ---------------- */}
      {filmOpen && videoUrl && (
        <div className="ll-fade fixed inset-0 z-[60] flex items-center justify-center bg-black/95 p-4" onClick={() => setFilmOpen(false)}>
          <button aria-label="Close video" className="absolute right-4 top-4 rounded-full bg-white/10 p-3 hover:bg-white/20"><X className="h-5 w-5" /></button>
          <video src={videoUrl} controls autoPlay playsInline className="max-h-[86vh] w-full max-w-5xl rounded-lg" onClick={(event) => event.stopPropagation()} />
        </div>
      )}

      {/* ---------------- LIGHTBOX ---------------- */}
      {lightbox !== null && images[lightbox] && (
        <div className="ll-fade fixed inset-0 z-[70] flex items-center justify-center bg-black/95" onClick={() => setLightbox(null)}>
          <button aria-label="Close gallery" onClick={() => setLightbox(null)} className="absolute right-4 top-4 rounded-full bg-white/10 p-3 hover:bg-white/20"><X className="h-5 w-5" /></button>
          {total > 1 && (
            <>
              <button aria-label="Previous" onClick={(event) => { event.stopPropagation(); stepLightbox(-1); }} className="absolute left-3 rounded-full bg-white/10 p-3 hover:bg-white/25 sm:left-6"><ChevronLeft className="h-6 w-6" /></button>
              <button aria-label="Next" onClick={(event) => { event.stopPropagation(); stepLightbox(1); }} className="absolute right-3 rounded-full bg-white/10 p-3 hover:bg-white/25 sm:right-6"><ChevronRight className="h-6 w-6" /></button>
            </>
          )}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img key={images[lightbox].id} src={images[lightbox].src} alt={`${address} — ${lightbox + 1} of ${total}`} className="ll-fade max-h-[88vh] max-w-[94vw] rounded-lg object-contain" onClick={(event) => event.stopPropagation()} />
          <span className="absolute bottom-5 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-4 py-1.5 text-sm">{lightbox + 1} / {total}</span>
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-2">
      <dt className="text-neutral-400">{label}</dt>
      <dd className="font-semibold text-neutral-100">{value}</dd>
    </div>
  );
}
