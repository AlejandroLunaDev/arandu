"use client";

import { useEffect, useRef, useState } from "react";
import { takeDailyGift } from "@/caminho/actions";
import { useAttempt } from "@/ui/use-attempt";
import styles from "./room.module.css";

// S1: the day's peixinhos, a gift the person takes on the day's first visit (Wallet.dailyGift, POST /me/daily-gift).
// A small fish swims on the room's left, twinkling, until it is tapped; then a big one swims in the middle of 3D bubbles
// and sparks (catch-scene.ts) with what was won, until a tap anywhere sends it off to the wallet.
// Always rendered: taking the gift refreshes the page's data at once (updateTag), and the amount drops to 0 while the
// celebration is still on.
export function DailyGift({ amount }: { amount: number }) {
  const { busy, failed, attempt } = useAttempt();
  const [won, setWon] = useState(0);
  /** Tapped to close: the fish swims off to the wallet and it all fades, then it is gone. */
  const [leaving, setLeaving] = useState(false);
  const burst = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = burst.current;
    if (won <= 0 || !canvas || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let stop: (() => void) | null = null;
    let cancelled = false;
    import("./catch-scene")
      .then(({ runCatch }) => {
        if (!cancelled) stop = runCatch(canvas);
      })
      .catch((error: unknown) => console.error("The catch's bubbles could not start", error)); // the fish and words stay
    return () => {
      cancelled = true;
      stop?.();
    };
  }, [won]);

  return (
    <>
      {amount > 0 && !won && (
        <button
          type="button"
          className={styles.gift}
          data-failed={failed || undefined}
          disabled={busy}
          aria-label={`Pegar o presente do dia: ${amount} peixinhos`}
          onClick={() =>
            attempt(async () => {
              const gift = await takeDailyGift();
              setWon(gift.peixinhos);
            })
          }
        >
          <span className={styles.swim} />
        </button>
      )}
      {failed && (
        <p role="alert" className="sr-only">
          Não consegui pegar agora. Tenta de novo?
        </p>
      )}
      {won > 0 && (
        // A tap anywhere closes it; a whole-screen button, so the keyboard closes it too, focused as it opens.
        <button
          type="button"
          className={styles.caught}
          data-leaving={leaving || undefined}
          autoFocus
          aria-label={`Você ganhou ${won} peixinhos. Fechar`}
          onClick={() => setLeaving(true)}
          onAnimationEnd={(e) => leaving && e.target === e.currentTarget && setWon(-1)}
        >
          <canvas ref={burst} className={styles.burst} aria-hidden="true" />
          <span className={styles.swim} />
          <strong>+{won}</strong>
          <span>Você ganhou {won} peixinhos!</span>
        </button>
      )}
    </>
  );
}
