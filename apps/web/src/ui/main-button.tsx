import type { ButtonHTMLAttributes } from "react";
import styles from "./ui.module.css";

/** The screen's main action: ink with a violet rim and cat ears, an amber chevron after the label. */
export function MainButton({ children, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type="button" className={styles.button} {...props}>
      {children}
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M9 6l6 6-6 6" />
      </svg>
    </button>
  );
}
