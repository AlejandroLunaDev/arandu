"use client";

import type { Wallet } from "@arandu/contracts";
import Image from "next/image";
import { useEffect, useState } from "react";
import styles from "@/onboarding/onboarding.module.css";
import { Cat } from "@/ui/cat";
import { useAttempt } from "@/ui/use-attempt";
import c from "./caminho.module.css";

/** "47 min", "1 h 05 min": how long until the novelos come back, at midnight. */
function wait(at: string | null, now: number): string | null {
  if (!at) return null;
  const minutes = Math.max(1, Math.ceil((Date.parse(at) - now) / 60000));
  return minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, "0")} min`;
}

// P6: no novelos left. They come back at midnight; meanwhile the person re-reads the chapter's cards (one novelo, once
// a chapter) or buys one with peixinhos, dearer each time that day. Each returns whether the API agreed.
export function OutOfNovelos({
  wallet,
  onReread,
  onRefill,
  onClose,
}: {
  wallet: Wallet;
  onReread: () => Promise<boolean>;
  onRefill: () => Promise<boolean>;
  onClose: () => void;
}) {
  const { busy, failed, attempt } = useAttempt();
  const [refused, setRefused] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  // The countdown moves on its own while the screen is open.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);
  const next = wait(wallet.nextNoveloAt, now);

  const run = (call: () => Promise<boolean>, no: string) =>
    attempt(async () => {
      setRefused(null);
      if (!(await call())) setRefused(no);
    });

  return (
    <>
      <div className={styles.body}>
        <section className={c.out}>
          <Cat mood="lie" size={150} label="Arandu deitado, descansando" className={c.outCat} />
          <h1>Seus novelos acabaram</h1>
          <p>Eles voltam à meia-noite. Enquanto isso, você pode seguir de outro jeito.</p>
          {next && <span className={c.timer}>Os novelos voltam em {next}</span>}
        </section>
        <div className={c.ways}>
          <button type="button" className={c.way} disabled={busy} onClick={() => run(onReread, "Este capítulo já te deu um novelo por reler.")}>
            <Image src="/img/props/books.webp" alt="" width={40} height={40} />
            <span>
              <b>Reler os cards do capítulo</b>
              <small>Ganha 1 novelo, sem custo</small>
            </span>
          </button>
          <button
            type="button"
            className={c.way}
            disabled={busy || wallet.peixinhos < wallet.refillPrice}
            onClick={() => run(onRefill, "Faltam peixinhos para comprar um novelo.")}
          >
            <Image src="/img/props/fish.webp" alt="" width={40} height={40} />
            <span>
              <b>Comprar 1 novelo</b>
              <small>
                {wallet.refillPrice} peixinhos · você tem {wallet.peixinhos}
              </small>
            </span>
          </button>
          {(refused || failed) && (
            <p className={styles.error} role="alert">
              {refused ?? "Não consegui agora. Tenta de novo?"}
            </p>
          )}
        </div>
      </div>
      <footer className={`${styles.foot} ${styles.last}`}>
        <button type="button" className={c.ghost} onClick={onClose}>
          Voltar ao caminho
        </button>
      </footer>
    </>
  );
}
