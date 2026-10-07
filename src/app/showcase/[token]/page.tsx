import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Mail, Phone } from "lucide-react";
import TourViewer from "@/components/delivery/tour-viewer";
import { loadTour } from "@/lib/tour";

export const metadata: Metadata = { title: "Property Showcase", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function ShowcasePage({ params }: PageProps<"/showcase/[token]">) {
  const { token } = await params;
  const tour = await loadTour(token);
  if (!tour) notFound();
  const { listing } = tour;
  const phoneHref = listing.agent_phone ? `tel:${listing.agent_phone.replace(/[^\d+]/g, "")}` : null;
  const subject = encodeURIComponent(`Showing request: ${listing.property_address}`);
  const location = `${listing.city}, ${listing.state} ${listing.zip_code}`;

  return (
    <main className="min-h-screen bg-[#0d0f10] text-neutral-100">
      <header className="mx-auto max-w-6xl px-5 pb-6 pt-10">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/_next/image?url=%2Fimages%2Fmerit-logo.png&w=128&q=75" alt="Merit Media & Marketing" width={56} height={56} className="mb-4 h-14 w-14 rounded-lg" />
        <p className="text-xs uppercase tracking-[0.2em] text-[#c4a16a]">{listing.brokerage_name ?? "Featured Listing"}</p>
        <h1 className="mt-1 text-3xl font-semibold">{listing.property_address}</h1>
        <p className="text-neutral-400">{location}</p>
      </header>

      <div className="mx-auto max-w-6xl">
        <TourViewer
          images={tour.images}
          videoUrl={tour.videoUrl}
          floorPlanUrl={tour.floorPlanUrl}
          floorPlanPdfUrl={tour.floorPlanPdfUrl}
          alt={listing.property_address}
          accent="#c4a16a"
        />
      </div>

      <section className="mx-auto my-10 max-w-6xl px-5">
        <div className="flex flex-col items-center gap-5 rounded-lg border border-[#c4a16a]/40 bg-white/5 p-6 sm:flex-row">
          {listing.agent_headshot_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={listing.agent_headshot_url} alt={listing.agent_name} referrerPolicy="no-referrer" className="h-24 w-24 rounded-full object-cover" />
          )}
          <div className="flex-1 text-center sm:text-left">
            <h2 className="text-xl font-semibold">{listing.agent_name}</h2>
            {listing.brokerage_name && <p className="text-[#e1c697]">{listing.brokerage_name}</p>}
            <div className="mt-2 flex flex-wrap justify-center gap-4 text-sm text-neutral-300 sm:justify-start">
              {phoneHref && <a href={phoneHref} className="flex items-center gap-1"><Phone className="h-4 w-4" />{listing.agent_phone}</a>}
              <a href={`mailto:${listing.agent_email}`} className="flex items-center gap-1"><Mail className="h-4 w-4" />{listing.agent_email}</a>
            </div>
          </div>
          <a href={`mailto:${listing.agent_email}?subject=${subject}`} className="rounded-md bg-gradient-to-b from-[#e1c697] to-[#c4a16a] px-6 py-3 font-bold text-[#14201e]">
            Schedule Showing
          </a>
        </div>
      </section>
    </main>
  );
}
