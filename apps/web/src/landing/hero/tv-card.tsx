"use client";

import { useState } from "react";
import { DownloadButton } from "@/install/download-button";
import { MOTTO } from "../copy";
import { VIDEO_URL } from "../links";
import styles from "./hero.module.css";

// The TV's title card: the brand, the pitch and a play button. The play button
// turns the TV to the presentation video, and a button over the video turns it back to the title.
// The title stays in the page while the video plays, unseen, so it is still read.
export function TvCard() {
  const [playing, setPlaying] = useState(false);
  return (
    <div data-tv data-theme="dark" data-playing={playing || undefined} className={styles.tv}>
      <h1 id="hero-title" className={styles.brand}>
        {/* The logo: "arand", and a cat on its back is the u (head on one stem, paws up on the other). */}
        <span aria-hidden="true">arand</span>
        <svg className={styles.u} viewBox="-4 -8 80 72" aria-hidden="true">
          <path
            d="M40 58 C 62 62 78 50 74 36 C 72 29 64 31 67 37"
            fill="none"
            stroke="currentColor"
            strokeWidth="5.5"
            strokeLinecap="round"
          />
          <path d="M10.5 16 V 38 A 21.5 21.5 0 0 0 53.5 38 V 22" fill="none" stroke="currentColor" strokeWidth="15" />
          <circle cx="48.5" cy="14" r="5" />
          <circle cx="59" cy="15.5" r="5" />
          <circle cx="10.5" cy="10" r="13.5" />
          <path d="M-2.5 6 L-1.5 -9 L8 -2 Z M13 -2 L22.5 -9 L23.5 6 Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
          <path className={styles.ear} d="M0.8 -0.5 L1.2 -5 L5 -2 Z M16 -2 L19.8 -5 L20.2 -0.5 Z" />
          <circle className={styles.eye} cx="5.5" cy="10.5" r="3.4" />
          <circle className={styles.eye} cx="15.5" cy="10.5" r="3.4" />
        </svg>
        <span className="sr-only">Arandu</span>
      </h1>
      <p className={`${styles.pitch} text-pretty text-text-muted`}>
        Um app de <strong className={styles.key}>orientação vocacional</strong> com inteligência artificial, onde quem quer entrar na universidade
        vive uma carreira antes de escolher.
      </p>
      <DownloadButton />
      <p className="sr-only">{MOTTO}</p>
      <button type="button" className={styles.play} aria-label="Ver vídeo" onClick={() => setPlaying(true)}>
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <path fill="currentColor" d="M5 2.8v10.4l8.4-5.2z" />
        </svg>
      </button>
      {playing && (
        <>
          <iframe
            className={styles.video}
            src={VIDEO_URL}
            title="Vídeo de apresentação do Arandu"
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            referrerPolicy="strict-origin-when-cross-origin"
          />
          <button type="button" className={`${styles.unplay} ar-btn ar-btn--primary`} onClick={() => setPlaying(false)}>
            Voltar ao título
          </button>
        </>
      )}
    </div>
  );
}
