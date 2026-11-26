import type { BookProgress, Home, Journey } from "@arandu/contracts";
import Link from "next/link";
import { mine } from "@/app-shell/api";
import c from "@/caminho/caminho.module.css";
import { PathMap } from "@/caminho/path-map";
import { careerPaths } from "@/onboarding/catalog";

// Caminho (P1): the path of the book the person is on. No loading boundary of its own: on the way here the Quarto stays
// on screen while Arandu walks off and this loads (app-shell/walk-off.ts); a first visit waits in the tabs' boundary.
export default async function CaminhoPage() {
  const home = await mine<Home>("/me");
  if (!home.current)
    return (
      <main className={c.empty}>
        <h1>Seu caminho começa com uma matéria</h1>
        <Link href="/app">Escolher no quarto</Link>
      </main>
    );
  const [book, journey] = await Promise.all([mine<BookProgress>(`/me/books/${home.current.disciplineId}`), mine<Journey>("/me/journey")]);
  // The career the person chose (O10-O11), through the course that stands for it: it names the path, and holds the
  // semester's next book.
  const course = journey.professionSlug ? (await careerPaths(journey.professionSlug)).paths.find((path) => path.courseId === journey.courseId) : undefined;
  const at = course?.subjects.findIndex((subject) => subject.disciplineId === book.discipline.id) ?? -1;
  const next = home.current.nextTopic === null && at >= 0 ? (course?.subjects[at + 1] ?? null) : null;
  return <PathMap home={home} book={book} course={course ? `${course.course} · 1º semestre` : null} next={next} />;
}
