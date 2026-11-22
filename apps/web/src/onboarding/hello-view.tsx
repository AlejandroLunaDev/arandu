"use client";

import { Said, useReveal } from "@/ui/arandu-says";
import { Cat } from "@/ui/cat";
import { MainButton } from "@/ui/main-button";
import ui from "@/ui/ui.module.css";
import styles from "./onboarding.module.css";

const HELLO = "Oi! Eu sou o Arandu. Vou te ajudar a achar um caminho que tenha a sua cara, e a experimentar ele antes de escolher.";

// O01: Arandu says hello, the cat under its bubble, and the person starts, or signs in with Google to the account
// they already have and comes back to /app, whose front door takes them on.
export function HelloView({ busy, failed, onStart, onGoogle }: { busy: boolean; failed: boolean; onStart: () => void; onGoogle: () => void }) {
  const { shown, done } = useReveal(HELLO);
  return (
    <main className={styles.screen}>
      <div className={styles.glow} />
      <section className={styles.hello}>
        <div className={`${ui.bubble} ${styles.bubble}`} role="status">
          <Said text={HELLO} shown={shown} />
        </div>
        <Cat mood="sit" size={220} className={styles.heroCat} />
      </section>
      {/* Mounted from the start so the cat does not move when the buttons come; hidden (and unclickable) until then. */}
      <footer className={`${styles.foot} ${styles.last} ${done ? ui.after : ui.unsaid}`}>
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
          onClick={onGoogle}
        >
          Já tenho uma conta
        </button>
      </footer>
    </main>
  );
}
