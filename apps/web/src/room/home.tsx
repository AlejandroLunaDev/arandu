"use client";

import type { Home, League } from "@arandu/contracts";
import Image from "next/image";
import Link from "next/link";
import { Patinha, patinhaWord } from "@/ui/patinha";
import { DailyGift } from "./daily-gift";
import { RoomStage } from "./room-stage";
import styles from "./room.module.css";

const DAYS = ["S", "T", "Q", "Q", "S", "S", "D"];
// The API counts the week in São Paulo time (progress.repository TIME_ZONE), so "today" is that date there.
const dayFormat = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" });

// S1, the room: this week's ratinhos and the wallet on one line, the day's gift, and under the room three ways on, as on
// Clash Royale's home: the catalog, Continuar (the book the person is on, GET /me) and the league (GET /me/league).
// Between them, Arandu's living room in 3D (RoomStage): his sofa, and shelves of professions to open, as the landing's.
export function HomeView({ home, league }: { home: Home; league: League }) {
  const { wallet, week, current } = home;
  const today = dayFormat.format(new Date());
  return (
    <main className={styles.room}>
      <h1 className="sr-only">Quarto</h1>
      <header className={styles.top}>
        <section className={styles.week} aria-label={`${week.studied}${week.goal ? ` de ${week.goal}` : ""} dias esta semana`}>
          <div aria-hidden="true">
            {week.days.map((day, i) => (
              <span key={day.date} data-on={day.studied || undefined} data-today={day.date === today || undefined}>
                <Image src="/img/props/mouse.webp" alt="" width={20} height={13} />
                <i>{DAYS[i]}</i>
              </span>
            ))}
          </div>
        </section>
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
      <DailyGift amount={wallet.dailyGift} />
      <RoomStage />
      <nav className={styles.ways} aria-label="Para onde ir">
        <Link className={styles.side} href="/app/catalogo">
          <Image src="/img/props/books.webp" alt="" width={41} height={30} />
          Catálogo
        </Link>
        {current ? (
          <Link className={styles.go} href="/app/caminho">
            <strong>{current.nextTopic === null ? "Ver o caminho" : "Continuar"}</strong>
            <span>{current.nextTopic === null ? `${current.name} · completo` : `${current.name} · capítulo ${current.nextTopic + 1}`}</span>
          </Link>
        ) : (
          <Link className={styles.go} href="/app/catalogo">
            <strong>Escolher um livro</strong>
            <span>Viva uma matéria de verdade</span>
          </Link>
        )}
        <Link className={styles.side} href="/app/liga" data-new={league.promotion || undefined}>
          {/* The leagues go from Calouro to Sábio: a laurel, the crown of the wise, not a trophy. */}
          <Image src="/img/props/laurel.webp" alt="" width={30} height={30} />
          {league.league.name}
          {league.promotion && <span className="sr-only">, nova liga</span>}
        </Link>
      </nav>
    </main>
  );
}
