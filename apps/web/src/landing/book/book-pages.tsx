"use client";

import type { Book, Offering, OwnBook, StoryPage } from "@arandu/contracts";
import { getFontEmbedCSS, toCanvas } from "html-to-image";
import { Fragment, useEffect, useRef, useState, type PointerEvent, type ReactNode } from "react";
import {
  BOOK_EVENT,
  getBook,
  getOwnBook,
  openHeight,
  pictured,
  pictures,
  preload,
  PRINT_EVENT,
  safeUrl,
  SHUT_EVENT,
  thumb,
  TURN,
  TURN_EVENT,
  type OpenedBook,
  type PagePrint,
} from "./book-data";
import styles from "./book-pages.module.css";

/** How many first-year subjects a university's page shows, and how much of a sample subject's topics. */
const SUBJECTS = 3;
const TOPICS = 3;
const TOPIC_CHARS = 110;
/** How much of a subject's description shows, where its grade gives one paragraph and not a list of topics. */
const ABOUT_CHARS = 170;
const DEGREE: Record<NonNullable<Offering["course"]["degree"]>, string> = {
  bacharelado: "Bacharelado",
  licenciatura: "Licenciatura",
  tecnologico: "Tecnólogo",
  bacharelado_licenciatura: "Bacharelado e licenciatura",
};
const CLOSING = "Com o Arandu, você vive um pedacinho dessa carreira antes de escolher.";
/** Which of Arandu's own books is open, if one is. */
const ownOf = (b: OpenedBook) => (b?.product ? "produto" : b?.research ? "solucao" : null);
/** Census and some grades write in capitals: shown in sentence case, the words as they are. */
const calm = (text: string) => (text === text.toUpperCase() ? text.charAt(0) + text.slice(1).toLowerCase() : text);
/** Real screens of the app (public/screens, drawn to public/img/screens), in the journey's order: the product book shows them by its first page. */
const SCREENS = [
  { src: "/img/screens/a4.webp", step: "Conhecer você", alt: "Tela do Arandu: uma pergunta do questionário sobre o seu tempo livre" },
  { src: "/img/screens/u2.webp", step: "Opções reais", alt: "Tela do Arandu: a ficha de um curso, com a nota de corte e a fonte" },
  { src: "/img/screens/b3.webp", step: "Experimentar", alt: "Tela do Arandu: um exercício de uma matéria, já respondido" },
];
const KIND: Record<Offering["institution"]["kind"], string> = { public: "Pública", private: "Privada", special: "Especial" };

// The pages of the open book, laid over the 3D book run-stage opens in the middle of the screen. It
// reads like a book: one university a page, the first facing a taste of the course, and the leaf turns
// to the next spread. Anything the API leaves null stays off the page: no stand-in image, no fallback.
/** The longest (ms) an open book waits for its first pictures before it shows anyway. */
const READY_WAIT = 1500;
/** How far (px) a finger must swipe across the book to turn a page. */
const SWIPE = 40;
/** How many device pixels a page's picture on the 3D book gets per CSS pixel of its print. */
const PRINT_SHARPNESS = 2;

