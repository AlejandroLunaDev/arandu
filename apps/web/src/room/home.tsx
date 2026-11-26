import type { Home } from "@arandu/contracts";
import Image from "next/image";
import Link from "next/link";
import { Cat } from "@/ui/cat";
import { Patinha, patinhaWord } from "@/ui/patinha";
import { DailyGift } from "./daily-gift";
import styles from "./room.module.css";

const DAYS = ["S", "T", "Q", "Q", "S", "S", "D"];
// The API counts the week in São Paulo time (progress.repository TIME_ZONE), so "today" is that date there.
const dayFormat = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" });

// S1, the room: the wallet, the day's gift, this week's ratinhos and the book the person is on (GET /me), which leads
// to its path.
// shortcut: the 3D room and Arandu's talk come with the room step; for now it shows where the person stands.
export function HomeView({ home }: { home: Home }) {
  const { wallet, week, current } = home;
  const today = dayFormat.format(new Date());
  return (
    <main className={styles.room}>
      <h1 className="sr-only">Quarto</h1>
      <header className={styles.top}>
        <p>
          <Patinha />
          {wallet.currency}
          <span className="sr-only"> {patinhaWord(wallet.currency)}</span>
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
              <Image src="/img/props/mouse.webp" alt="" width={26} height={17} />
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
      {wallet.dailyGift > 0 && <DailyGift amount={wallet.dailyGift} />}
      <div className={styles.cat}>
        <Cat mood="sit" size={220} className={styles.catModel} />
      </div>
      {current && (
        <Link className={styles.book} href="/app/caminho">
          <p>Seu livro</p>
          <strong>{current.name}</strong>
          <span>{current.nextTopic === null ? "Livro completo!" : `Próximo: capítulo ${current.nextTopic + 1} de ${current.total}`}</span>
          <b>
            {current.nextTopic === null ? "Ver o caminho" : "Continuar"}
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M9 6l6 6-6 6" />
            </svg>
          </b>
        </Link>
      )}
    </main>
  );
}
