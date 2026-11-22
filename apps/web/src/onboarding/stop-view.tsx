"use client";

import type { Exercise, StopContent, Wallet } from "@arandu/contracts";
import Image from "next/image";
import { useEffect, useState } from "react";
import { OutOfNovelos } from "@/caminho/out-of-novelos";
import { safeUrl } from "@/landing/book/book-data";
import { Cat } from "@/ui/cat";
import { MainButton } from "@/ui/main-button";
import styles from "./onboarding.module.css";
import p from "./path.module.css";
import { afterAnswer, sentenceRight, shuffled } from "./stop";

type Of<K extends Exercise["kind"]> = Extract<Exercise, { kind: K }>;
/** An exercise reports once it is over: whether it was right, and how many mistakes it took. */
type Done = (right: boolean, mistakes: number, title?: string) => void;

/** The props on each exercise's ledge, in turn, as on the O15-O18 boards. */
const PROPS = [
  ["yarn-big", 116, 75],
  ["books", 116, 85],
  ["ball-big", 64, 64],
  ["plant-big", 86, 97],
] as const;

/** The ledge under the exercise: a prop and Arandu, sitting while the person thinks. */
function Stage({ turn }: { turn: number }) {
  const [file, width, height] = PROPS[turn % PROPS.length];
  return (
    <div className={p.stage} aria-hidden="true">
      <div className={p.ledge} />
      <Image className={p.prop} src={`/img/props/${file}.webp`} alt="" width={width} height={height} />
      <Cat mood="sit" size={150} className={p.stageCat} />
    </div>
  );
}

const KIND: Partial<Record<Exercise["kind"], string>> = {
  escolha_uma: "escolha uma",
  una_os_pares: "una os pares",
  verdadeiro_ou_falso: "verdadeiro ou falso",
  complete_a_frase: "complete a frase",
  ordene: "ordene",
};

/** Off the onboarding a stop is paid in novelos: a wrong answer spends one (P5), and with none left it waits (P6). */
export type Novelos = {
  wallet: Wallet;
  spend: () => Promise<Wallet>;
  /** null: the API refused (this stop already gave its novelo, or there are not enough peixinhos). */
  reread: () => Promise<Wallet | null>;
  refill: () => Promise<Wallet | null>;
};

// O14-O18: the stop's cards, then its exercises. A missed exercise comes back at the end until it is right; in the
// first stop mistakes spend no novelo. Every word on screen comes from the stop (GET /stops/:disciplineId/:topic).
// shortcut: the onboarding's first stops hold only the first four kinds (measured: all 125 of them) and P4 adds
// ordene; the other six are skipped as right until the R01-R12 screens are built.
type Props = {
  stop: StopContent;
  caption: string;
  busy: boolean;
  failed: boolean;
  novelos?: Novelos;
  onClose: () => void;
  onDone: (mistakes: number) => void;
};

