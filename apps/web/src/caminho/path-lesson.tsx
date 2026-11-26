"use client";

import type { CaixaContents, Home, LessonResult, Wallet } from "@arandu/contracts";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import styles from "@/onboarding/onboarding.module.css";
import p from "@/onboarding/path.module.css";
import { ChapterView } from "@/onboarding/chapter-view";
import { Cat } from "@/ui/cat";
import { Patinha, patinhaWord } from "@/ui/patinha";
import { Loading } from "@/ui/loading";
import { MainButton } from "@/ui/main-button";
import { useAttempt } from "@/ui/use-attempt";
import { continueLesson, finishLesson, openCaixa } from "./actions";
import { type LessonEntry, enteredLesson, keepLesson, leaveLesson, readEntry } from "./lesson-entry";
import c from "./caminho.module.css";

const DAYS = ["S", "T", "Q", "Q", "S", "S", "D"];
const never = () => () => {};

// P2-P7: the lesson the person entered from the path (lesson-entry.ts). Its cards and exercises are the onboarding's
// (ChapterView), with the lives the API gave it; at the end P7 shows what it gave and opens its caixa. The tab keeps the
// lives left and the result, so a reload gives back neither the lives nor a lesson to finish again.
export function PathLesson({ wallet }: { wallet: Wallet }) {
  const router = useRouter();
  const { busy, failed, attempt } = useAttempt();
  const [done, setDone] = useState<Finished | null>(null);
  // null on the server and while hydrating; "" when the tab holds no lesson.
  const raw = useSyncExternalStore(never, enteredLesson, () => null);
  const entry = useMemo(() => (raw ? readEntry(raw) : null), [raw]);
  // Nothing was entered (a typed address, a new tab): the path is where a lesson starts.
  useEffect(() => {
    if (raw !== null && !entry) router.replace("/app/caminho");
  }, [raw, entry, router]);
  if (!entry) return <Loading />;

  const { disciplineId, topic, lesson } = entry;
  const finished = done ?? entry.finished;
  const back = () => {
    leaveLesson();
    router.push("/app/caminho");
  };
  if (finished) return <LessonDone entry={entry} finished={finished} onNext={back} />;
  return (
    <ChapterView
      chapter={{ discipline: { id: disciplineId, name: entry.discipline }, topic: { index: topic, text: entry.text, total: entry.total }, cards: lesson.cards, exercises: lesson.exercises }}
      caption={`Arandu explica · capítulo ${entry.number} · lição ${lesson.index} de ${lesson.total}`}
      busy={busy}
      failed={failed}
      lives={{
        count: lesson.lives,
        left: entry.left,
        onLeft: (left) => keepLesson({ left }),
        wallet,
        goOn: () => continueLesson(disciplineId, topic, lesson.index),
      }}
      onClose={back}
      onDone={(_, missed) =>
        attempt(async () => {
          const saved = await finishLesson(
            disciplineId,
            topic,
            lesson.index,
            missed.flatMap((i) => {
              const exercise = lesson.exercises[i];
              return exercise ? [{ topic: exercise.topic, index: exercise.index }] : [];
            }),
          );
          const now = { ...saved, caixa: null };
          keepLesson({ finished: now });
          setDone(now);
        })
      }
    />
  );
}

type Finished = { result: LessonResult; home: Home; caixa: CaixaContents | null };

// P7: the lesson is done, with what it gave, its caixa to open and the week's ratinhos. The way on shows once the caixa
// is open: an unopened caixa is never left behind (finishing the lesson again gives none).
function LessonDone({ entry, finished, onNext }: { entry: LessonEntry; finished: Finished; onNext: () => void }) {
  const { result, home } = finished;
  const { busy, failed, attempt } = useAttempt();
  const [caixa, setCaixa] = useState(finished.caixa);
  // An achievement or an opened caixa surprises him first; then he jumps for joy.
  const [mood, setMood] = useState<"surprised" | "hop">(result.achievements.length > 0 ? "surprised" : "hop");
  useEffect(() => {
    if (mood !== "surprised") return;
    const id = setTimeout(() => setMood("hop"), 1400);
    return () => clearTimeout(id);
  }, [mood]);
  const sabedoria = result.sabedoria + (caixa?.sabedoria ?? 0);
  const caixaId = caixa ? null : result.caixaId;

  return (
    <main className={styles.screen}>
      <div className={styles.body}>
        <section className={p.done}>
          <Cat mood={mood} size={190} label="Arandu pulando de alegria" className={p.doneCat} />
          <p className={p.label}>
            Capítulo {entry.number} de {entry.total} · lição {entry.lesson.index} de {entry.lesson.total}
          </p>
          <h1>{result.chapterDone ? "Capítulo concluído!" : "Lição concluída!"}</h1>
          <p className={p.meta}>{entry.text}</p>
          {result.caixaId === null && sabedoria === 0 ? (
            <p className={p.meta}>Você já tinha ganhado os prêmios desta lição.</p>
          ) : (
            <div className={p.stats}>
              {sabedoria > 0 && (
                <div>
                  <Image src="/img/props/books.webp" alt="" width={40} height={40} />
                  <strong>+{sabedoria}</strong>
                  <small>de sabedoria</small>
                </div>
              )}
              {caixa && caixa.peixinhos > 0 && (
                <div>
                  <Image src="/img/props/fish.webp" alt="" width={40} height={40} />
                  <strong>+{caixa.peixinhos}</strong>
                  <small>peixinhos</small>
                </div>
              )}
              {caixa && caixa.currency > 0 && (
                <div>
                  <Patinha className={c.prize} />
                  <strong>+{caixa.currency}</strong>
                  <small>{patinhaWord(caixa.currency)}</small>
                </div>
              )}
            </div>
          )}
          {caixa && (caixa.marcador || caixa.roomItem) && (
            <p className={p.meta}>{[caixa.marcador && "Um marcador de página", caixa.roomItem && `Para o seu quarto: ${caixa.roomItem}`].filter(Boolean).join(" · ")}</p>
          )}
          {caixaId !== null && (
            <button
              type="button"
              className={c.caixa}
              disabled={busy}
              onClick={() =>
                attempt(async () => {
                  const opened = await openCaixa(caixaId);
                  keepLesson({ finished: { ...finished, caixa: opened } });
                  setCaixa(opened);
                  setMood("surprised");
                })
              }
            >
              <svg viewBox="0 0 96 76" aria-hidden="true">
                <path className={c.caixaSide} d="M12 30h72v38a4 4 0 0 1-4 4H16a4 4 0 0 1-4-4z" />
                <path className={c.caixaLid} d="M6 16h84l-6 14H12z" />
                <path className={c.caixaTape} d="M43 16h10v26H43z" />
              </svg>
              {busy ? "Abrindo…" : "Abrir a caixa"}
            </button>
          )}
          {failed && (
            <p className={styles.error} role="alert">
              Não consegui abrir a caixa agora. Tenta de novo?
            </p>
          )}
        </section>
        <div className={p.week} aria-label={`Sua semana: ${home.week.studied} ${home.week.studied === 1 ? "dia" : "dias"} de estudo`}>
          {home.week.days.map((day, i) => (
            <span key={day.date} className={p.day} data-on={day.studied || undefined} aria-hidden="true">
              <Image src="/img/props/mouse.webp" alt="" width={34} height={22} />
              {DAYS[i]}
            </span>
          ))}
        </div>
      </div>
      {caixaId === null && (
        <footer className={`${styles.foot} ${styles.last}`}>
          <MainButton onClick={onNext}>Continuar o caminho</MainButton>
        </footer>
      )}
    </main>
  );
}
