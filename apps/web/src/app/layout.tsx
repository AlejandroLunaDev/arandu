import type { Metadata } from "next";
import { Bricolage_Grotesque, Lexend, Outfit } from "next/font/google";
import { DESCRIPTION } from "@/landing/copy";
import { PORTFOLIO_URL, SITE_URL } from "@/landing/links";
import "./globals.css";

// The variable names are the ones scripts/tokens.mjs writes into the font tokens.
const outfit = Outfit({ variable: "--font-outfit", subsets: ["latin"] });
const lexend = Lexend({ variable: "--font-lexend", subsets: ["latin"] });
// The logo's face, for the wordmark only (hero.module.css), so it is not a font token.
const bricolage = Bricolage_Grotesque({ variable: "--font-bricolage", subsets: ["latin"], weight: "700" });

const title = "Arandu · Orientação vocacional com inteligência artificial";

// The link preview's image is app/opengraph-image.png, which Next.js adds to openGraph and twitter.
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title,
  description: DESCRIPTION,
  applicationName: "Arandu",
  authors: [{ name: "Alejandro Luna", url: PORTFOLIO_URL }],
  alternates: { canonical: "/" },
  openGraph: { type: "website", locale: "pt_BR", url: "/", siteName: "Arandu", title, description: DESCRIPTION },
  twitter: { card: "summary_large_image", title, description: DESCRIPTION },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" data-theme="dark" className={`${outfit.variable} ${lexend.variable} ${bricolage.variable}`}>
      <body>{children}</body>
    </html>
  );
}
