import type { BookProgress, Home, PathSubject } from "@arandu/contracts";
import Image from "next/image";
import Link from "next/link";
import { Cat } from "@/ui/cat";
import { NextBook } from "./next-book";
import c from "./caminho.module.css";

// P1: the subject's path of stops (GET /me/books/:disciplineId), winding down the screen; the stop the person is on
// opens with "Começar com o Arandu", and Arandu sits beside it. Done stops can be played again; locked ones wait.
// shortcut: the board's parts ("Parte 1 · Membro superior"), class hours and "Pausa pra rever" stops are not in the
// API yet; the path shows the stops alone until they are.
export function PathMap({ home, book, course, next }: { home: Home; book: BookProgress; course: string | null; next: PathSubject | null }) {
  const { wallet, week } = home;
  const total = book.stops.length;
  const done = book.stops.filter((stop) => stop.state === "done").length;
  const href = (index: number) => `/app/capitulo/${book.discipline.id}/${index}` as const;

  return (
    <main className={c.map}>
      <div className={c.stats}>
        <Link className={c.stat} href="/app/estante" aria-label="Voltar para as matérias">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M15 6l-6 6 6 6" />
          </svg>
        </Link>
        <span className={c.grow} />
        <span className={c.stat} aria-label={`${week.studied} patinhas esta semana`}>
          <Image src="/img/props/paw.webp" alt="" width={26} height={26} />
          {week.studied}
        </span>
        <span className={c.stat} aria-label={`${wallet.novelos} novelos`}>
          <Image src="/img/props/yarn.webp" alt="" width={26} height={26} />
          {wallet.novelos}
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

      <ol className={c.path} aria-label="Caminho da matéria">
        {book.stops.map((stop, i) => (
          <li key={stop.index} className={c.row} data-col={i % 5} data-state={stop.state}>
            {stop.state === "current" && (
              <div className={c.pop}>
                <div>
                  <p className={c.cap} data-amber>
                    Capítulo {i + 1} de {total}
                  </p>
                  <p className={c.popTitle}>{stop.text}</p>
                </div>
                <Link className={c.go} href={href(stop.index)}>
                  Começar com o Arandu
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M9 6l6 6-6 6" />
                  </svg>
                </Link>
              </div>
            )}
            {stop.state === "locked" ? (
              <span className={c.node} aria-label={`Capítulo ${i + 1}, bloqueado`}>
                {i + 1}
              </span>
            ) : (
              <Link className={c.node} href={href(stop.index)} aria-label={`Capítulo ${i + 1}, ${stop.state === "done" ? "feito" : "atual"}`}>
                {stop.state === "done" ? (
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M5 12.5l4.5 4.5L19 7.5" />
                  </svg>
                ) : (
                  i + 1
                )}
              </Link>
            )}
            {stop.state === "current" ? (
              <Cat mood="sit" size={118} label="Arandu sentado ao lado do capítulo" className={c.sitter} />
            ) : (
              <p className={c.label}>{stop.text}</p>
            )}
          </li>
        ))}
      </ol>
      {next && <NextBook subject={next} />}
    </main>
  );
}
