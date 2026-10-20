import type { Metadata } from "next";
import MediaExperience from "@/components/media-experience";

export const metadata: Metadata = {
  title: "Commercial Video & Local Growth Marketing | Merit Media — Treasure Coast",
  description:
    "Brand films, direct-response video ads, Google Maps and paid-search growth for Treasure Coast businesses. Book a free commercial video consult with Merit Media in Vero Beach, Fort Pierce and Stuart.",
  alternates: { canonical: "https://www.meritmediafl.com/commercial" },
  openGraph: {
    title: "Commercial Video & Local Growth Marketing | Merit Media",
    description:
      "Brand films, direct-response video ads, and local growth marketing for Treasure Coast businesses.",
    url: "https://www.meritmediafl.com/commercial",
    type: "website",
  },
};

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function CommercialPage({ searchParams }: PageProps) {
  await searchParams;
  return <MediaExperience initialTrack="commercial" />;
}
