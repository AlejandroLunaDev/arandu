"use client";

import type { Wallet } from "@arandu/contracts";
import { useState } from "react";
import styles from "@/onboarding/onboarding.module.css";
import { Cat } from "@/ui/cat";
import { Patinha, patinhas } from "@/ui/patinha";
import { useAttempt } from "@/ui/use-attempt";
import c from "./caminho.module.css";

// P6: the last life is gone. The person goes on with the lesson for the currency, or leaves it and loses its progress.
// onGoOn returns whether the API agreed.
export function OutOfLives({ wallet, onGoOn, onClose }: { wallet: Wallet; onGoOn: () => Promise<boolean>; onClose: () => void }) {
  const { busy, failed, attempt } = useAttempt();
  const [refused, setRefused] = useState(false);
  return (
    <>
      <div className={styles.body}>
        <section className={c.out}>
          <Cat mood="lie" size={150} label="Arandu deitado, descansando" className={c.outCat} />
          <h1>Suas vidas acabaram</h1>
          <p>Dá para seguir de onde você parou. Se sair agora, a lição recomeça do início na próxima vez.</p>
        </section>
        <div className={c.ways}>
          <button
            type="button"
            className={c.way}
            disabled={busy || wallet.currency < wallet.continuePrice}
            onClick={() =>
              attempt(async () => {
                setRefused(false);
                if (!(await onGoOn())) setRefused(true);
              })
            }
          >
            <Patinha />
            <span>
              <b>Continuar a lição</b>
              <small>
                {patinhas(wallet.continuePrice)} · você tem {wallet.currency}
              </small>
            </span>
          </button>
          {(refused || failed) && (
            <p className={styles.error} role="alert">
              {refused ? "Faltam patinhas para continuar." : "Não consegui agora. Tenta de novo?"}
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
