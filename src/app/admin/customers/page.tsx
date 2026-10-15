import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_SESSION_COOKIE, isAdminSessionToken } from "@/lib/portal-auth";
import CustomersAdmin from "./customers-admin";

export const metadata: Metadata = { title: "Customers | Merit Media Admin", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function CustomersPage() {
  const store = await cookies();
  if (!isAdminSessionToken(store.get(ADMIN_SESSION_COOKIE)?.value)) redirect("/admin");
  return <CustomersAdmin />;
}
