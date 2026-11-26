import type { BookProgress, Home, PathSubject } from "@arandu/contracts";
import Image from "next/image";
import Link from "next/link";
import { Patinha, patinhas } from "@/ui/patinha";
import { NextBook } from "./next-book";
import { Tower } from "./tower";
import c from "./caminho.module.css";

// P1: the subject's path (GET /me/books/:disciplineId) as a cat tower the person goes down: a house per chapter, a spot
// per lesson, and Arandu on the next one. The wallet rides along at the top.
// shortcut: the board's parts ("Parte 1 · Membro superior"), class hours and "Pausa pra rever" chapters are not in the
// API yet; the path shows the chapters and their lessons alone until they are.
export function PathMap({ home, book, course, next }: { home: Home; book: BookProgress; course: string | null; next: PathSubject | null }) {
  const { wallet, week } = home;
  const total = book.chapters.length;
  const done = book.chapters.filter((chapter) => chapter.state === "done").length;

  return (
    <main className={c.map}>
      <div className={c.stats}>
        <Link className={c.stat} href="/app/estante" aria-label="Voltar para as matérias">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M15 6l-6 6 6 6" />
          </svg>
        </Link>
        <span className={c.grow} />
        <span className={c.stat} aria-label={`${week.studied} ${week.studied === 1 ? "ratinho" : "ratinhos"} esta semana`}>
          <Image src="/img/props/mouse.webp" alt="" width={26} height={17} />
          {week.studied}
        </span>
        <span className={c.stat} aria-label={patinhas(wallet.currency)}>
          <Patinha />
          {wallet.currency}
        </span>
        <span className={c.stat} aria-label={`${wallet.peixinhos} peixinhos`}>
          <Image src="/img/props/fish.webp" alt="" width={26} height={26} />
          {wallet.peixinhos}
        </span>
      </div>

      <header className={c.head}>
        <p className={c.cap}>{course ?? "Caminho da matéria"}</p>
        <h1>{book.discipline.name}</h1>
        <p className={c.sub}>
          {total} {total === 1 ? "capítulo" : "capítulos"}
          {done > 0 && ` · ${done} ${done === 1 ? "feito" : "feitos"}`}
        </p>
      </header>

      <Tower book={book} wallet={wallet} />
      {next && <NextBook subject={next} />}
    </main>
  );
}
