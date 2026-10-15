import { requireAdmin } from "@/lib/admin-guard";
import { listCustomers, syncCustomers } from "@/lib/customers";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const denied = requireAdmin(request);
  if (denied) return denied;
  try {
    return Response.json({ customers: await listCustomers() }, { headers: { "cache-control": "no-store" } });
  } catch {
    return Response.json({ error: "Could not load customers. Has the customers migration been applied?" }, { status: 503 });
  }
}

/** Rebuild the customer database from delivery + booking history. */
export async function POST(request: Request) {
  const denied = requireAdmin(request);
  if (denied) return denied;
  try {
    const result = await syncCustomers();
    return Response.json({ ...result, customers: await listCustomers() }, { headers: { "cache-control": "no-store" } });
  } catch {
    return Response.json({ error: "Could not sync customers. Check the migrations and storage config." }, { status: 503 });
  }
}
