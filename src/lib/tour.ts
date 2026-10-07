import "server-only";
import { getListingByToken } from "@/lib/delivery";
import { getDownloadPresignedUrl } from "@/lib/storage";

const TOUR_URL_TTL_SECONDS = 4 * 60 * 60;

/** Loads a paid listing's web-size media for the public tour pages. Returns null if missing or unpaid. */
export async function loadTour(token: string) {
  const found = await getListingByToken(token);
  if (!found || !found.listing.is_paid) return null;
  const { listing, assets } = found;
  const sign = (key: string) => getDownloadPresignedUrl(key, listing, { expiresIn: TOUR_URL_TTL_SECONDS });

  const images = await Promise.all(
    assets.filter((a) => a.asset_type === "hdr_still" || a.asset_type === "drone_aerial").map(async (a) => ({ id: a.id, src: await sign(a.web_res_url) })),
  );
  const video = assets.find((a) => a.asset_type === "walkthrough_video");
  const plan = assets.find((a) => a.asset_type === "floor_plan_img");
  const pdf = assets.find((a) => a.asset_type === "floor_plan_pdf");

  return {
    listing,
    images,
    videoUrl: video ? await sign(video.web_res_url) : null,
    floorPlanUrl: plan ? await sign(plan.web_res_url) : null,
    floorPlanPdfUrl: pdf ? await sign(pdf.web_res_url) : null,
  };
}