export function StopView({ stop, caption, busy, failed, novelos, onClose, onDone }: Props) {
  const [card, setCard] = useState(0);
  const [queue, setQueue] = useState(() => stop.exercises.map((_, i) => i));
  const [attempt, setAttempt] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [sheet, setSheet] = useState<{ right: boolean; title: string } | null>(null);
  // Every exercise is right: the result is being saved, or failed to and waits for another try.
  const [ended, setEnded] = useState(false);
  const [wallet, setWallet] = useState(novelos?.wallet ?? null);

  const inCards = card < stop.cards.length;
  const total = stop.exercises.length;
  const left = new Set(queue).size;
  const current = queue[0];
  const exercise = current === undefined ? undefined : stop.exercises[current];

  const finish: Done = (right, more, title) => {
    setMistakes(mistakes + more);
    setSheet({ right, title: title ?? (right ? "Isso!" : "Quase.") });
    if (!right && novelos && wallet) {
      setWallet({ ...wallet, novelos: Math.max(0, wallet.novelos - 1) });
      // The API's count wins; if the spend fails, the person keeps learning.
      novelos.spend().then(setWallet, () => {});
    }
  };
  // The API takes up to 100 mistakes a stop.
  const save = () => onDone(Math.min(mistakes, 100));
  /** `reread`: back to the cards first, then on with the exercises. */
  const next = (reread = false) => {
    const rest = afterAnswer(queue, sheet!.right);
    setSheet(null);
    if (rest.length === 0) {
      setEnded(true);
      save();
      return;
    }
    setAttempt(attempt + 1);
    setQueue(rest);
    if (reread) setCard(0);
  };
  const out = novelos && wallet?.novelos === 0 && !sheet && !inCards && !ended;

  return (
    <main className={styles.screen}>
      <header className={p.top}>
        <button type="button" className={p.close} aria-label="Fechar" onClick={onClose}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
        <progress className={p.progress} aria-label={inCards ? "Leitura" : `Exercício ${total - left + 1} de ${total}`} value={inCards ? 0.04 : Math.max(total - left, 0.04)} max={inCards ? 1 : total} />
        {wallet ? (
          <span className={p.lives} aria-label={`${wallet.novelos} ${wallet.novelos === 1 ? "novelo" : "novelos"}`}>
            <Image src="/img/props/yarn.webp" alt="" width={30} height={30} data-off={wallet.novelos === 0 || undefined} />
            <b>{wallet.novelos}</b>
          </span>
        ) : (
          <span className={p.first}>primeiro capítulo</span>
        )}
      </header>

      {out ? (
        <OutOfNovelos
          wallet={wallet!}
          onClose={onClose}
          onReread={async () => {
            const back = await novelos.reread();
            if (back) {
              setWallet(back);
              setCard(0);
            }
            return back !== null;
          }}
          onRefill={async () => {
            const full = await novelos.refill();
            if (full) setWallet(full);
            return full !== null;
          }}
        />
      ) : inCards ? (
        <Card card={stop.cards[card]!} caption={caption} onNext={() => setCard(card + 1)} />
      ) : (
        exercise && (
          <>
            <div className={styles.body} inert={sheet !== null || ended}>
              <div className={p.stop}>
                <p className={p.caption}>
                  {total - left + 1} de {total} · {KIND[exercise.kind] ?? exercise.kind}
                  <span className={p.mode}>{exercise.mode}</span>
                </p>
                <ExerciseView key={`${current}-${attempt}`} exercise={exercise} onDone={finish} />
                {!sheet && <Stage turn={total - left} />}
              </div>
            </div>
            {sheet && (
              <section className={p.sheet} data-wrong={!sheet.right || undefined} role="alert">
                <Cat mood={sheet.right ? "hop" : "sad"} size={112} label={sheet.right ? "Arandu comemorando" : "Arandu, tranquilo"} className={p.peek} />
                <h2>{sheet.title}</h2>
                <p>
                  {exercise.why}
                  {!sheet.right && (wallet ? " Essa volta no fim, até você acertar." : " Tudo bem: essa volta no fim, até você acertar. Aqui errar não gasta novelo.")}
                </p>
                {!sheet.right && wallet && (
                  <p className={p.spent}>
                    Menos 1 novelo · você tem {wallet.novelos}
                  </p>
                )}
                <MainButton onClick={() => next()}>Continuar</MainButton>
                {!sheet.right && wallet && (
                  <button type="button" className={p.ghost} onClick={() => next(true)}>
                    Reler os cards
                  </button>
                )}
              </section>
            )}
            {ended && (
              <footer className={`${styles.foot} ${styles.last}`}>
                {failed && (
                  <p className={styles.error} role="alert">
                    Não consegui guardar o capítulo agora. Tenta de novo?
                  </p>
                )}
                <MainButton disabled={busy} onClick={save}>
                  {busy ? "Guardando…" : "Tentar de novo"}
                </MainButton>
              </footer>
            )}
          </>
        )
      )}
    </main>
  );
}

function Card({ card, caption, onNext }: { card: StopContent["cards"][number]; caption: string; onNext: () => void }) {
  const url = safeUrl(card.source.url);
  return (
    <>
      <div className={styles.body}>
        <div className={p.stop}>
          <p className={p.caption}>{caption}</p>
          <h1 className={p.title}>{card.title}</h1>
          <div className={p.page}>
            <Cat mood="read" size={120} label="Arandu lendo" className={p.readCat} />
            <p>{card.text}</p>
            {url && (
              <a className={p.source} href={url} target="_blank" rel="noreferrer">
                {card.source.label}
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
                </svg>
              </a>
            )}
          </div>
        </div>
      </div>
      <footer className={`${styles.foot} ${styles.last}`}>
        <MainButton onClick={onNext}>Entendi</MainButton>
      </footer>
    </>
  );
}

function ExerciseView({ exercise, onDone }: { exercise: Exercise; onDone: Done }) {
  switch (exercise.kind) {
    case "escolha_uma":
    case "escolha_a_frase_certa":
      return <Choose exercise={exercise} onDone={onDone} />;
    case "una_os_pares":
      return <Pairs exercise={exercise} onDone={onDone} />;
    case "verdadeiro_ou_falso":
      return <TrueFalse exercise={exercise} onDone={onDone} />;
    case "complete_a_frase":
      return <Sentence exercise={exercise} onDone={onDone} />;
    case "ordene":
      return <Order exercise={exercise} onDone={onDone} />;
    default:
      // A kind the first stop doesn't hold: skipped as right rather than blocking the stop.
      return <MainButton onClick={() => onDone(true, 0)}>Continuar</MainButton>;
  }
}

