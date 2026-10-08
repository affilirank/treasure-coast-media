import type { Metadata } from "next";
import { notFound } from "next/navigation";
import TourViewer from "@/components/delivery/tour-viewer";
import { loadTour } from "@/lib/tour";

// Unbranded by design: no logos, no agent or agency details, generic title.
export const metadata: Metadata = { title: "Virtual Tour", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function MlsTourPage({ params }: PageProps<"/mls/[token]">) {
  const { token } = await params;
  const tour = await loadTour(token);
  if (!tour) notFound();

  return (
    <main className="min-h-screen bg-black">
      {!tour.isPaid && (
        <p className="bg-amber-200 px-4 py-2 text-center text-sm font-semibold text-neutral-900">
          PREVIEW — the full tour, video and floor plan unlock once the invoice is paid.
        </p>
      )}
      <TourViewer
        images={tour.images}
        videoUrl={tour.videoUrl}
        floorPlanUrl={tour.floorPlanUrl}
        floorPlanPdfUrl={tour.floorPlanPdfUrl}
        alt={tour.listing.property_address}
      />
    </main>
  );
}
