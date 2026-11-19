import { DESCRIPTION } from "@/landing/copy";
import { LandingPage } from "@/landing/landing-page";
import { PORTFOLIO_URL, SITE_URL } from "@/landing/links";

// What the site is, for search engines and AI assistants: the site, the app and the person who made it.
const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    { "@type": "WebSite", "@id": `${SITE_URL}/#website`, url: SITE_URL, name: "Arandu", inLanguage: "pt-BR", description: DESCRIPTION },
    {
      "@type": "WebApplication",
      "@id": `${SITE_URL}/#app`,
      name: "Arandu",
      url: SITE_URL,
      description: DESCRIPTION,
      applicationCategory: "EducationalApplication",
      operatingSystem: "Web",
      inLanguage: "pt-BR",
      audience: { "@type": "Audience", audienceType: "Pessoas escolhendo um curso superior no Brasil, de qualquer idade" },
      author: { "@id": `${SITE_URL}/#founder` },
    },
    {
      "@type": "Person",
      "@id": `${SITE_URL}/#founder`,
      name: "Alejandro Luna",
      url: PORTFOLIO_URL,
      sameAs: ["https://github.com/AlejandroLunaDev"],
    },
  ],
};

export default function Page() {
  return (
    <>
      {/* "<" escaped so no string in the data can close the script tag. */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <LandingPage />
    </>
  );
}
