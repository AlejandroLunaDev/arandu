"use client";

import { useState } from "react";
import styles from "./ui.module.css";

// The composer: one field, and the send button appears inside it once there is text.
// shortcut: no mic yet (voice to text comes with the talking part); it goes where the send button sits.
export function Composer({ placeholder, onSend }: { placeholder: string; onSend: (text: string) => void }) {
  const [draft, setDraft] = useState("");
  const text = draft.trim();
  return (
    <form
      className={styles.compose}
      onSubmit={(event) => {
        event.preventDefault();
        if (!text) return;
        onSend(text);
        setDraft("");
      }}
    >
      <div className={styles.field}>
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={placeholder}
          aria-label="Mensagem para o Arandu"
          enterKeyHint="send"
          autoComplete="off"
          // The API takes up to 1000 characters of the person's own words.
          maxLength={1000}
        />
        {text && (
          <button type="submit" className={styles.send} aria-label="Enviar">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 19V5M6 11l6-6 6 6" />
            </svg>
          </button>
        )}
      </div>
    </form>
  );
}
