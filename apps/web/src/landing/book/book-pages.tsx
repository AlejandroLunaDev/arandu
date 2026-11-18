"use client";

import type { Book, Offering, Source } from "@arandu/contracts";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { BOOK_EVENT, getBook, openHeight, safeUrl, SHUT_EVENT, TURN, TURN_EVENT, type OpenedBook } from "./book-data";
import { ANSWER, FACTS, type Fact } from "./research";
import styles from "./book-pages.module.css";

/** How many first-year subjects a university's page shows, and how much of a sample subject's topics. */
const SUBJECTS = 3;
const TOPICS = 3;
const TOPIC_CHARS = 110;
const DEGREE: Record<NonNullable<Offering["course"]["degree"]>, string> = {
  bacharelado: "Bacharelado",
  licenciatura: "Licenciatura",
  tecnologico: "Tecnólogo",
  bacharelado_licenciatura: "Bacharelado e licenciatura",
};
const CLOSING = "Com o Arandu, você vive um pedacinho dessa carreira antes de escolher.";
/** The universities the book shows: only those with a photo of their own (owner's rule). */
const pictured = (book: Book) => book.offerings.filter((o) => safeUrl(o.institution.photo?.url));
/** Census and some grades write in capitals: shown in sentence case, the words as they are. */
const calm = (text: string) => (text === text.toUpperCase() ? text.charAt(0) + text.slice(1).toLowerCase() : text);
const KIND: Record<Offering["institution"]["kind"], string> = { public: "Pública", private: "Privada", special: "Especial" };

// The pages of the open book, laid over the 3D book run-stage opens in the middle of the screen. It
// reads like a book: one university a page, the first facing a taste of the course, and the leaf turns
// to the next spread. Anything the API leaves null stays off the page: no stand-in image, no fallback.
export function BookPages() {
  const [opened, setOpened] = useState<OpenedBook>(null);
  const [book, setBook] = useState<Book | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const [spread, setSpread] = useState(0);
  const [turning, setTurning] = useState(false);
  const host = useRef<HTMLElement>(null);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    const onBook = (e: Event) => {
      const next = (e as CustomEvent<OpenedBook>).detail;
      timers.current.forEach(clearTimeout);
      setOpened(next);
      setSpread(0);
      setTurning(false);
      if (next?.slug) getBook(next.slug).then(setBook, () => setFailed(next.slug));
    };
    addEventListener(BOOK_EVENT, onBook);
    return () => removeEventListener(BOOK_EVENT, onBook);
  }, []);

  // The pages are laid out at one size (book-pages.module.css) and scaled to the 3D book's, as the
  // hero's phone scales its screen: the print shrinks with the book and never reflows.
  useEffect(() => {
    const el = host.current;
    if (!opened || !el) return;
    const fit = () => el.style.setProperty("--k", String(openHeight(innerWidth, innerHeight) / el.offsetHeight));
    fit();
    el.focus();
    addEventListener("resize", fit);
    return () => removeEventListener("resize", fit);
  }, [opened]);

  if (!opened) return null;
  const shown = book?.profession.slug === opened.slug ? book : null;
  const blank = !opened.research && !shown && (!opened.slug || failed === opened.slug);
  const pages: ReactNode[] = opened.research
    ? [...FACTS.map((fact, i) => <FactPage key={i} fact={fact} first={i === 0} />), <AnswerPage key="answer" />]
    : shown
      ? [
          ...pictured(shown)
            .slice(0, 1)
            .map((o) => <OfferingPage key="u0" offering={o} profession={shown.profession.name} />),
          <SamplePage key="sample" book={shown} />,
          ...pictured(shown)
            .slice(1)
            .map((o, i) => <OfferingPage key={`u${i + 1}`} offering={o} profession={shown.profession.name} />),
        ]
      : [<Note key="wait" text={blank ? "Este livro não abriu agora. Tente de novo daqui a pouco." : "Abrindo o livro…"} />];
  // A last page left alone gets Arandu's word, so no spread ends on bare paper.
  if (shown && pages.length % 2) pages.push(<Note key="end" text={CLOSING} />);
  const spreads = Math.ceil(pages.length / 2);

  // The print fades, the leaf turns over it (run-stage), and the next spread's print comes up.
  const turn = (dir: 1 | -1) => {
    const ms = matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : TURN * 1000;
    setTurning(true);
    dispatchEvent(new CustomEvent(TURN_EVENT, { detail: dir }));
    timers.current = [window.setTimeout(() => setSpread((n) => n + dir), ms / 2), window.setTimeout(() => setTurning(false), ms)];
  };

  return (
    <section ref={host} tabIndex={-1} data-pages data-turning={turning || undefined} role="dialog" aria-label={opened.title} className={styles.book} data-theme="dark">
      <div className={styles.page}>{pages[spread * 2]}</div>
      <div className={styles.page}>{pages[spread * 2 + 1]}</div>
      {spreads > 1 && (
        <nav className={styles.turn} aria-label="Páginas">
          <button type="button" aria-label="Página anterior" disabled={spread === 0 || turning} onClick={() => turn(-1)}>
            ‹
          </button>
          <span className={styles.on}>
            <span className="type-caption">
              {spread + 1}/{spreads}
            </span>
            <button type="button" aria-label="Próxima página" disabled={spread === spreads - 1 || turning} onClick={() => turn(1)}>
              ›
            </button>
          </span>
        </nav>
      )}
      <button type="button" className={styles.shut} aria-label="Fechar o livro" onClick={() => dispatchEvent(new Event(SHUT_EVENT))}>
        ×
      </button>
    </section>
  );
}

