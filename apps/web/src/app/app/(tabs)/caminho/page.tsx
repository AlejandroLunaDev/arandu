import type { BookProgress, Home, Journey } from "@arandu/contracts";
import Link from "next/link";
import { Suspense } from "react";
import { api } from "@/app-shell/api";
import c from "@/caminho/caminho.module.css";
import { PathMap } from "@/caminho/path-map";
import { careerPaths } from "@/onboarding/catalog";

// Caminho (P1): the path of the book the person is on.
export default function CaminhoPage() {
  return (
    <Suspense fallback={null}>
      <Path />
    </Suspense>
  );
}

async function Path() {
  const home = await api<Home>("/me");
  if (!home.current)
    return (
      <main className={c.empty}>
        <h1>Seu caminho começa com uma matéria</h1>
        <Link href="/app/estante">Escolher na estante</Link>
      </main>
    );
  const [book, journey] = await Promise.all([api<BookProgress>(`/me/books/${home.current.disciplineId}`), api<Journey>("/me/journey")]);
  // The career the person chose (O10-O11), through the course that stands for it: it names the path, and holds the
  // semester's next book.
  const course = journey.professionSlug ? (await careerPaths(journey.professionSlug)).paths.find((path) => path.courseId === journey.courseId) : undefined;
  const at = course?.subjects.findIndex((subject) => subject.disciplineId === book.discipline.id) ?? -1;
  const next = home.current.nextTopic === null && at >= 0 ? (course?.subjects[at + 1] ?? null) : null;
  return <PathMap home={home} book={book} course={course ? `${course.course} · 1º semestre` : null} next={next} />;
}
