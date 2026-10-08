import { issueSignedToken, presignUrl } from "@vercel/blob";
import { randomUUID } from "node:crypto";
import { hasAdminSession } from "@/lib/portal-auth";
import { getPrivateJson, type DeliveryProject } from "@/lib/private-blob";

export const runtime = "nodejs";

const maximumFileSize = 250 * 1024 * 1024;
const allowedExtensions = new Map([
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".png", "image/png"],
  [".webp", "image/webp"],
  [".heic", "image/heic"],
  [".tif", "image/tiff"],
  [".tiff", "image/tiff"],
  [".pdf", "application/pdf"],
  [".mp4", "video/mp4"],
  [".mov", "video/quicktime"],
]);

export async function POST(request: Request) {
  if (!hasAdminSession(request)) return Response.json({ error: "Admin login required." }, { status: 401 });
  if (!process.env.BLOB_STORE_ID) return Response.json({ error: "Private delivery storage is not connected." }, { status: 503 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Choose a file and project before uploading." }, { status: 400 });
  }

  const values = body as Record<string, unknown>;
  const projectId = typeof values.projectId === "string" ? values.projectId : "";
  const fileName = typeof values.fileName === "string" ? values.fileName.slice(0, 180) : "";
  const size = typeof values.size === "number" ? values.size : 0;
  const extension = fileName.toLowerCase().slice(fileName.lastIndexOf("."));
  const contentType = allowedExtensions.get(extension);
  if (!/^[0-9a-f-]{36}$/i.test(projectId) || !fileName || !contentType || size < 1 || size > maximumFileSize) {
    return Response.json({ error: "Supported uploads are photos, PDFs, and MP4/MOV video up to 250 MB." }, { status: 400 });
  }

  try {
    const project = await getPrivateJson<DeliveryProject>(`projects/${projectId}/manifest.json`);
    if (!project) return Response.json({ error: "The selected delivery project was not found." }, { status: 404 });

    const sanitizedName = fileName.replace(/[^a-zA-Z0-9_.-]/g, "-");
    const pathname = `delivery/${projectId}/files/${randomUUID()}-${sanitizedName}`;
    const validUntil = Date.now() + 5 * 60 * 1000;
    const token = await issueSignedToken({
      pathname,
      operations: ["put"],
      validUntil,
      allowedContentTypes: [contentType],
      maximumSizeInBytes: maximumFileSize,
    });
    const signed = await presignUrl(token, {
      operation: "put",
      pathname,
      access: "private",
      validUntil,
      allowedContentTypes: [contentType],
      maximumSizeInBytes: maximumFileSize,
    });

    return Response.json({ success: true, pathname, uploadUrl: signed.presignedUrl, contentType, validUntil }, { headers: { "cache-control": "no-store" } });
  } catch {
    return Response.json({ error: "A secure upload could not be created." }, { status: 503 });
  }
}
