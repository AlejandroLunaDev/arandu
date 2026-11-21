"use client";

import { safeUrl, thumb } from "@/landing/book/book-data";
import { AranduSays, useReveal } from "@/ui/arandu-says";
import { MainButton } from "@/ui/main-button";
import ui from "@/ui/ui.module.css";
import styles from "./onboarding.module.css";
import { type Place, placeName } from "./places";

const SAY = "Separei carreiras que combinam com o que você me contou, e onde estudar cada uma.";
const KIND = { public: "Pública", private: "Privada", special: null } as const;

type Props = { places: Place[]; pick: number | null; busy: boolean; failed: boolean; onPick: (courseId: number) => void; onNext: () => void };

// O10: the recommended careers, by institution where each can be lived. The person picks one course.
// Anything the API leaves null (photo, logo) stays off the card: no stand-in image.
export function PlacesView({ places, pick, busy, failed, onPick, onNext }: Props) {
  const { shown, done } = useReveal(SAY);
  return (
    <main className={styles.screen}>
      <div className={styles.body}>
        <AranduSays text={SAY} shown={shown} pose="standing" />
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
                    {courses.map(({ courseId, course }) => (
                      <button key={courseId} type="button" className={styles.career} aria-pressed={pick === courseId} onClick={() => onPick(courseId)}>
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
      <footer className={`${styles.foot} ${styles.last}`}>
        {failed && (
          <p className={styles.error} role="alert">
            Não consegui seguir agora. Tenta de novo?
          </p>
        )}
        <MainButton disabled={busy || pick === null} onClick={onNext}>
          Continuar
        </MainButton>
      </footer>
    </main>
  );
}
