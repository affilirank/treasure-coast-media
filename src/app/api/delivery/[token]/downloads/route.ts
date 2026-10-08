import { fileNameFromKey, getListingByToken, type ListingAsset } from "@/lib/delivery";
import { getDownloadPresignedUrl } from "@/lib/storage";

export const runtime = "nodejs";

const KINDS = {
  mls: (a: ListingAsset) => (a.asset_type === "hdr_still" || a.asset_type === "drone_aerial" ? a.web_res_url : null),
  print: (a: ListingAsset) => (a.asset_type === "hdr_still" || a.asset_type === "drone_aerial" ? a.full_res_url : null),
  floorplan: (a: ListingAsset) => (a.asset_type === "floor_plan_pdf" || a.asset_type === "floor_plan_img" ? a.full_res_url : null),
  video: (a: ListingAsset) => (a.asset_type === "walkthrough_video" ? a.full_res_url : null),
} as const;

export async function GET(request: Request, ctx: RouteContext<"/api/delivery/[token]/downloads">) {
  const { token } = await ctx.params;
  const kind = new URL(request.url).searchParams.get("kind") as keyof typeof KINDS | null;
  if (!kind || !(kind in KINDS)) return Response.json({ error: "Unknown download type." }, { status: 400 });

  const found = await getListingByToken(token);
  if (!found) return Response.json({ error: "Delivery not found." }, { status: 404 });
  if (!found.listing.is_paid) return Response.json({ error: "Payment required." }, { status: 402 });

  const used = new Map<string, number>();
  const files = await Promise.all(
    found.assets.flatMap((asset) => {
      const key = KINDS[kind](asset);
      if (!key) return [];
      // Keep names unique inside the ZIP.
      const base = fileNameFromKey(key);
      const count = used.get(base) ?? 0;
      used.set(base, count + 1);
      const name = count ? `${count + 1}-${base}` : base;
      return [getDownloadPresignedUrl(key, found.listing, { downloadName: name }).then((url) => ({ name, url }))];
    }),
  );

  return Response.json({ files }, { headers: { "cache-control": "no-store" } });
}
