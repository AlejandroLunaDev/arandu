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
import { type Place, type PlaceCourse, placeName } from "./places";

/** Arandu's words, one by one, each answer anew; dimmed while he thinks of the next. */
export function Answer({ text, busy }: { text: string; busy: boolean }) {
  const { shown } = useReveal(text);
  return (
    <div className={busy ? styles.thinking : undefined}>
      <AranduSays text={text} shown={shown} pose="sit" />
    </div>
  );
}

const WAIT = "Deixa eu ver o que sei sobre esse curso.";

// O10, one course at one place: Arandu tells about it on his own, the person asks more in their own words, and
// "Escolher" goes on with it.
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
  const [chat, setChat] = useState<{ sessionId: string; reply: string } | null>(null);
  const where = `${placeName(place.institution)}, em ${place.city}`;
  const ask = (message: string, sessionId?: string) =>
    talk.attempt(async () => {
      const reply = await askAboutCareers([course.profession.slug], message, sessionId);
      setChat({ sessionId: reply.sessionId, reply: reply.reply });
    });
  // He opens with the course itself, once (StrictMode runs effects twice).
  const opened = useRef(false);
  useEffect(() => {
    if (opened.current) return;
    opened.current = true;
    ask(`Me conta sobre o curso de ${course.course} na ${where}.`);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only on opening
  }, []);

  return (
    <main className={styles.screen}>
      <div className={ui.backBar}>
        <Back onBack={onBack} />
      </div>
      <div className={styles.body}>
        <header className={styles.courseHead}>
          <p className={styles.meta}>{where}</p>
          <h1>{course.course}</h1>
        </header>
        <Answer key={chat?.reply ?? WAIT} text={chat?.reply ?? WAIT} busy={talk.busy} />
      </div>
      <footer className={styles.foot}>
        {(failed || talk.failed) && (
          <p className={styles.error} role="alert">
            {failed ? "Não consegui seguir agora. Tenta de novo?" : "Não consegui responder agora. Pergunta de novo?"}
          </p>
        )}
        <MainButton disabled={busy} onClick={() => onChoose(course.courseId)}>
          Escolher {course.course}
        </MainButton>
      </footer>
      <Composer placeholder="Pergunte sobre o curso" busy={talk.busy} onSend={(text) => ask(text, chat?.sessionId)} />
    </main>
  );
}
