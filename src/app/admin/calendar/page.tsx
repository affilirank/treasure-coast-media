import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_SESSION_COOKIE, isAdminSessionToken } from "@/lib/portal-auth";
import CalendarEditor from "./calendar-editor";

export const metadata: Metadata = { title: "Booking calendar | Merit Media Admin", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function CalendarPage() {
  const store = await cookies();
  if (!isAdminSessionToken(store.get(ADMIN_SESSION_COOKIE)?.value)) redirect("/admin");
  return <CalendarEditor />;
}
