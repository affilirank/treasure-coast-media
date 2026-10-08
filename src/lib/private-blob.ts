import { get, list, put } from "@vercel/blob";

export type DeliveryProject = {
  id: string;
  customerName: string;
  customerEmail: string;
  shareTokenHash: string;
  createdAt: string;
};

export async function putPrivateJson(pathname: string, value: unknown) {
  if (!process.env.BLOB_STORE_ID) throw new Error("Private delivery storage is not configured.");
  return put(pathname, JSON.stringify(value), {
    access: "private",
    contentType: "application/json",
    allowOverwrite: true,
    addRandomSuffix: false,
  });
}

export async function getPrivateJson<T>(pathname: string): Promise<T | null> {
  if (!process.env.BLOB_STORE_ID) throw new Error("Private delivery storage is not configured.");
  const result = await get(pathname, { access: "private", useCache: false });
  if (!result || result.statusCode !== 200) return null;
  return JSON.parse(await new Response(result.stream).text()) as T;
}

export async function listPrivateBlobs(prefix: string) {
  if (!process.env.BLOB_STORE_ID) throw new Error("Private delivery storage is not configured.");
  const result = await list({ prefix, limit: 1000 });
  return result.blobs;
}

export async function getPrivateBlob(pathname: string) {
  if (!process.env.BLOB_STORE_ID) throw new Error("Private delivery storage is not configured.");
  return get(pathname, { access: "private", useCache: false });
}