"use client";

import { Fragment, useEffect, useRef } from "react";
import { UNZOOM_EVENT } from "../book/book-data";
import { BookPages } from "../book/book-pages";
import { PORTFOLIO_URL } from "../links";
import styles from "./stage.module.css";

/** The photos in the room's frames (props.ts), from Wikimedia Commons: what, whose, and under what license. */
const FRAME_CREDITS = [
  { what: "USP", who: "Dornicke", license: "CC BY 3.0", href: "https://commons.wikimedia.org/wiki/File:Cidade_Universit%C3%A1ria%2C_USP%2C_Rel%C3%B3gio.JPG" },
  { what: "UFSCar", who: "Melobozoga", license: "domínio público", href: "https://commons.wikimedia.org/wiki/File:Entrada_Sul_UFSCar.jpg" },
];

/** The frames' photos, credited while the camera is close on them (html[data-zoom="frames"]); the Quarto shows them too. */
export function FrameCredits() {
  return (
    <p className={`${styles.credits} type-small`}>
      {FRAME_CREDITS.map(({ what, who, license, href }, i) => (
        <Fragment key={href}>
          {i > 0 && " · "}
          <a href={href} target="_blank" rel="noopener noreferrer">
            {what}: {who}, {license}
          </a>
        </Fragment>
      ))}
      {" · Wikimedia Commons"}
    </p>
  );
}

// The 3D layer over the landing. three.js loads in its own chunk, after the page is up, so the
// first paint never waits for it.
export function Stage() {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let stop: (() => void) | null = null;
    let cancelled = false;
    import("./run-stage")
      .then(({ runStage }) => {
        if (!cancelled) stop = runStage(el);
      })
      .catch((error: unknown) => {
        console.error("The 3D stage could not load", error);
        document.documentElement.classList.add("no3d");
      });
    return () => {
      cancelled = true;
      stop?.();
    };
  }, []);

  // The cat's speech bubble: run-stage fills it, opens it and keeps it over his head; the coffee's
  // steam rises from the mug the same way. The open book's pages and the way back from the shelves
  // sit outside the hidden layer: they are read and pressed.
  return (
    <>
      <div ref={host} className={styles.stage} aria-hidden="true">
        <p data-say className={`${styles.say} type-small`} />
        <span data-steam className={styles.steam}>
          <i />
          <i />
          <i />
        </span>
      </div>
      {/* The notebook's screen, close up: run-stage lays it over the screen and loads it on the first visit. */}
      <iframe
        data-portfolio={PORTFOLIO_URL}
        title="Portfólio de Alejandro Luna"
        className={styles.portfolio}
        sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
        referrerPolicy="no-referrer"
      />
      <FrameCredits />
      <button type="button" className={`${styles.back} ar-btn ar-btn--primary`} onClick={() => dispatchEvent(new Event(UNZOOM_EVENT))}>
        Voltar ao quarto
      </button>
      <BookPages />
    </>
  );
}
