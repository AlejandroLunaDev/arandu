"use client";

import { useEffect } from "react";

// iOS Safari ignores interactive-widget: its keyboard covers the page instead of shrinking it, and the page slides
// up under it. The visible height (visualViewport) sizes the app column instead (h-app), and the page goes back to
// the top. Only unzoomed: a pinch zoom pans freely.
export function FitViewport() {
  useEffect(() => {
    const view = window.visualViewport;
    if (!view) return;
    const root = document.documentElement;
    const fit = () => {
      root.style.setProperty("--vvh", String(view.height));
      if (Math.abs(view.scale - 1) < 0.01 && window.scrollY !== 0) window.scrollTo(0, 0);
    };
    fit();
    view.addEventListener("resize", fit);
    view.addEventListener("scroll", fit);
    return () => {
      view.removeEventListener("resize", fit);
      view.removeEventListener("scroll", fit);
      root.style.removeProperty("--vvh");
    };
  }, []);
  return null;
}
