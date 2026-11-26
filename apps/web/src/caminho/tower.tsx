"use client";

import type { BookProgress, Wallet } from "@arandu/contracts";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import styles from "@/onboarding/onboarding.module.css";
import { Loading } from "@/ui/loading";
import { MainButton } from "@/ui/main-button";
import { useAttempt } from "@/ui/use-attempt";
import { type LessonRefusal, startLesson } from "./actions";
import { enterLesson } from "./lesson-entry";
import { type SpotState, chapterKey, lessonKey, specialKey, towerPlan } from "./tower-plan";
import type { TowerBook } from "./tower-scene";
import c from "./caminho.module.css";

type Run = Awaited<ReturnType<typeof import("./tower-scene").runTower>>;

const STATE = { done: "done", current: "open", locked: "locked" } as const;
const LESSON: Record<SpotState, string> = { done: "feita", open: "aberta", locked: "fechada" };
const CHAPTER: Record<SpotState, string> = { done: "feito", open: "atual", locked: "fechado" };
const REFUSED: Record<LessonRefusal, string> = {
  not_enough_peixinhos: "Faltam peixinhos para esta lição. Nada foi gasto.",
  lesson_locked: "Esta lição ainda está fechada.",
};

/**
 * P1: the book's path as a 3D cat tower (tower-scene.ts). Each chapter is a house and each lesson a spot, with a sign
 * that opens it; the page's scroll goes down the tower and round it. The same path is a list of buttons, one group per
 * bay, for the keyboard and screen readers, and what is seen if the 3D cannot start. What the person picks shows in a
 * card at the bottom, and an open lesson is entered from there, for its peixinhos.
 */
