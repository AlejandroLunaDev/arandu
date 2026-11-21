"use client";

import { AranduSays, useReveal } from "@/ui/arandu-says";
import { MainButton } from "@/ui/main-button";
import ui from "@/ui/ui.module.css";
import styles from "./onboarding.module.css";
import type { Place } from "./places";

const SAY = "Separei carreiras que combinam com o que você me contou, e onde estudar cada uma.";

/** The picked institution and career. */
export type Pick = { place: Place; slug: string };

type Props = { places: Place[]; pick: Pick | null; busy: boolean; failed: boolean; onPick: (pick: Pick) => void; onNext: () => void };

// O10: the recommended careers, by institution where each can be lived. The person picks one career at one place.
// shortcut: photo, logo and the Pública/Privada tag wait for the API to send them with each institution.
export function PlacesView({ places, pick, busy, failed, onPick, onNext }: Props) {
  const { shown, done } = useReveal(SAY);
  const picked = (place: Place, slug: string) => pick?.place === place && pick.slug === slug;
  return (
    <main className={styles.screen}>
      <div className={styles.body}>
        <AranduSays text={SAY} shown={shown} pose="standing" />
        {done && (
          <div className={`${styles.places} ${ui.after}`}>
            {places.map((place) => (
              <div key={`${place.institution} ${place.city}`} className={styles.place} data-on={pick?.place === place || undefined}>
                <div className={styles.placeHead}>
                  <span className={styles.meta}>
                    {place.institution} · {place.city}
                  </span>
                </div>
                <div className={styles.careers}>
                  {place.careers.map(({ slug, name }) => (
                    <button key={slug} type="button" className={styles.career} aria-pressed={picked(place, slug)} onClick={() => onPick({ place, slug })}>
                      {name}
                    </button>
                  ))}
                </div>
              </div>
            ))}
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
        <MainButton disabled={busy || !pick} onClick={onNext}>
          Continuar
        </MainButton>
      </footer>
    </main>
  );
}
