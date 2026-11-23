"use client";

import { AranduSays, useReveal } from "@/ui/arandu-says";
import { Back } from "@/ui/back";
import { Composer } from "@/ui/composer";
import { useAttempt } from "@/ui/use-attempt";
import ui from "@/ui/ui.module.css";
import styles from "./onboarding.module.css";
import { askAboutCareers } from "./actions";
import { Answer } from "./course-view";
import { type Place, type PlaceCourse, placeName, toChoice } from "./places";

/** The conversation about O10's careers: its session, Arandu's last answer and the career it is about. */
export type CareersChat = { sessionId: string; reply: string; slug: string | null; chosen: number | null };

const SAY = "Pode me perguntar sobre qualquer uma dessas carreiras, ou pedir pra comparar.";

// O10's "Conversar com o Arandu": a full-screen chat about every career on the list. The courses of the career he
// talks about come under his answer, to open one; saying which one they want chooses it (Arandu confirms, then the
// next screen comes).
export function CareersChatView({
  courses,
  chat,
  onChat,
  failed,
  onOpen,
  onChoose,
  onBack,
}: {
  courses: { place: Place; course: PlaceCourse }[];
  chat: CareersChat | null;
  onChat: (chat: CareersChat) => void;
  failed: boolean;
  onOpen: (courseId: number) => void;
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
  const about = chat?.slug && chosen === null ? courses.filter(({ course }) => course.profession.slug === chat.slug) : [];

  return (
    <main className={styles.screen}>
      <div className={ui.backBar}>
        <Back onBack={onBack} />
      </div>
      <div className={styles.body}>
        {chat ? (
          <Answer key={chat.reply} text={chat.reply} busy={talk.busy} onRead={chosen === null ? undefined : () => onChoose(chosen)} />
        ) : (
          <AranduSays text={SAY} shown={shown} pose="sit" />
        )}
        {about.length > 0 && !talk.busy && (
          <div className={`${styles.careers} ${styles.talkCourses} ${ui.after}`}>
            {about.map(({ place, course }) => (
              <button key={course.courseId} type="button" className={styles.career} onClick={() => onOpen(course.courseId)}>
                {course.course} · {placeName(place.institution)}
              </button>
            ))}
          </div>
        )}
      </div>
      <footer className={styles.foot}>
        {(failed || talk.failed) && (
          <p className={styles.error} role="alert">
            Não consegui responder agora. Pergunta de novo?
          </p>
        )}
      </footer>
      <Composer placeholder="Pergunte sobre as carreiras" busy={talk.busy} onSend={ask} />
    </main>
  );
}