export function Tower({ book, wallet }: { book: BookProgress; wallet: Wallet }) {
  const router = useRouter();
  const { busy, failed, attempt } = useAttempt();
  const box = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLOListElement>(null);
  const pop = useRef<HTMLElement>(null);
  const run = useRef<Run | null>(null);
  /** The pick came from the list: the card takes the focus, so it is read out and its button is next. */
  const fromList = useRef(false);

  const total = book.chapters.length;
  const chapters = book.chapters.map((chapter) => ({
    state: STATE[chapter.state],
    lessons: [1, 2, 3].map((n): SpotState => chapter.lessons.find((lesson) => lesson.index === n)?.state ?? "locked"),
  }));
  // Arandu sits on the next lesson of the chapter the person is on.
  const current = chapters.findIndex((chapter) => chapter.state === "open");
  const next = chapters[current]?.lessons.indexOf("open") ?? -1;
  const at = next < 0 ? null : lessonKey(current, next + 1);

  const [picked, setPicked] = useState(at);
  const [plain, setPlain] = useState(false);
  const [live, setLive] = useState(false);
  const [refused, setRefused] = useState<LessonRefusal | null>(null);
  const input = JSON.stringify({ seed: book.discipline.id, chapters, at } satisfies TowerBook);
  useEffect(() => {
    const [b, s, t] = [box.current, stage.current, track.current];
    if (!b || !s || !t) return;
    let cancelled = false;
    import("./tower-scene")
      .then(({ runTower }) =>
        runTower({ box: b, stage: s, track: t }, JSON.parse(input) as TowerBook, (key) => {
          setRefused(null);
          setPicked(key);
        }),
      )
      .then((r) => {
        if (cancelled) return r.stop();
        run.current = r;
        setLive(true);
      })
      .catch((error: unknown) => {
        console.error("The 3D tower could not load", error);
        if (!cancelled) setPlain(true);
      });
    return () => {
      cancelled = true;
      run.current?.stop();
      run.current = null;
    };
  }, [input]);

  useEffect(() => {
    run.current?.select(picked);
    if (fromList.current) pop.current?.focus();
    fromList.current = false;
  }, [picked]);

  const spot = (key: string, label: string) => (
    <button
      key={key}
      type="button"
      className={plain ? c.plain : "sr-only"}
      aria-pressed={picked === key}
      onFocus={(e) => e.currentTarget.closest("li")?.scrollIntoView({ block: "start" })}
      onClick={() => {
        fromList.current = true;
        setRefused(null);
        setPicked(key);
      }}
    >
      {label}
    </button>
  );

  // What the card says about the pick: a chapter (c3), one of its lessons (c3l2) or a special lesson (s4).
  const [, kind, index, lesson] = /^([cs])(\d+)(?:l(\d))?$/.exec(picked ?? "") ?? [];
  const i = Number(index);
  const chapter = book.chapters[i];
  const state = chapters[i];
  const n = Number(lesson);
  const lessonState = lesson ? state?.lessons[n - 1] : undefined;
  const closed = state?.state === "locked" ? `Abre quando você terminar o capítulo ${i}.` : "Abre depois das lições 1 e 2.";
  // The day's gift comes with the first lesson entered, so it counts toward the price.
  const short = wallet.peixinhos + wallet.dailyGift < wallet.lessonPrice;

  const start = () =>
    attempt(async () => {
      if (!chapter) return;
      setRefused(null);
      const entered = await startLesson(book.discipline.id, chapter.index, n);
      if ("refused" in entered) {
        setRefused(entered.refused);
        router.refresh();
        return;
      }
      enterLesson({ disciplineId: book.discipline.id, discipline: book.discipline.name, topic: chapter.index, number: i + 1, text: chapter.text, total, lesson: entered });
      router.push("/app/capitulo");
    });

  return (
    <div ref={box} className={c.tower} data-plain={plain || undefined}>
      <div ref={stage} className={c.stage}>
        {!live && !plain && (
          <div className={c.wait}>
            <Loading />
          </div>
        )}
      </div>
      <ol ref={track} className={c.bays} aria-label="Caminho da matéria">
        {towerPlan(total).map(({ hung, floor }, b) => (
          <li key={b} className={c.bay}>
            {typeof hung === "object" &&
              [1, 2, 3].map((l) => spot(lessonKey(hung.lessons, l), `Capítulo ${hung.lessons + 1}, lição ${l}, ${LESSON[chapters[hung.lessons]?.lessons[l - 1] ?? "locked"]}`))}
            {hung === "special" && typeof floor === "object" && spot(specialKey(floor.house), "Lição especial, em breve")}
            {typeof floor === "object" &&
              spot(chapterKey(floor.house), `Capítulo ${floor.house + 1}: ${book.chapters[floor.house]?.text ?? ""}, ${CHAPTER[chapters[floor.house]?.state ?? "locked"]}`)}
          </li>
        ))}
      </ol>
      {kind && (
        <section ref={pop} tabIndex={-1} className={c.pop} aria-live="polite" aria-label="Sua escolha no caminho">
          {kind === "s" ? (
            <>
              <p className={c.cap} data-amber>
                Lição especial
              </p>
              <p className={c.popTitle}>Uma lição diferente, que vale mais.</p>
              <p className={c.note}>Em breve.</p>
            </>
          ) : (
            chapter &&
            state && (
              <>
                <p className={c.cap} data-amber>
                  Capítulo {i + 1} de {total}
                  {lesson && ` · lição ${n} de 3`}
                </p>
                <p className={c.popTitle}>{chapter.text}</p>
                {!lesson && (
                  <p className={c.note}>
                    {state.state === "done" ? "Capítulo feito." : state.state === "locked" ? closed : `${state.lessons.filter((s) => s === "done").length} de 3 lições feitas.`}
                  </p>
                )}
                {lessonState === "locked" && <p className={c.note}>{closed}</p>}
                {lessonState === "done" && <p className={c.note}>Lição feita. Refazer não dá os prêmios de novo.</p>}
                {lessonState && lessonState !== "locked" && (
                  <>
                    {short && (
                      <p className={c.note}>
                        Você tem {wallet.peixinhos} peixinhos e a lição pede {wallet.lessonPrice}. Amanhã o Arandu traz mais.
                      </p>
                    )}
                    {(refused || failed) && (
                      <p className={styles.error} role="alert">
                        {refused ? REFUSED[refused] : "Não consegui abrir a lição agora. Tenta de novo?"}
                      </p>
                    )}
                    <MainButton disabled={busy || short} onClick={start}>
                      {busy ? "Abrindo…" : lessonState === "done" ? "Fazer de novo" : "Começar"} · {wallet.lessonPrice}
                      <Image className={c.fish} src="/img/props/fish.webp" alt="peixinhos" width={22} height={22} />
                    </MainButton>
                  </>
                )}
              </>
            )
          )}
        </section>
      )}
    </div>
  );
}
