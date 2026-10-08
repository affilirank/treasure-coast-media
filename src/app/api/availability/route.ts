import { getAvailability } from "@/lib/calendar";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return Response.json(await getAvailability(), { headers: { "cache-control": "no-store" } });
  } catch {
    return Response.json({ error: "Availability is temporarily unavailable." }, { status: 503 });
  }
}
