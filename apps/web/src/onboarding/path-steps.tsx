"use client";

import type { CareerPath } from "@arandu/contracts";
import Image from "next/image";
import { type ReactNode, useState } from "react";
import { AranduSays, type Pose, Said, useReveal } from "@/ui/arandu-says";
import { Back } from "@/ui/back";
import { Cat } from "@/ui/cat";
import { Shelf } from "@/ui/shelf";
import { MainButton } from "@/ui/main-button";
import ui from "@/ui/ui.module.css";
import styles from "./onboarding.module.css";
import p from "./path.module.css";
import type { PlaceCourse } from "./places";

type Next = { busy: boolean; failed: boolean; onNext: () => void; onBack?: () => void };

/** Arandu's bubble on top, the step's content under it once the words are out, the main button at the bottom. */
function Step({ say, pose, button, busy, failed, onNext, onBack, ready = true, children }: Next & { say: string; pose: Pose; button: string; ready?: boolean; children?: ReactNode }) {
  const { shown, done } = useReveal(say);
  return (
    <main className={styles.screen}>
      {onBack && (
        <div className={ui.backBar}>
          <Back onBack={onBack} />
        </div>
      )}
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

// O11: the picked career's first semester, its subjects as books. Tapping one starts the path there; the button starts
// at the first, where the ball rests.
export function SemesterView({ course, path, onPick, ...next }: Next & { course: PlaceCourse; path: CareerPath; onPick: (index: number) => void }) {
  const first = path.subjects[0];
  return (
    <Step {...next} say={`Boa escolha! Olha o que vem no 1º semestre de ${course.profession.name}.`} pose="hop" button={`Experimentar ${course.profession.name}`}>
      <div className={p.card}>
        <div className={p.head}>
          <span className={p.pill}>{course.profession.name}</span>
        </div>
        <p className={p.why}>{course.reason}</p>
        <p className={p.label}>
          1º semestre · {path.subjects.length} {path.subjects.length === 1 ? "livro" : "livros"}
        </p>
        <div className={p.shelf}>
          <Shelf titles={path.subjects.map((subject) => subject.name)} onPick={next.busy ? undefined : onPick} />
          <Cat mood="lie" size={92} className={p.kittyCat} />
        </div>
        {first &&
          (path.subjects.length > 1 ? (
            <p className={p.why}>Toca num livro pra começar por ele.</p>
          ) : (
            <p className={p.why}>
              A bolinha marca onde você começa: <strong className={p.paw}>{first.name}</strong>.
            </p>
          ))}
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
    <Step {...next} say={`Combinado, ${course}! Quantos dias por semana você quer estudar comigo?`} pose="read" button="Continuar" ready={goal !== null}>
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
            <Image src="/img/props/mouse.webp" alt="" width={34} height={22} />
            {day}
          </span>
        ))}
      </div>
      <p className={styles.hint}>Cada dia de estudo, o Arandu pega um ratinho.</p>
    </Step>
  );
}

// O13: the game in three things, before the first chapter.
export function HowView({ course, ...next }: Next & { course: string }) {
  return (
    <Step {...next} say="Antes de começar, o jogo em três coisas." pose="sit" button="Experimentar o primeiro capítulo">
      <div className={p.rows}>
        <div className={p.row}>
          <Image src="/img/props/books.webp" alt="" width={46} height={46} />
          <div>
            <strong>Um caminho de capítulos</strong>
            <span>
              As matérias de verdade do 1º semestre de {course}, um capítulo curto por vez.
            </span>
          </div>
        </div>
        <div className={p.row}>
          <Image src="/img/props/fish.webp" alt="" width={46} height={46} />
          <div>
            <strong>Peixinhos</strong>
            <span>Entrar numa lição custa peixinhos, e todo dia o Arandu te dá mais. Nesta amostra, é por conta dele.</span>
          </div>
        </div>
        <div className={p.row}>
          <Image src="/img/props/mouse.webp" alt="" width={46} height={30} />
          <div>
            <strong>Ratinhos</strong>
            <span>Cada dia que você estuda, o Arandu pega um ratinho.</span>
          </div>
        </div>
      </div>
    </Step>
  );
}

// O19: the sample of the first chapter is over. It gave nothing: inside the app, chapter 1 starts from zero.
export function DoneView({ course, subject, ...next }: Next & { course: string; subject: string }) {
  const say = `Esse foi um gostinho de ${course}. Guardando seu progresso, o primeiro capítulo começa de verdade, com mais exercícios.`;
  const { shown, done } = useReveal(say);
  return (
    <main className={styles.screen}>
      <div className={styles.body}>
        <section className={p.done}>
          <Cat mood="hop" size={190} label="Arandu comemorando" className={p.doneCat} />
          <h1>Você provou o primeiro capítulo!</h1>
          <p className={p.meta}>{subject}</p>
        </section>
        <div className={`${ui.bubble} ${p.loose}`} role="status">
          <Said text={say} shown={shown} />
        </div>
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
    <Step {...next} onNext={() => onAge(age)} say="Pra eu conversar do jeito certo com você: quantos anos você tem?" pose="sit" button="Continuar">
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
export function GoogleView({ busy, failed, onGoogle, onLater, onBack }: { busy: boolean; failed: boolean; onGoogle: () => void; onLater: () => void; onBack: () => void }) {
  const say = "Pronto! Entra com sua conta Google pra guardar seu caminho e tudo que você me contou.";
  const { shown, done } = useReveal(say);
  return (
    <main className={styles.screen}>
      <div className={ui.backBar}>
        <Back onBack={onBack} />
      </div>
      <div className={styles.body}>
        <div className={`${ui.bubble} ${p.loose}`} role="status">
          <Said text={say} shown={shown} />
        </div>
        <div className="flex justify-center pt-6">
          <Cat mood="sit" size={220} className={p.googleCat} />
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
