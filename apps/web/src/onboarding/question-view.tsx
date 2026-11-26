"use client";

import { AranduSays, useReveal } from "@/ui/arandu-says";
import { Back } from "@/ui/back";
import { Composer } from "@/ui/composer";
import { MainButton } from "@/ui/main-button";
import { PawSteps } from "@/ui/paw-steps";
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
        <PawSteps total={7} at={step} label={`Pergunta ${step} de 7`} />
      </header>
      <div className={`${styles.body} ${styles.talk}`}>
        <div className={busy ? styles.thinking : undefined}>
          <AranduSays text={say} shown={shown} pose={question?.pose ?? "sit"} free />
        </div>
      </div>
      {question ? (
        <Composer placeholder={question.placeholder} busy={busy} onSend={onSay}>
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
        </Composer>
      ) : (
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
      )}
    </main>
  );
}
