"use client";

import { useEffect, useRef } from "react";
import { BookPages } from "../book/book-pages";
import styles from "./stage.module.css";

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

  // The cat's speech bubble: run-stage fills it, opens it and keeps it over his head. The open book's
  // pages sit outside the hidden layer: they are read and their buttons are pressed.
  return (
    <>
      <div ref={host} className={styles.stage} aria-hidden="true">
        <p data-say className={`${styles.say} type-small`} />
      </div>
      <BookPages />
    </>
  );
}
