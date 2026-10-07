import "server-only";
import { randomUUID } from "node:crypto";
import { GetObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const UPLOAD_URL_TTL_SECONDS = 15 * 60;
export const DOWNLOAD_URL_TTL_SECONDS = 30 * 60;
export const UPLOAD_KEY_PATTERN = /^uploads\/[0-9a-f-]{36}\/[A-Za-z0-9._-]{1,160}$/;

let client: S3Client | null = null;

function config() {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET_NAME;
  if (!accountId || !accessKeyId || !secretAccessKey || !bucket) throw new Error("Cloudflare R2 storage is not configured.");
  return { accountId, accessKeyId, secretAccessKey, bucket };
}

function s3() {
  if (!client) {
    const { accountId, accessKeyId, secretAccessKey } = config();
    client = new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey },
      // R2 does not support the SDK's default CRC32 checksum params on presigned URLs.
      requestChecksumCalculation: "WHEN_REQUIRED",
      responseChecksumValidation: "WHEN_REQUIRED",
    });
  }
  return client;
}

export function sanitizeFileName(fileName: string) {
  const cleaned = fileName.normalize("NFKD").replace(/[^A-Za-z0-9._-]+/g, "_").replace(/^\.+/, "").slice(-120);
  return cleaned || "file";
}

/** Presigned PUT for direct browser uploads. The client must send the same Content-Type header. */
export async function getUploadPresignedUrl(fileName: string, contentType: string, options: { preview?: boolean } = {}) {
  // Only watermarked previews get the "preview-" prefix, so it can safely mark objects that may be public.
  const safeName = sanitizeFileName(fileName).replace(/^preview-/, "f-");
  const key = `uploads/${randomUUID()}/${options.preview ? "preview-" : ""}${safeName}`;
  const url = await getSignedUrl(
    s3(),
    new PutObjectCommand({ Bucket: config().bucket, Key: key, ContentType: contentType }),
    { expiresIn: UPLOAD_URL_TTL_SECONDS },
  );
  return { key, url };
}

type DownloadOptions = { expiresIn?: number; downloadName?: string };

/**
 * Presigned GET for private objects. Refuses to sign anything for an unpaid listing.
 * Callers must also make sure fileKey belongs to that listing.
 */
export async function getDownloadPresignedUrl(fileKey: string, listing: { is_paid: boolean }, options: DownloadOptions = {}) {
  if (listing.is_paid !== true) throw new Error("Listing has not been paid for.");
  return signGet(fileKey, options);
}

/** Watermarked previews are the only objects that may be signed for unpaid listings. */
export async function getPreviewPresignedUrl(fileKey: string) {
  if (!fileKey.startsWith("uploads/")) throw new Error("Invalid key.");
  const publicDomain = process.env.R2_PUBLIC_DOMAIN?.replace(/\/+$/, "");
  if (publicDomain && fileKey.includes("/preview-")) {
    return `${publicDomain.startsWith("http") ? publicDomain : `https://${publicDomain}`}/${fileKey}`;
  }
  return signGet(fileKey, { expiresIn: 60 * 60 });
}

function signGet(fileKey: string, { expiresIn = DOWNLOAD_URL_TTL_SECONDS, downloadName }: DownloadOptions) {
  const disposition = downloadName ? `attachment; filename="${sanitizeFileName(downloadName)}"` : undefined;
  return getSignedUrl(
    s3(),
    new GetObjectCommand({ Bucket: config().bucket, Key: fileKey, ResponseContentDisposition: disposition }),
    { expiresIn },
  );
}

export async function objectExists(fileKey: string) {
  try {
    await s3().send(new HeadObjectCommand({ Bucket: config().bucket, Key: fileKey }));
    return true;
  } catch {
    return false;
  }
}
