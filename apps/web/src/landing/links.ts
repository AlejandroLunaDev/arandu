/** The site's own address: every canonical, sitemap and structured-data URL is built on it. */
export const SITE_URL = "https://aranduvocacional.com";
export const GITHUB_URL = "https://github.com/AlejandroLunaDev/arandu";
/** The presentation video, played on the hero room's TV: set at deploy as a YouTube link; without it the TV has no play button. */
export const VIDEO_URL = youtubeEmbed(process.env.NEXT_PUBLIC_VIDEO_URL);

/** A YouTube link (watch, youtu.be, shorts or embed; ?t= kept as the start) as its privacy-enhanced autoplay embed. */
export function youtubeEmbed(link: string | undefined): string | undefined {
  let url: URL;
  try {
    url = new URL(link ?? "");
  } catch {
    return undefined;
  }
  const host = url.hostname.replace(/^(www|m)\./, "");
  const path = url.pathname.split("/").filter(Boolean);
  const id =
    host === "youtu.be"
      ? path[0]
      : ["youtube.com", "youtube-nocookie.com"].includes(host)
        ? path[0] === "watch"
          ? url.searchParams.get("v")
          : ["shorts", "embed", "live"].includes(path[0] ?? "")
            ? path[1]
            : undefined
        : undefined;
  if (!id || !/^[\w-]{11}$/.test(id)) return undefined;
  const start = parseInt(url.searchParams.get("t") ?? url.searchParams.get("start") ?? "", 10);
  return `https://www.youtube-nocookie.com/embed/${id}?${start > 0 ? `start=${start}&` : ""}autoplay=1&rel=0`;
}
/** Alejandro's portfolio: it opens, live, on the notebook's screen in the hero's room. */
export const PORTFOLIO_URL = "https://alejandrolunadev.site/es";
