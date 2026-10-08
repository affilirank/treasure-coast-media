import { createHash, randomBytes, randomUUID } from "node:crypto";
import { hasAdminSession } from "@/lib/portal-auth";
import { getPrivateJson, listPrivateBlobs, putPrivateJson, type DeliveryProject } from "@/lib/private-blob";

function clean(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

export async function GET(request: Request) {
  if (!hasAdminSession(request)) return Response.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const entries = await listPrivateBlobs("projects/");
    const projects = await Promise.all(entries
      .filter((entry) => entry.pathname.endsWith("/manifest.json"))
      .map((entry) => getPrivateJson<DeliveryProject>(entry.pathname)));
    return Response.json({ projects: projects.filter((project): project is DeliveryProject => project !== null) }, { headers: { "cache-control": "no-store" } });
  } catch {
    return Response.json({ error: "Private delivery storage is unavailable." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  if (!hasAdminSession(request)) return Response.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Submit valid project details." }, { status: 400 });
  }

  const customerName = clean((body as Record<string, unknown>)?.customerName, 120);
  const customerEmail = clean((body as Record<string, unknown>)?.customerEmail, 254).toLowerCase();
  if (!customerName || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) {
    return Response.json({ error: "Add a customer name and valid email address." }, { status: 400 });
  }

  const id = randomUUID();
  const shareToken = randomBytes(32).toString("base64url");
  const project: DeliveryProject = {
    id,
    customerName,
    customerEmail,
    shareTokenHash: createHash("sha256").update(shareToken).digest("hex"),
    createdAt: new Date().toISOString(),
  };

  try {
    await putPrivateJson(`projects/${id}/manifest.json`, project);
  } catch {
    return Response.json({ error: "Private delivery storage is unavailable." }, { status: 503 });
  }

  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? new URL(request.url).origin;
  const shareUrl = new URL("/client-portal", origin);
  shareUrl.searchParams.set("project", id);
  shareUrl.searchParams.set("share", shareToken);

  return Response.json({ success: true, project: { id, customerName, customerEmail, createdAt: project.createdAt }, shareUrl: shareUrl.toString() }, { status: 201, headers: { "cache-control": "no-store" } });
}