// A page of the book, laid out as a screen of the app.
function Card({ children }: { children: ReactNode }) {
  return (
    <article className={styles.card}>
      {children}
    </article>
  );
}

function Note({ text }: { text: string }) {
  return (
    <Card>
      <p className={`${styles.body} ${styles.note}`}>{text}</p>
    </Card>
  );
}

function Cite({ source }: { source: Pick<Source, "label" | "url"> }) {
  const url = safeUrl(source.url);
  return (
    <p className={styles.src}>
      Fonte:{" "}
      {url ? (
        <a href={url} target="_blank" rel="noreferrer">
          {source.label}
        </a>
      ) : (
        source.label
      )}
    </p>
  );
}

function OfferingPage({ offering: { institution, course, curriculum }, profession }: { offering: Offering; profession: string }) {
  const photo = safeUrl(institution.photo?.url);
  const logo = safeUrl(institution.logo?.url);
  const where = [course.campus.name, course.campus.city].filter((x) => x !== null).map(calm).join(" · ");
  const kind = [course.degree && DEGREE[course.degree], course.durationYears && `${course.durationYears} anos`].filter(Boolean).join(" · ");
  const firstYear = curriculum?.years.find((y) => y.year === 1)?.subjects ?? [];
  return (
    <Card>
      {photo && institution.photo && (
        <span className={styles.photo}>
          {/* eslint-disable-next-line @next/next/no-img-element -- Wikimedia Commons file of any size: no optimizer route for it. */}
          <img src={photo} alt={`Foto de ${institution.name}`} />
          <a className={styles.credit} href={safeUrl(institution.photo.sourceUrl) ?? undefined} target="_blank" rel="noreferrer">
            Foto: {institution.photo.credit} · {institution.photo.license}
          </a>
        </span>
      )}
      {logo && institution.logo && (
        <a
          className={styles.logo}
          data-on-photo={photo ? "" : undefined}
          href={safeUrl(institution.logo.sourceUrl) ?? undefined}
          target="_blank"
          rel="noreferrer"
          title={`Logo: ${institution.logo.license}`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- as above */}
          <img src={logo} alt={`Logo de ${institution.name}`} />
        </a>
      )}
      <div className={styles.body}>
        <header className={styles.head}>
          <p className={styles.label}>
            {institution.shortName ?? institution.name} · {KIND[institution.kind]}
          </p>
          <h3 className={styles.title}>{profession}</h3>
          {kind && <p className={styles.cap}>{kind}</p>}
          {where && <p className={`${styles.cap} ${styles.roomy}`}>{where}</p>}
        </header>
        {firstYear.length > 0 && (
          <section className={styles.head}>
            <h4 className={styles.label}>O que se estuda no 1º ano</h4>
            <ul className={styles.chips}>
              {firstYear.slice(0, SUBJECTS).map((s, i) => (
                <li key={i} title={calm(s)}>
                  {calm(s)}
                </li>
              ))}
            </ul>
            {firstYear.length > SUBJECTS && <p className={styles.cap}>e mais {firstYear.length - SUBJECTS} matérias</p>}
          </section>
        )}
        <Cite source={curriculum?.source ?? course.source} />
      </div>
    </Card>
  );
}

/** A subject's first topics: at most TOPICS, and no more than TOPIC_CHARS between them; a first topic that runs past it is cut. */
function trimTopics(topics: string[]) {
  const shown: string[] = [];
  let length = 0;
  for (const topic of topics.slice(0, TOPICS)) {
    if (length + topic.length > TOPIC_CHARS) {
      if (shown.length === 0) shown.push(`${topic.slice(0, TOPIC_CHARS).trimEnd()}…`);
      break;
    }
    shown.push(topic);
    length += topic.length;
  }
  return shown;
}

function SamplePage({ book }: { book: Book }) {
  return (
    <Card>
      <div className={styles.body}>
        <header className={styles.head}>
          <p className={styles.label}>Um gostinho do curso</p>
          <h3 className={styles.title}>{book.profession.name} no 1º semestre</h3>
        </header>
        {book.sample.map((subject, i) => (
          <section key={i} className={styles.subject}>
            <h4 className={styles.name}>{subject.name}</h4>
            <p className={`${styles.cap} ${styles.roomy}`}>{subject.institution}</p>
            <ul className={styles.topics}>
              {trimTopics(subject.topics).map((topic, j) => (
                <li key={j}>{topic}</li>
              ))}
            </ul>
            <Cite source={subject.source} />
          </section>
        ))}
      </div>
    </Card>
  );
}

function FactPage({ fact, first }: { fact: Fact; first: boolean }) {
  return (
    <Card>
      <div className={styles.body}>
        {first && <p className={styles.label}>Por que o Arandu existe</p>}
        <p className={styles.figure}>{fact.figure}</p>
        <p className={styles.text}>{fact.text}</p>
        <Cite source={fact.source} />
      </div>
    </Card>
  );
}

function AnswerPage() {
  return (
    <Card>
      <div className={styles.body}>
        <h3 className={styles.title}>{ANSWER.title}</h3>
        {ANSWER.lines.map((line, i) => (
          <p key={i} className={styles.text}>
            {line}
          </p>
        ))}
      </div>
    </Card>
  );
}
