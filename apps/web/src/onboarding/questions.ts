import type { OnboardingTopic } from "@arandu/contracts";
import type { Pose } from "@/ui/arandu-says";

/** One of O02-O08: Arandu's AI phrases it and its quick replies; this is only the topic, his pose and the field's hint. */
export type Question = { topic: OnboardingTopic; pose: Pose; placeholder: string };

const OWN_WORDS = "Ou fale do seu jeito";

/** In the order the API asks them. Each answer becomes an OnboardingAnswer: the picks and the person's words. */
export const QUESTIONS: Question[] = [
  { topic: "situation", pose: "sit", placeholder: OWN_WORDS },
  { topic: "likedSubjects", pose: "stand", placeholder: OWN_WORDS },
  { topic: "hardSubjects", pose: "lie", placeholder: OWN_WORDS },
  { topic: "interests", pose: "read", placeholder: OWN_WORDS },
  { topic: "workStyle", pose: "sit", placeholder: OWN_WORDS },
  { topic: "admired", pose: "stand", placeholder: OWN_WORDS },
  { topic: "careerIdea", pose: "sit", placeholder: OWN_WORDS },
];
