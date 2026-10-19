import { lookupPropertyByAddress } from "@/lib/property-lookup";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const address = typeof body.address === "string" ? body.address.trim().slice(0, 200) : "";
    const city = typeof body.city === "string" ? body.city.trim().slice(0, 80) : "";
    const zipCode = typeof body.zipCode === "string" ? body.zipCode.trim().slice(0, 10) : "";

    if (!address) {
      return Response.json({ error: "Address is required." }, { status: 400 });
    }

    const result = await lookupPropertyByAddress(address, city, zipCode);
    return Response.json(result, { headers: { "cache-control": "no-store" } });
  } catch {
    return Response.json({ error: "Property lookup failed." }, { status: 500 });
  }
}
