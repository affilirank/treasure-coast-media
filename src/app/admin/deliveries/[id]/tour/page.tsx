import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_SESSION_COOKIE, isAdminSessionToken } from "@/lib/portal-auth";
import TourEditor from "./tour-editor";

export const metadata: Metadata = { title: "Listing Tour Editor | Merit Media Admin", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function TourEditorPage({ params }: PageProps<"/admin/deliveries/[id]/tour">) {
  const store = await cookies();
  if (!isAdminSessionToken(store.get(ADMIN_SESSION_COOKIE)?.value)) redirect("/admin");
  const { id } = await params;
  return <TourEditor listingId={id} />;
}
