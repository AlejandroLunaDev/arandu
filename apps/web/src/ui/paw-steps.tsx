import styles from "./ui.module.css";

/**
 * The way through a run of steps (the onboarding's questions, a lesson's cards and exercises) as a trail of paw
 * prints: the `at` first ones are lit, and the newest of them lands. Prints, not the paw: that one is the currency.
 */
export function PawSteps({ total, at, label }: { total: number; at: number; label: string }) {
  return (
    <div className={styles.steps} role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={total} aria-valuenow={at}>
      {Array.from({ length: total }, (_, i) => (
        <svg key={i} viewBox="0 0 24 24" aria-hidden="true" data-on={i < at || undefined} data-now={i === at - 1 || undefined}>
          <path d="M12 12.4c-3.2 0-5.6 2.5-5.6 5 0 1.9 1.6 2.9 3.3 2.9 1 0 1.6-.4 2.3-.4s1.3.4 2.3.4c1.7 0 3.3-1 3.3-2.9 0-2.5-2.4-5-5.6-5z" />
          <ellipse cx="6" cy="10.4" rx="1.8" ry="2.4" transform="rotate(-22 6 10.4)" />
          <ellipse cx="9.9" cy="6.6" rx="1.9" ry="2.6" transform="rotate(-8 9.9 6.6)" />
          <ellipse cx="14.1" cy="6.6" rx="1.9" ry="2.6" transform="rotate(8 14.1 6.6)" />
          <ellipse cx="18" cy="10.4" rx="1.8" ry="2.4" transform="rotate(22 18 10.4)" />
        </svg>
      ))}
    </div>
  );
}
