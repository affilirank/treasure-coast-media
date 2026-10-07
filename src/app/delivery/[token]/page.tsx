import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { deliveryLinks, getListingByToken } from "@/lib/delivery";
import { getDownloadPresignedUrl, getPreviewPresignedUrl } from "@/lib/storage";
import DeliveryClient, { type GalleryImage } from "./delivery-client";

export const metadata: Metadata = { title: "Your Media Delivery | Merit Media", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function DeliveryPage({ params, searchParams }: PageProps<"/delivery/[token]">) {
  const { token } = await params;
  const { paid } = await searchParams;
  const found = await getListingByToken(token);
  if (!found) notFound();
  const { listing, assets } = found;

  // Unpaid listings only ever get watermarked previews; paid ones get web-size images.
  const stills = assets.filter((a) => a.asset_type === "hdr_still" || a.asset_type === "drone_aerial");
  const images = (
    await Promise.all(
      stills.map(async (asset): Promise<GalleryImage | null> => {
        if (listing.is_paid) return { id: asset.id, src: await getDownloadPresignedUrl(asset.web_res_url, listing) };
        return asset.watermarked_url ? { id: asset.id, src: await getPreviewPresignedUrl(asset.watermarked_url) } : null;
      }),
    )
  ).filter((image): image is GalleryImage => image !== null);

  const links = deliveryLinks(listing.access_token);
  return (
    <DeliveryClient
      token={listing.access_token}
      address={listing.property_address}
      amount={Number(listing.invoice_amount)}
      isPaid={listing.is_paid}
      returnedFromCheckout={paid === "1"}
      images={images}
      hasFloorPlan={assets.some((a) => a.asset_type === "floor_plan_pdf" || a.asset_type === "floor_plan_img")}
      hasVideo={assets.some((a) => a.asset_type === "walkthrough_video")}
      mlsLink={links.mls}
      showcaseLink={links.showcase}
    />
  );
}
