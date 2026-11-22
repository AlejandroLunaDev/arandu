import type { BookProgress, Home } from "@arandu/contracts";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { api } from "@/app-shell/api";
import { PathStop } from "@/caminho/path-stop";
import { stopContent } from "@/onboarding/catalog";

// P2-P7, full screen: a stop of the person's path. Only the stop they are on, or one they finished, opens.
export default function CapituloPage({ params }: PageProps<"/app/capitulo/[disciplineId]/[topic]">) {
  return (
    <Suspense fallback={null}>
      <Stop params={params} />
    </Suspense>
  );
}

async function Stop({ params }: Pick<PageProps<"/app/capitulo/[disciplineId]/[topic]">, "params">) {
  const { disciplineId, topic } = await params;
  const id = Number(disciplineId);
  const index = Number(topic);
  if (!Number.isSafeInteger(id) || id < 0 || !Number.isSafeInteger(index) || index < 0) redirect("/app/caminho");
  const [book, home] = await Promise.all([api<BookProgress>(`/me/books/${id}`), api<Home>("/me")]);
  const state = book.stops.find((stop) => stop.index === index)?.state;
  if (state !== "current" && state !== "done") redirect("/app/caminho");
  return <PathStop stop={await stopContent(id, index)} wallet={home.wallet} />;
}
