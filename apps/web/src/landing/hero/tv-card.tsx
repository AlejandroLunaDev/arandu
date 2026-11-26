"use client";

import { useState } from "react";
import { DownloadButton } from "@/install/download-button";
import ui from "@/ui/ui.module.css";
import { Wordmark } from "@/ui/wordmark";
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
      <h1 id="hero-title" className={`${ui.wordmark} ${styles.brand}`}>
        <Wordmark />
      </h1>
      <p className={`${styles.pitch} text-pretty text-text-muted`}>
        Um app de <strong className={styles.key}>orientação vocacional</strong> com inteligência artificial, onde quem quer entrar na universidade
        vive uma carreira antes de escolher.
      </p>
      {/* The way into the app: the room's small neon opens it; its button shows for the keyboard and without 3D. */}
      <div className={styles.getApp}>
        <DownloadButton />
      </div>
      <p className="sr-only">{MOTTO}</p>
      {VIDEO_URL && (
        <button type="button" className={styles.play} aria-label="Ver vídeo" onClick={() => setPlaying(true)}>
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <path fill="currentColor" d="M5 2.8v10.4l8.4-5.2z" />
          </svg>
        </button>
      )}
      {playing && VIDEO_URL && (
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
