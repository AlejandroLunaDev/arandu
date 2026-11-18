import Image from "next/image";
import { Fragment } from "react";
import { Scene } from "../scene/scene";
import styles from "./hero.module.css";
import { TvCard } from "./tv-card";

const MOTTO = "A busca da sabedoria começa por você.";

// The hero: Arandu's room at night, across the whole screen, the motto under it. The stage draws the
// room in 3D; the page only keeps its place in the layout. The brand and the pitch are the TV's title
// card: real text, which run-stage lays over the TV's screen (without 3D, they sit above the room).
// The motto's letters are the stage's too: each one is a body that gives under a tap or the cat's
// paws, so screen readers get the sentence whole instead.
export function Hero() {
  return (
    <Scene
      length="hero"
      labelledBy="hero-title"
      copy={<TvCard />}
      art={
        <span data-room="hero" className={styles.room}>
          <Image className={styles.fallback} src="/img/cat.svg" alt="" width={600} height={370} />
          <Image className={styles.loading} src="/img/head.svg" alt="" width={32} height={32} priority />
        </span>
      }
      foot={
        <p data-reveal data-theme="dark" className="type-display text-balance text-text">
          <span className="sr-only">{MOTTO}</span>
          <span aria-hidden="true">
            {MOTTO.split(" ").map((word, w) => (
              <Fragment key={w}>
                {w > 0 && " "}
                <span className={styles.word}>
                  {[...word].map((letter, i) => (
                    <span key={i} data-letter className={styles.letter}>
                      {letter}
                    </span>
                  ))}
                </span>
              </Fragment>
            ))}
          </span>
        </p>
      }
    />
  );
}
