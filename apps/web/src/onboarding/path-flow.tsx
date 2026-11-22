"use client";

import type { CareerPaths, StopContent, StopResult } from "@arandu/contracts";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { signInWithGoogle } from "@/auth/actions";
import { useAttempt } from "@/ui/use-attempt";
import { getCareerPaths, getStop, isGuest, saveJourney, saveStopResult } from "./actions";
import { AgeView, DoneView, GoogleView, HowView, RhythmView, SemesterView } from "./path-steps";
import { type Place, type PlaceCourse, placeName } from "./places";
import { StopView } from "./stop-view";

type Step = "semester" | "rhythm" | "how" | "stop" | "done" | "age" | "google";

// O11-O21, after the person picked a course at O10: its first semester, the weekly goal, the first stop (its
// cards and exercises), its result, the age and Google. Each choice is saved to the journey as it is made.
export function PathFlow({ course, place, onBack }: { course: PlaceCourse; place: Place; onBack: () => void }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("semester");
  const [paths, setPaths] = useState<CareerPaths | null>(null);
  const [goal, setGoal] = useState<3 | 5 | 7 | null>(null);
  const [stop, setStop] = useState<StopContent | null>(null);
  const [result, setResult] = useState<StopResult | null>(null);
  const [lost, setLost] = useState(false);
  const { busy, failed, attempt } = useAttempt();

  useEffect(() => {
    getCareerPaths(course.profession.slug).then(setPaths, () => setLost(true));
  }, [course.profession.slug]);

  // The offerings only list courses whose path can be opened, so the picked one is there with a first subject.
  const path = paths?.paths.find((p) => p.courseId === course.courseId);
  const first = path?.subjects[0];
  const name = placeName(place.institution);
  const next = { busy, failed };

  // The first stop comes while the person picks the goal and reads how the game works (O12-O13): "Continuar" at O13
  // opens it at once instead of waiting for it.
  const firstId = first?.disciplineId;
  useEffect(() => {
    // A failed prefetch is not an error yet: "Continuar" asks again.
    if (firstId !== undefined) getStop(firstId, 0).then(setStop, () => undefined);
  }, [firstId]);

  if (!path || !first)
    return lost ? (
      <p className="type-body p-4 text-center text-error" role="alert">
        Não consegui abrir esse caminho agora. Tenta de novo mais tarde?
      </p>
    ) : null;

  if (step === "semester")
    return (
      <SemesterView
        {...next}
        course={course}
        place={name}
        path={path}
        onBack={onBack}
        onNext={() =>
          attempt(async () => {
            await saveJourney({ disciplineId: first.disciplineId });
            setStep("rhythm");
          })
        }
      />
    );

  if (step === "rhythm")
    return (
      <RhythmView
        {...next}
        course={course.course}
        goal={goal}
        onGoal={setGoal}
        onBack={() => setStep("semester")}
        onNext={() =>
          attempt(async () => {
            await saveJourney({ weeklyGoal: goal });
            setStep("how");
          })
        }
      />
    );

  if (step === "how")
    return (
      <HowView
        {...next}
        course={course.course}
        place={name}
        onBack={() => setStep("rhythm")}
        onNext={() =>
          attempt(async () => {
            if (!stop) setStop(await getStop(first.disciplineId, 0));
            setStep("stop");
          })
        }
      />
    );

  if (step === "stop" && stop)
    return (
      <StopView
        {...next}
        stop={stop}
        caption={`${course.course} · ${name} · ${stop.discipline.name}`}
        onClose={() => setStep("how")}
        onDone={(mistakes) =>
          attempt(async () => {
            setResult(await saveStopResult(first.disciplineId, 0, mistakes));
            setStep("done");
          })
        }
      />
    );

  if (step === "done" && result)
    return <DoneView {...next} course={course.course} subject={first.name} place={name} result={result} onNext={() => setStep("age")} />;

  if (step === "age")
    return (
      <AgeView
        {...next}
        onBack={() => setStep("done")}
        onAge={(age) =>
          attempt(async () => {
            await saveJourney({ age });
            // Someone who came in with "Já tenho uma conta" is already on Google: nothing to link.
            if (await isGuest()) setStep("google");
            else router.push("/app");
          })
        }
      />
    );

  return (
    <GoogleView
      {...next}
      // A Google nobody has yet becomes this guest, so everything above stays; a Google that already has an account
      // loads that account instead (the API decides). It comes back to /app.
      onGoogle={() => attempt(signInWithGoogle)}
      onLater={() => router.push("/app")}
      onBack={() => setStep("age")}
    />
  );
}
