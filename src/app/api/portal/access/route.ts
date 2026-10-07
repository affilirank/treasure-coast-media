import { createHash, timingSafeEqual } from "node:crypto";
import { createProjectSession, PROJECT_SESSION_COOKIE, PROJECT_SESSION_TTL_SECONDS } from "@/lib/portal-auth";
import { getPrivateJson, type DeliveryProject } from "@/lib/private-blob";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "The delivery link is invalid." }, { status: 400 });
  }

  const values = body as Record<string, unknown>;
  const projectId = typeof values.projectId === "string" ? values.projectId : "";
  const shareToken = typeof values.shareToken === "string" ? values.shareToken : "";
  if (!/^[0-9a-f-]{36}$/i.test(projectId) || shareToken.length < 40) {
    return Response.json({ error: "The delivery link is invalid or expired." }, { status: 401 });
  }

  try {
    const project = await getPrivateJson<DeliveryProject>(`projects/${projectId}/manifest.json`);
    if (!project) return Response.json({ error: "The delivery link is invalid or expired." }, { status: 401 });
    const providedHash = Buffer.from(createHash("sha256").update(shareToken).digest("hex"));
    const storedHash = Buffer.from(project.shareTokenHash);
    if (providedHash.length !== storedHash.length || !timingSafeEqual(providedHash, storedHash)) {
      return Response.json({ error: "The delivery link is invalid or expired." }, { status: 401 });
    }

    const session = createProjectSession(projectId);
    if (!session) return Response.json({ error: "Project access is not configured." }, { status: 503 });
    const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
    return Response.json(
      { success: true, customerName: project.customerName },
      { headers: { "cache-control": "no-store", "set-cookie": `${PROJECT_SESSION_COOKIE}=${session}; HttpOnly; SameSite=Strict; Path=/api/portal; Max-Age=${PROJECT_SESSION_TTL_SECONDS}${secure}` } },
    );
  } catch {
    return Response.json({ error: "Private delivery storage is unavailable." }, { status: 503 });
  }
}

export async function DELETE(request: Request) {
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return Response.json(
    { success: true },
    { headers: { "cache-control": "no-store", "set-cookie": `${PROJECT_SESSION_COOKIE}=; HttpOnly; SameSite=Strict; Path=/api/portal; Max-Age=0${secure}` } },
  );
}