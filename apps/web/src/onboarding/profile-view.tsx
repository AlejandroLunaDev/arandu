"use client";

import type { AranduProfile } from "@arandu/contracts";
import { AranduSays, useReveal } from "@/ui/arandu-says";
import { MainButton } from "@/ui/main-button";
import ui from "@/ui/ui.module.css";
import styles from "./onboarding.module.css";

// shortcut: the board adds "Se algo ficou errado, toca pra corrigir."; tags can't be corrected yet, so it waits.
const SAY = "Olha o que eu entendi de você.";

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

// O09: what Arandu understood of the person, read from the onboarding's conversation.
export function ProfileView({ profile, busy, failed, onNext }: { profile: AranduProfile; busy: boolean; failed: boolean; onNext: () => void }) {
  const { shown, done } = useReveal(SAY);
  return (
    <main className={styles.screen}>
      <div className={styles.body}>
        <AranduSays text={SAY} shown={shown} pose="paws-up" />
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
    </main>
  );
}
