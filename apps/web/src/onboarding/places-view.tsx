"use client";

import { useState } from "react";
import { safeUrl, thumb } from "@/landing/book/book-data";
import { AranduSays, useReveal } from "@/ui/arandu-says";
import { Back } from "@/ui/back";
import ui from "@/ui/ui.module.css";
import styles from "./onboarding.module.css";
import { CareersChatView, type CareersChat } from "./careers-chat-view";
import { CourseView } from "./course-view";
import { type Place, byCareer, placeName } from "./places";

const SAY = "Separei carreiras que combinam com o que você me contou, e onde estudar cada uma. Toca num lugar pra saber mais.";
const KIND = { public: "Pública", private: "Privada", special: null } as const;
/** Places a career shows before "Ver mais": a career can be taught at dozens. */
const SHOWN = 4;

type Props = { places: Place[]; busy: boolean; failed: boolean; onChoose: (courseId: number) => void; onBack: () => void };

// O10: the recommended careers, each one once with why it fits and the places where it can be studied, on a screen of
// their own. Tapping a place opens that course with Arandu telling about it (CourseView); "Conversar com o Arandu"
// opens a chat about all of them (CareersChatView). Either one chooses. A logo the API leaves null stays off its row.
export function PlacesView({ places, busy, failed, onChoose, onBack }: Props) {
  const { shown, done } = useReveal(SAY);
  const [view, setView] = useState<{ course: number; from: "list" | "chat" } | "chat" | null>(null);
  // The chat with Arandu outlives a visit to a course: back from it, the conversation goes on.
  const [chat, setChat] = useState<CareersChat | null>(null);
  const courses = places.flatMap((place) => place.courses.map((course) => ({ place, course })));
  /** The careers whose whole list of places is open. */
  const [whole, setWhole] = useState<string[]>([]);

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
            {byCareer(places).map(({ profession, reason, at }) => {
              const all = whole.includes(profession.slug);
              return (
                <section key={profession.slug} className={styles.place}>
                  <h2 className={styles.careerName}>{profession.name}</h2>
                  {reason && <p className={styles.why}>{reason}</p>}
                  <ul className={styles.wheres} aria-label={`Onde estudar ${profession.name}`}>
                    {(all ? at : at.slice(0, SHOWN)).map(({ place: { institution, city }, course }) => {
                      const logo = safeUrl(institution.logo?.url);
                      const kind = KIND[institution.kind];
                      return (
                        <li key={course.courseId}>
                          {logo && institution.logo && (
                            <a
                              className={styles.logo}
                              href={safeUrl(institution.logo.sourceUrl) ?? undefined}
                              target="_blank"
                              rel="noreferrer"
                              title={`Logo: ${institution.logo.license}`}
                              aria-label={`Logo de ${institution.name}: ${institution.logo.license}`}
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element -- Wikimedia Commons file of any size: no optimizer route for it. */}
                              <img src={thumb(logo)} alt="" loading="lazy" />
                            </a>
                          )}
                          <button type="button" className={styles.where} onClick={() => setView({ course: course.courseId, from: "list" })}>
                            <span>
                              <b>{placeName(institution)}</b>
                              <small>
                                {/* A career can be more than one course at a place (Enfermagem and Obstetrícia): the row says which. */}
                                {[course.course.toLowerCase() === profession.name.toLowerCase() ? null : course.course, city ?? "A distância"].filter(Boolean).join(" · ")}
                                {kind && <span className={styles.kind}>{kind}</span>}
                              </small>
                            </span>
                            <svg viewBox="0 0 24 24" aria-hidden="true">
                              <path d="M9 6l6 6-6 6" />
                            </svg>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                  {at.length > SHOWN && (
                    <button
                      type="button"
                      className={styles.more}
                      aria-expanded={all}
                      onClick={() => setWhole(all ? whole.filter((slug) => slug !== profession.slug) : [...whole, profession.slug])}
                    >
                      {all ? "Ver menos" : `Ver mais ${at.length - SHOWN} ${at.length - SHOWN === 1 ? "lugar" : "lugares"}`}
                    </button>
                  )}
                </section>
              );
            })}
            <p className={styles.hint}>Lugares em ordem alfabética. Ninguém paga pra aparecer aqui.</p>
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
