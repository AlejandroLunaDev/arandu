import type { MetadataRoute } from "next";
import tokens from "@/design-system/tokens.json";
import { DESCRIPTION } from "@/landing/copy";

const bg = tokens.color.tokens.find((t) => t.name === "bg")!.value as { dark: string };

// Scope is the whole site, so Chrome can offer the install from the landing; the installed app opens at /app.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Arandu",
    short_name: "Arandu",
    description: DESCRIPTION,
    lang: "pt-BR",
    id: "/app",
    start_url: "/app",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: bg.dark,
    theme_color: bg.dark,
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
