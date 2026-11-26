import Image from "next/image";
import styles from "./ui.module.css";

// The game's currency: patinhas, Arandu's paw (the owner's call, 2026-11-26). The paw means nothing else in the app:
// a studied day is a ratinho, and where the person stands is the toy ball.
export const patinhaWord = (amount: number) => (amount === 1 ? "patinha" : "patinhas");
export const patinhas = (amount: number) => `${amount} ${patinhaWord(amount)}`;

export function Patinha({ className }: { className?: string }) {
  return <Image className={`${styles.patinha} ${className ?? ""}`} src="/img/props/paw.webp" alt="" width={26} height={26} />;
}
