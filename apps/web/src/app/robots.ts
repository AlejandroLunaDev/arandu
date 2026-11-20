import type { MetadataRoute } from "next";
import { SITE_URL } from "@/landing/links";

// Every crawler, search engines and AI assistants alike, may read the site; the app's screen mockups
// (public/screens, framed in the landing) are not pages of their own.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: "/screens/" },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
