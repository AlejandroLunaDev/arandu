import styles from "./ui.module.css";

/** The boards' back chevron, top left: one screen back. */
export function Back({ onBack }: { onBack: () => void }) {
  return (
    <button type="button" className={styles.back} aria-label="Voltar" onClick={onBack}>
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M15 6l-6 6 6 6" />
      </svg>
    </button>
  );
}
