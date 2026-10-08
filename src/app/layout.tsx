import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Merit Media & Marketing | Architectural Real Estate Media & Commercial Growth Agency",
  description:
    "Next-day HDR real estate photography, 4K aerial drone, schematic floor plans, and high-yield commercial video ads for the Treasure Coast & Palm Beaches. 24-hour delivery guaranteed.",
  applicationName: "Merit Media & Marketing",
  openGraph: {
    title: "Merit Media & Marketing",
    siteName: "Merit Media & Marketing",
    description:
      "Next-day HDR real estate photography, 4K aerial drone, schematic floor plans, and high-yield commercial video ads for the Treasure Coast & Palm Beaches. 24-hour delivery guaranteed.",
    type: "website",
  },
  twitter: {
    title: "Merit Media & Marketing",
    description:
      "Next-day HDR real estate photography, 4K aerial drone, schematic floor plans, and high-yield commercial video ads for the Treasure Coast & Palm Beaches. 24-hour delivery guaranteed.",
    card: "summary_large_image",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>{children}</body>
    </html>
  );
}
