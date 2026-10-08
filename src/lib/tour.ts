import "server-only";
import { getListingByToken } from "@/lib/delivery";
import { getDownloadPresignedUrl, getPreviewPresignedUrl } from "@/lib/storage";

const TOUR_URL_TTL_SECONDS = 4 * 60 * 60;

/**
 * Loads a listing's media for the tour pages.
 * Paid: web-size photos, video and floor plan. Unpaid: watermarked photo previews only.
 */
export async function loadTour(token: string) {
  const found = await getListingByToken(token);
  if (!found) return null;
  const { listing, assets } = found;
  const stills = assets.filter((a) => a.asset_type === "hdr_still" || a.asset_type === "drone_aerial");

  if (!listing.is_paid) {
    const images = (
      await Promise.all(stills.map(async (a) => (a.watermarked_url ? { id: a.id, src: await getPreviewPresignedUrl(a.watermarked_url) } : null)))
    ).filter((image): image is { id: string; src: string } => image !== null);
    return { listing, isPaid: false as const, images, videoUrl: null, floorPlanUrl: null, floorPlanPdfUrl: null };
  }

  const sign = (key: string) => getDownloadPresignedUrl(key, listing, { expiresIn: TOUR_URL_TTL_SECONDS });
  const images = await Promise.all(stills.map(async (a) => ({ id: a.id, src: await sign(a.web_res_url) })));
  const video = assets.find((a) => a.asset_type === "walkthrough_video");
  const plan = assets.find((a) => a.asset_type === "floor_plan_img");
  const pdf = assets.find((a) => a.asset_type === "floor_plan_pdf");

  return {
    listing,
    isPaid: true as const,
    images,
    videoUrl: video ? await sign(video.web_res_url) : null,
    floorPlanUrl: plan ? await sign(plan.web_res_url) : null,
    floorPlanPdfUrl: pdf ? await sign(pdf.web_res_url) : null,
  };
}
