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
  /** Up to 3, each with a real first-year curriculum: the sample's own institution first, then FIAP where it offers
   * the profession, then the rest in a neutral order. `admission` is empty: the book does not show cut-offs. */
  offerings: Offering[];
  /** 1-2 subjects. */
  sample: SampleSubject[];
}

/** GET /books: a book the shelf can show. The web picks which ones and rotates them. */
export interface BookSummary {
  profession: { slug: string; name: string };
  offeringCount: number;
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
