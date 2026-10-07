import { hasProjectSession } from "@/lib/portal-auth";
import { getPrivateBlob, listPrivateBlobs } from "@/lib/private-blob";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const projectId = url.searchParams.get("project") ?? "";
  const pathname = url.searchParams.get("pathname");

  if (!/^[0-9a-f-]{36}$/i.test(projectId) || !hasProjectSession(request, projectId)) {
    return Response.json({ error: "Use the secure delivery link to access these files." }, { status: 401, headers: { "cache-control": "no-store" } });
  }

  try {
    const prefix = `delivery/${projectId}/files/`;
    if (pathname) {
      if (!pathname.startsWith(prefix) || pathname.includes("..")) return Response.json({ error: "File not found." }, { status: 404 });
      const result = await getPrivateBlob(pathname);
      if (!result || result.statusCode !== 200) return Response.json({ error: "File not found." }, { status: 404 });
      const fileName = pathname.split("/").at(-1)?.replace(/^[0-9a-f-]{36}-/, "") ?? "download";
      const headers = new Headers({
        "cache-control": "private, no-store",
        "content-type": result.blob.contentType,
        "content-disposition": `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
        "x-content-type-options": "nosniff",
      });
      headers.set("content-length", String(result.blob.size));
      return new Response(result.stream, { headers });
    }

    const blobs = await listPrivateBlobs(prefix);
    return Response.json({ files: blobs.map((blob) => ({
      name: blob.pathname.split("/").at(-1)?.replace(/^[0-9a-f-]{36}-/, "") ?? "File",
      pathname: blob.pathname,
      size: blob.size,
      uploadedAt: blob.uploadedAt.toISOString(),
    })) }, { headers: { "cache-control": "private, no-store" } });
  } catch {
    return Response.json({ error: "Private delivery storage is unavailable." }, { status: 503 });
  }
}
