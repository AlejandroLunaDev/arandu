"use client";

import type { CareerPath, StopResult } from "@arandu/contracts";
import Image from "next/image";
import { type ReactNode, useState } from "react";
import { AranduSays, type Pose, useReveal } from "@/ui/arandu-says";
import { MainButton } from "@/ui/main-button";
import ui from "@/ui/ui.module.css";
import styles from "./onboarding.module.css";
import p from "./path.module.css";
import type { PlaceCourse } from "./places";

type Next = { busy: boolean; failed: boolean; onNext: () => void };

/** Arandu's bubble on top, the step's content under it once the words are out, the main button at the bottom. */
function Step({ say, pose, button, busy, failed, onNext, ready = true, children }: Next & { say: string; pose: Pose; button: string; ready?: boolean; children?: ReactNode }) {
  const { shown, done } = useReveal(say);
  return (
    <main className={styles.screen}>
      <div className={styles.body}>
        <AranduSays text={say} shown={shown} pose={pose} />
        {done && <div className={ui.after}>{children}</div>}
      </div>
      <footer className={`${styles.foot} ${styles.last}`}>
        {failed && (
          <p className={styles.error} role="alert">
            Não consegui seguir agora. Tenta de novo?
          </p>
        )}
        <MainButton disabled={busy || !ready} onClick={onNext}>
          {button}
        </MainButton>
      </footer>
    </main>
  );
}

// O11: the picked course's first semester, its subjects as books; the first one is where the path starts.
export function SemesterView({ course, place, path, ...next }: Next & { course: PlaceCourse; place: string; path: CareerPath }) {
  const first = path.subjects[0];
  return (
    <Step {...next} say={`Boa escolha! Olha o que vem no 1º semestre de ${course.course} na ${place}.`} pose="paws-up" button={`Experimentar ${course.course}`}>
      <div className={p.card}>
        <span className={p.pill}>{course.course}</span>
        <p className={p.meta}>
          {place} · {path.city}
        </p>
        <p className={p.why}>{course.reason}</p>
        <p className={p.label}>
          1º semestre · {path.subjects.length} {path.subjects.length === 1 ? "livro" : "livros"}
        </p>
        <div className={p.shelf}>
          {path.subjects.map((subject, i) => (
            <span key={subject.disciplineId} className={p.book} data-first={i === 0 || undefined} title={subject.name}>
              {subject.name}
            </span>
          ))}
        </div>
        {first && (
          <p className={p.why}>
            A patinha marca onde você começa: <strong className={p.paw}>{first.name}</strong>.
          </p>
        )}
      </div>
      <p className={styles.hint}>Dá pra trocar de carreira depois, quando quiser.</p>
    </Step>
  );
}

const GOALS = [
  [3, "3 dias", "leve"],
  [5, "5 dias", "firme"],
  [7, "Todo dia", "intenso"],
] as const;
// Which days of the week (Monday first) each goal lights.
const LIT: Record<3 | 5 | 7, number[]> = { 3: [0, 2, 4], 5: [0, 1, 2, 3, 4], 7: [0, 1, 2, 3, 4, 5, 6] };

// O12: how many days a week the person wants to study.
export function RhythmView({ course, goal, onGoal, ...next }: Next & { course: string; goal: 3 | 5 | 7 | null; onGoal: (goal: 3 | 5 | 7) => void }) {
  return (
    <Step {...next} say={`Combinado, ${course}! Quantos dias por semana você quer estudar comigo?`} pose="looking-down" button="Continuar" ready={goal !== null}>
      <div className={styles.options}>
        {GOALS.map(([value, label, sub]) => (
          <button key={value} type="button" className={`${styles.option} ${p.option}`} aria-pressed={goal === value} onClick={() => onGoal(value)}>
            {label}
            <small>{sub}</small>
          </button>
        ))}
      </div>
      <div className={p.week} aria-hidden="true">
        {["S", "T", "Q", "Q", "S", "S", "D"].map((day, i) => (
          <span key={i} className={p.day} data-on={(goal && LIT[goal].includes(i)) || undefined}>
            <i />
            {day}
          </span>
        ))}
      </div>
      <p className={styles.hint}>Cada dia de estudo vira uma patinha.</p>
    </Step>
  );
}

