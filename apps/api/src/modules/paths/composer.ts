import type { Exercise } from '@arandu/contracts';
import { EARLIER_MISSES, REVIEW_WHEN_CLEAN, seeded } from './lessons.logic.js';
import type { Piece } from './pieces.js';
import { instanceOf } from './problem.js';

export type Kind = Exercise['kind'];

/** The piece an exercise tests: `index` in its chapter's pieces, and the kind it was played in. */
export interface PieceRef {
  topic: number;
  index: number;
  kind?: Kind;
}

export interface ChapterPieces {
  topic: number;
  pieces: Piece[];
}

export interface Composed {
  exercise: Exercise;
  ref: { topic: number; index: number; kind: Kind };
}

type Random = () => number;
type Of<T extends Piece['type']> = Extract<Piece, { type: T }>;
interface At<P extends Piece = Piece> {
  piece: P;
  index: number;
}

/** A copy of the list in a random order (Fisher-Yates). */
function shuffle<T>(list: readonly T[], random: Random): T[] {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

const piecesOfType = <T extends Piece['type']>(
  pieces: Piece[],
  type: T,
): At<Of<T>>[] =>
  pieces.flatMap((piece, index) =>
    piece.type === type ? [{ piece: piece as Of<T>, index }] : [],
  );

const same = (a: string, b: string) =>
  a.trim().toLowerCase() === b.trim().toLowerCase();

/** The right option among up to three others, in a random order. */
function choice(right: string, others: string[], random: Random) {
  const wrong = others.filter(
    (o, i) => !same(o, right) && others.findIndex((x) => same(x, o)) === i,
  );
  const options = shuffle([right, ...wrong.slice(0, 3)], random);
  return { options, answer: options.indexOf(right) };
}

/**
 * The statement's wrong version cut in segments around the part that changed, which is the one to tap; null when the
 * change is not one short stretch or the sentence is too short to cut in 3 to 8 segments.
 */
export function tapSegments(
  right: string,
  wrong: string,
): { segments: string[]; answer: number } | null {
  const a = right.split(/\s+/).filter(Boolean);
  const b = wrong.split(/\s+/).filter(Boolean);
  let start = 0;
  while (start < a.length && start < b.length && same(a[start]!, b[start]!))
    start++;
  let end = 0;
  while (
    end < a.length - start &&
    end < b.length - start &&
    same(a[a.length - 1 - end]!, b[b.length - 1 - end]!)
  )
    end++;
  const changed = b.slice(start, b.length - end);
  if (!changed.length || changed.length > 6) return null;
  const before = b.slice(0, start);
  const after = b.slice(b.length - end);
  const chunks = (words: string[], size: number) =>
    Array.from({ length: Math.ceil(words.length / size) }, (_, i) =>
      words.slice(i * size, (i + 1) * size).join(' '),
    );
  for (let size = 2; size <= 8; size++) {
    const head = chunks(before, size);
    const segments = [...head, changed.join(' '), ...chunks(after, size)];
    if (segments.length < 3) return null;
    if (segments.length <= 8) return { segments, answer: head.length };
  }
  return null;
}

/** The exercises one piece can be played in, as many as it has: the review picks one it was not missed in. */
const KINDS: Record<Piece['type'], Kind[]> = {
  conceito: ['escolha_uma', 'complete_a_frase'],
  afirmacao: [
    'escolha_a_frase_certa',
    'toque_no_trecho',
    'verdadeiro_ou_falso',
  ],
  caso: ['escolha_uma'],
  classificacao: ['separe_nas_cestas'],
  sequencia: ['ordene'],
  frase: ['monte_a_frase'],
  pergunta: ['explique_para_o_arandu'],
  problema: ['resolva'],
  codigo: ['ordene', 'complete_a_frase'],
};

/** Builds exercises of one chapter, with the concepts of the subject's other chapters as extra wrong options. */
class Builder {
  constructor(
    private readonly chapter: ChapterPieces,
    private readonly others: ChapterPieces[],
    private readonly random: Random,
  ) {}

  /** Terms for wrong options: the chapter's own first, then the subject's other chapters'. */
  private terms(except: string): string[] {
    const own = piecesOfType(this.chapter.pieces, 'conceito').map(
      (c) => c.piece.term,
    );
    const elsewhere = this.others.flatMap((o) =>
      piecesOfType(o.pieces, 'conceito').map((c) => c.piece.term),
    );
    return [
      ...shuffle(own, this.random),
      ...shuffle(elsewhere, this.random),
    ].filter((t) => !same(t, except));
  }

  private ref(at: At, kind: Kind) {
    return { topic: this.chapter.topic, index: at.index, kind };
  }

  /** One piece in one kind; null when the piece cannot be played in it (a sentence too short to tap, a lone concept). */
  play(at: At, kind: Kind): Composed | null {
    const exercise = this.exercise(at, kind);
    return exercise ? { exercise, ref: this.ref(at, kind) } : null;
  }

  private exercise(at: At, kind: Kind): Exercise | null {
    const { piece } = at;
    const statements = piecesOfType(this.chapter.pieces, 'afirmacao').filter(
      (s) => s.index !== at.index,
    );
    switch (piece.type) {
      case 'conceito': {
        const terms = this.terms(piece.term);
        if (terms.length < 2) return null;
        if (kind === 'escolha_uma')
          return {
            kind,
            mode: 'reconhecer',
            prompt: `A qual conceito corresponde esta definição?\n${piece.definition}`,
            ...choice(piece.term, terms, this.random),
            why: `${piece.term}: ${piece.definition}`,
          };
        if (kind === 'complete_a_frase')
          return {
            kind,
            mode: 'produzir',
            text: `${piece.definition} Esse conceito se chama ___.`,
            tiles: shuffle([piece.term, ...terms.slice(0, 2)], this.random),
            answers: [piece.term],
            why: `${piece.term}: ${piece.definition}`,
          };
        return null;
      }
      case 'afirmacao': {
        if (kind === 'escolha_a_frase_certa') {
          if (statements.length < 2) return null;
          const wrong = shuffle(statements, this.random)
            .slice(0, 3)
            .map((s) => s.piece.wrong);
          return {
            kind,
            mode: 'reconhecer',
            prompt: 'Qual destas frases está certa?',
            ...choice(piece.right, wrong, this.random),
            why: piece.why,
          };
        }
        if (kind === 'toque_no_trecho') {
          const tap = tapSegments(piece.right, piece.wrong);
          if (!tap) return null;
          return {
            kind,
            mode: 'reconhecer',
            prompt: 'Esta frase tem um erro. Toque no trecho errado.',
            ...tap,
            why: `${piece.why} Certo: "${piece.right}"`,
          };
        }
        if (kind === 'verdadeiro_ou_falso')
          return this.trueOrFalse([
            at as At<Of<'afirmacao'>>,
            ...shuffle(statements, this.random).slice(0, 2),
          ]);
        return null;
      }
      case 'caso': {
        const terms = this.terms(piece.term);
        if (kind !== 'escolha_uma' || terms.length < 2) return null;
        return {
          kind,
          mode: 'reconhecer',
          prompt: `${piece.situation}\nQual conceito explica isso?`,
          ...choice(piece.term, terms, this.random),
          why: piece.why,
        };
      }
      case 'classificacao':
        return kind === 'separe_nas_cestas'
          ? {
              kind,
              mode: 'reconhecer',
              prompt: piece.prompt,
              baskets: piece.baskets,
              items: shuffle(piece.items, this.random),
              why: piece.why,
            }
          : null;
      case 'sequencia':
        return kind === 'ordene'
          ? {
              kind,
              mode: 'produzir',
              prompt: piece.prompt,
              steps: piece.steps,
              why: piece.why,
            }
          : null;
      case 'frase':
        return kind === 'monte_a_frase'
          ? {
              kind,
              mode: 'produzir',
              prompt: 'Monte a frase com uma ideia central do capítulo.',
              answer: piece.words,
              distractors: piece.distractors,
              why: piece.why,
            }
          : null;
      case 'pergunta':
        return kind === 'explique_para_o_arandu'
          ? {
              kind,
              mode: 'produzir',
              prompt: piece.prompt,
              ideas: piece.ideas,
              why: piece.why,
            }
          : null;
      case 'problema': {
        if (kind !== 'resolva') return null;
        const play = instanceOf(piece, this.random);
        return play
          ? { kind, mode: 'produzir', ...play, why: piece.why }
          : null;
      }
      case 'codigo': {
        if (kind === 'ordene')
          return {
            kind,
            mode: 'produzir',
            prompt: `${piece.prompt} Ponha as linhas na ordem certa.`,
            steps: piece.lines,
            code: true,
            why: piece.why,
          };
        if (kind === 'complete_a_frase') {
          const lines = piece.lines.map((line, i) =>
            i === piece.blank.line
              ? line.replace(piece.blank.token, '___')
              : line,
          );
          return {
            kind,
            mode: 'produzir',
            text: lines.join('\n'),
            tiles: shuffle(
              [piece.blank.token, ...piece.distractors],
              this.random,
            ),
            answers: [piece.blank.token],
            code: true,
            why: piece.why,
          };
        }
        return null;
      }
    }
  }

  /** Up to three statements, each shown right or wrong, at least one of each when there are two or more. */
  trueOrFalse(list: At<Of<'afirmacao'>>[]): Exercise {
    const shown = list.map(() => this.random() < 0.5);
    if (shown.length > 1 && shown.every((s) => s === shown[0]))
      shown[Math.floor(this.random() * shown.length)] = !shown[0];
    return {
      kind: 'verdadeiro_ou_falso',
      mode: 'reconhecer',
      statements: list.map((s, i) => ({
        text: shown[i] ? s.piece.right : s.piece.wrong,
        answer: shown[i]!,
        why: s.piece.why,
      })),
      why: 'Uma frase falsa costuma ter um só detalhe trocado: leia até o fim.',
    };
  }

  /** Three or four concepts to match with their definitions. */
  pairs(list: At<Of<'conceito'>>[]): Composed {
    const pairs = shuffle(list, this.random).map((c): [string, string] => [
      c.piece.term,
      c.piece.definition,
    ]);
    return {
      exercise: {
        kind: 'una_os_pares',
        mode: 'reconhecer',
        prompt: 'Una cada conceito ao que ele significa.',
        pairs,
        why: pairs.map(([t, d]) => `${t}: ${d}`).join('\n'),
      },
      ref: this.ref(list[0]!, 'una_os_pares'),
    };
  }
}

/** The fewest exercises a lesson takes: below it, more of the chapter's concepts and statements fill it. */
const MIN_PER_LESSON = 3;
/** The most exercises lesson 3 takes. */
const MAX_PER_LESSON = 6;

/**
 * Lesson 1 to 3 of a chapter for one seed (a person, a chapter): 1 recognises (concepts and statements), 2 applies
 * (cases, the right sentence, the wrong stretch, baskets), 3 solves and produces (problems, code, steps, sentences,
 * the open question). Which pieces a lesson tests depends only on the chapter and the seed, never on the other
 * chapters, so a lesson keeps its pieces while the subject grows.
 */
export function composeLesson(
  chapter: ChapterPieces,
  others: ChapterPieces[],
  lesson: number,
  seed: string,
): Composed[] {
  const pick = seeded(`${seed}:${lesson}:pick`);
  const b = new Builder(chapter, others, seeded(`${seed}:${lesson}:play`));
  const p = chapter.pieces;
  const concepts = shuffle(piecesOfType(p, 'conceito'), pick);
  const statements = shuffle(piecesOfType(p, 'afirmacao'), pick);
  const out: (Composed | null)[] = [];
  const play = (at: At | undefined, kind: Kind) =>
    at ? out.push(b.play(at, kind)) : undefined;

  if (lesson === 1) {
    play(concepts[0], 'escolha_uma');
    if (concepts.length >= 4) out.push(b.pairs(concepts.slice(1, 5)));
    else play(concepts[1], 'escolha_uma');
    if (statements.length)
      out.push({
        exercise: b.trueOrFalse(statements.slice(0, 3)),
        ref: {
          topic: chapter.topic,
          index: statements[0]!.index,
          kind: 'verdadeiro_ou_falso',
        },
      });
  } else if (lesson === 2) {
    for (const c of shuffle(piecesOfType(p, 'caso'), pick))
      play(c, 'escolha_uma');
    play(statements[0], 'escolha_a_frase_certa');
    // The first statement whose change is one short stretch, other than the one just played.
    const tappable = statements
      .slice(1)
      .find((s) => tapSegments(s.piece.right, s.piece.wrong));
    play(tappable, 'toque_no_trecho');
    for (const c of piecesOfType(p, 'classificacao'))
      play(c, 'separe_nas_cestas');
  } else {
    for (const q of shuffle(piecesOfType(p, 'problema'), pick))
      play(q, 'resolva');
    // Each snippet once a lesson, in one of its two kinds.
    for (const c of piecesOfType(p, 'codigo'))
      play(c, pick() < 0.5 ? 'ordene' : 'complete_a_frase');
    for (const s of piecesOfType(p, 'sequencia')) play(s, 'ordene');
    for (const f of piecesOfType(p, 'frase')) play(f, 'monte_a_frase');
    play(concepts[concepts.length - 1], 'complete_a_frase');
  }
  let list = out.filter((c): c is Composed => c !== null);
  if (lesson === 3) {
    list = list.slice(0, MAX_PER_LESSON - 1);
    const question = piecesOfType(p, 'pergunta')[0];
    const ask = question ? b.play(question, 'explique_para_o_arandu') : null;
    if (ask) list.push(ask);
  }
  // A thin lesson gets more of the chapter's concepts, then of its statements, each piece once.
  const used = new Set(list.map((c) => c.ref.index));
  for (const extra of [...concepts, ...statements]) {
    if (list.length >= MIN_PER_LESSON) break;
    if (used.has(extra.index)) continue;
    const kind =
      extra.piece.type === 'conceito' ? 'escolha_uma' : 'escolha_a_frase_certa';
    const filler = b.play(extra, kind);
    if (filler) {
      list.push(filler);
      used.add(extra.index);
    }
  }
  return list;
}

/** The chapter as everyone sees it (GET /chapters/:d/:t, onboarding): lessons 1-3 on one fixed seed. */
export function composeChapter(
  chapter: ChapterPieces,
  seed: string,
): Exercise[] {
  return [1, 2, 3].flatMap((lesson) =>
    composeLesson(chapter, [], lesson, seed).map((c) => c.exercise),
  );
}

const key = (r: PieceRef) => `${r.topic}:${r.index}`;

/**
 * Lesson 4: each piece missed in this chapter, then up to EARLIER_MISSES missed in the subject's earlier chapters,
 * each played in a kind it was not missed in (a problem gets new values). Nothing missed: REVIEW_WHEN_CLEAN pieces of
 * the chapter, picked by the seed.
 */
export function composeReview(
  chapter: ChapterPieces,
  subject: ChapterPieces[],
  missedHere: PieceRef[],
  missedEarlier: PieceRef[],
  seed: string,
): Composed[] {
  const random = seeded(`${seed}:review`);
  const byTopic = new Map(subject.map((c) => [c.topic, c]));
  byTopic.set(chapter.topic, chapter);
  const seen = new Set<string>();
  const once = (refs: PieceRef[]) =>
    refs.filter((r) => !seen.has(key(r)) && seen.add(key(r)));

  const here = once(missedHere.filter((r) => r.topic === chapter.topic));
  const refs: PieceRef[] = here.length
    ? here
    : shuffle(
        chapter.pieces
          .map((piece, index) => ({
            topic: chapter.topic,
            index,
            type: piece.type,
          }))
          .filter((r) => r.type !== 'pergunta'),
        random,
      ).slice(0, REVIEW_WHEN_CLEAN);
  const earlier = once(
    missedEarlier.filter((r) => r.topic !== chapter.topic),
  ).slice(0, EARLIER_MISSES);

  const out: Composed[] = [];
  for (const ref of [...refs, ...earlier]) {
    const owner = byTopic.get(ref.topic);
    const piece = owner?.pieces[ref.index];
    if (!owner || !piece) continue;
    const others = subject.filter((c) => c.topic !== owner.topic);
    const b = new Builder(owner, others, random);
    const kinds = KINDS[piece.type];
    // Another kind first; the same one (new options, new values) when it has no other.
    const order = [
      ...shuffle(
        kinds.filter((k) => k !== ref.kind),
        random,
      ),
      ...kinds.filter((k) => k === ref.kind),
    ];
    for (const kind of order) {
      const played = b.play({ piece, index: ref.index }, kind);
      if (played) {
        out.push(played);
        break;
      }
    }
  }
  return out;
}
