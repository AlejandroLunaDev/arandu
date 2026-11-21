import type { OnboardingTopic } from "@arandu/contracts";
import type { Pose } from "@/ui/arandu-says";

/** How a question is answered by tapping; every question also takes the person's own words. */
type Picks =
  | { kind: "one"; options: string[] }
  | { kind: "chips"; options: string[] }
  | { kind: "cards"; options: [title: string, sub: string][]; max?: number }
  | { kind: "areas"; areas: [title: string, sub: string][]; subjects: string[] }
  | { kind: "free" };

export type Question = { topic: OnboardingTopic; say: string; pose: Pose; hint?: string; placeholder: string } & Picks;

const OWN_WORDS = "Ou fale do seu jeito";
const FREE = "Fale ou escreva pro Arandu";
const FREE_HINT = "Fale ou escreva do seu jeito, sem certo ou errado.";

/** O02-O08, as on the boards. Each answer becomes an OnboardingAnswer: the picks and the person's words. */
export const QUESTIONS: Question[] = [
  {
    topic: "situation",
    say: "Pra começar, me conta: o que você faz hoje?",
    pose: "sitting",
    placeholder: OWN_WORDS,
    kind: "one",
    options: ["Estou estudando", "Estou trabalhando", "Quero mudar de área", "Já me aposentei", "Prefiro pular"],
  },
  {
    topic: "likedSubjects",
    say: "Legal! E o que você gosta de aprender?",
    pose: "paws-up",
    hint: "Pode escolher quantas quiser.",
    placeholder: OWN_WORDS,
    kind: "areas",
    areas: [
      ["Humanas", "pessoas, história, sociedade"],
      ["Exatas", "números, lógica, cálculo"],
      ["Biológicas", "vida, corpo, natureza"],
      ["Linguagens e Artes", "ler, escrever, criar"],
    ],
    subjects: [
      "Biologia", "Química", "Física", "Matemática", "História", "Geografia", "Filosofia", "Sociologia",
      "Português", "Literatura", "Línguas", "Artes", "Música", "Educação Física", "Tecnologia", "Ainda não sei",
    ],
  },
  {
    topic: "hardSubjects",
    say: "Anotado. E o que costuma ser mais difícil ou chato pra você?",
    pose: "lying",
    hint: "Pode escolher mais de um.",
    placeholder: OWN_WORDS,
    kind: "chips",
    options: ["Matemática", "Física", "Química", "Português", "Biologia", "História", "Decorar coisas", "Nada em especial"],
  },
  {
    topic: "interests",
    say: "Agora uma mais livre: o que você curte fazer quando ninguém te pede nada?",
    pose: "looking-down",
    hint: FREE_HINT,
    placeholder: FREE,
    kind: "free",
  },
  {
    topic: "workStyle",
    // The board opens with a reaction to the last answer; that needs Arandu's AI, which comes with the talking part.
    say: "No trabalho, o que te atrai mais?",
    pose: "sitting",
    hint: "Até duas.",
    placeholder: OWN_WORDS,
    kind: "cards",
    max: 2,
    options: [
      ["Pessoas", "cuidar, ensinar, conversar"],
      ["Coisas", "montar, consertar, construir"],
      ["Dados", "números, padrões, organizar"],
      ["Ideias", "criar, imaginar, entender"],
    ],
  },
  {
    topic: "admired",
    say: "Quem você admira, de verdade ou de uma história, e por quê?",
    pose: "paws-up",
    hint: FREE_HINT,
    placeholder: FREE,
    kind: "free",
  },
  {
    topic: "careerIdea",
    say: "Última: você já tinha alguma carreira em mente?",
    pose: "standing",
    placeholder: OWN_WORDS,
    kind: "one",
    options: ["Sim, tenho uma ideia", "Pensei em algumas", "Ainda não sei"],
  },
];
