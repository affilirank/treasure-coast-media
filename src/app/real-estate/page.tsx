import MediaExperience from "@/components/media-experience";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function RealEstatePage({ searchParams }: PageProps) {
  await searchParams;
  return <MediaExperience initialTrack="real-estate" />;
}
