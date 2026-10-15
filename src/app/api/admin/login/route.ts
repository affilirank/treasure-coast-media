import {
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_TTL_SECONDS,
  createAdminSession,
  hasAdminSession,
  verifyAdminPassword,
} from "@/lib/portal-auth";

export async function GET(request: Request) {
  return Response.json({ authenticated: hasAdminSession(request) }, { headers: { "cache-control": "no-store" } });
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Please provide a password." }, { status: 400 });
  }

  const password = typeof body === "object" && body && "password" in body ? (body as Record<string, unknown>).password : null;
  if (!process.env.CLIENT_PORTAL_PASSWORD || !process.env.PORTAL_SESSION_SECRET) {
    return Response.json({ error: "The admin portal is not configured." }, { status: 503 });
  }

  if (!verifyAdminPassword(password)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const session = createAdminSession();
  if (!session) return Response.json({ error: "The admin portal is not configured." }, { status: 503 });

  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return Response.json(
    { success: true },
    {
      headers: {
        "cache-control": "no-store",
        "set-cookie": `${ADMIN_SESSION_COOKIE}=${session}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${ADMIN_SESSION_TTL_SECONDS}${secure}`,
      },
    },
  );
}

export async function DELETE(request: Request) {
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return Response.json(
    { success: true },
    {
      headers: {
        "cache-control": "no-store",
        "set-cookie": `${ADMIN_SESSION_COOKIE}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0${secure}`,
      },
    },
  );
}
