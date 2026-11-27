"use client";

import type { CareerOption } from "@arandu/contracts";
import { useState } from "react";
import { safeUrl, thumb } from "@/landing/book/book-data";
import { AranduSays, useReveal } from "@/ui/arandu-says";
import { Back } from "@/ui/back";
import ui from "@/ui/ui.module.css";
import styles from "./onboarding.module.css";
import { CareersChatView, type CareersChat } from "./careers-chat-view";
import { CourseView } from "./course-view";
import { type Place, byCareer, placeName } from "./places";

const SAY = "Separei carreiras que combinam com o que você me contou, e onde estudar cada uma. Toca numa carreira pra saber mais.";
const KIND = { public: "Pública", private: "Privada", special: null } as const;
/** Which places to list: all of them, or only the public or the private ones. */
const FILTERS = [
  ["all", "Todas"],
  ["public", "Públicas"],
  ["private", "Privadas"],
] as const;
const NONE = { public: "Nenhuma pública nesta lista.", private: "Nenhuma privada nesta lista.", all: "" } as const;
/** Places a career shows before "Ver mais": a career can be taught at dozens. */
const SHOWN = 4;

type Props = {
  places: Place[];
  /** What Arandu says over the list: his own words when he brought it from the chat. */
  say?: string;
  busy: boolean;
  failed: boolean;
  onChoose: (courseId: number) => void;
  onMore: (careers: CareerOption[], say: string) => void;
  /** The careers of the lists shown before this one. */
  seen: string[];
  onBack: () => void;
};

// O10: the recommended careers, each one once with why it fits, on a screen of their own. The person picks a career,
// never a place: tapping one opens it with Arandu telling about it (CourseView), and "Conversar com o Arandu" opens a
// chat about all of them (CareersChatView); either one chooses. Under each career, the places where it is taught are
// information only: the ones with a photo or a logo first, and a filter for public or private ones.
export function PlacesView({ places, say = SAY, busy, failed, onChoose, onMore, seen, onBack }: Props) {
  const { shown, done } = useReveal(say);
  /** The career open on its own screen, by the course that stands for it; or the chat about all of them. */
  const [view, setView] = useState<number | "chat" | null>(null);
  // The chat with Arandu outlives a visit to a career: back from it, the conversation goes on.
  const [chat, setChat] = useState<CareersChat | null>(null);
  const courses = places.flatMap((place) => place.courses.map((course) => ({ place, course })));
  const careers = byCareer(places);
  /** The careers whose whole list of places is open. */
  const [whole, setWhole] = useState<string[]>([]);
  const [only, setOnly] = useState<(typeof FILTERS)[number][0]>("all");
  const kinds = new Set(places.map((place) => place.institution.kind));

  const open = typeof view === "number" ? courses.find(({ course }) => course.courseId === view) : undefined;
  if (open)
    return (
      <CourseView
        place={open.place}
        course={open.course}
        busy={busy}
        failed={failed}
        onChoose={onChoose}
        onBack={() => setView(null)}
      />
    );
  if (view === "chat")
    return (
      <CareersChatView
        // One course stands for each career: its first place's.
        courses={careers.flatMap(({ at }) => at.slice(0, 1))}
        chat={chat}
        onChat={setChat}
        busy={busy}
        failed={failed}
        onChoose={onChoose}
        onMore={onMore}
        seen={seen}
        onBack={() => setView(null)}
      />
    );

  return (
    <main className={styles.screen}>
      <div className={ui.backBar}>
        <Back onBack={onBack} />
      </div>
      <div className={styles.body}>
        <AranduSays text={say} shown={shown} pose="stand" />
        {done && (
          <div className={`${styles.places} ${ui.after}`}>
            {kinds.has("public") && kinds.has("private") && (
              <div className={styles.filters} role="group" aria-label="Quais lugares mostrar">
                {FILTERS.map(([kind, label]) => (
                  <button key={kind} type="button" className={styles.filter} aria-pressed={only === kind} onClick={() => setOnly(kind)}>
                    {label}
                  </button>
                ))}
              </div>
            )}
            {careers.map(({ profession, reason, at }) => {
              const all = whole.includes(profession.slug);
              const listed = only === "all" ? at : at.filter(({ place }) => place.institution.kind === only);
              const first = at[0];
              return (
                <section key={profession.slug} className={styles.place}>
                  <div className={styles.pick}>
                    <h2 className={styles.careerName}>
                      <button type="button" onClick={() => first && setView(first.course.courseId)}>
                        {profession.name}
                      </button>
                    </h2>
                    {reason && <p className={styles.why}>{reason}</p>}
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M9 6l6 6-6 6" />
                    </svg>
                  </div>
                  <p className={styles.count}>
                    Onde estudar · {listed.length} {listed.length === 1 ? "lugar" : "lugares"}
                  </p>
                  {listed.length === 0 && <p className={styles.none}>{NONE[only]}</p>}
                  <ul className={styles.wheres} aria-label={`Onde estudar ${profession.name}`}>
                    {(all ? listed : listed.slice(0, SHOWN)).map(({ place: { institution, city }, course }) => {
                      const photo = safeUrl(institution.photo?.url);
                      const logo = safeUrl(institution.logo?.url);
                      const kind = KIND[institution.kind];
                      return (
                        <li key={course.courseId}>
                          {photo ? (
                            // eslint-disable-next-line @next/next/no-img-element -- Wikimedia Commons file of any size: no optimizer route for it.
                            <img className={styles.thumb} src={thumb(photo)} alt="" loading="lazy" />
                          ) : (
                            logo &&
                            institution.logo && (
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
                            )
                          )}
                          <span className={styles.where}>
                            <b>{placeName(institution)}</b>
                            <small>
                              {/* A career can be more than one course at a place (Enfermagem and Obstetrícia): the row says which. */}
                              {[course.course.toLowerCase() === profession.name.toLowerCase() ? null : course.course, city ?? "A distância"].filter(Boolean).join(" · ")}
                              {kind && <span className={styles.kind}>{kind}</span>}
                            </small>
                            {/* The licenses (CC BY, CC BY-SA) ask for a link to the source, as the landing's book does. */}
                            {photo && institution.photo && (
                              <a className={styles.credit} href={safeUrl(institution.photo.sourceUrl) ?? undefined} target="_blank" rel="noreferrer">
                                Foto: {institution.photo.credit} · {institution.photo.license}
                              </a>
                            )}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                  {listed.length > SHOWN && (
                    <button
                      type="button"
                      className={styles.more}
                      aria-expanded={all}
                      onClick={() => setWhole(all ? whole.filter((slug) => slug !== profession.slug) : [...whole, profession.slug])}
                    >
                      {all ? "Ver menos" : `Ver mais ${listed.length - SHOWN} ${listed.length - SHOWN === 1 ? "lugar" : "lugares"}`}
                    </button>
                  )}
                </section>
              );
            })}
            <p className={styles.hint}>Primeiro os lugares com foto e mais informação. Ninguém paga pra aparecer aqui.</p>
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
