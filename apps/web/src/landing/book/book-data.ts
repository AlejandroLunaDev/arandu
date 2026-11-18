import type { Book, BookSummary } from "@arandu/contracts";

// The shelf's books come from the API (GET /books, GET /books/:slug). Without NEXT_PUBLIC_API_URL
// the shelf keeps its own titles and the books open blank.
const API = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");

/** The book that tells why Arandu exists: always on the shelf, written in the web, never fetched. */
export const RESEARCH = "Por que Arandu";

/** What run-stage tells the page when a book has opened (a book) or starts to shut (null). */
export type OpenedBook = { title: string; slug: string | null; research: boolean } | null;
export const BOOK_EVENT = "arandu:book";
/** What the page tells run-stage to shut the open book. */
export const SHUT_EVENT = "arandu:shut";
/** What the page tells run-stage to turn the open book's leaf: detail 1 forward, -1 back. */
export const TURN_EVENT = "arandu:turn";
/** Seconds a page takes to turn. */
export const TURN = 0.7;

/** How tall the open book stands on a width by height screen: half its height, never wider (1.4 times
 * its height) than 70% of its width, or 96% on a narrow one. The 3D book and its pages both use it. */
export const openHeight = (width: number, height: number) => Math.min(height * 0.5, (width * (width < 640 ? 0.96 : 0.7)) / 1.4);

/** Only https links and images reach the page: the API is a trust boundary. */
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

const books = new Map<string, Promise<Book>>();
/** One book, fetched once per visit; a failed fetch is tried again next time. */
export function getBook(slug: string) {
  let book = books.get(slug);
  if (!book) {
    book = get(`/books/${encodeURIComponent(slug)}`, isBook);
    book.catch(() => books.delete(slug));
    books.set(slug, book);
  }
  return book;
}
