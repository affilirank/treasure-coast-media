import "server-only";
import { hasAdminSession } from "@/lib/portal-auth";

export function requireAdmin(request: Request) {
  return hasAdminSession(request) ? null : Response.json({ error: "Unauthorized" }, { status: 401, headers: { "cache-control": "no-store" } });
}
