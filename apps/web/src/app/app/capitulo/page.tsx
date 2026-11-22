import type { BookProgress, Home } from "@arandu/contracts";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { api } from "@/app-shell/api";
import { PathStop } from "@/caminho/path-stop";
import { stopContent } from "@/onboarding/catalog";

// P2-P7, full screen: a stop of the person's path (?d=disciplineId&t=topic). Only the stop they are on, or one they
// finished, opens. The stop is in the query, not in [segments]: a dynamic segment's metadata blocks the build.
export default function CapituloPage({ searchParams }: PageProps<"/app/capitulo">) {
  return (
    <Suspense fallback={null}>
      <Stop searchParams={searchParams} />
    </Suspense>
  );
}

const index = (value: string | string[] | undefined) => (typeof value === "string" && /^\d{1,9}$/.test(value) ? Number(value) : null);

async function Stop({ searchParams }: Pick<PageProps<"/app/capitulo">, "searchParams">) {
  const query = await searchParams;
  const id = index(query.d);
  const topic = index(query.t);
  if (id === null || topic === null) redirect("/app/caminho");
  const [book, home] = await Promise.all([api<BookProgress>(`/me/books/${id}`), api<Home>("/me")]);
  const state = book.stops.find((stop) => stop.index === topic)?.state;
  if (state !== "current" && state !== "done") redirect("/app/caminho");
  return <PathStop stop={await stopContent(id, topic)} wallet={home.wallet} />;
}
