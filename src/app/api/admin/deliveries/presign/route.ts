import { requireAdmin } from "@/lib/admin-guard";
import { getUploadPresignedUrl } from "@/lib/storage";

export const runtime = "nodejs";

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf", "video/mp4"]);
const MAX_FILES = 400;

export async function POST(request: Request) {
  const denied = requireAdmin(request);
  if (denied) return denied;

  let body: { files?: { name?: unknown; contentType?: unknown; preview?: unknown }[] };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  const files = body.files;
  if (!Array.isArray(files) || files.length === 0 || files.length > MAX_FILES) {
    return Response.json({ error: `Provide between 1 and ${MAX_FILES} files.` }, { status: 400 });
  }
  for (const file of files) {
    if (typeof file.name !== "string" || !file.name || typeof file.contentType !== "string" || !ALLOWED_TYPES.has(file.contentType)) {
      return Response.json({ error: "Unsupported file type." }, { status: 400 });
    }
  }

  try {
    const uploads = await Promise.all(
      files.map((file) => getUploadPresignedUrl(file.name as string, file.contentType as string, { preview: file.preview === true })),
    );
    return Response.json({ uploads }, { headers: { "cache-control": "no-store" } });
  } catch {
    return Response.json({ error: "Storage is not configured." }, { status: 503 });
  }
}