function Choose({ exercise, onDone }: { exercise: Of<"escolha_uma"> | Of<"escolha_a_frase_certa">; onDone: Done }) {
  const [pick, setPick] = useState<number | null>(null);
  const [checked, setChecked] = useState(false);
  const state = (i: number) => (!checked ? undefined : i === exercise.answer ? "ok" : i === pick ? "no" : undefined);
  return (
    <>
      <h1 className={p.prompt}>{exercise.prompt}</h1>
      {/* Short options sit two by two, as on O15; sentences stack. */}
      <div className={p.choices} data-grid={exercise.options.every((o) => o.length <= 24) || undefined}>
        {exercise.options.map((option, i) => (
          <button key={i} type="button" className={styles.option} aria-pressed={pick === i} data-state={state(i)} disabled={checked} onClick={() => setPick(i)}>
            {option}
          </button>
        ))}
      </div>
      {!checked && (
        <div className={p.action}>
          <MainButton
            disabled={pick === null}
            onClick={() => {
              setChecked(true);
              onDone(pick === exercise.answer, pick === exercise.answer ? 0 : 1);
            }}
          >
            Verificar
          </MainButton>
        </div>
      )}
    </>
  );
}

function Pairs({ exercise, onDone }: { exercise: Of<"una_os_pares">; onDone: Done }) {
  const [right] = useState(() => shuffled(exercise.pairs.map((_, i) => i)));
  const [left, setLeft] = useState<number | null>(null);
  // Matched tiles, by pair index, per column: they can differ, since a stop may repeat a definition.
  const [doneLeft, setDoneLeft] = useState<number[]>([]);
  const [doneRight, setDoneRight] = useState<number[]>([]);
  const [flash, setFlash] = useState<number | null>(null);
  const [wrongs, setWrongs] = useState(0);

  useEffect(() => {
    if (flash === null) return;
    const id = setTimeout(() => setFlash(null), 600);
    return () => clearTimeout(id);
  }, [flash]);

  const pickRight = (i: number) => {
    if (left === null) return;
    // Any tile with the right text is right, and so is the definition of a term that reads the same.
    const [term, meaning] = exercise.pairs[left]!;
    if (exercise.pairs[i]![1] !== meaning && exercise.pairs[i]![0] !== term) {
      setWrongs(wrongs + 1);
      setFlash(i);
      return;
    }
    const all = [...doneLeft, left];
    setDoneLeft(all);
    setDoneRight([...doneRight, i]);
    setLeft(null);
    if (all.length === exercise.pairs.length) onDone(true, wrongs, "Pares completos!");
  };

  return (
    <>
      <h1 className={p.prompt}>{exercise.prompt}</h1>
      <div className={p.pairs}>
        <div>
          {exercise.pairs.map(([term], i) => (
            <button key={i} type="button" className={p.tile} aria-pressed={left === i} data-state={doneLeft.includes(i) ? "done" : undefined} disabled={doneLeft.includes(i)} onClick={() => setLeft(i)}>
              {term}
            </button>
          ))}
        </div>
        <div>
          {right.map((i) => (
            <button key={i} type="button" className={p.tile} data-state={doneRight.includes(i) ? "done" : flash === i ? "no" : undefined} disabled={doneRight.includes(i)} onClick={() => pickRight(i)}>
              {exercise.pairs[i]![1]}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}

function TrueFalse({ exercise, onDone }: { exercise: Of<"verdadeiro_ou_falso">; onDone: Done }) {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<boolean[]>([]);
  const statement = exercise.statements[index]!;
  const answered = answers.length > index;
  const ok = answered && answers[index] === statement.answer;
  const total = exercise.statements.length;
  const last = index === total - 1;

  const see = () => {
    const rights = answers.filter((a, i) => a === exercise.statements[i]!.answer).length;
    onDone(rights === total, total - rights, rights === total ? `${total} de ${total}!` : `Quase. ${rights} de ${total}.`);
  };

  return (
    <>
      <h1 className={p.prompt}>
        Isso é verdade? {index + 1} de {total}
      </h1>
      <div className={p.statement} data-state={answered ? (ok ? "ok" : "no") : undefined}>
        <p>{statement.text}</p>
        {answered && (
          <small>
            {statement.answer ? "Verdadeiro" : "Falso"}: {statement.why}
          </small>
        )}
      </div>
      {!answered ? (
        <div className={p.tf}>
          {[false, true].map((value) => (
            <button key={String(value)} type="button" className={styles.option} onClick={() => setAnswers([...answers, value])}>
              {value ? "Verdadeiro" : "Falso"}
            </button>
          ))}
        </div>
      ) : (
        <div className={p.action}>
          <MainButton onClick={last ? see : () => setIndex(index + 1)}>{last ? "Ver resultado" : "Próxima"}</MainButton>
        </div>
      )}
    </>
  );
}

function Sentence({ exercise, onDone }: { exercise: Of<"complete_a_frase">; onDone: Done }) {
  const [bank] = useState(() => shuffled(exercise.tiles));
  // Which bank tile fills each gap, by the tile's index in the bank.
  const [filled, setFilled] = useState<(number | null)[]>(() => exercise.answers.map(() => null));
  const [checked, setChecked] = useState(false);
  const parts = exercise.text.split("___");
  const words = filled.map((i) => (i === null ? null : bank[i]!));

  const place = (tile: number) => {
    const gap = filled.indexOf(null);
    if (gap >= 0) setFilled(filled.map((f, i) => (i === gap ? tile : f)));
  };

  return (
    <>
      <p className={p.sentence}>
        {parts.map((part, i) => (
          <span key={i}>
            {part}
            {i < parts.length - 1 && (
              <button
                type="button"
                className={p.gap}
                aria-label={words[i] ? `Lacuna ${i + 1}: ${words[i]}. Toque para tirar.` : `Lacuna ${i + 1}, vazia`}
                data-state={checked ? (words[i] === exercise.answers[i] ? "ok" : "no") : undefined}
                disabled={checked}
                onClick={() => setFilled(filled.map((f, g) => (g === i ? null : f)))}
              >
                {words[i] ?? " "}
              </button>
            )}
          </span>
        ))}
      </p>
      <div className={p.bank}>
        {bank.map((tile, i) => (
          <button key={i} type="button" className={p.tile} data-state={filled.includes(i) ? "done" : undefined} disabled={checked || filled.includes(i)} onClick={() => place(i)}>
            {tile}
          </button>
        ))}
      </div>
      {!checked && (
        <div className={p.action}>
          <MainButton
            disabled={filled.includes(null)}
            onClick={() => {
              setChecked(true);
              const right = sentenceRight(exercise, words);
              onDone(right, right ? 0 : 1);
            }}
          >
            Verificar
          </MainButton>
        </div>
      )}
    </>
  );
}

// P4: put the steps in order. A tap on a piece fills the next slot; a tap on a filled slot takes its piece back.
function Order({ exercise, onDone }: { exercise: Of<"ordene">; onDone: Done }) {
  const [bank] = useState(() => shuffled(exercise.steps));
  // The bank pieces in the slots, in slot order, by their index in the bank.
  const [placed, setPlaced] = useState<number[]>([]);
  const [checked, setChecked] = useState(false);
  const words = placed.map((i) => bank[i]!);

  return (
    <>
      <h1 className={p.prompt}>{exercise.prompt}</h1>
      <ol className={p.slots}>
        {exercise.steps.map((step, i) => {
          const word = words[i];
          return (
            <li key={i}>
              <button
                type="button"
                className={p.slot}
                data-full={word !== undefined || undefined}
                data-state={checked ? (word === step ? "ok" : "no") : undefined}
                aria-label={word ? `${i + 1}: ${word}. Toque para tirar.` : `${i + 1}, vazio`}
                disabled={checked || word === undefined}
                onClick={() => setPlaced(placed.filter((_, s) => s !== i))}
              >
                <b>{i + 1}</b>
                {word}
              </button>
            </li>
          );
        })}
      </ol>
      <div className={p.bank}>
        {bank.map((step, i) => (
          <button key={i} type="button" className={p.tile} data-state={placed.includes(i) ? "done" : undefined} disabled={checked || placed.includes(i)} onClick={() => setPlaced([...placed, i])}>
            {step}
          </button>
        ))}
      </div>
      {!checked && (
        <div className={p.action}>
          <MainButton
            disabled={placed.length < bank.length}
            onClick={() => {
              setChecked(true);
              const right = words.every((word, i) => word === exercise.steps[i]);
              onDone(right, right ? 0 : 1, right ? undefined : "Quase. A ordem ainda não é essa.");
            }}
          >
            Verificar
          </MainButton>
        </div>
      )}
    </>
  );
}
