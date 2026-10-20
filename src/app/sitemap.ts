import type { MetadataRoute } from "next";

const BASE_URL = "https://www.meritmediafl.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: `${BASE_URL}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${BASE_URL}/real-estate`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${BASE_URL}/commercial`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
  ];
}
