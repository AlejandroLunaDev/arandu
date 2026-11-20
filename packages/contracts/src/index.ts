// The API's response shapes, shared by apps/api and apps/web. Types only: nothing here runs.
// The book contract is decided in docs/adr/0004-profession-book-contract-and-ingestion-scope.md.

/** Where a fact comes from. Every fact the book shows carries one. */
export interface Source {
  label: string;
  url: string;
  /** ISO 8601 date the source was last fetched. */
  retrievedAt: string;
}

export interface Logo {
  url: string;
  license: string;
  sourceUrl: string;
}

export interface Photo {
  url: string;
  credit: string;
  license: string;
  sourceUrl: string;
}

export interface Institution {
  name: string;
  shortName: string | null;
  kind: "public" | "private" | "special";
  logo: Logo | null;
  photo: Photo | null;
}

export interface Course {
  name: string;
  degree:
    | "bacharelado"
    | "licenciatura"
    | "tecnologico"
    | "bacharelado_licenciatura"
    | null;
  shift: "matutino" | "vespertino" | "noturno" | "integral" | null;
  durationYears: number | null;
  campus: { name: string | null; city: string };
  source: Source;
}

export interface Cutoff {
  /** "1-2024" for SISU and ProUni (term-year), "2026" for Fuvest and ENEM-USP. */
  edition: string;
  /** phase1_min is Fuvest points out of 90; the others are out of 1000. Never compare across metrics. */
  metric: "final_cutoff" | "first_call_min" | "phase1_min";
  /** Set for Fuvest and ENEM-USP lists, which publish one per call. */
  callNumber: number | null;
  /** Set for ProUni only. */
  scholarship: "integral" | "parcial" | null;
  quota: string;
  quotaLabel: string;
  score: number;
}

export interface AdmissionRoute {
  route: "sisu" | "prouni" | "fuvest" | "enem_usp";
  /** Scores of different scales are never compared. A ProUni score is a scholarship cut-off. */
  scale: "enem" | "fuvest" | "prouni";
  source: Source;
  /** Oldest edition first. */
  cutoffs: Cutoff[];
}

export interface Curriculum {
  years: { year: number; subjects: string[] }[];
  source: Source;
}

export interface Offering {
  institution: Institution;
  course: Course;
  admission: AdmissionRoute[];
  curriculum: Curriculum | null;
}

/** A first-semester subject with its real topics: a taste of the path Arandu offers in this career. */
export interface SampleSubject {
  name: string;
  /** In the source's order. One item can be a whole paragraph: the web trims them. */
  topics: string[];
  /** The institution's short name, or its name when it has none. */
  institution: string;
  source: Source;
}

/** One book on the shelf: a profession and the São Paulo institutions that offer it. */
export interface Book {
  profession: { slug: string; name: string };
  /** Up to 3 institutions with a photo, one offering each: the sample's own institution first, then FIAP where it
   * offers the profession, then the rest in a neutral order. Each has a real first-year curriculum, except FIAP's,
   * which is null where its grade is unknown. `admission` is empty: the book does not show cut-offs. */
  offerings: Offering[];
  /** 1-2 subjects. */
  sample: SampleSubject[];
}

/** GET /books: a book the shelf can show. The web picks which ones and rotates them. */
export interface BookSummary {
  profession: { slug: string; name: string };
  offeringCount: number;
}

/** One item of a page of the landing's own books. */
export interface StoryFact {
  /** The item's heading, or null for a plain paragraph. */
  figure: string | null;
  text: string;
  /** Null for Arandu's own statement. `url` is null for a count of Arandu's own database, which has no one page. */
  source: {
    label: string;
    url: string | null;
    /** ISO 8601 date the figure was checked at its source. */
    verifiedOn: string;
  } | null;
}

export interface StoryPage {
  title: string;
  /** In order. */
  facts: StoryFact[];
}

/** GET /books/own/:book: the landing's own books, "Solução" (the problem) and "Produto" (what Arandu brings). */
export interface OwnBook {
  book: "produto" | "solucao";
  /** In reading order, one per section of the text; at least one. */
  pages: StoryPage[];
}

/** One turn of the conversation with Arandu. */
export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

/** POST /arandu/chat: the person's next message about one profession. Without sessionId it starts a new session. */
export interface AranduChatRequest {
  professionSlug: string;
  sessionId?: string;
  message: string;
}

export interface AranduChatReply {
  sessionId: string;
  reply: string;
  /** The curricula Arandu was given to ground the reply. */
  sources: Source[];
}

/** The onboarding's topics, one question each (docs/05-functional-map.md S1). */
export type OnboardingTopic =
  | "situation"
  | "likedSubjects"
  | "hardSubjects"
  | "interests"
  | "workStyle"
  | "admired"
  | "careerIdea";