// O13: the game in three things, before the first stop.
export function HowView({ course, place, ...next }: Next & { course: string; place: string }) {
  return (
    <Step {...next} say="Antes de começar, o jogo em três coisas." pose="sitting" button="Começar a primeira parada">
      <div className={p.rows}>
        <div className={p.row}>
          <strong>Um caminho de paradas</strong>
          <span>
            As matérias de verdade do 1º semestre de {course} na {place}, uma parada curta por vez.
          </span>
        </div>
        <div className={p.row}>
          <strong>Novelos</strong>
          <span>Errou, gasta um. Eles voltam com o tempo. Na primeira parada, errar não gasta.</span>
        </div>
        <div className={p.row}>
          <strong>Patinhas</strong>
          <span>Cada dia que você estuda vira uma patinha. Vamos fazer a primeira?</span>
        </div>
      </div>
    </Step>
  );
}

// O19: the first stop is done, with what it gave.
export function DoneView({ course, subject, place, result, ...next }: Next & { course: string; subject: string; place: string; result: StopResult }) {
  const say = `Você fez sua primeira parada de ${course}! Pra não perder isso, vamos guardar seu progresso.`;
  const { shown, done } = useReveal(say);
  return (
    <main className={styles.screen}>
      <div className={styles.body}>
        <section className={p.done}>
          <Image src="/img/arandu/paws-up.webp" alt="Arandu comemorando" width={120} height={120} priority />
          <h1>Primeira parada feita!</h1>
          <p className={p.meta}>
            {subject} · {place}
          </p>
          <div className={p.stats}>
            {result.sabedoria > 0 && (
              <span>
                <strong>+{result.sabedoria}</strong> de sabedoria
              </span>
            )}
            {result.patinha && (
              <span>
                <strong>1 patinha</strong>, a primeira
              </span>
            )}
          </div>
        </section>
        <AranduSays text={say} shown={shown} pose="sitting" />
      </div>
      {done && (
        <footer className={`${styles.foot} ${styles.last} ${ui.after}`}>
          {next.failed && (
            <p className={styles.error} role="alert">
              Não consegui seguir agora. Tenta de novo?
            </p>
          )}
          <MainButton disabled={next.busy} onClick={next.onNext}>
            Guardar meu progresso
          </MainButton>
        </footer>
      )}
    </main>
  );
}

// O20: the person's age, only the number; the API takes 10-120, the stepper 10-99.
export function AgeView({ onAge, ...next }: Omit<Next, "onNext"> & { onAge: (age: number) => void }) {
  const [age, setAge] = useState(17);
  return (
    <Step {...next} onNext={() => onAge(age)} say="Pra eu conversar do jeito certo com você: quantos anos você tem?" pose="sitting" button="Continuar">
      <div className={p.stepper}>
        <button type="button" aria-label="Menos um ano" disabled={age <= 10} onClick={() => setAge(age - 1)}>
          −
        </button>
        <output aria-live="polite" aria-label="Idade">
          {age}
        </output>
        <button type="button" aria-label="Mais um ano" disabled={age >= 99} onClick={() => setAge(age + 1)}>
          +
        </button>
      </div>
      <p className={styles.hint}>Só a idade. Nada de documento.</p>
    </Step>
  );
}

// O21: Google keeps what the guest did, unless that Google already has an account, which loads instead; "Agora não"
// goes on as a guest.
export function GoogleView({ busy, failed, onGoogle, onLater }: { busy: boolean; failed: boolean; onGoogle: () => void; onLater: () => void }) {
  const say = "Pronto! Entra com sua conta Google pra guardar seu caminho, sua patinha e tudo que você me contou.";
  const { shown, done } = useReveal(say);
  return (
    <main className={styles.screen}>
      <div className={styles.body}>
        <AranduSays text={say} shown={shown} pose="sitting" />
        <div className="flex justify-center pt-6">
          <Image src="/img/arandu/lying.webp" alt="" width={168} height={168} />
        </div>
      </div>
      {done && (
        <footer className={`${styles.foot} ${styles.last} ${ui.after}`}>
          {failed && (
            <p className={styles.error} role="alert">
              Não consegui abrir o Google agora. Tenta de novo?
            </p>
          )}
          <button type="button" className={p.google} disabled={busy} onClick={onGoogle}>
            <Image src="/img/google-g.svg" alt="" width={18} height={18} unoptimized />
            Continuar com Google
          </button>
          <button type="button" className={ui.ghost} disabled={busy} onClick={onLater}>
            Agora não
          </button>
          {/* shortcut: Termos and Política de Privacidade have no pages yet; they become links when they exist. */}
          <p className={p.terms}>Ao continuar, você aceita os Termos e a Política de Privacidade.</p>
        </footer>
      )}
    </main>
  );
}
