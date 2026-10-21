import type { Metadata } from "next";
import "./globals.css";

const BASE_URL = "https://www.meritmediafl.com";
const DESCRIPTION =
  "Next-day HDR real estate photography, HD aerial drone, schematic floor plans, and high-yield commercial video ads for the Treasure Coast & Palm Beaches. Next-morning delivery promise.";

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: "Merit Media & Marketing | Architectural Real Estate Media & Commercial Growth Agency",
  description: DESCRIPTION,
  applicationName: "Merit Media & Marketing",
  alternates: { canonical: "/" },
  openGraph: {
    title: "Merit Media & Marketing",
    siteName: "Merit Media & Marketing",
    description: DESCRIPTION,
    url: BASE_URL,
    type: "website",
    images: [{ url: "/images/og-default.png", width: 1200, height: 630, alt: "Merit Media & Marketing" }],
  },
  twitter: {
    title: "Merit Media & Marketing",
    description: DESCRIPTION,
    card: "summary_large_image",
    images: ["/images/og-default.png"],
  },
};

// LocalBusiness structured data so Google can surface the phone, service area and offer.
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "ProfessionalService",
  name: "Merit Media & Marketing",
  url: BASE_URL,
  image: `${BASE_URL}/images/og-default.png`,
  logo: `${BASE_URL}/images/merit-logo.png`,
  telephone: "+1-772-290-1756",
  email: "meritmediamarketingfl@gmail.com",
  description: DESCRIPTION,
  areaServed: [
    { "@type": "AdministrativeArea", name: "Treasure Coast, Florida" },
    { "@type": "AdministrativeArea", name: "Palm Beaches, Florida" },
  ],
  address: {
    "@type": "PostalAddress",
    addressRegion: "FL",
    addressCountry: "US",
  },
  sameAs: ["https://instagram.com/merit.media.marketing"],
  serviceType: [
    "Real estate photography",
    "Aerial drone photography",
    "Real estate video production",
    "Commercial video production",
    "Local marketing and advertising",
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
        {children}
      </body>
    </html>
  );
}
