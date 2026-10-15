import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_SESSION_COOKIE, isAdminSessionToken } from "@/lib/portal-auth";
import OffersBuilder from "./offers-builder";

export const metadata: Metadata = { title: "Offers | Merit Media Admin", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function OffersPage() {
  const store = await cookies();
  if (!isAdminSessionToken(store.get(ADMIN_SESSION_COOKIE)?.value)) redirect("/admin");
  return <OffersBuilder />;
}
