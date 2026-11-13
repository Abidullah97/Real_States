import type { Metadata, Viewport } from "next";
import { Inter, Poppins } from "next/font/google";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { getSiteSettings } from "@/lib/site-content";
import "./globals.css";

const poppins = Poppins({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--font-poppins", display: "swap" });
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

/** SEO defaults come from the admin Site settings, falling back to built-in copy. */
export async function generateMetadata(): Promise<Metadata> {
  const s = await getSiteSettings();
  const name = s.siteName || "Estate House";
  const title = s.seoTitle || `${name} | Homes for sale and rent in Pakistan`;
  const description = s.seoDescription || "Explore thoughtfully presented homes for sale and rent across Pakistan, compare details clearly and contact owners or agents directly.";
  return {
    metadataBase: new URL(s.websiteUrl || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
    title: { default: title, template: `%s | ${name}` },
    description,
    keywords: s.seoKeywords ? s.seoKeywords.split(",").map((k) => k.trim()).filter(Boolean) : undefined,
    openGraph: { title, description, siteName: name, type: "website", ...(s.ogImageUrl ? { images: [s.ogImageUrl] } : {}) },
    ...(s.faviconUrl ? { icons: { icon: s.faviconUrl } } : {}),
  };
}

export const viewport: Viewport = { themeColor: "#142b45" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${poppins.variable} ${inter.variable}`}>
      <body>
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        {children}
        <SpeedInsights />
      </body>
    </html>
  );
}
