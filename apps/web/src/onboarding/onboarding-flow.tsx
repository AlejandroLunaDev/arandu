"use client";

import type { Journey, OnboardingAnswer, OnboardingReply, Recommendations } from "@arandu/contracts";
import { useState } from "react";
import { api } from "@/app-shell/api";
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
// answers with the board's own options for that topic, their words, or both. Once every topic is covered the
// answers are saved to the journey (PATCH /me/journey), Arandu shows what it understood (O09), and the
// recommended careers come by institution (O10, POST /arandu/recommendations).
export function OnboardingFlow() {
  const [turn, setTurn] = useState<OnboardingReply | null>(null);
  const [answers, setAnswers] = useState<OnboardingAnswer[]>([]);
  const [picks, setPicks] = useState<string[]>([]);
  const [said, setSaid] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [profileShown, setProfileShown] = useState(false);
  const [places, setPlaces] = useState<Place[] | null>(null);
  const [pick, setPick] = useState<number | null>(null);
  const [chosen, setChosen] = useState<{ course: PlaceCourse; place: Place } | null>(null);

  // Each call either moves on or leaves everything as it was, so "Tenta de novo" repeats it whole.
  const attempt = async (call: () => Promise<void>) => {
    // Enter can be pressed again while Arandu is still answering: one call at a time.
    if (busy) return;
    setBusy(true);
    setFailed(false);
    try {
      await call();
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };

  if (!turn)
    return <HelloView busy={busy} failed={failed} onStart={() => attempt(async () => setTurn(await api<OnboardingReply>("/arandu/onboarding", { method: "POST", body: {} })))} />;

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
            await api<Journey>("/me/journey", { method: "PATCH", body: { professionSlug: course.profession.slug, courseId: course.courseId } });
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
            const { careers } = await api<Recommendations>("/arandu/recommendations", { method: "POST", body: { profile: toProfileInput(turn.profile) } });
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
    if (question.kind === "one") return setPicks([pick]);
    if (picks.length >= (question.kind === "cards" && question.max ? question.max : MAX_PICKS)) return;
    setPicks([...picks, pick]);
  };

  // Sending words from the composer answers at once, with whatever was tapped: no extra "Continuar".
  const answer = (text = said) =>
    attempt(async () => {
      if (!question) {
        await api<Journey>("/me/journey", { method: "PATCH", body: { answers } });
        return setProfileShown(true);
      }
      const all = withAnswer(answers, { topic: question.topic, picks, text });
      const next = await api<OnboardingReply>("/arandu/onboarding", {
        method: "POST",
        body: { sessionId: turn.sessionId, message: toMessage(picks, text) },
      });
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
