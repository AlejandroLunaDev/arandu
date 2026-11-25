"use client";

import { useState, useTransition } from "react";

/**
 * A screen's call to the server: one at a time (Enter can be pressed again while Arandu is still answering), busy
 * meanwhile, and failed when it threw. Each call either moves on or leaves everything as it was, so "Tenta de novo"
 * repeats it whole.
 */
export function useAttempt() {
  const [busy, startTransition] = useTransition();
  const [failed, setFailed] = useState(false);
  const attempt = (call: () => Promise<void>) => {
    if (busy) return;
    setFailed(false);
    startTransition(async () => {
      try {
        await call();
      } catch {
        setFailed(true);
      }
    });
  };
  return { busy, failed, attempt };
}
