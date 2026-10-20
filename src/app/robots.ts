import type { MetadataRoute } from "next";

const BASE_URL = "https://www.meritmediafl.com";

// Token-gated pages (deliveries, MLS cuts, offers) stay out of the index; the
// public marketing pages and the branded showcase are welcome to be crawled.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/api", "/delivery/", "/mls/", "/offer/", "/booking/success"],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
    host: BASE_URL,
  };
}
