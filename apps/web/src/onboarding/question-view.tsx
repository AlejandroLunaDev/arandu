"use client";

import { AranduSays, useReveal } from "@/ui/arandu-says";
import { Back } from "@/ui/back";
import { Composer } from "@/ui/composer";
import { MainButton } from "@/ui/main-button";
import styles from "./onboarding.module.css";
import type { Question } from "./questions";

type Props = {
  /** null once Arandu is done: its closing words, nothing to answer. */
  question: Question | null;
  /** What Arandu says: its reaction to the last answer and this question, in its own words. */
  say: string;
  /** The question's number, of seven. */
  step: number;
  busy: boolean;
  failed: boolean;
  onSay: (text: string) => void;
  onContinue: () => void;
  /** Only on the first question: back to the greeting. */
  onBack?: () => void;
};

// One of the seven questions (O02-O08): Arandu asks, and the person answers in their own words, writing or talking.
export function QuestionView({ question, say, step, busy, failed, onSay, onContinue, onBack }: Props) {
  const { shown } = useReveal(say);
  return (
    <main className={styles.screen}>
      <header className={styles.bar}>
        {onBack && <Back onBack={onBack} />}
        {/* The way through the seven questions, as paw prints: one more lights up with each. */}
        <div className={styles.trail} role="progressbar" aria-label={`Pergunta ${step} de 7`} aria-valuemin={0} aria-valuemax={7} aria-valuenow={step}>
          {Array.from({ length: 7 }, (_, i) => (
            <svg key={i} viewBox="0 0 24 24" aria-hidden="true" data-on={i < step || undefined} data-now={i === step - 1 || undefined}>
              <path d="M12 12.4c-3.2 0-5.6 2.5-5.6 5 0 1.9 1.6 2.9 3.3 2.9 1 0 1.6-.4 2.3-.4s1.3.4 2.3.4c1.7 0 3.3-1 3.3-2.9 0-2.5-2.4-5-5.6-5z" />
              <ellipse cx="6" cy="10.4" rx="1.8" ry="2.4" transform="rotate(-22 6 10.4)" />
              <ellipse cx="9.9" cy="6.6" rx="1.9" ry="2.6" transform="rotate(-8 9.9 6.6)" />
              <ellipse cx="14.1" cy="6.6" rx="1.9" ry="2.6" transform="rotate(8 14.1 6.6)" />
              <ellipse cx="18" cy="10.4" rx="1.8" ry="2.4" transform="rotate(22 18 10.4)" />
            </svg>
          ))}
        </div>
      </header>
      <div className={styles.body}>
        <div className={busy ? styles.thinking : undefined}>
          <AranduSays text={say} shown={shown} pose={question?.pose ?? "sit"} />
        </div>
      </div>
      <footer className={styles.foot}>
        {failed && (
          <p className={styles.error} role="alert">
            Não consegui seguir agora. Tenta de novo?
          </p>
        )}
        {/* With a question, going on lives in the composer's button; Arandu's closing words have no composer. */}
        {!question && (
          <MainButton disabled={busy} onClick={onContinue}>
            Continuar
          </MainButton>
        )}
      </footer>
      {question && <Composer placeholder={question.placeholder} busy={busy} onSend={onSay} />}
    </main>
  );
}
