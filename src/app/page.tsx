import MediaExperience from "@/components/media-experience";
import type { Track } from "@/lib/site-data";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { track } = await searchParams;
  const initialTrack: Track = track === "commercial" ? "commercial" : "real-estate";

  return <MediaExperience initialTrack={initialTrack} />;
}
