import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_SESSION_COOKIE, isAdminSessionToken } from "@/lib/portal-auth";
import NewDeliveryForm from "./new-delivery-form";

export const metadata: Metadata = { title: "New Delivery | Merit Media Admin", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function NewDeliveryPage() {
  const store = await cookies();
  if (!isAdminSessionToken(store.get(ADMIN_SESSION_COOKIE)?.value)) redirect("/admin");
  return <NewDeliveryForm />;
}
