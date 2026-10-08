import { createHmac, timingSafeEqual } from "node:crypto";

export const ADMIN_SESSION_COOKIE = "merit_admin_session";
export const PROJECT_SESSION_COOKIE = "merit_project_session";
export const ADMIN_SESSION_TTL_SECONDS = 60 * 60 * 8;
export const PROJECT_SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;

function sessionSecret() {
  const value = process.env.PORTAL_SESSION_SECRET;
  return value && value.length >= 32 ? value : null;
}

function signature(payload: string, secret: string) {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

function createSession(role: string, expiresAt: number, projectId?: string) {
  const secret = sessionSecret();
  if (!secret) return null;
  const payload = Buffer.from(JSON.stringify({ role, projectId, expiresAt })).toString("base64url");
  return `${payload}.${signature(payload, secret)}`;
}

function readSession(request: Request, cookieName: string) {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const cookie = cookieHeader.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${cookieName}=`));
  return readSessionToken(cookie?.slice(cookieName.length + 1));
}

function readSessionToken(token: string | undefined) {
  const secret = sessionSecret();
  if (!secret || !token) return null;

  const [payload, providedSignature] = token.split(".");
  if (!payload || !providedSignature) return null;
  const expectedSignature = signature(payload, secret);
  const providedBuffer = Buffer.from(providedSignature);
  const expectedBuffer = Buffer.from(expectedSignature);
  if (providedBuffer.length !== expectedBuffer.length || !timingSafeEqual(providedBuffer, expectedBuffer)) return null;

  try {
    const session = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { role?: string; projectId?: string; expiresAt?: number };
    if (typeof session.expiresAt !== "number" || session.expiresAt <= Date.now() / 1000) return null;
    return session;
  } catch {
    return null;
  }
}

export function verifyAdminPassword(value: unknown) {
  const expected = process.env.CLIENT_PORTAL_PASSWORD;
  if (typeof value !== "string" || !expected) return false;
  const providedBuffer = Buffer.from(value);
  const expectedBuffer = Buffer.from(expected);
  return providedBuffer.length === expectedBuffer.length && timingSafeEqual(providedBuffer, expectedBuffer);
}

export function createAdminSession() {
  const expiresAt = Math.floor(Date.now() / 1000) + ADMIN_SESSION_TTL_SECONDS;
  return createSession("admin", expiresAt);
}

export function hasAdminSession(request: Request) {
  return readSession(request, ADMIN_SESSION_COOKIE)?.role === "admin";
}

export function isAdminSessionToken(token: string | undefined) {
  return readSessionToken(token)?.role === "admin";
}

export function createProjectSession(projectId: string) {
  const expiresAt = Math.floor(Date.now() / 1000) + PROJECT_SESSION_TTL_SECONDS;
  return createSession("project", expiresAt, projectId);
}

export function hasProjectSession(request: Request, projectId: string) {
  const session = readSession(request, PROJECT_SESSION_COOKIE);
  return session?.role === "project" && session.projectId === projectId;
}