/** What Arandu learns in the onboarding: the base of "Quem sou eu". Items are in the person's own words. */
export interface AranduProfile {
  /** What the person does now: finishing ensino médio, working, retired, just left a course. */
  situation: string | null;
  likedSubjects: string[];
  hardSubjects: string[];
  /** What they enjoy doing, in or out of study and work. */
  interests: string[];
  /** How they like to work: with people, ideas, their hands, data. */
  workStyle: string[];
  /** People, characters or stories they admire, and why: themes of who they want to be. */
  admired: string[];
  /** The career they had in mind; null when they had none or were not asked yet. */
  careerIdea: string | null;
  /** The topics they already answered. */
  covered: OnboardingTopic[];
}

/** POST /arandu/onboarding: {} starts a session and Arandu speaks first; then the session and the person's answer. */
export type OnboardingRequest =
  Record<string, never> | { sessionId: string; message: string };

export interface OnboardingReply {
  sessionId: string;
  reply: string;
  /** Tappable answers to the question in `reply`; the person can always write freely. Empty when done. */
  quickReplies: string[];
  profile: AranduProfile;
  /** Topics answered, of all of them: "3 de 7". */
  progress: { answered: number; total: number };
  /** Every topic is answered: time to show careers. */
  done: boolean;
}

/** POST /arandu/recommendations: the profile, as the person confirmed or corrected it (S3). */
export interface RecommendationsRequest {
  profile: AranduProfile;
}

export interface CareerOption {
  profession: { slug: string; name: string };
  /** One line that links the career back to the profile. */
  reason: string;
  /** Where it has a real first-term curriculum, so its path can be lived. */
  offerings: { institution: string; city: string }[];
}

export interface Recommendations {
  /** 3 or 4 careers, the person's own idea first when it is one of them. */
  careers: CareerOption[];
}

/** GET /arandu/memory: everything Arandu remembers about the signed-in person, so they can see it (§5 transparency). */
export interface AranduMemory {
  /** The profile they confirmed; null until they do. */
  profile: AranduProfile | null;
  /** Arandu's note on their past sessions, in Brazilian Portuguese, at most 1500 characters. */
  summary: string;
  /** Newest first, the last 50. */
  sessions: {
    kind: "onboarding" | "career";
    professionSlug: string | null;
    startedAt: string;
  }[];
}

/** One onboarding question as the person answered it (O02-O08): the options they tapped and their own words. */
export interface OnboardingAnswer {
  topic: OnboardingTopic;
  picks: string[];
  /** Typed or spoken (speech-to-text); never audio. */
  text: string | null;
}

/** POST /arandu/onboarding/profile: the answers; the reply is Arandu's reading of the person as tags (O09). */
export interface ProfileReadingRequest {
  answers: OnboardingAnswer[];
}

/** A first-semester subject a path can start with: a book on the shelf, each topic one stop. */
export interface PathSubject {
  disciplineId: number;
  code: string | null;
  name: string;
  /** The official topics, in the source's order; the index is the stop. */
  topics: string[];
}

/** One course of the career and its first-semester subjects with topics (O11). */
export interface CareerPath {
  courseId: number;
  institution: string;
  course: string;
  city: string;
  shift: string | null;
  subjects: PathSubject[];
  source: Source;
}

/** GET /careers/:slug/paths: where the career can be lived, course by course. Empty when no course has topics. */
export interface CareerPaths {
  profession: { slug: string; name: string };
  paths: CareerPath[];
}

/** What the person chose so far (O02-O20). Null until chosen. */
export interface Journey {
  answers: OnboardingAnswer[] | null;
  professionSlug: string | null;
  courseId: number | null;
  /** The subject the path starts with. */
  disciplineId: number | null;
  /** Days of study per week (O12). */
  weeklyGoal: 3 | 5 | 7 | null;
  /** Self-declared (O20). */
  age: number | null;
}

/** PATCH /me/journey: only the fields sent change. */
export type JourneyUpdate = Partial<Journey>;

/** One card Arandu explains a stop with: every card cites where it comes from. */
export interface StopCard {
  title: string;
  text: string;
  /** `quote` is copied word for word from the page at `url`, and the API checked it is there. */
  source: { label: string; url: string; quote: string };
}

/** Recognize the answer among given ones, or produce it. */
export type ExerciseMode = "reconhecer" | "produzir";

/**
 * The exercises of a stop (R01-R12). Answers come with them: the client checks them and reports the mistakes. "Revisão
 * relâmpago" (R11) is not here: the client replays the items missed in this stop against a timer.
 */
