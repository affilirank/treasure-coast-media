import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ListingLanding from "@/components/listing/listing-landing";
import { loadTour } from "@/lib/tour";
import { factsFromListing, type ListingRow } from "@/lib/listing-details";

// Unbranded by design: no logos, no agent or agency details, generic title.
export const metadata: Metadata = { title: "Virtual Tour", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function MlsTourPage({ params }: PageProps<"/mls/[token]">) {
  const { token } = await params;
  const tour = await loadTour(token);
  if (!tour) notFound();
  const { listing } = tour;
  const facts = factsFromListing(listing as unknown as ListingRow);

  return (
    <main className="min-h-screen bg-[#0b0d0e]">
      {!tour.isPaid && (
        <p className="bg-amber-200 px-4 py-2 text-center text-sm font-semibold text-neutral-900">
          PREVIEW — the full tour, video and floor plan unlock once the invoice is paid.
        </p>
      )}
      <ListingLanding
        branded={false}
        address={listing.property_address}
        city={listing.city}
        state={listing.state}
        zip={listing.zip_code}
        price={facts.listPrice}
        facts={facts}
        images={tour.images}
        videoUrl={tour.videoUrl}
        floorPlanUrl={tour.floorPlanUrl}
        floorPlanPdfUrl={tour.floorPlanPdfUrl}
        agent={{ name: listing.agent_name, email: listing.agent_email, phone: listing.agent_phone, brokerage: listing.brokerage_name, headshot: listing.agent_headshot_url }}
      />
    </main>
  );
}
