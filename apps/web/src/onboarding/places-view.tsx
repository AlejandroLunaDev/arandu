"use client";

import { useState } from "react";
import { safeUrl, thumb } from "@/landing/book/book-data";
import { AranduSays, useReveal } from "@/ui/arandu-says";
import { Back } from "@/ui/back";
import { Composer } from "@/ui/composer";
import { useAttempt } from "@/ui/use-attempt";
import ui from "@/ui/ui.module.css";
import styles from "./onboarding.module.css";
import { askAboutCareers } from "./actions";
import { type Place, placeName } from "./places";

const SAY = "Separei carreiras que combinam com o que você me contou, e onde estudar cada uma.";
const KIND = { public: "Pública", private: "Privada", special: null } as const;

type Props = { places: Place[]; pick: number | null; busy: boolean; failed: boolean; onPick: (courseId: number) => void; onNext: () => void; onBack: () => void };

/** Arandu's answer about a career: its words come out one by one, each answer anew. */
function Answer({ text, busy }: { text: string; busy: boolean }) {
  const { shown } = useReveal(text);
  return (
    <div className={busy ? styles.thinking : undefined}>
      <AranduSays text={text} shown={shown} pose="sit" />
    </div>
  );
}

// O10: the recommended careers, by institution where each can be lived. Before choosing, the person can ask Arandu
// about any of them in their own words; he works out which one they mean. Tapping a course picks it, and "Escolher"
// on its card goes on. Anything the API leaves null (photo, logo) stays off the card: no stand-in image.
export function PlacesView({ places, pick, busy, failed, onPick, onNext, onBack }: Props) {
  const { shown, done } = useReveal(SAY);
  const picked = places.flatMap((p) => p.courses).find((c) => c.courseId === pick);
  const talk = useAttempt();
  const [chat, setChat] = useState<{ sessionId: string; reply: string; slug: string | null } | null>(null);
  // The careers on screen, in the order shown: the chat's grounding (the API takes 1 to 4).
  const slugs = [...new Set(places.flatMap((p) => p.courses.map((c) => c.profession.slug)))].slice(0, 4);
  const ask = (message: string) =>
    talk.attempt(async () => {
      const { sessionId, reply, professionSlug } = await askAboutCareers(slugs, message, chat?.sessionId);
      setChat({ sessionId, reply, slug: professionSlug });
    });
  return (
    <main className={styles.screen}>
      <div className={ui.backBar}>
        <Back onBack={onBack} />
      </div>
      <div className={styles.body}>
        {chat ? <Answer key={chat.reply} text={chat.reply} busy={talk.busy} /> : <AranduSays text={SAY} shown={shown} pose="stand" />}
        {done && (
          <div className={`${styles.places} ${ui.after}`}>
            {places.map(({ institution, city, courses }) => {
              const photo = safeUrl(institution.photo?.url);
              const logo = safeUrl(institution.logo?.url);
              const kind = KIND[institution.kind];
              return (
                <div key={`${institution.name} ${city}`} className={styles.place} data-on={courses.some((c) => c.courseId === pick) || undefined}>
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
                    {courses.map(({ courseId, course, profession }) => (
                      <button
                        key={courseId}
                        type="button"
                        className={styles.career}
                        aria-pressed={pick === courseId}
                        data-talk={chat?.slug === profession.slug || undefined}
                        onClick={() => onPick(courseId)}
                      >
                        {course}
                      </button>
                    ))}
                  </div>
                  {picked && courses.includes(picked) && (
                    <button type="button" className={styles.choose} disabled={busy} onClick={onNext}>
                      Escolher {picked.course}
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M9 6l6 6-6 6" />
                      </svg>
                    </button>
                  )}
                </div>
              );
            })}
            <p className={styles.hint}>Em ordem alfabética. Ninguém paga pra aparecer aqui.</p>
          </div>
        )}
      </div>
      <footer className={styles.foot}>
        {(failed || talk.failed) && (
          <p className={styles.error} role="alert">
            {failed ? "Não consegui seguir agora. Tenta de novo?" : "Não consegui responder agora. Pergunta de novo?"}
          </p>
        )}
      </footer>
      {done && <Composer placeholder="Pergunte sobre uma carreira" busy={talk.busy} onSend={ask} />}
    </main>
  );
}
