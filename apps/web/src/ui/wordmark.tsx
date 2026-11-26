import styles from "./ui.module.css";

/**
 * The logo: "arand", and a cat on its back is the u (head on one stem, paws up on the other). Its letters take the
 * size of whoever holds them, which also gives them `ui.wordmark` (the logo's face and tracking).
 */
export function Wordmark() {
  return (
    <>
      <span aria-hidden="true">arand</span>
      <svg className={styles.wordU} viewBox="-4 -8 80 72" aria-hidden="true">
        <path d="M40 58 C 62 62 78 50 74 36 C 72 29 64 31 67 37" fill="none" stroke="currentColor" strokeWidth="5.5" strokeLinecap="round" />
        <path d="M10.5 16 V 38 A 21.5 21.5 0 0 0 53.5 38 V 22" fill="none" stroke="currentColor" strokeWidth="15" />
        <circle cx="48.5" cy="14" r="5" />
        <circle cx="59" cy="15.5" r="5" />
        <circle cx="10.5" cy="10" r="13.5" />
        <path d="M-2.5 6 L-1.5 -9 L8 -2 Z M13 -2 L22.5 -9 L23.5 6 Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        <path className={styles.wordEar} d="M0.8 -0.5 L1.2 -5 L5 -2 Z M16 -2 L19.8 -5 L20.2 -0.5 Z" />
        <circle className={styles.wordEye} cx="5.5" cy="10.5" r="3.4" />
        <circle className={styles.wordEye} cx="15.5" cy="10.5" r="3.4" />
      </svg>
      <span className="sr-only">Arandu</span>
    </>
  );
}
