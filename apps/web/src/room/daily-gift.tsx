"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { takeDailyGift } from "@/caminho/actions";
import { useAttempt } from "@/ui/use-attempt";
import styles from "./room.module.css";

// S1: the day's peixinhos, a gift the person takes on the day's first visit (Wallet.dailyGift, POST /me/daily-gift).
export function DailyGift({ amount }: { amount: number }) {
  const router = useRouter();
  const { busy, failed, attempt } = useAttempt();
  return (
    <section className={styles.gift} aria-label="Presente do dia">
      <Image src="/img/props/fish.webp" alt="" width={36} height={36} />
      <div>
        <strong>Presente do dia</strong>
        <span role={failed ? "alert" : undefined}>{failed ? "Não consegui agora. Tenta de novo?" : `+${amount} peixinhos para as lições de hoje`}</span>
      </div>
      <button
        type="button"
        disabled={busy}
        onClick={() =>
          attempt(async () => {
            await takeDailyGift();
            router.refresh();
          })
        }
      >
        {busy ? "Pegando…" : "Pegar"}
      </button>
    </section>
  );
}
