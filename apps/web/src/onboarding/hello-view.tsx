"use client";

import Image from "next/image";
import { supabase } from "@/app-shell/api";
import { useReveal } from "@/ui/arandu-says";
import { MainButton } from "@/ui/main-button";
import ui from "@/ui/ui.module.css";
import styles from "./onboarding.module.css";

const HELLO = "Oi! Eu sou o Arandu. Vou te ajudar a achar um caminho que tenha a sua cara, e a experimentar ele antes de escolher.";

// O01: Arandu says hello, the cat under its bubble, and the person starts, or signs in with Google to the account
// they already have and comes back to /app, whose front door takes them on.
export function HelloView({ busy, failed, onStart }: { busy: boolean; failed: boolean; onStart: () => void }) {
  const { shown, done } = useReveal(HELLO);
  return (
    <main className={styles.screen}>
      <div className={styles.glow} />
      <section className={styles.hello}>
        <div className={`${ui.bubble} ${styles.bubble}`} role="status">
          <span className="sr-only">{shown > 0 && HELLO}</span>
          <span aria-hidden="true">
            {HELLO.split(" ").slice(0, shown).join(" ")}
            <span className={ui.caret} />
          </span>
        </div>
        <Image src="/img/arandu/sitting.webp" alt="Arandu" width={168} height={168} priority />
      </section>
      {done && (
        <footer className={`${styles.foot} ${styles.last} ${ui.after}`}>
          {failed && (
            <p className={styles.error} role="alert">
              Não consegui começar agora. Tenta de novo?
            </p>
          )}
          <MainButton disabled={busy} onClick={onStart}>
            Começar
          </MainButton>
          <button
            type="button"
            className={ui.ghost}
            disabled={busy}
            onClick={() => supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${location.origin}/app` } })}
          >
            Já tenho uma conta
          </button>
        </footer>
      )}
    </main>
  );
}
