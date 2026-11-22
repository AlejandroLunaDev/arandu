"use client";

import type { Home, StopContent, StopResult, Wallet } from "@arandu/contracts";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import styles from "@/onboarding/onboarding.module.css";
import p from "@/onboarding/path.module.css";
import { StopView } from "@/onboarding/stop-view";
import { Cat } from "@/ui/cat";
import { MainButton } from "@/ui/main-button";
import { useAttempt } from "@/ui/use-attempt";
import { finishStop, refillNovelos, rereadStop, spendNovelo } from "./actions";

const DAYS = ["S", "T", "Q", "Q", "S", "S", "D"];

// P2-P7: a stop of the path. The cards and exercises are the onboarding's (StopView), paid in novelos here; at the end
// P7 shows what it gave.
export function PathStop({ stop, wallet }: { stop: StopContent; wallet: Wallet }) {
  const router = useRouter();
  const { busy, failed, attempt } = useAttempt();
  const [done, setDone] = useState<{ result: StopResult; home: Home } | null>(null);
  const disciplineId = stop.discipline.id;
  const topic = stop.topic.index;
  const back = () => router.push("/app/caminho");

  if (done) return <StopDone stop={stop} {...done} onNext={back} />;
  return (
    <StopView
      stop={stop}
      caption={`Arandu explica · capítulo ${topic + 1} de ${stop.topic.total}`}
      busy={busy}
      failed={failed}
      novelos={{ wallet, spend: spendNovelo, reread: () => rereadStop(disciplineId, topic), refill: refillNovelos }}
      onClose={back}
      onDone={(mistakes) => attempt(async () => setDone(await finishStop(disciplineId, topic, mistakes)))}
    />
  );
}

// P7: the stop is done, with what it gave and the week's patinhas.
function StopDone({ stop, result, home, onNext }: { stop: StopContent; result: StopResult; home: Home; onNext: () => void }) {
  const sources = new Set(stop.cards.map((card) => card.source.url)).size;
  // An achievement surprises him first; then he jumps for joy.
  const [mood, setMood] = useState<"surprised" | "hop">(result.achievements.length > 0 ? "surprised" : "hop");
  useEffect(() => {
    if (mood !== "surprised") return;
    const id = setTimeout(() => setMood("hop"), 1400);
    return () => clearTimeout(id);
  }, [mood]);
  return (
    <main className={styles.screen}>
      <div className={styles.body}>
        <section className={p.done}>
          <Cat mood={mood} size={190} label="Arandu pulando de alegria" className={p.doneCat} />
          <p className={p.label}>
            Capítulo {stop.topic.index + 1} de {stop.topic.total}
          </p>
          <h1>Capítulo concluído!</h1>
          <p className={p.meta}>{stop.topic.text}</p>
          <div className={p.stats}>
            <div>
              <Image src="/img/props/books.webp" alt="" width={40} height={40} />
              <strong>+{result.sabedoria}</strong>
              <small>de sabedoria</small>
            </div>
            {result.peixinhos > 0 && (
              <div>
                <Image src="/img/props/fish.webp" alt="" width={40} height={40} />
                <strong>+{result.peixinhos}</strong>
                <small>peixinhos</small>
              </div>
            )}
            <div>
              <strong className={p.big}>{sources}</strong>
              <small>{sources === 1 ? "fonte para ler fora" : "fontes para ler fora"}</small>
            </div>
          </div>
        </section>
        <div className={p.week} aria-label={`Sua semana: ${home.week.studied} ${home.week.studied === 1 ? "dia" : "dias"} de estudo`}>
          {home.week.days.map((day, i) => (
            <span key={day.date} className={p.day} data-on={day.studied || undefined} aria-hidden="true">
              <Image src="/img/props/paw.webp" alt="" width={34} height={34} />
              {DAYS[i]}
            </span>
          ))}
        </div>
      </div>
      <footer className={`${styles.foot} ${styles.last}`}>
        <MainButton onClick={onNext}>Continuar o caminho</MainButton>
      </footer>
    </main>
  );
}
