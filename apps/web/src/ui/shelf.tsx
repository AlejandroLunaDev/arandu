"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import styles from "./ui.module.css";

/**
 * Subjects on a 3D shelf, as the landing's books (props.glb), the first one marked as where the person starts. The
 * titles are also a list for screen readers; the shelf render holds the place until the scene is up. With onPick each
 * book is a button, on the shelf and in the list.
 */
export function Shelf({ titles, className, onPick }: { titles: string[]; className?: string; onPick?: (index: number) => void }) {
  const box = useRef<HTMLDivElement>(null);
  const [live, setLive] = useState(false);
  const key = titles.join("\n");
  // The latest callback, so a new one does not rebuild the scene.
  const pick = useRef(onPick);
  useEffect(() => {
    pick.current = onPick;
  });
  const pickable = !!onPick;

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    let cancelled = false;
    let stop: (() => void) | null = null;
    import("./shelf-scene")
      .then(({ runShelf }) =>
        runShelf(el, key.split("\n"), () => !cancelled && setLive(true), pickable ? (i) => pick.current?.(i) : undefined),
      )
      .then((run) => {
        if (cancelled) run.stop();
        else stop = run.stop;
      })
      .catch((error: unknown) => console.error("The 3D shelf could not load", error));
    return () => {
      cancelled = true;
      stop?.();
    };
  }, [key, pickable]);

  return (
    <div ref={box} className={`${styles.shelf} ${className ?? ""}`} data-live={live || undefined}>
      <ul className="sr-only">
        {titles.map((title, i) => (
          <li key={i}>
            {onPick ? (
              <button type="button" onClick={() => onPick(i)}>
                Começar por {title}
              </button>
            ) : i === 0 ? (
              `${title}, seu primeiro capítulo`
            ) : (
              title
            )}
          </li>
        ))}
      </ul>
      {!live && <Image src="/img/props/shelf.webp" alt="" width={780} height={185} />}
    </div>
  );
}
