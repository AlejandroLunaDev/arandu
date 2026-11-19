import type { Metadata } from "next";
import { Bricolage_Grotesque, Lexend, Outfit } from "next/font/google";
import "./globals.css";

// The variable names are the ones scripts/tokens.mjs writes into the font tokens.
const outfit = Outfit({ variable: "--font-outfit", subsets: ["latin"] });
const lexend = Lexend({ variable: "--font-lexend", subsets: ["latin"] });
// The logo's face, for the wordmark only (hero.module.css), so it is not a font token.
const bricolage = Bricolage_Grotesque({ variable: "--font-bricolage", subsets: ["latin"], weight: "700" });

export const metadata: Metadata = {
  title: "Arandu ·Orientação vocacional com inteligência artificial",
  description:
    "Um app de orientação vocacional com inteligência artificial, onde quem quer entrar na universidade vive uma carreira antes de escolher.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" data-theme="dark" className={`${outfit.variable} ${lexend.variable} ${bricolage.variable}`}>
      <body>{children}</body>
    </html>
  );
}
