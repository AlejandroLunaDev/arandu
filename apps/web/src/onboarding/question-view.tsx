"use client";

import { AranduSays, useReveal } from "@/ui/arandu-says";
import { Composer } from "@/ui/composer";
import { MainButton } from "@/ui/main-button";
import ui from "@/ui/ui.module.css";
import styles from "./onboarding.module.css";
import type { Question } from "./questions";

type Props = {
  /** null once Arandu is done: its closing words, nothing to pick. */
  question: Question | null;
  /** What Arandu says: its reaction to the last answer and this question, in its own words. */
  say: string;
  /** Arandu's quick replies to its own question, so what there is to tap always fits what it asked. */
  options: string[];
  /** The question's number, of seven. */
  step: number;
  picks: string[];
  said: string | null;
  busy: boolean;
  failed: boolean;
  onToggle: (pick: string) => void;
  onSay: (text: string) => void;
  onContinue: () => void;
};

// One of the seven questions (O02-O08): Arandu asks, the person taps its quick replies, writes, talks, or mixes them.
export function QuestionView({ question, say, options, step, picks, said, busy, failed, onToggle, onSay, onContinue }: Props) {
  const { shown, done } = useReveal(say);
  return (
    <main className={styles.screen}>
      <header className={styles.bar}>
        <div className={styles.segments} role="progressbar" aria-label={`Pergunta ${step} de 7`} aria-valuemin={0} aria-valuemax={7} aria-valuenow={step}>
          {Array.from({ length: 7 }, (_, i) => (
            <i key={i} data-on={i < step || undefined} />
          ))}
        </div>
      </header>
      <div className={styles.body}>
        <div className={busy ? styles.thinking : undefined}>
          <AranduSays text={say} shown={shown} pose={question?.pose ?? "standing"} />
        </div>
        {done && question && (
          <div className={ui.after}>
            {options.length > 0 && (
              <div className={styles.chips}>
                {options.map((pick) => (
                  <button key={pick} type="button" className={styles.chip} aria-pressed={picks.includes(pick)} onClick={() => onToggle(pick)}>
                    {pick}
                  </button>
                ))}
              </div>
            )}
            {said && <p className={ui.you}>{said}</p>}
          </div>
        )}
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
      {question && <Composer placeholder={question.placeholder} busy={busy} onSend={onSay} onNext={picks.length > 0 ? onContinue : undefined} />}
    </main>
  );
}
