"use client";

import type { AranduProfile } from "@arandu/contracts";
import { AranduSays, useReveal } from "@/ui/arandu-says";
import { Composer } from "@/ui/composer";
import { MainButton } from "@/ui/main-button";
import ui from "@/ui/ui.module.css";
import styles from "./onboarding.module.css";

const SAY = "Olha o que eu entendi de você. Se algo ficou errado ou faltou, me conta.";

/** The profile's rows as on the O09 board; a row with nothing in it is left out. */
function rows(profile: AranduProfile): [label: string, items: string[]][] {
  const career = profile.careerIdea ?? (profile.covered.includes("careerIdea") ? "ainda não sabe" : null);
  const all: [string, string[]][] = [
    ["Gosta de", profile.likedSubjects],
    ["Acha difícil", profile.hardSubjects],
    ["Curte", profile.interests],
    ["Prefere", profile.workStyle],
    ["Admira", profile.admired],
    ["Carreira", career ? [career] : []],
  ];
  return all.filter(([, items]) => items.length > 0);
}

/** What Arandu says over the profile: his words come out one by one, each anew. */
function Says({ text }: { text: string }) {
  const { shown } = useReveal(text);
  return <AranduSays text={text} shown={shown} pose="sit" />;
}

// O09: what Arandu understood of the person, read from the onboarding's conversation. Something wrong or missing,
// the person tells him in their own words: it goes to the same conversation, and he reads the profile again.
export function ProfileView({
  profile,
  reply,
  busy,
  failed,
  onFix,
  onNext,
}: {
  profile: AranduProfile;
  /** Arandu's answer to the last correction, or null before any. */
  reply: string | null;
  busy: boolean;
  failed: boolean;
  onFix: (text: string) => void;
  onNext: () => void;
}) {
  const { done } = useReveal(SAY);
  return (
    <main className={styles.screen}>
      <div className={styles.body}>
        <div className={busy ? styles.thinking : undefined}>
          <Says key={reply ?? SAY} text={reply ?? SAY} />
        </div>
        {done && (
          <div className={`${styles.profile} ${ui.after}`}>
            <dl>
              {rows(profile).map(([label, items]) => (
                <div key={label} className="contents">
                  <dt>{label}</dt>
                  <dd>
                    {items.map((item) => (
                      <span key={item} className={styles.tag}>
                        {item}
                      </span>
                    ))}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        )}
      </div>
      {done ? (
        <Composer placeholder="Corrigir ou acrescentar algo" busy={busy} onSend={onFix}>
          <footer className={`${styles.foot} ${styles.last}`}>
            {failed && (
              <p className={styles.error} role="alert">
                Não consegui buscar as carreiras agora. Tenta de novo?
              </p>
            )}
            <MainButton disabled={busy} onClick={onNext}>
              Ver onde dá pra estudar
            </MainButton>
          </footer>
        </Composer>
      ) : (
        <footer className={`${styles.foot} ${styles.last}`}>
          {failed && (
            <p className={styles.error} role="alert">
              Não consegui buscar as carreiras agora. Tenta de novo?
            </p>
          )}
          <MainButton disabled={busy} onClick={onNext}>
            Ver onde dá pra estudar
          </MainButton>
        </footer>
      )}
    </main>
  );
}
