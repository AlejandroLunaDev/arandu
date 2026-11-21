"use client";

import { useEffect, type ReactNode } from "react";
import { InstallOptions } from "./install-options";
import { useInstall } from "./use-install";

// On a phone the app runs only installed: in a phone's browser tab it shows how to install instead.
// A desktop browser gets the app ("Testar no navegador").
export function InstallGate({ children }: { children: ReactNode }) {
  const { where } = useInstall();

  useEffect(() => {
    navigator.serviceWorker?.register("/sw.js");
  }, []);

  // Nothing until hydrated: the server can't tell a phone from a desktop.
  if (where === null) return null;
  if (where === "installed" || where === "desktop") return children;
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="type-h1">Instale o Arandu</h1>
      <InstallOptions />
    </main>
  );
}
