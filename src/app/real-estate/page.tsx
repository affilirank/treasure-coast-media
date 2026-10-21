import type { Metadata } from "next";
import MediaExperience from "@/components/media-experience";

export const metadata: Metadata = {
  title: "Real Estate Listing Media | HDR Photos, Drone & Video — Treasure Coast",
  description:
    "Next-day HDR listing photos, HD aerial drone, 2D floor plans, and cinematic property video for Treasure Coast agents. Realtor-hosted branding reels and Zillow 3D tours. Book a free consult.",
  alternates: { canonical: "https://www.meritmediafl.com/real-estate" },
  openGraph: {
    title: "Real Estate Listing Media | Merit Media — Treasure Coast",
    description:
      "Next-day HDR photos, HD drone, floor plans, and cinematic property video for Treasure Coast listings.",
    url: "https://www.meritmediafl.com/real-estate",
    type: "website",
  },
};

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function RealEstatePage({ searchParams }: PageProps) {
  await searchParams;
  return <MediaExperience initialTrack="real-estate" />;
}
