"use client";

import { useState } from "react";
import { safeUrl, thumb } from "@/landing/book/book-data";
import { AranduSays, useReveal } from "@/ui/arandu-says";
import { Back } from "@/ui/back";
import ui from "@/ui/ui.module.css";
import styles from "./onboarding.module.css";
import { CareersChatView, type CareersChat } from "./careers-chat-view";
import { CourseView } from "./course-view";
import { type Place, placeName } from "./places";

const SAY = "Separei carreiras que combinam com o que você me contou, e onde estudar cada uma. Toca numa pra saber mais.";
const KIND = { public: "Pública", private: "Privada", special: null } as const;

type Props = { places: Place[]; busy: boolean; failed: boolean; onChoose: (courseId: number) => void; onBack: () => void };

// O10: the recommended careers, by institution where each can be lived, on a screen of their own. Tapping a course
// opens it with Arandu telling about it (CourseView); "Conversar com o Arandu" opens a chat about all of them
// (CareersChatView). Either one chooses. Anything the API leaves null (photo, logo) stays off the card.
export function PlacesView({ places, busy, failed, onChoose, onBack }: Props) {
  const { shown, done } = useReveal(SAY);
  const [view, setView] = useState<{ course: number; from: "list" | "chat" } | "chat" | null>(null);
  // The chat with Arandu outlives a visit to a course: back from it, the conversation goes on.
  const [chat, setChat] = useState<CareersChat | null>(null);
  const courses = places.flatMap((place) => place.courses.map((course) => ({ place, course })));

  const open = typeof view === "object" && view ? courses.find(({ course }) => course.courseId === view.course) : undefined;
  if (open)
    return (
      <CourseView
        place={open.place}
        course={open.course}
        busy={busy}
        failed={failed}
        onChoose={onChoose}
        onBack={() => setView(typeof view === "object" && view?.from === "chat" ? "chat" : null)}
      />
    );
  if (view === "chat")
    return (
      <CareersChatView
        courses={courses}
        chat={chat}
        onChat={setChat}
        busy={busy}
        failed={failed}
        onOpen={(courseId) => setView({ course: courseId, from: "chat" })}
        onChoose={onChoose}
        onBack={() => setView(null)}
      />
    );

  return (
    <main className={styles.screen}>
      <div className={ui.backBar}>
        <Back onBack={onBack} />
      </div>
      <div className={styles.body}>
        <AranduSays text={SAY} shown={shown} pose="stand" />
        {done && (
          <div className={`${styles.places} ${ui.after}`}>
            {places.map(({ institution, city, courses }) => {
              const photo = safeUrl(institution.photo?.url);
              const logo = safeUrl(institution.logo?.url);
              const kind = KIND[institution.kind];
              return (
                <div key={`${institution.name} ${city}`} className={styles.place}>
                  {photo && institution.photo && (
                    <div className={styles.photo}>
                      {/* eslint-disable-next-line @next/next/no-img-element -- Wikimedia Commons file of any size: no optimizer route for it. */}
                      <img src={thumb(photo)} alt="" loading="lazy" />
                      {/* The licenses (CC BY, CC BY-SA) ask for a link to the source, as the landing's book does. */}
                      <a className={styles.credit} href={safeUrl(institution.photo.sourceUrl) ?? undefined} target="_blank" rel="noreferrer">
                        Foto: {institution.photo.credit} · {institution.photo.license}
                      </a>
                    </div>
                  )}
                  <div className={styles.placeHead}>
                    {logo && institution.logo && (
                      <a
                        className={styles.logo}
                        href={safeUrl(institution.logo.sourceUrl) ?? undefined}
                        target="_blank"
                        rel="noreferrer"
                        title={`Logo: ${institution.logo.license}`}
                        aria-label={`Logo de ${institution.name}: ${institution.logo.license}`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element -- as above */}
                        <img src={thumb(logo)} alt="" loading="lazy" />
                      </a>
                    )}
                    <span className={styles.meta}>
                      {placeName(institution)} · {city}
                      {kind && <span className={styles.kind}>{kind}</span>}
                    </span>
                  </div>
                  <div className={styles.careers}>
                    {courses.map(({ courseId, course }) => (
                      <button key={courseId} type="button" className={styles.career} onClick={() => setView({ course: courseId, from: "list" })}>
                        {course}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
            <p className={styles.hint}>Em ordem alfabética. Ninguém paga pra aparecer aqui.</p>
          </div>
        )}
      </div>
      {done && (
        <footer className={styles.foot}>
          <button type="button" className={ui.ghost} onClick={() => setView("chat")}>
            Conversar com o Arandu
          </button>
        </footer>
      )}
    </main>
  );
}
