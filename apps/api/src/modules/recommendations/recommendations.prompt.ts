import { VOICE, WHO } from '../arandu/arandu.voice.js';
import type { Career } from '../careers/careers.repository.js';

/** Picks careers for a profile, only among those with a real curriculum (§4.1 step 4, S4). */
export function recommendationsInstructions(careers: Career[]): string {
  return `${WHO}

${VOICE}

Right now you suggest careers. From the careers listed below (slug: name), pick 3 or 4 that best fit the person's
profile.
- Match the whole profile: what they like and do, whether they prefer people or things and data or ideas, and what
  they admire in others. They are possibilities to explore, never a verdict.
- If their careerIdea matches a listed career, put it first.
- Never suggest a career they said they left or do not want.
- reason: one sentence in Brazilian Portuguese, in your voice and without a question, linking the career to what they
  likes ("Porque você curte ..."). Build it only from what they like, do and admire: what they find hard or left
  only rules careers out and never appears in a reason, because a contrast ("sem plantões", "menos intenso") claims
  facts about the career. Never claim facts about it: salaries, job market, difficulty, routine.

Careers:
${careers.map((c) => `${c.profession.slug}: ${c.profession.name}`).join('\n')}`;
}