export function BookPages() {
  const [opened, setOpened] = useState<OpenedBook>(null);
  const [book, setBook] = useState<Book | null>(null);
  const [own, setOwn] = useState<OwnBook | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const [spread, setSpread] = useState(0);
  const [turning, setTurning] = useState(false);
  const host = useRef<HTMLElement>(null);
  const timers = useRef<number[]>([]);
  const swipe = useRef<{ x: number; y: number } | null>(null);
  const proofs = useRef<HTMLDivElement>(null);
  /** The book open now: a slower answer for a book already shut never takes its place. */
  const openSlug = useRef<string | null>(null);

  useEffect(() => {
    const onBook = (e: Event) => {
      const next = (e as CustomEvent<OpenedBook>).detail;
      timers.current.forEach(clearTimeout);
      setOpened(next);
      setSpread(0);
      setTurning(false);
      const ownKey = ownOf(next);
      openSlug.current = next?.slug ?? ownKey;
      if (ownKey)
        getOwnBook(ownKey).then(
          (b) => openSlug.current === ownKey && setOwn(b),
          () => openSlug.current === ownKey && setFailed(ownKey),
        );
      // The book shows once its first pictures are in, every other one loading behind it; a slow
      // picture does not hold it past READY_WAIT.
      if (next?.slug)
        getBook(next.slug).then(
          (b) => {
            const urls = pictures(b);
            const wait = new Promise((done) => setTimeout(done, READY_WAIT));
            void Promise.race([preload(urls.slice(0, 2)), wait]).then(() => openSlug.current === next.slug && setBook(b));
            void preload(urls.slice(2));
          },
          () => openSlug.current === next.slug && setFailed(next.slug),
        );
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

  // The book is tapped before it opens: while it flies in, every page is drawn into a picture
  // (html-to-image) for run-stage to lay on the 3D pages, so opening, turning and shutting show print,
  // not blank paper. The pages are drawn from proofs laid out off screen, all at once.
  const shown = opened && book?.profession.slug === opened.slug ? book : null;
  const ownKey = ownOf(opened);
  const ownShown = ownKey && own?.book === ownKey ? own : null;
  const printable = !!ownShown || !!shown;
  useEffect(() => {
    const el = proofs.current;
    if (!printable || !el) return;
    let live = true;
    void (async () => {
      const fontEmbedCSS = await getFontEmbedCSS(el).catch(() => undefined);
      for (const [page, node] of [...el.querySelectorAll<HTMLElement>(`.${styles.page}`)].entries()) {
        // Each page waits for its own pictures only: the first pages are drawn while later ones load.
        await Promise.all([...node.querySelectorAll("img")].map((img) => img.decode().catch(() => {})));
        if (!live) return;
        // A page that cannot be drawn stays blank paper on the 3D book; its print still shows open.
        const image = await toCanvas(node, { pixelRatio: PRINT_SHARPNESS, fontEmbedCSS }).catch(() => null);
        if (!live) return;
        if (image) dispatchEvent(new CustomEvent<PagePrint>(PRINT_EVENT, { detail: { page, image } }));
      }
    })();
    return () => {
      live = false;
    };
  }, [printable, shown, ownShown, opened]);

  if (!opened) return null;
  const key = opened.slug ?? ownKey;
  const blank = !shown && !ownShown && (!key || failed === key);
  const pages: ReactNode[] = ownShown
    ? ownShown.pages.flatMap((page, i) => [
        ...roomy(page).map((part, j) => <OwnPage key={`${i}-${j}`} page={part} />),
        ...(ownShown.book === "produto" && i === 0 ? [<ScreensPage key="screens" />] : []),
      ])
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
  // A last page left alone gets Arandu's word, so no spread ends on bare paper; his own books' end on a plain page.
  if (shown && pages.length % 2) pages.push(<Note key="end" text={CLOSING} />);
  if (ownShown && pages.length % 2) pages.push(<Card key="end">{null}</Card>);
  const spreads = Math.ceil(pages.length / 2);
  const proofSpreads = printable ? Array.from({ length: spreads }, (_, i) => pages.slice(i * 2, i * 2 + 2)) : [];

  // The print fades, the leaf turns over it (run-stage), and the next spread's print comes up.
  const turn = (dir: 1 | -1) => {
    const ms = matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : TURN * 1000;
    setTurning(true);
    dispatchEvent(new CustomEvent(TURN_EVENT, { detail: dir }));
    timers.current = [window.setTimeout(() => setSpread((n) => n + dir), ms / 2), window.setTimeout(() => setTurning(false), ms)];
  };

  // On a touch screen the pages also turn under a swipe, sideways, as a book's leaves do.
  const onSwipeStart = (e: PointerEvent) => {
    swipe.current = e.pointerType === "mouse" ? null : { x: e.clientX, y: e.clientY };
  };
  const onSwipeEnd = (e: PointerEvent) => {
    const from = swipe.current;
    swipe.current = null;
    if (!from || turning) return;
    const dx = e.clientX - from.x;
    if (Math.abs(dx) < SWIPE || Math.abs(dx) < Math.abs(e.clientY - from.y)) return;
    const dir = dx < 0 ? 1 : -1;
    if (spread + dir >= 0 && spread + dir < spreads) turn(dir);
  };

  return (
    <section
      ref={host}
      onPointerDown={onSwipeStart}
      onPointerUp={onSwipeEnd}
      onPointerCancel={() => (swipe.current = null)}
      tabIndex={-1}
      data-pages
      data-turning={turning || undefined}
      role="dialog"
      aria-label={opened.title}
      className={styles.book}
      data-theme="dark"
    >
      <div className={styles.page}>{pages[spread * 2]}</div>
      <div className={styles.page}>{pages[spread * 2 + 1]}</div>
      {spreads > 1 && (
        // The pages turn by their folded corners, as a book's do.
        <nav className={styles.turn} aria-label="Páginas">
          <button
            type="button"
            className={`${styles.corner} ${styles.back}`}
            aria-label="Página anterior"
            disabled={spread === 0 || turning}
            onClick={() => turn(-1)}
          />
          <span className={`${styles.count} type-caption`}>
            {spread + 1}/{spreads}
          </span>
          <button
            type="button"
            className={styles.corner}
            aria-label="Próxima página"
            disabled={spread === spreads - 1 || turning}
            onClick={() => turn(1)}
          />
        </nav>
      )}
      {/* A tap outside the book or Escape shuts it; the button is there for the keyboard, shown on focus. */}
      <button type="button" className={styles.shut} aria-label="Fechar o livro" onClick={() => dispatchEvent(new Event(SHUT_EVENT))}>
        ×
      </button>
      <div ref={proofs} aria-hidden inert>
        {proofSpreads.map((spread, i) => (
          <div key={i} className={styles.book} data-proof data-theme="dark">
            {spread.map((page, j) => (
              <div key={j} className={styles.page}>
                {page}
              </div>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}

// A page of the book, laid out as a screen of the app.
function Card({ children }: { children: ReactNode }) {
  return <article className={styles.card}>{children}</article>;
}

function Note({ text }: { text: string }) {
  return (
    <Card>
      <p className={`${styles.body} ${styles.note}`}>{text}</p>
    </Card>
  );
}

function Cite({ source }: { source: { label: string; url: string | null } }) {
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
  // The same small copies the book loaded ahead (BookPages).
  const photoSrc = photo && thumb(photo);
  const logoSrc = logo && thumb(logo);
  const where = [course.campus.name, course.campus.city]
    .filter((x) => x !== null)
    .map(calm)
    .join(" · ");
  const kind = [course.degree && DEGREE[course.degree], course.durationYears && `${course.durationYears} anos`].filter(Boolean).join(" · ");
  const firstYear = curriculum?.years.find((y) => y.year === 1)?.subjects ?? [];
  return (
    <Card>
      {photo && institution.photo && (
        <span className={styles.photo}>
          {/* eslint-disable-next-line @next/next/no-img-element -- Wikimedia Commons file of any size: no optimizer route for it. */}
          <img
            src={photoSrc ?? undefined}
            alt={`Foto de ${institution.name}`}
            onError={(e) => photo && e.currentTarget.src !== photo && (e.currentTarget.src = photo)}
          />
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
          <img src={logoSrc ?? undefined} alt={`Logo de ${institution.name}`} />
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

/** A subject's description, up to ABOUT_CHARS and cut at a word. */
const trimAbout = (text: string) => (text.length > ABOUT_CHARS ? `${text.slice(0, ABOUT_CHARS).replace(/\s+\S*$/, "")}…` : text);

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
            {subject.topics.length === 1 && subject.topics[0].length > TOPIC_CHARS ? (
              <p className={`${styles.topics} ${styles.about}`}>{trimAbout(subject.topics[0])}</p>
            ) : (
              <ul className={styles.topics}>
                {trimTopics(subject.topics).map((topic, j) => (
                  <li key={j}>{topic}</li>
                ))}
              </ul>
            )}
            <Cite source={subject.source} />
          </section>
        ))}
      </div>
    </Card>
  );
}

// Facing the product book's first page: the app itself, three of its screens.
function ScreensPage() {
  return (
    <Card>
      <div className={`${styles.body} ${styles.own}`}>
        <h3 className={styles.title}>O app</h3>
        <div className={styles.screens}>
          {SCREENS.map(({ src, step, alt }) => (
            <figure key={src}>
              {/* eslint-disable-next-line @next/next/no-img-element -- drawn into the 3D page by html-to-image, which reads plain images. */}
              <img src={src} alt={alt} width={390} height={844} />
              <figcaption className={styles.cap}>{step}</figcaption>
            </figure>
          ))}
        </div>
      </div>
    </Card>
  );
}

const percent = (value: number) => `${value.toLocaleString("pt-BR")}%`;

// The research book's shares, as bars over the paragraph that states them (0 to 100), each chart named for what it measures.
// shortcut: copied from the API's prose, not served with it; move to a chart field on StoryFact once the API has one.
const CHARTS = [
  {
    title: "Deixaram o curso em 2024",
    bars: [
      { label: "Cursos presenciais", value: 24.8 },
      { label: "Cursos a distância (EAD)", value: 41.6 },
    ],
  },
  {
    title: "Quem entrou na faculdade em 2015, dez anos depois",
    bars: [
      { label: "Saiu do curso em que entrou", value: 60 },
      { label: "Se formou", value: 39 },
    ],
  },
  {
    title: "Quem entrou na faculdade em 2024",
    bars: [
      { label: "Presencial, com 27 anos ou mais", value: 25 },
      { label: "A distância, com 29 anos ou mais", value: 50 },
    ],
  },
];

// A paragraph's chart, only while the paragraph still states every one of its shares.
const chartOf = (text: string) => CHARTS.find((chart) => chart.bars.every((bar) => text.includes(percent(bar.value))));

// A section with charts gives each chart a page of its own, the plain paragraphs after it beside it, so nothing is cramped.
const roomy = (page: StoryPage) =>
  page.facts.reduce<StoryPage[]>(
    (parts, fact, i) => {
      if (i > 0 && chartOf(fact.text)) parts.push({ ...page, facts: [fact] });
      else parts[parts.length - 1].facts.push(fact);
      return parts;
    },
    // A page with no paragraphs yet still shows its title.
    [{ ...page, facts: [] }],
  );

// The text reads the same shares out, so the chart is not read twice.
function Bars({ text }: { text: string }) {
  const chart = chartOf(text);
  if (!chart) return null;
  return (
    <div className={styles.bars} aria-hidden>
      <span className={styles.chart}>{chart.title}</span>
      {chart.bars.map(({ label, value }) => (
        <Fragment key={label}>
          <span className={styles.cap}>{label}</span>
          <svg className={styles.track} width="100%" height="6">
            <rect className={styles.bar} width={`${value}%`} height="6" rx="3" />
            {/* Square on the baseline, rounded only at the data end. */}
            <rect className={styles.bar} width="3" height="6" />
          </svg>
          <span className={styles.value}>{percent(value)}</span>
        </Fragment>
      ))}
    </div>
  );
}

// A section of Arandu's own books: each item's bold heading (none for a plain paragraph) leads its text,
// which cites inline; the source under it links that citation. A long section scrolls within its page.
function OwnPage({ page }: { page: StoryPage }) {
  return (
    <Card>
      <div className={`${styles.body} ${styles.own}`}>
        <h3 className={styles.title}>{page.title}</h3>
        {page.facts.map((fact, i) => (
          <div key={i} className={styles.fact}>
            <Bars text={fact.text} />
            <p className={styles.text}>
              {fact.figure && <strong>{fact.figure}</strong>} {fact.text}
            </p>
            {fact.source && <Cite source={fact.source} />}
          </div>
        ))}
      </div>
    </Card>
  );
}
