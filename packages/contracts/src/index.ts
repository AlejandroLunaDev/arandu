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
  modality: "presencial" | "a_distancia";
  /** Null for a distance course: the census gives it no campus or city. */
  campus: { name: string | null; city: string } | null;
  source: Source;
}

export interface Curriculum {
  years: { year: number; subjects: string[] }[];
  source: Source;
}

export interface Offering {
  institution: Institution;
  course: Course;
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
   * which is null where its grade is unknown. */
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

/** POST /arandu/chat: the person's next message about one profession, or about the recommended careers (O10). Without sessionId it starts a new session. */
export type AranduChatRequest =
  | { professionSlug: string; sessionId?: string; message: string }
  | {
      /** O10: the recommended careers, 1 to 4 and unique, in the order shown; Arandu works out which one they mean. */
      professionSlugs: string[];
      sessionId?: string;
      message: string;
      /** The courses on screen (up to 12, unique courseIds, from CareerOption.offerings), so Arandu can tell them apart by place. */
      choices?: CourseChoice[];
    };

export interface CourseChoice {
  courseId: number;
  course: string;
  institution: string;
  /** Null for a distance course: the census gives it no city. */
  city: string | null;
}

export interface AranduChatReply {
  sessionId: string;
  reply: string;
  /** The curricula of the career the reply is about; empty when Arandu asked which one they mean. */
  sources: Source[];
  /** The career the reply is about; null when Arandu asked which one they mean (only with professionSlugs). */
  professionSlug: string | null;
  /**
   * One of the sent choices once the person clearly decided on it; the reply is then a short confirmation and the
   * web moves on. Null while they doubt, ask, or name a career offered at several places (Arandu asks which).
   */
  chosenCourseId: number | null;
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
  /** Arandu's reaction and its next question, which the person answers in their own words. */
  reply: string;
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
  /** Where it has a real first-term curriculum, so its path can be lived: one per course; courseId is the CareerPath's. */
  offerings: {
    courseId: number;
    course: string;
    institution: Institution;
    /** Null for a distance course: the census gives it no city. */
    city: string | null;
  }[];
}

export interface Recommendations {
  /** 3 or 4 careers, the person's own idea first when it is one of them. */
  careers: CareerOption[];
}

/** GET /arandu/memory/conversations (S2): what the person and Arandu said, as text, newest first. */
export interface Conversations {
  conversations: {
    /** The onboarding, a talk about a career, one among the recommended careers (O10), or a question on a chapter's card (T1). */
    kind: "onboarding" | "career" | "choosing" | "card";
    startedAt: string;
    professionSlug: string | null;
    /** The chapter a card question was about; null for the other kinds. */
    chapter: { disciplineId: number; topic: number } | null;
    /** Oldest first. */
    messages: { role: "user" | "assistant"; text: string }[];
  }[];
}

/** GET /arandu/memory: everything Arandu remembers about the signed-in person, so they can see it (§5 transparency). */
export interface AranduMemory {
  /** The profile they confirmed; null until they do. */
  profile: AranduProfile | null;
  /** The facts as one note, one per line: what Arandu reads before talking to them. */
  summary: string;
  /** What Arandu remembers, oldest first; each one can be deleted (DELETE /arandu/memory/facts/:id). */
  facts: AranduFact[];
  /** Newest first, the last 50. */
  sessions: {
    kind: "onboarding" | "career" | "choosing";
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

/** A first-semester subject a path can start with: a book on the shelf, each topic one chapter. */
export interface PathSubject {
  disciplineId: number;
  code: string | null;
  name: string;
  /** The official topics, in the source's order; the index is the chapter. */
  topics: string[];
}

/** One course of the career and its first-semester subjects with topics (O11). */
export interface CareerPath {
  courseId: number;
  institution: string;
  course: string;
  /** Null for a distance course: the census gives it no city. */
  city: string | null;
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

/** One card Arandu explains a chapter with: every card cites where it comes from. */
export interface ChapterCard {
  title: string;
  text: string;
  /** `quote` is copied word for word from the page at `url`, and the API checked it is there. */
  source: { label: string; url: string; quote: string };
}

/** Recognize the answer among given ones, or produce it. */
export type ExerciseMode = "reconhecer" | "produzir";

/**
 * The exercises of a chapter (R01-R12). Answers come with them: the client checks them and reports the mistakes. "Revisão
 * relâmpago" (R11) is not here: the client replays the items missed in this chapter against a timer.
 */
export type Exercise = { mode: ExerciseMode; why: string } & (
  | { kind: "escolha_uma"; prompt: string; options: string[]; answer: number }
  | { kind: "una_os_pares"; prompt: string; pairs: [string, string][] }
  | {
      kind: "verdadeiro_ou_falso";
      statements: { text: string; answer: boolean; why: string }[];
    }
  /**
   * `text` marks each gap with ___; `answers` fill them in order; `tiles` holds them plus distractors. With `code`,
   * `text` is lines of code: show it monospaced, keeping its line breaks and indentation.
   */
  | {
      kind: "complete_a_frase";
      text: string;
      tiles: string[];
      answers: string[];
      code?: boolean;
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
  /** `steps` in the right order; the client shuffles them. With `code`, each step is a line of code, shown monospaced. */
  | { kind: "ordene"; prompt: string; steps: string[]; code?: boolean }
  /** A free answer by text or voice, graded by POST /chapters/:disciplineId/:topic/explain against `ideas`. */
  | { kind: "explique_para_o_arandu"; prompt: string; ideas: string[] }
  /**
   * A problem to solve, with new values on every play. `answer` is the index of the right option; `mistakes[i]` says
   * which typical mistake leads to option i (null for the right one), to show when the person picks it.
   */
  | {
      kind: "resolva";
      prompt: string;
      options: string[];
      answer: number;
      mistakes: (string | null)[];
    }
);

/** GET /chapters/:disciplineId/:topic: a chapter of a subject, the same for everyone. */
export interface ChapterContent {
  discipline: { id: number; name: string };
  topic: { index: number; text: string; total: number };
  /** 3 to 5 (a few early chapters have fewer). */
  cards: ChapterCard[];
  exercises: Exercise[];
}

/**
 * Where an exercise comes from: `index` is the chapter piece it tests (a concept, a statement, a problem...), in the
 * chapter `topic`. Report a miss with this `topic` and `index`.
 */
export type LessonExercise = Exercise & { topic: number; index: number };

/**
 * POST /chapters/:disciplineId/:topic/lessons/:lesson/start (1-3): enters one lesson of a chapter, for this person,
 * built from the chapter's pieces: 1 recognises, 2 applies, 3 solves and produces. Entering costs `Wallet.lessonPrice`
 * peixinhos, every time: 409 `not_enough_peixinhos` with too few, and nothing is spent. Lessons 1 and 2 open in any
 * order, 3 once both are done: 409 `lesson_locked` before. The same person gets the same lesson again; another person
 * gets another variant. Each lesson is a full pass: its cards, its exercises, then its misses again until right.
 */
export interface Lesson {
  index: number;
  total: 3;
  /** This lesson's share of the chapter's cards (all of them when the chapter has fewer than 3). */
  cards: ChapterCard[];
  exercises: LessonExercise[];
  /**
   * Mistakes the lesson allows: each one costs a life, and the last one loses the lesson's progress, unless the person
   * goes on with POST /chapters/:disciplineId/:topic/lessons/:lesson/continue.
   */
  lives: number;
}

/** POST /chapters/:disciplineId/:topic/lessons/:lesson/result: the exercises missed at least once. */
export interface LessonResultRequest {
  missed: { topic: number; index: number }[];
}

/** A lesson's rewards; a replay gives none. Lesson 3 also finishes the chapter. */
export interface LessonResult {
  /** Sabedoria this finish gave: 0 on a replay, or once the chapter was finished. */
  sabedoria: number;
  /** The day's first lesson or chapter: a new patinha. */
  patinha: boolean;
  /** The caixa this lesson's first finish earned (open it with POST /me/caixas/:id/open); null on a replay. */
  caixaId: number | null;
  achievements: AchievementCode[];
  chapterDone: boolean;
}

/** POST /chapters/:disciplineId/:topic/result: how many mistakes the person made before getting every item right. */
export interface ChapterResultRequest {
  mistakes: number;
  /** Mistakes in the chapter's revisão relâmpago; null when it had none (nothing was missed). */
  relampagoMistakes?: number | null;
}

/** POST /chapters/:disciplineId/:topic/explain: the person's answer to "Explique para o Arandu", typed or spoken. */
export interface ExplainRequest {
  answer: string;
}

/** Which expected ideas the answer got: a reading, never a score. */
export interface ExplainReply {
  ideas: { text: string; got: boolean }[];
  /** Arandu's short, warm reply. */
  reply: string;
}

/** POST /chapters/:disciplineId/:topic/ask (T1): a question about the chapter's cards. */
export interface AskRequest {
  question: string;
}

export interface AskReply {
  reply: string;
  /** The cards' sources the reply rests on. */
  sources: { label: string; url: string }[];
}

export type AchievementCode =
  | "primeiro_capitulo"
  | "nenhum_novelo_perdido"
  | "semana_de_patinhas"
  | "primeiro_livro"
  | "relampago"
  | "curiosidade_de_gato";

export interface ChapterResult {
  /** Sabedoria this finish gave: 0 when the chapter was already finished. */
  sabedoria: number;
  /** Peixinhos this finish gave: 0 when the chapter was already finished. */
  peixinhos: number;
  /** The first chapter of the day: a new patinha. */
  patinha: boolean;
  /** Achievements this finish earned. */
  achievements: AchievementCode[];
}

/** Peixinhos, the currency and page markers (all amounts are demo values). */
export interface Wallet {
  /** The energy: entering a lesson costs `lessonPrice`. Caixas and the season add more. */
  peixinhos: number;
  /** A new wallet starts with this, and the day's gift brings the peixinhos up to it; more than this is kept. */
  dailyPeixinhos: number;
  /**
   * The day's gift still waiting: what is missing to reach `dailyPeixinhos`, once per São Paulo day. Show it on the day's
   * first visit and give it with POST /me/daily-gift. 0 once given, or with `dailyPeixinhos` or more. Entering a lesson
   * before that gives it too.
   */
  dailyGift: number;
  /** The next day's gift: the next São Paulo midnight. */
  nextRefillAt: string;
  lessonPrice: number;
  /** The game's currency (its name is not chosen yet): it comes in caixas. */
  currency: number;
  /** Currency to go on with a lesson after its last life (POST /chapters/:d/:t/lessons/:n/continue). */
  continuePrice: number;
  marcadores: number;
}

/** POST /me/daily-gift: the peixinhos the day's gift gave (0 when already given today), and the wallet after it. */
export interface DailyGift {
  peixinhos: number;
  wallet: Wallet;
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
  /** For S3 "Voltou": null before the first chapter. */
  lastStudiedOn: string | null;
  /** The book the person is on and its next chapter; null before choosing one. `nextTopic` is null when it is done. */
  current: {
    disciplineId: number;
    name: string;
    nextTopic: number | null;
    total: number;
  } | null;
  achievements: Achievement[];
}

/** GET /me/books/:disciplineId: the path of chapters (P1, K3). */
export interface BookProgress {
  discipline: { id: number; name: string };
  chapters: {
    index: number;
    text: string;
    state: "done" | "current" | "locked";
    /** The chapter's three lessons: all done in a done chapter, all locked in a locked one. */
    lessons: { index: 1 | 2 | 3; state: "done" | "open" | "locked" }[];
  }[];
}

/** The six leagues, in order (L0). Each dresses Arandu; an outfit is kept forever. */
export type LeagueId =
  "calouro" | "veterano" | "monitor" | "mestre" | "filosofo" | "sabio";

/** GET /me/league (L1): this week's league of 12 by weekly sabedoria. Others show only a nickname and sabedoria. */
export interface League {
  league: { id: LeagueId; name: string; rank: number };
  /** The round in progress (its length is a game setting, 1 day in the demo): first São Paulo day, days, end. */
  round: { startsOn: string; days: number; endsAt: string };
  /** How many move up at the end of the round. */
  promoteTop: number;
  /** Best first. `demo` rivals fill the league while there are few people. */
  rows: {
    position: number;
    nickname: string;
    sabedoria: number;
    you: boolean;
    demo: boolean;
  }[];
  /** A promotion the person has not seen yet (L7); cleared by POST /me/league/promotion/seen. */
  promotion: { from: LeagueId; to: LeagueId; caixaId: number } | null;
}

export type SeasonReward =
  | { kind: "peixinhos"; amount: number }
  | { kind: "caixa" }
  | { kind: "marcador" };

/** GET /me/season (L3): a level every 50 sabedoria of the season, 8 levels. Only studying moves it. */
export interface Season {
  season: number;
  endsOn: string;
  sabedoria: number;
  level: number;
  perLevel: number;
  free: {
    level: number;
    reward: SeasonReward;
    ready: boolean;
    claimed: boolean;
  }[];
  /** Shown locked: never purchasable here. */
  plus: { level: number; item: string; locked: true }[];
}

/** What a caixa held, rolled on the server when opened (L4). */
export interface CaixaContents {
  peixinhos: number;
  currency: number;
  sabedoria: number;
  marcador: boolean;
  /** A room item, e.g. "planta"; null when none. */
  roomItem: string | null;
}

export interface Caixa {
  id: number;
  /** Why it was earned: "lesson:<disciplineId>:<topic>:<lesson>", "season:1:2", "promotion:veterano" or "demo_finished". */
  reason: string;
  createdAt: string;
  openedAt: string | null;
  contents: CaixaContents | null;
}

/** GET /me/wardrobe (L6): owned league outfits and room items, and what Arandu wears. */
export interface Wardrobe {
  outfits: { id: LeagueId; owned: boolean }[];
  roomItems: string[];
  /** The outfit worn: the chosen one, or the highest league reached. */
  wearing: LeagueId;
  nickname: string | null;
}

/** PUT /me/wardrobe: either field; null wears the highest league reached, or clears the nickname. */
export interface WardrobeUpdate {
  wearing?: LeagueId | null;
  nickname?: string | null;
}

/** One short thing Arandu remembers about the person, in Brazilian Portuguese, and where it learned it. */
export interface AranduFact {
  id: number;
  text: string;
  source: "onboarding" | "chapter" | "conversation";
  createdAt: string;
}

/** POST /me/books/:disciplineId/reflection (S4): how the book felt, as chips, their own words, or both. */
export interface BookReflectionRequest {
  chips: string[];
  text: string | null;
}

/** GET /me/books/:disciplineId/reflection (S4): Arandu's reading of the book, never a grade. */
export interface BookReflection {
  discipline: { id: number; name: string };
  /** Every chapter of the book is done. */
  finished: boolean;
  /** Exercise items answered right the first time, of all the items in the finished chapters. */
  items: { right: number; total: number };
  questions: number;
  /** Chapters finished with no mistake. */
  further: string[];
  /** The chapter with the most mistakes; null when none had any. */
  stuck: string | null;
  feeling: BookReflectionRequest | null;
  /** Arandu's closing, once the book is finished and its feeling sent; null before, or while it cannot be written. */
  closing: BookClosing | null;
}

/** Arandu's closing of a finished book: its reading in a few sentences, ending in a decision the person makes. */
export interface BookClosing {
  /** Brazilian Portuguese, 2 to 4 sentences, ending with one question. */
  text: string;
  /** The way Arandu suggests, never a verdict: the app shows all three and the person picks. */
  suggestion: "seguir" | "outra_carreira" | "rever_capitulo";
  /** The chapter (its topic index) to go back to, with "rever_capitulo"; otherwise null. */
  chapter: number | null;
}

/** Every error response is `{ error: ApiError }`. Branch on `code`; `message` is for people and never parsed. */
export interface ApiError {
  statusCode: number;
  /** Stable snake_case, e.g. `not_found`, `validation_failed`, an AuthErrorCode. */
  code: string;
  message: string;
  /** Only on `validation_failed`: what is wrong with each field (`""` is the whole body). */
  details?: { field: string; messages: string[] }[];
}

export interface ErrorResponse {
  error: ApiError;
}

// Auth: the API owns users and sessions (the v2.0 model). Only the web's Next server calls these, with
// x-internal-secret, x-client-ip and x-client-user-agent; the browser never sees a token.

/** What POST /auth/guest, /auth/session and /auth/refresh answer. Kept server-side, in a sealed httpOnly cookie. */
export interface TokenPair {
  /** HS256 JWT { sub: userId, sid: sessionId }, sent as `Authorization: Bearer` on every other call. */
  accessToken: string;
  /** Seconds until the access token expires. */
  accessTokenExpiresIn: number;
  /** Opaque; the API stores only its SHA-256. */
  refreshToken: string;
}

/**
 * POST /auth/session: Supabase only proves the Google identity. With the current session's bearer, a guest is promoted
 * to a Google nobody has; a Google that already has a user loads that user and the guest is deleted with its progress
 * (never merged). Without a bearer, a plain sign-in. Always a new session: replace the whole cookie. An invalid bearer
 * is a 401 `unauthorized` and changes nothing.
 */
export interface CreateSessionRequest {
  supabaseToken: string;
}

/** POST /auth/refresh. */
export interface RefreshSessionRequest {
  refreshToken: string;
  /** Epoch ms. Past it the API answers 408 `refresh_deadline_passed` and does not rotate. */
  deadline: number;
}

/** GET /auth/me: the account. (GET /me is the Home.) */
export interface Me {
  id: string;
  /** A guest (shadow user) has no identity yet. */
  guest: boolean;
  email: string | null;
  name: string | null;
  avatarUrl: string | null;
}

/** The `error.code` of an auth error. */
export type AuthErrorCode =
  /** 401: missing, invalid or expired access token, or an ended session. */
  | "unauthorized"
  /** 401: Supabase rejected the token. */
  | "invalid_identity_token"
  /** 401: the session is over; clear the cookie. */
  | "invalid_refresh_token"
  /** 408 */
  | "refresh_deadline_passed"
  /** 403, at login and on every request. */
  | "user_banned"
  /** 503: Supabase could not be reached at sign-in; try again, the person is not signed out. */
  | "identity_unavailable"
  /** 429 */
  | "too_many_requests";
