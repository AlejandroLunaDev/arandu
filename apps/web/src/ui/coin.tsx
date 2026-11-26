import styles from "./ui.module.css";

// shortcut: the game's currency has no name or art yet (the owner's call); "moedas" and this coin stand in for both,
// here only, until it does.
export const coinWord = (amount: number) => (amount === 1 ? "moeda" : "moedas");
export const coins = (amount: number) => `${amount} ${coinWord(amount)}`;

export function Coin({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={`${styles.coin} ${className ?? ""}`} aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
    </svg>
  );
}
