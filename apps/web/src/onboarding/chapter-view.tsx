"use client";

import type { AskReply, Exercise, ChapterContent, Wallet } from "@arandu/contracts";
import Image from "next/image";
import { useEffect, useState } from "react";
import { OutOfLives } from "@/caminho/out-of-lives";
import { safeUrl } from "@/landing/book/book-data";
import { Cat } from "@/ui/cat";
import { Composer } from "@/ui/composer";
import { MainButton } from "@/ui/main-button";
import { PawSteps } from "@/ui/paw-steps";
import ui from "@/ui/ui.module.css";
import { useAttempt } from "@/ui/use-attempt";
import { askAboutChapter } from "./actions";
import { Answer } from "./course-view";
import styles from "./onboarding.module.css";
import p from "./path.module.css";
import { afterAnswer, sentenceRight, shuffled } from "./chapter";

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
  const [file, width, height] = PROPS[turn % PROPS.length]!;
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

/** Off the onboarding a lesson has lives: a missed exercise costs one (P5), and after the last one the lesson stops (P6). */
export type Lives = {
  /** Mistakes the lesson allows (Lesson.lives). */
  count: number;
  wallet: Wallet;
  /** Pays to go on after the last life: the wallet after it, or null when the currency is short. */
  goOn: () => Promise<Wallet | null>;
};

// O14-O18: the chapter's cards, then its exercises. A missed exercise comes back at the end until it is right; in the
// first chapter mistakes cost no life. Every word on screen comes from the chapter or the lesson the API served.
// shortcut: the onboarding's first chapters hold only the first four kinds (measured: all 125 of them) and P4 adds
// ordene; the other six are skipped as right until the R01-R12 screens are built.
type Props = {
  chapter: ChapterContent;
  caption: string;
  busy: boolean;
  failed: boolean;
  lives?: Lives;
  onClose: () => void;
  /** `missed`: the exercises missed at least once, by their place in the chapter's list. */
  onDone: (mistakes: number, missed: number[]) => void;
};

