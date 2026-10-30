import type { Metadata, Viewport } from "next";
import { connection } from "next/server";
import { Bricolage_Grotesque, Fredoka, Instrument_Serif, Inter, Plus_Jakarta_Sans } from "next/font/google";
import { site } from "@/lib/site";
import "./globals.css";

const body = Inter({ subsets: ["latin"], variable: "--font-body", display: "swap" });
const heading = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-heading", display: "swap" });
// App (signed-in) fonts: rounded, friendly headings and a warm text face.
const fun = Fredoka({ subsets: ["latin"], variable: "--font-fun", display: "swap" });
const friendly = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-friendly", display: "swap" });
const accent = Instrument_Serif({ subsets: ["latin"], weight: "400", style: ["normal", "italic"], variable: "--font-accent", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: { default: site.name, template: `%s · ${site.name}` },
  description: site.description,
  applicationName: site.name,
  openGraph: { type: "website", siteName: site.name, title: site.name, description: site.description, url: "/" },
  twitter: { card: "summary_large_image", title: site.name, description: site.description },
  robots: { index: true, follow: true },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#13111c",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Render per request so the CSP nonce from src/proxy.ts reaches every page.
  await connection();
  return (
    <html lang="en" className={`${body.variable} ${heading.variable} ${accent.variable} ${fun.variable} ${friendly.variable}`}>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
