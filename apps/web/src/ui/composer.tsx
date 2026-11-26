"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import styles from "./ui.module.css";

/** The browser's dictation (Web Speech API): Chrome, Edge and Safari have it, prefixed in some; Firefox does not. */
type Dictation = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};
type DictationClass = new () => Dictation;

const noChanges = () => () => {};

function dictationClass(): DictationClass | null {
  const w = window as unknown as { SpeechRecognition?: DictationClass; webkitSpeechRecognition?: DictationClass };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

// The composer: one field and one round button inside it, which is whatever comes next. With text it sends; with
// nothing typed it is the mic, whose voice becomes text in the field for the person to read and send. Without
// dictation in the browser there is no mic.
// While Arandu is answering (busy) the field is read-only: its answer brings a new question and a new, empty composer,
// so words typed in the meantime would be lost. What the person last sent stays over the field, so they see it went.
export function Composer({ placeholder, busy, onSend }: { placeholder: string; busy: boolean; onSend: (text: string) => void }) {
  const [draft, setDraft] = useState("");
  const [sent, setSent] = useState<string | null>(null);
  const [listening, setListening] = useState(false);
  const dictation = useRef<Dictation | null>(null);
  const field = useRef<HTMLTextAreaElement>(null);
  const text = draft.trim();

  // False on the server and while hydrating, so both renders agree; read from the browser after that.
  const canDictate = useSyncExternalStore(noChanges, () => dictationClass() !== null, () => false);
  useEffect(() => () => dictation.current?.stop(), []);
  // Dictation writes past the field's last line: keep the newest words in sight.
  useEffect(() => {
    if (listening && field.current) field.current.scrollTop = field.current.scrollHeight;
  }, [draft, listening]);

  const listen = () => {
    if (listening) return dictation.current?.stop();
    const Dictation = dictationClass();
    if (!Dictation) return;
    const d = new Dictation();
    d.lang = "pt-BR";
    d.interimResults = true;
    d.continuous = false;
    d.onresult = (event) => setDraft(Array.from(event.results, (result) => result[0]?.transcript ?? "").join(""));
    d.onend = () => setListening(false);
    dictation.current = d;
    setListening(true);
    d.start();
  };

  return (
    <>
      {sent && (
        <p className={`${styles.you} ${styles.echo}`}>
          <span>{sent}</span>
        </p>
      )}
      <form
        className={styles.compose}
        onSubmit={(event) => {
          event.preventDefault();
          if (busy || !text) return;
          // Sent: a late dictation result must not write the message back into the field.
          if (dictation.current) dictation.current.onresult = null;
          dictation.current?.stop();
          onSend(text);
          setSent(text);
          setDraft("");
        }}
      >
        {listening && (
          <p className={styles.listening} role="status">
            Ouvindo… vira texto no campo
          </p>
        )}
        <div className={styles.field}>
          {/* The field grows with what is written or said, up to a few lines, then scrolls: a hidden copy of the text
              (data-text, drawn by CSS) sits under it and gives it its height. */}
          <div className={styles.grow} data-text={draft}>
            <textarea
              ref={field}
              rows={1}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              // Enter sends, as in a chat; Shift+Enter breaks the line. Not while an IME is still composing a word.
              onKeyDown={(event) => {
                if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return;
                event.preventDefault();
                event.currentTarget.form?.requestSubmit();
              }}
              placeholder={placeholder}
              aria-label="Mensagem para o Arandu"
              enterKeyHint="send"
              autoComplete="off"
              readOnly={busy}
              // The API takes up to 1000 characters of the person's own words.
              maxLength={1000}
            />
          </div>
          {text ? (
            <button type="submit" className={styles.send} aria-label="Enviar" disabled={busy}>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 19V5M6 11l6-6 6 6" />
              </svg>
            </button>
          ) : (
            canDictate && (
              <button
                type="button"
                className={styles.mic}
                data-on={listening || undefined}
                aria-label={listening ? "Parar de ouvir" : "Falar com o Arandu"}
                aria-pressed={listening}
                disabled={busy}
                onClick={listen}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <rect x="9" y="3" width="6" height="11" rx="3" />
                  <path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21" />
                </svg>
              </button>
            )
          )}
        </div>
      </form>
    </>
  );
}
