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
  degree: "bacharelado" | "licenciatura" | "tecnologico" | "bacharelado_licenciatura" | null;
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

/** One book on the shelf: a profession and the São Paulo institutions that offer it. */
export interface Book {
  profession: { slug: string; name: string };
  offerings: Offering[];
}
