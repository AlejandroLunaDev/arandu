"use client";

import type { OnboardingAnswer, OnboardingReply } from "@arandu/contracts";
import { useState } from "react";
import { signInWithGoogle } from "@/auth/actions";
import { useAttempt } from "@/ui/use-attempt";
import { answerOnboarding, recommend, saveJourney, startOnboarding } from "./actions";
import { nextQuestion, toMessage, toProfileInput, withAnswer } from "./answers";
import { HelloView } from "./hello-view";
import { PathFlow } from "./path-flow";
import { byInstitution, type Place, type PlaceCourse } from "./places";
import { PlacesView } from "./places-view";
import { ProfileView } from "./profile-view";
import { QuestionView } from "./question-view";

/** The API takes up to 10 picks per answer. */
const MAX_PICKS = 10;

// O01-O10. Arandu (POST /arandu/onboarding) phrases each question and reacts to the last answer; the person
// answers with its quick replies, their own words, or both. Once every topic is covered the
// answers are saved to the journey (PATCH /me/journey), Arandu shows what it understood (O09), and the
// recommended careers come by institution (O10, POST /arandu/recommendations).
export function OnboardingFlow() {
  const [turn, setTurn] = useState<OnboardingReply | null>(null);
  const [answers, setAnswers] = useState<OnboardingAnswer[]>([]);
  const [picks, setPicks] = useState<string[]>([]);
  const [said, setSaid] = useState<string | null>(null);
  const [profileShown, setProfileShown] = useState(false);
  const [places, setPlaces] = useState<Place[] | null>(null);
  const [pick, setPick] = useState<number | null>(null);
  const [chosen, setChosen] = useState<{ course: PlaceCourse; place: Place } | null>(null);
  const { busy, failed, attempt } = useAttempt();

  if (!turn)
    return <HelloView busy={busy} failed={failed} onStart={() => attempt(async () => setTurn(await startOnboarding()))} onGoogle={() => attempt(signInWithGoogle)} />;

  if (chosen) return <PathFlow course={chosen.course} place={chosen.place} />;

  if (places)
    return (
      <PlacesView
        places={places}
        pick={pick}
        busy={busy}
        failed={failed}
        onPick={setPick}
        onNext={() =>
          attempt(async () => {
            const place = places.find((p) => p.courses.some((c) => c.courseId === pick))!;
            const course = place.courses.find((c) => c.courseId === pick)!;
            await saveJourney({ professionSlug: course.profession.slug, courseId: course.courseId });
            setChosen({ course, place });
          })
        }
      />
    );

  if (profileShown)
    return (
      <ProfileView
        profile={turn.profile}
        busy={busy}
        failed={failed}
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

  const toggle = (pick: string) => {
    if (!question) return;
    if (picks.includes(pick)) return setPicks(picks.filter((p) => p !== pick));
    if (picks.length >= MAX_PICKS) return;
    setPicks([...picks, pick]);
  };

  // Sending words from the composer answers at once, with whatever was tapped: no extra "Continuar".
  const answer = (text = said) =>
    attempt(async () => {
      if (!question) {
        await saveJourney({ answers });
        return setProfileShown(true);
      }
      const all = withAnswer(answers, { topic: question.topic, picks, text });
      const next = await answerOnboarding(turn.sessionId, toMessage(picks, text));
      setAnswers(all);
      setTurn(next);
      setPicks([]);
      setSaid(null);
    });

  return (
    <QuestionView
      // A new turn is a new question: its words come out one by one again.
      key={turn.reply}
      question={question}
      say={turn.reply}
      options={turn.quickReplies}
      step={question ? Math.min(turn.progress.answered + 1, 7) : 7}
      picks={picks}
      said={said}
      busy={busy}
      failed={failed}
      onToggle={toggle}
      onSay={(text) => {
        setSaid(text);
        answer(text);
      }}
      onContinue={() => answer()}
    />
  );
}
