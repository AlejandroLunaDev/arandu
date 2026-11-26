"use client";

import { useEffect, useRef } from "react";
import { InstallOptions } from "./install-options";
import { useInstall } from "./use-install";

// The landing's way into the app. On a phone where Chrome offers its install prompt, it opens it
// (desktop Chrome offers one too, but a desktop gets the QR); anywhere
// else it opens how to get the app: the iPhone steps, or on a desktop the QR and "Testar no navegador".
// The room's small neon opens it (GET_APP_EVENT); the button is there for the keyboard, and without 3D.
/** What the room's small neon ("Baixe o app") sends when tapped: DownloadButton opens the ways into the app. */
export const GET_APP_EVENT = "arandu:get-app";

export function DownloadButton() {
  const { where, install } = useInstall();
  const dialog = useRef<HTMLDialogElement>(null);

  const open = () => (where === "phone" && install ? install() : dialog.current?.showModal());

  // iOS may open a home-screen app at the page it was added from, this landing: send it on to the app.
  useEffect(() => {
    if (where === "installed") location.replace("/app");
  }, [where]);
  useEffect(() => {
    addEventListener(GET_APP_EVENT, open);
    return () => removeEventListener(GET_APP_EVENT, open);
  });

  return (
    <div>
      <button type="button" className="ar-btn ar-btn--primary" onClick={open}>
        Baixar o app
      </button>
      <dialog
        ref={dialog}
        aria-label="Baixar o Arandu"
        className="m-auto max-w-xs rounded-card border border-border bg-surface p-6 text-center text-text backdrop:bg-bg/80"
        // A click on the backdrop lands on the dialog itself: it closes, as Esc does.
        onClick={(event) => event.target === event.currentTarget && event.currentTarget.close()}
      >
        <div className="flex flex-col items-center gap-4">
          <InstallOptions />
          <form method="dialog">
            <button className="ar-btn ar-btn--ghost ar-btn--sm">Fechar</button>
          </form>
        </div>
      </dialog>
    </div>
  );
}
