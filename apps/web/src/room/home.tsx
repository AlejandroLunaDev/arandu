"use client";

import type { Home } from "@arandu/contracts";
import Image from "next/image";
import { useEffect, useState } from "react";
import { api } from "@/app-shell/api";
import styles from "./room.module.css";

const DAYS = ["S", "T", "Q", "Q", "S", "S", "D"];

// S1, the room: the wallet, this week's patinhas and the book the person is on (GET /me).
// shortcut: the 3D room and cat, Arandu's talk and "Continuar" into the next stop come with the room step; for now it
// shows where the person stands.
export function HomeView() {
  const [home, setHome] = useState<Home | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    api<Home>("/me").then(setHome, () => setFailed(true));
  }, []);

  if (failed)
    return (
      <p className="type-body p-4 text-center text-error" role="alert">
        Não consegui abrir seu quarto agora. Tenta de novo mais tarde?
      </p>
    );
  if (!home) return null;

  const { wallet, week, current } = home;
  return (
    <main className={styles.room}>
      <h1 className="sr-only">Quarto</h1>
      <header className={styles.top}>
        <span aria-label={`${wallet.novelos} de ${wallet.maxNovelos} novelos`}>
          <strong>{wallet.novelos}</strong> novelos
        </span>
        <span>
          <strong>{wallet.peixinhos}</strong> peixinhos
        </span>
      </header>
      <section className={styles.week} aria-label={`${week.studied}${week.goal ? ` de ${week.goal}` : ""} dias esta semana`}>
        <div aria-hidden="true">
          {week.days.map((day, i) => (
            <span key={day.date} data-on={day.studied || undefined}>
              <i />
              {DAYS[i]}
            </span>
          ))}
        </div>
        <p>
          <strong>
            {week.studied}
            {week.goal && ` de ${week.goal}`}
          </strong>{" "}
          esta semana
        </p>
      </section>
      <div className={styles.cat}>
        <Image src="/img/arandu/sitting.webp" alt="Arandu" width={168} height={168} priority />
      </div>
      {current && (
        <section className={styles.book}>
          <p>Seu livro</p>
          <strong>{current.name}</strong>
          <span>{current.nextTopic === null ? "Livro completo!" : `Próxima: parada ${current.nextTopic + 1} de ${current.total}`}</span>
        </section>
      )}
    </main>
  );
}
