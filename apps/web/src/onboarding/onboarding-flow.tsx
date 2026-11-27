"use client";

import type { AranduProfile, OnboardingAnswer, OnboardingReply } from "@arandu/contracts";
import Link from "next/link";
import { useState } from "react";
import { signInWithGoogle } from "@/auth/actions";
import { useAttempt } from "@/ui/use-attempt";
import { answerOnboarding, recommend, saveJourney, startOnboarding } from "./actions";
import { nextQuestion, toProfileInput, withAnswer } from "./answers";
import { HelloView } from "./hello-view";
import { PathFlow } from "./path-flow";
import { byInstitution, type Place, type PlaceCourse } from "./places";
import { PlacesView } from "./places-view";
import { ProfileView } from "./profile-view";
import { QuestionView } from "./question-view";
import styles from "./onboarding.module.css";

// O01-O10. Arandu (POST /arandu/onboarding) phrases each question and reacts to the last answer; the person
// answers in their own words, writing or talking. Once every topic is covered the
// answers are saved to the journey (PATCH /me/journey), Arandu shows what it understood (O09), and the
// recommended careers come with where each is taught (O10, POST /arandu/recommendations).
/** Whether a profile holds anything the person said. */
const heard = (p: AranduProfile) =>
  p.situation !== null ||
  p.careerIdea !== null ||
  [p.likedSubjects, p.hardSubjects, p.interests, p.workStyle, p.admired].some((list) => list.length > 0);

export function OnboardingFlow() {
  // Recomeçar mounts the flow anew: a new conversation, nothing of the last one on screen.
  const [run, setRun] = useState(0);
  return <Flow key={run} onRestart={() => setRun((n) => n + 1)} />;
}

function Flow({ onRestart }: { onRestart: () => void }) {
  const [turn, setTurn] = useState<OnboardingReply | null>(null);
  const [answers, setAnswers] = useState<OnboardingAnswer[]>([]);
  const [profileShown, setProfileShown] = useState(false);
  const [fixed, setFixed] = useState(false);
  const [places, setPlaces] = useState<Place[] | null>(null);
  const [chosen, setChosen] = useState<PlaceCourse | null>(null);
  /** What Arandu said bringing the list from the chat, when the person asked for other careers. */
  const [say, setSay] = useState<string | undefined>();
  /** Each list brought from the chat: its number keys the screen, and the careers of the earlier ones stay out of it. */
  const [list, setList] = useState(0);
  const [seen, setSeen] = useState<string[]>([]);
  const { busy, failed, attempt } = useAttempt();

  if (!turn)
    return <HelloView busy={busy} failed={failed} onStart={() => attempt(async () => setTurn(await startOnboarding()))} onGoogle={() => attempt(signInWithGoogle)} />;

  // At every step after the first, a way out of the onboarding and a way to start it over.
  const leave = (
    <nav className={styles.leave} aria-label="Sair ou recomeçar">
      <button type="button" onClick={onRestart}>
        Recomeçar
      </button>
      <Link href="/">Sair</Link>
    </nav>
  );
  const screen = (view: React.ReactNode) => (
    <div className={styles.flow}>
      {view}
      {leave}
    </div>
  );

  if (chosen) return screen(<PathFlow course={chosen} onBack={() => setChosen(null)} />);

  if (places)
    return screen(
      <PlacesView
        // A new list is a new screen: Arandu's words come out again and nothing stays open.
        key={list}
        places={places}
        say={say}
        seen={seen}
        onMore={(careers, said) => {
          const shown = places.flatMap((p) => p.courses.map((c) => c.profession.slug));
          setSeen((before) => [...new Set([...before, ...shown])].slice(-40));
          setPlaces(byInstitution(careers));
          setSay(said);
          setList((n) => n + 1);
        }}
        busy={busy}
        failed={failed}
        onBack={() => setPlaces(null)}
        onChoose={(courseId) =>
          attempt(async () => {
            // The course that stands for the career the person picked.
            const course = places.flatMap((p) => p.courses).find((c) => c.courseId === courseId)!;
            await saveJourney({ professionSlug: course.profession.slug, courseId: course.courseId });
            setChosen(course);
          })
        }
      />
    );

  if (profileShown)
    return screen(
      <ProfileView
        profile={turn.profile}
        reply={fixed ? turn.reply : null}
        busy={busy}
        failed={failed}
        // A correction is one more message in the onboarding's conversation: the reply carries the profile read again.
        onFix={(text) =>
          attempt(async () => {
            const next = await answerOnboarding(turn.sessionId, text);
            // A message Arandu lets pass (guardrails) comes back with an empty profile: the one read so far stays.
            setTurn(heard(next.profile) ? next : { ...next, profile: turn.profile });
            setFixed(true);
          })
        }
        onNext={() =>
          attempt(async () => {
            const { careers } = await recommend(toProfileInput(turn.profile));
            setPlaces(byInstitution(careers));
          })
        }
      />
    );

  // The latest reply's covered picks the question; one rich answer can cover two topics.
  // Once done (all covered, or the API's cap on answers) Arandu closes and asks nothing.
  const question = turn.done ? null : nextQuestion(turn.profile.covered);

  // Sending words from the composer answers at once; once Arandu closes, "Continuar" saves the answers.
  // shortcut: the journey's answers still carry `picks` from when there were options to tap (stored rows hold them);
  // it is always empty now. Drop the field when the journey's shape next changes.
  const answer = (text: string | null) =>
    attempt(async () => {
      if (!question || text === null) {
        await saveJourney({ answers });
        return setProfileShown(true);
      }
      const all = withAnswer(answers, { topic: question.topic, picks: [], text });
      const next = await answerOnboarding(turn.sessionId, text);
      setAnswers(all);
      setTurn(next);
    });

  return screen(
    <QuestionView
      // A new turn is a new question: its words come out one by one again.
      key={turn.reply}
      question={question}
      say={turn.reply}
      step={question ? Math.min(turn.progress.answered + 1, 7) : 7}
      busy={busy}
      failed={failed}
      onSay={answer}
      onContinue={() => answer(null)}
      // Only before the first answer: a conversation with Arandu cannot be taken back, so later questions go on.
      onBack={
        answers.length === 0
          ? () => {
              setTurn(null);
            }
          : undefined
      }
    />
  );
}
