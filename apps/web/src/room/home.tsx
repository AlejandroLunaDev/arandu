import type { Home } from "@arandu/contracts";
import Image from "next/image";
import { Cat } from "@/ui/cat";
import styles from "./room.module.css";

const DAYS = ["S", "T", "Q", "Q", "S", "S", "D"];
// The API counts the week in São Paulo time (progress.repository TIME_ZONE), so "today" is that date there.
const dayFormat = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" });

// S1, the room: the wallet, this week's patinhas and the book the person is on (GET /me).
// shortcut: the 3D room and cat, Arandu's talk and "Continuar" into the next stop come with the room step; for now it
// shows where the person stands.
export function HomeView({ home }: { home: Home }) {
  const { wallet, week, current } = home;
  const today = dayFormat.format(new Date());
  return (
    <main className={styles.room}>
      <h1 className="sr-only">Quarto</h1>
      <header className={styles.top}>
        <p>
          <Image src="/img/props/yarn.webp" alt="" width={26} height={17} />
          {wallet.novelos}
          <span className="sr-only"> de {wallet.maxNovelos} novelos</span>
        </p>
        <p>
          <Image src="/img/props/fish.webp" alt="" width={26} height={17} />
          {wallet.peixinhos}
          <span className="sr-only"> peixinhos</span>
        </p>
      </header>
      <section className={styles.week} aria-label={`${week.studied}${week.goal ? ` de ${week.goal}` : ""} dias esta semana`}>
        <div aria-hidden="true">
          {week.days.map((day, i) => (
            <span key={day.date} data-on={day.studied || undefined} data-today={day.date === today || undefined}>
              <Image src="/img/props/paw.webp" alt="" width={20} height={20} />
              <i>{DAYS[i]}</i>
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
        <Cat mood="sit" size={220} className={styles.catModel} />
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
