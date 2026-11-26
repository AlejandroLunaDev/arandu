"use client";

import { useEffect, useRef, useState } from "react";
import { AranduSays, useReveal } from "@/ui/arandu-says";
import { Back } from "@/ui/back";
import { Composer } from "@/ui/composer";
import { MainButton } from "@/ui/main-button";
import { useAttempt } from "@/ui/use-attempt";
import ui from "@/ui/ui.module.css";
import styles from "./onboarding.module.css";
import { askAboutCareers } from "./actions";
import { type Place, type PlaceCourse, toChoice } from "./places";

/** A moment to read Arandu's confirmation before the next screen, once it is all written out. */
const READ_MS = 1200;

/**
 * Arandu's words, one by one, each answer anew; dimmed while he thinks of the next. With onRead, it is called once
 * the words are out and the person had a moment to read them.
 */
export function Answer({ text, busy, onRead }: { text: string; busy: boolean; onRead?: () => void }) {
  const { shown, done } = useReveal(text);
  // Once: the save onRead starts re-renders with a new onRead, which must not call it again.
  const fired = useRef(false);
  useEffect(() => {
    if (!done || !onRead) return;
    const id = setTimeout(() => {
      if (fired.current) return;
      fired.current = true;
      onRead();
    }, READ_MS);
    return () => clearTimeout(id);
  }, [done, onRead]);
  return (
    <div className={busy ? styles.thinking : undefined}>
      <AranduSays text={text} shown={shown} pose="sit" low />
    </div>
  );
}

const WAIT = "Deixa eu ver o que sei sobre essa carreira.";

// O10, one career: Arandu tells about it on his own, the person asks more in their own words, and "Escolher" goes on
// with it, or saying so does ("quero essa": Arandu confirms and the next screen comes). `course` at `place` stands for
// the career where a courseId is needed; the place itself is never shown as chosen.
export function CourseView({
  place,
  course,
  busy,
  failed,
  onChoose,
  onBack,
}: {
  place: Place;
  course: PlaceCourse;
  busy: boolean;
  failed: boolean;
  onChoose: (courseId: number) => void;
  onBack: () => void;
}) {
  const talk = useAttempt();
  const [chat, setChat] = useState<{ sessionId: string; reply: string; chosen: number | null } | null>(null);
  const career = course.profession.name;
  const chosen = chat?.chosen ?? null;
  const ask = (message: string, sessionId?: string) =>
    talk.attempt(async () => {
      const reply = await askAboutCareers([course.profession.slug], message, sessionId, [toChoice(place, course)]);
      setChat({ sessionId: reply.sessionId, reply: reply.reply, chosen: reply.chosenCourseId });
    });
  // He opens with the course itself, once (StrictMode runs effects twice).
  const opened = useRef(false);
  useEffect(() => {
    if (opened.current) return;
    opened.current = true;
    ask(`Me conta sobre a carreira de ${career}.`);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only on opening
  }, []);

  return (
    <main className={styles.screen}>
      <div className={ui.backBar}>
        <Back onBack={onBack} />
      </div>
      <div className={`${styles.body} ${styles.low}`}>
        <header className={styles.courseHead}>
          <h1>{career}</h1>
        </header>
        <Answer key={chat?.reply ?? WAIT} text={chat?.reply ?? WAIT} busy={talk.busy} onRead={chosen === null ? undefined : () => onChoose(chosen)} />
      </div>
      <Composer placeholder="Pergunte sobre a carreira" busy={talk.busy} onSend={(text) => ask(text, chat?.sessionId)}>
        <footer className={styles.foot}>
          {(failed || talk.failed) && (
            <p className={styles.error} role="alert">
              {failed ? "Não consegui seguir agora. Tenta de novo?" : "Não consegui responder agora. Pergunta de novo?"}
            </p>
          )}
          <MainButton disabled={busy} onClick={() => onChoose(course.courseId)}>
            Escolher {career}
          </MainButton>
        </footer>
      </Composer>
    </main>
  );
}
