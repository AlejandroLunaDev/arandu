import type { Book, BookSummary, OwnBook } from "@arandu/contracts";

// The shelf's books come from the API (GET /books, GET /books/:slug), and Arandu's own two from
// GET /books/own/:book. Without NEXT_PUBLIC_API_URL the shelf keeps its own titles and the books open blank.
const API = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");

/** The book on the problem Arandu comes to solve: on the side table, its pages from GET /books/own/solucao. */
export const RESEARCH = "Solução";
/** The book on what Arandu brings: by the research book, its pages from GET /books/own/produto. */
export const PRODUCT = "Produto";

/** What run-stage tells the page when a book is tapped and starts to open (a book) or starts to shut (null). */
export type OpenedBook = { title: string; slug: string | null; research: boolean; product: boolean } | null;
export const BOOK_EVENT = "arandu:book";
/** What the page tells run-stage once a page of the open book is drawn: its number and its picture, for the 3D pages. */
export type PagePrint = { page: number; image: HTMLCanvasElement };
export const PRINT_EVENT = "arandu:print";
/** What the page tells run-stage to shut the open book. */
export const SHUT_EVENT = "arandu:shut";
/** What the page tells run-stage to turn the open book's leaf: detail 1 forward, -1 back. */
export const TURN_EVENT = "arandu:turn";
/** What the page tells run-stage to back the camera out of the shelves, to the whole room. */
export const UNZOOM_EVENT = "arandu:unzoom";
/** Seconds a page takes to turn. */
export const TURN = 0.7;

/** How tall the open book stands on a width by height screen: half its height, never wider (1.4 times
 * its height) than 70% of its width, or 96% on a narrow one. The 3D book and its pages both use it. */
export const openHeight = (width: number, height: number) => Math.min(height * 0.78, (width * (width < 640 ? 0.96 : 0.86)) / 1.4);

/** Only https links and images reach the page: the API is a trust boundary. */
/** One of Wikimedia's standard thumbnail widths (px): the page's photo is about this wide on a sharp screen. */
const THUMB = 500;
/**
 * A Commons photo at the width the page shows it, not its original (often megabytes): Wikimedia's own
 * thumbnail. Any other address, or a drawing (SVG), stays as it is.
 */
export const thumb = (url: string) => {
  const m = /^https:\/\/upload\.wikimedia\.org\/wikipedia\/commons\/(\w\/\w\w)\/([^/]+)$/.exec(url);
  return m && !/\.svg$/i.test(m[2]) ? `https://upload.wikimedia.org/wikipedia/commons/thumb/${m[1]}/${m[2]}/${THUMB}px-${m[2]}` : url;
};

/** The universities the book shows: only those with a photo of their own (owner's rule). */
export const pictured = (book: Book) => book.offerings.filter((o) => safeUrl(o.institution.photo?.url));
/** Their photos and logos, in page order, at the size the pages show them. */
export const pictures = (book: Book) =>
  pictured(book).flatMap((o) =>
    [o.institution.photo, o.institution.logo]
      .map((f) => safeUrl(f?.url))
      .filter((u) => u !== null)
      .map(thumb),
  );

/** The pictures a book's pages show, small: loaded ahead, so no page turns onto an empty frame. */
export const preload = (urls: string[]) =>
  Promise.all(
    urls.map((url) => {
      const img = new Image();
      img.src = url;
      return img.decode().catch(() => {});
    }),
  );

export const safeUrl = (url: string | null | undefined) => (url && /^https:\/\//.test(url) ? url : null);

async function get<T>(path: string, valid: (body: unknown) => body is T): Promise<T> {
  if (!API) throw new Error("NEXT_PUBLIC_API_URL is not set");
  // Asked again every visit, so newly loaded photos and logos show; an unchanged answer is a 304.
  const response = await fetch(`${API}${path}`, { cache: "no-cache" });
  if (!response.ok) throw new Error(`${path} answered ${response.status}`);
  const body: unknown = await response.json();
  if (!valid(body)) throw new Error(`${path} answered an unexpected shape`);
  return body;
}

const isList = (body: unknown): body is BookSummary[] =>
  Array.isArray(body) && body.every((b) => typeof b?.profession?.slug === "string" && typeof b.profession.name === "string");

const isBook = (body: unknown): body is Book => {
  const b = body as Book | null;
  return typeof b?.profession?.slug === "string" && Array.isArray(b.offerings) && Array.isArray(b.sample);
};

export const listBooks = () => get("/books", isList);

const isSource = (s: unknown) => {
  const v = s as { label?: unknown; url?: unknown } | null;
  return v === null || (typeof v?.label === "string" && (v.url === null || typeof v.url === "string"));
};

const isOwnBook = (body: unknown): body is OwnBook => {
  const b = body as OwnBook | null;
  return (
    (b?.book === "produto" || b?.book === "solucao") &&
    Array.isArray(b.facts) &&
    b.facts.every((f) => typeof f?.figure === "string" && typeof f.text === "string" && isSource(f.source))
  );
};

/** Fetched once per visit; a failed fetch is tried again next time. */
function once<T>(cache: Map<string, Promise<T>>, key: string, fetchIt: () => Promise<T>) {
  let p = cache.get(key);
  if (!p) {
    p = fetchIt();
    p.catch(() => cache.delete(key));
    cache.set(key, p);
  }
  return p;
}

const books = new Map<string, Promise<Book>>();
export const getBook = (slug: string) => once(books, slug, () => get(`/books/${encodeURIComponent(slug)}`, isBook));

const own = new Map<string, Promise<OwnBook>>();
export const getOwnBook = (book: OwnBook["book"]) => once(own, book, () => get(`/books/own/${book}`, isOwnBook));
