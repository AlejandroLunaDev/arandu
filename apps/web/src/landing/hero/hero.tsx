import Image from "next/image";
import { Scene } from "../scene/scene";
import styles from "./hero.module.css";
import { TvCard } from "./tv-card";

// The hero: Arandu's room at night, across the whole screen. The stage draws the room in 3D; the page
// only keeps its place in the layout. The brand and the pitch are the TV's title card: real text, which
// run-stage lays over the TV's screen (without 3D, they sit above the room). The motto hangs on a sign
// under a shelf, drawn in 3D, so the card reads it out too.
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
    />
  );
}
