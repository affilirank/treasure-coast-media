import { requireAdmin } from "@/lib/admin-guard";
import { listUpcomingReservations, loadCalendarConfig, normalizeConfig, releaseSlot, saveCalendarConfig } from "@/lib/calendar";

export const runtime = "nodejs";

const headers = { "cache-control": "no-store" };

export async function GET(request: Request) {
  const denied = requireAdmin(request);
  if (denied) return denied;
  try {
    const [config, reservations] = await Promise.all([loadCalendarConfig(), listUpcomingReservations()]);
    return Response.json({ config, reservations }, { headers });
  } catch {
    return Response.json({ error: "Calendar could not be loaded." }, { status: 503, headers });
  }
}

export async function PUT(request: Request) {
  const denied = requireAdmin(request);
  if (denied) return denied;
  try {
    const body = await request.json();
    const config = normalizeConfig(body?.config);
    await saveCalendarConfig(config);
    return Response.json({ config }, { headers });
  } catch {
    return Response.json({ error: "Calendar could not be saved." }, { status: 503, headers });
  }
}

export async function DELETE(request: Request) {
  const denied = requireAdmin(request);
  if (denied) return denied;
  try {
    const referenceId = new URL(request.url).searchParams.get("referenceId") ?? "";
    if (!/^[0-9a-f-]{36}$/i.test(referenceId)) return Response.json({ error: "Invalid reservation." }, { status: 400, headers });
    await releaseSlot(referenceId);
    return Response.json({ reservations: await listUpcomingReservations() }, { headers });
  } catch {
    return Response.json({ error: "Reservation could not be released." }, { status: 503, headers });
  }
}
