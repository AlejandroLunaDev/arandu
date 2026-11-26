"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Window event: the app is going to `href`. A 3D scene whose Arandu can walk off first claims it (preventDefault) and
 * calls `go` once he is out of sight; the nav marks `href` as current meanwhile.
 */
export const LEAVE_EVENT = "arandu:leave";
export type Leave = { href: string; say: string; go: () => void };
/** The longest his walk may hold the app back (ms). */
const LEAVE_MAX = 6000;
/** How long after a walk-off the next screen may still take him as walking in (ms). */
const ARRIVE_FOR = 10000;
let walked = { href: "", at: 0 };
/** Whether Arandu just walked off another screen towards `href`: once, so only that screen's first scene walks him in. */
export function walkedTo(href: string) {
  const yes = walked.href === href && performance.now() - walked.at < ARRIVE_FOR;
  if (yes) walked = { href: "", at: 0 };
  return yes;
}

/**
 * A tap on a link to `href` from this screen: instead of a loading screen, Arandu walks off it while `href` loads,
 * saying `say` so the person knows the app is on its way, and the app goes there once he is gone. Captured before Link
 * takes the tap.
 */
export function useWalkOff(href: string, say: string, warm?: () => void) {
  const router = useRouter();
  useEffect(() => {
    let going = false;
    const onClick = (e: MouseEvent) => {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const link = e.target instanceof Element ? e.target.closest("a") : null;
      if (!link || new URL(link.href).pathname !== href) return;
      e.preventDefault();
      e.stopPropagation();
      if (going) return;
      going = true;
      router.prefetch(href);
      warm?.();
      let gone = false;
      const go = () => {
        if (gone) return;
        gone = true;
        clearTimeout(timer);
        walked = { href, at: performance.now() };
        router.push(href);
      };
      const timer = setTimeout(go, LEAVE_MAX);
      // No scene took it (no WebGL, or not up yet): straight there.
      if (dispatchEvent(new CustomEvent<Leave>(LEAVE_EVENT, { detail: { href, say, go }, cancelable: true }))) go();
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [href, say, router, warm]);
}
