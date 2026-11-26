"use client";

import { AranduSays, useReveal } from "@/ui/arandu-says";
import { Back } from "@/ui/back";
import { Composer } from "@/ui/composer";
import { MainButton } from "@/ui/main-button";
import { useAttempt } from "@/ui/use-attempt";
import ui from "@/ui/ui.module.css";
import styles from "./onboarding.module.css";
import { askAboutCareers } from "./actions";
import { Answer } from "./course-view";
import { type Place, type PlaceCourse, toChoice } from "./places";

/** The conversation about O10's careers: its session, Arandu's last answer and the career it is about. */
export type CareersChat = { sessionId: string; reply: string; slug: string | null; chosen: number | null };

const SAY = "Pode me perguntar sobre qualquer uma dessas carreiras, ou pedir pra comparar.";

// O10's "Conversar com o Arandu": a full-screen chat about every career on the list (`courses` holds one course per
// career, standing for it). He answers and does not ask back, so the talk has an end: the button under his answer
// starts the career he is talking about, and saying which one they want does too (Arandu confirms, then the next
// screen comes).
export function CareersChatView({
  courses,
  chat,
  onChat,
  busy,
  failed,
  onChoose,
  onBack,
}: {
  courses: { place: Place; course: PlaceCourse }[];
  chat: CareersChat | null;
  onChat: (chat: CareersChat) => void;
  busy: boolean;
  failed: boolean;
  onChoose: (courseId: number) => void;
  onBack: () => void;
}) {
  const { shown } = useReveal(SAY);
  const talk = useAttempt();
  // The careers on screen, in the order shown: the chat's grounding (the API takes 1 to 4).
  const slugs = [...new Set(courses.map(({ course }) => course.profession.slug))].slice(0, 4);
  const ask = (message: string) =>
    talk.attempt(async () => {
      const choices = courses.slice(0, 12).map(({ place, course }) => toChoice(place, course));
      const { sessionId, reply, professionSlug, chosenCourseId } = await askAboutCareers(slugs, message, chat?.sessionId, choices);
      onChat({ sessionId, reply, slug: professionSlug, chosen: chosenCourseId });
    });
  const chosen = chat?.chosen ?? null;
  const about = chat?.slug && chosen === null ? courses.find(({ course }) => course.profession.slug === chat.slug)?.course : undefined;

  return (
    <main className={styles.screen}>
      <div className={ui.backBar}>
        <Back onBack={onBack} />
      </div>
      <div className={`${styles.body} ${styles.low}`}>
        {chat ? (
          <Answer key={chat.reply} text={chat.reply} busy={talk.busy} onRead={chosen === null ? undefined : () => onChoose(chosen)} />
        ) : (
          <AranduSays text={SAY} shown={shown} pose="sit" low />
        )}
      </div>
      <Composer placeholder="Pergunte sobre as carreiras" busy={talk.busy} onSend={ask}>
        <footer className={styles.foot}>
          {(failed || talk.failed) && (
            <p className={styles.error} role="alert">
              {failed ? "Não consegui seguir agora. Tenta de novo?" : "Não consegui responder agora. Pergunta de novo?"}
            </p>
          )}
          {failed && chosen !== null && (
            <MainButton disabled={busy} onClick={() => onChoose(chosen)}>
              Tentar de novo
            </MainButton>
          )}
          {about && !talk.busy && (
            <MainButton disabled={busy} onClick={() => onChoose(about.courseId)}>
              Experimentar {about.profession.name}
            </MainButton>
          )}
        </footer>
      </Composer>
    </main>
  );
}
