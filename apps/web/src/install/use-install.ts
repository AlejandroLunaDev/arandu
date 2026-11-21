"use client";

import { useSyncExternalStore } from "react";

/** Where the app is opened: installed, a phone browser (iPhone or other) or a desktop browser. */
export type Where = "installed" | "iphone" | "phone" | "desktop";

type InstallPrompt = Event & { prompt(): Promise<void> };

let deferred: InstallPrompt | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((listener) => listener());

// Listened for as soon as this module loads, before React hydrates, so Chrome's early event is not missed.
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferred = event as InstallPrompt;
    emit();
  });
  window.addEventListener("appinstalled", () => {
    deferred = null;
    emit();
  });
}

function where(): Where {
  // navigator.standalone is iOS's own flag; display-mode covers Android and newer iOS.
  if (matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone) return "installed";
  // iPadOS reports itself as a Mac, so a touch Mac is an iPad.
  const ios = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  if (ios) return "iphone";
  return matchMedia("(pointer: coarse)").matches ? "phone" : "desktop";
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
const never = () => () => {};

/** null until hydrated: the server can't know the device. `install` is set only when Chrome offers its prompt. */
export function useInstall() {
  const at = useSyncExternalStore(never, where, () => null);
  const prompt = useSyncExternalStore(subscribe, () => deferred, () => null);
  const install = prompt
    ? async () => {
        await prompt.prompt();
        // A prompt can be shown once; Chrome sends a new event if the person can still install.
        deferred = null;
        emit();
      }
    : null;
  return { where: at, install };
}
