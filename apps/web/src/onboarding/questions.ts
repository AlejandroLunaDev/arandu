import type { OnboardingTopic } from "@arandu/contracts";
import type { Pose } from "@/ui/arandu-says";

/** One of O02-O08: Arandu's AI phrases it and its quick replies; this is only the topic, his pose and the field's hint. */
export type Question = { topic: OnboardingTopic; pose: Pose; placeholder: string };

const OWN_WORDS = "Ou fale do seu jeito";

/** In the order the API asks them. Each answer becomes an OnboardingAnswer: the picks and the person's words. */
export const QUESTIONS: Question[] = [
  { topic: "situation", pose: "sitting", placeholder: OWN_WORDS },
  { topic: "likedSubjects", pose: "paws-up", placeholder: OWN_WORDS },
  { topic: "hardSubjects", pose: "lying", placeholder: OWN_WORDS },
  { topic: "interests", pose: "looking-down", placeholder: OWN_WORDS },
  { topic: "workStyle", pose: "sitting", placeholder: OWN_WORDS },
  { topic: "admired", pose: "paws-up", placeholder: OWN_WORDS },
  { topic: "careerIdea", pose: "standing", placeholder: OWN_WORDS },
];