export function ChapterView({ chapter, caption, busy, failed, lives, onClose, onDone }: Props) {
  const [card, setCard] = useState(0);
  const [queue, setQueue] = useState(() => chapter.exercises.map((_, i) => i));
  const [attempt, setAttempt] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [sheet, setSheet] = useState<{ right: boolean; title: string } | null>(null);
  // Every exercise is right: the result is being saved, or failed to and waits for another try.
  const [ended, setEnded] = useState(false);
  const [hearts, setHearts] = useState(lives?.count ?? 0);
  const [wallet, setWallet] = useState(lives?.wallet ?? null);
  const [missed, setMissed] = useState<number[]>([]);

  const inCards = card < chapter.cards.length;
  const total = chapter.exercises.length;
  const left = new Set(queue).size;
  const current = queue[0];
  const exercise = current === undefined ? undefined : chapter.exercises[current];

  const finish: Done = (right, more, title) => {
    setMistakes(mistakes + more);
    setSheet({ right, title: title ?? (right ? "Isso!" : "Quase.") });
    if (right) return;
    if (current !== undefined && !missed.includes(current)) setMissed([...missed, current]);
    if (lives) setHearts(Math.max(0, hearts - 1));
  };
  // The API takes up to 100 mistakes a chapter.
  const save = () => onDone(Math.min(mistakes, 100), missed);
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
  const out = lives && wallet && hearts === 0 && !sheet && !inCards && !ended;

  return (
    <main className={styles.screen}>
      <header className={p.top}>
        <button type="button" className={p.close} aria-label="Fechar" onClick={onClose}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
        {/* A print per card and per exercise: the cards first, then the exercises as they are got right. */}
        <PawSteps
          total={chapter.cards.length + total}
          at={inCards ? card + 1 : chapter.cards.length + Math.min(total, total - left + 1)}
          label={inCards ? `Leitura ${card + 1} de ${chapter.cards.length}` : `Exercício ${Math.min(total, total - left + 1)} de ${total}`}
        />
        {lives ? (
          <span className={p.lives} aria-label={`${hearts} ${hearts === 1 ? "vida" : "vidas"}`}>
            <svg viewBox="0 0 24 24" aria-hidden="true" data-off={hearts === 0 || undefined}>
              <path d="M12 20.5C5 15.5 3 12 3 8.8a4.8 4.8 0 0 1 9-2.3 4.8 4.8 0 0 1 9 2.3c0 3.2-2 6.7-9 11.7z" />
            </svg>
            <b>{hearts}</b>
          </span>
        ) : (
          <span className={p.first}>amostra</span>
        )}
      </header>

      {out ? (
        <OutOfLives
          wallet={wallet}
          onClose={onClose}
          onGoOn={async () => {
            const paid = await lives.goOn();
            if (paid) {
              setWallet(paid);
              setHearts(lives.count);
            }
            return paid !== null;
          }}
        />
      ) : inCards ? (
        <Card key={card} chapter={chapter} card={chapter.cards[card]!} caption={caption} onNext={() => setCard(card + 1)} />
      ) : (
        exercise && (
          <>
            <div className={styles.body} inert={sheet !== null || ended}>
              <div className={p.chapter}>
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
                  {!sheet.right && (lives ? " Essa volta no fim, até você acertar." : " Tudo bem: essa volta no fim, até você acertar. Aqui errar não custa vida.")}
                </p>
                {!sheet.right && lives && <p className={p.spent}>Menos 1 vida · {hearts === 0 ? "era a última" : hearts === 1 ? "resta 1" : `restam ${hearts}`}</p>}
                <MainButton onClick={() => next()}>Continuar</MainButton>
                {!sheet.right && lives && hearts > 0 && (
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

// O14: a card of the chapter. Its words are Arandu's thought, as everything he tells: he sits low, over the buttons,
// and reads. This is where the person can ask him about what they read (T1): his answer takes the words' place, with
// the sources it rests on, until the person goes back to the text or on to the next card.
function Card({ chapter, card, caption, onNext }: { chapter: ChapterContent; card: ChapterContent["cards"][number]; caption: string; onNext: () => void }) {
  const talk = useAttempt();
  const [answer, setAnswer] = useState<AskReply | null>(null);
  const text = answer?.reply ?? card.text;
  return (
    <>
      <div className={`${styles.body} ${styles.low}`}>
        <div className={p.cardHead}>
          <p className={p.caption}>{caption}</p>
          <h1 className={p.title}>{card.title}</h1>
        </div>
        <Answer key={text} text={text} busy={talk.busy} pose="read">
          {(answer?.sources ?? [card.source]).map((source) => {
            const url = safeUrl(source.url);
            return (
              url && (
                <a key={url} className={p.source} href={url} target="_blank" rel="noreferrer">
                  {source.label}
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
                  </svg>
                </a>
              )
            );
          })}
        </Answer>
      </div>
      <Composer
        placeholder="Ficou com dúvida? Pergunte ao Arandu"
        busy={talk.busy}
        onSend={(question) => talk.attempt(async () => setAnswer(await askAboutChapter(chapter.discipline.id, chapter.topic.index, question)))}
      >
        <footer className={styles.foot}>
          {talk.failed && (
            <p className={styles.error} role="alert">
              Não consegui responder agora. Pergunta de novo?
            </p>
          )}
          <MainButton onClick={onNext}>Entendi</MainButton>
          {answer && (
            <button type="button" className={ui.ghost} onClick={() => setAnswer(null)}>
              Voltar ao texto
            </button>
          )}
        </footer>
      </Composer>
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
      // A kind the first chapter doesn't hold: skipped as right rather than blocking the chapter.
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
  // Matched tiles, by pair index, per column: they can differ, since a chapter may repeat a definition.
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
