import MediaExperience from "@/components/media-experience";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function CommercialPage({ searchParams }: PageProps) {
  await searchParams;
  return <MediaExperience initialTrack="commercial" />;
}
