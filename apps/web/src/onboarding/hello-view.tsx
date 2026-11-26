"use client";

import { Said, useReveal } from "@/ui/arandu-says";
import { Cat } from "@/ui/cat";
import { MainButton } from "@/ui/main-button";
import ui from "@/ui/ui.module.css";
import { Wordmark } from "@/ui/wordmark";
import styles from "./onboarding.module.css";

const HELLO = "Oi, eu sou o Arandu! Vou te ajudar a escolher o que estudar na faculdade. Antes de decidir, você prova matérias de verdade de cada curso.";

// O01: the logo at the top, Arandu saying hello with the cat under his thought, and the person starts, or signs in with Google to the account
// they already have and comes back to /app, whose front door takes them on.
export function HelloView({ busy, failed, onStart, onGoogle }: { busy: boolean; failed: boolean; onStart: () => void; onGoogle: () => void }) {
  const { shown, done } = useReveal(HELLO);
  return (
    <main className={styles.screen}>
      <div className={styles.glow} />
      {/* The logo, big at the top: this screen is the person's first contact with the app, and the only one that shows it. */}
      <p className={`${ui.wordmark} ${styles.brand}`}>
        <Wordmark />
      </p>
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