export type Exercise = { mode: ExerciseMode; why: string } & (
  | { kind: "escolha_uma"; prompt: string; options: string[]; answer: number }
  | { kind: "una_os_pares"; prompt: string; pairs: [string, string][] }
  | {
      kind: "verdadeiro_ou_falso";
      statements: { text: string; answer: boolean; why: string }[];
    }
  /** `text` marks each gap with ___; `answers` fill them in order; `tiles` holds them plus distractors. */
  | {
      kind: "complete_a_frase";
      text: string;
      tiles: string[];
      answers: string[];
    }
  /** `answer` is the sentence's words in order; the client shuffles them, plus `distractors`. */
  | {
      kind: "monte_a_frase";
      prompt: string;
      answer: string[];
      distractors: string[];
    }
  | {
      kind: "escolha_a_frase_certa";
      prompt: string;
      options: string[];
      answer: number;
    }
  /** A 2x2 grid: each item goes in one cell, [row, column]. */
  | {
      kind: "na_grade";
      prompt: string;
      rows: [string, string];
      columns: [string, string];
      items: { text: string; cell: [0 | 1, 0 | 1] }[];
    }
  | {
      kind: "separe_nas_cestas";
      prompt: string;
      baskets: [string, string];
      items: { text: string; basket: 0 | 1 }[];
    }
  /** The sentence in segments; `answer` is the index of the one to tap. */
  | {
      kind: "toque_no_trecho";
      prompt: string;
      segments: string[];
      answer: number;
    }
  /** `steps` in the right order; the client shuffles them. */
  | { kind: "ordene"; prompt: string; steps: string[] }
  /** A free answer by text or voice, graded by POST /stops/:disciplineId/:topic/explain against `ideas`. */
  | { kind: "explique_para_o_arandu"; prompt: string; ideas: string[] }
);

/** GET /stops/:disciplineId/:topic: a stop of a subject, the same for everyone. */
export interface StopContent {
  discipline: { id: number; name: string };
  topic: { index: number; text: string; total: number };
  /** 1-3. */
  cards: StopCard[];
  exercises: Exercise[];
}

/** POST /stops/:disciplineId/:topic/result: how many mistakes the person made before getting every item right. */
export interface StopResultRequest {
  mistakes: number;
  /** Mistakes in the stop's revisão relâmpago; null when it had none (nothing was missed). */
  relampagoMistakes?: number | null;
}

/** POST /stops/:disciplineId/:topic/explain: the person's answer to "Explique para o Arandu", typed or spoken. */
export interface ExplainRequest {
  answer: string;
}

/** Which expected ideas the answer got: a reading, never a score. */
export interface ExplainReply {
  ideas: { text: string; got: boolean }[];
  /** Arandu's short, warm reply. */
  reply: string;
}

/** POST /stops/:disciplineId/:topic/ask (T1): a question about the stop's cards. */
export interface AskRequest {
  question: string;
}

export interface AskReply {
  reply: string;
  /** The cards' sources the reply rests on. */
  sources: { label: string; url: string }[];
}

export type AchievementCode =
  | "primeira_parada"
  | "nenhum_novelo_perdido"
  | "semana_de_patinhas"
  | "primeiro_livro"
  | "relampago"
  | "curiosidade_de_gato";

export interface StopResult {
  /** Sabedoria this finish gave: 0 when the stop was already finished. */
  sabedoria: number;
  /** Peixinhos this finish gave: 0 when the stop was already finished. */
  peixinhos: number;
  /** The first stop of the day: a new patinha. */
  patinha: boolean;
  /** Achievements this finish earned. */
  achievements: AchievementCode[];
}

/** Novelos, peixinhos and page markers (all amounts are demo values). */
export interface Wallet {
  novelos: number;
  maxNovelos: number;
  /** When the next novelo comes back; null when full. */
  nextNoveloAt: string | null;
  peixinhos: number;
  marcadores: number;
}

export interface Achievement {
  code: AchievementCode;
  earnedAt: string;
}

/** GET /me: the home (S1) and "Você" (K1). Days are São Paulo days, "YYYY-MM-DD". */
export interface Home {
  wallet: Wallet;
  sabedoria: { total: number; week: number };
  /** This week, Monday first: whether the person studied that day (a patinha). */
  week: {
    days: { date: string; studied: boolean }[];
    studied: number;
    goal: 3 | 5 | 7 | null;
  };
  /** For S3 "Voltou": null before the first stop. */
  lastStudiedOn: string | null;
  /** The book the person is on and its next stop; null before choosing one. `nextTopic` is null when it is done. */
  current: {
    disciplineId: number;
    name: string;
    nextTopic: number | null;
    total: number;
  } | null;
  achievements: Achievement[];
}

/** GET /me/books/:disciplineId: the path of stops (P1, K3). */
export interface BookProgress {
  discipline: { id: number; name: string };
  stops: {
    index: number;
    text: string;
    state: "done" | "current" | "locked";
  }[];
}
