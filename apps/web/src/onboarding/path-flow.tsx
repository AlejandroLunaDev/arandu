"use client";

import type { CareerPaths, Journey, JourneyUpdate, StopContent, StopResult } from "@arandu/contracts";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api, supabase } from "@/app-shell/api";
import { AgeView, DoneView, GoogleView, HowView, RhythmView, SemesterView } from "./path-steps";
import { type Place, type PlaceCourse, placeName } from "./places";
import { StopView } from "./stop-view";

type Step = "semester" | "rhythm" | "how" | "stop" | "done" | "age" | "google";

// O11-O21, after the person picked a course at O10: its first semester, the weekly goal, the first stop (its
// cards and exercises), its result, the age and Google. Each choice is saved to the journey as it is made.
export function PathFlow({ course, place }: { course: PlaceCourse; place: Place }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("semester");
  const [paths, setPaths] = useState<CareerPaths | null>(null);
  const [goal, setGoal] = useState<3 | 5 | 7 | null>(null);
  const [stop, setStop] = useState<StopContent | null>(null);
  const [result, setResult] = useState<StopResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    api<CareerPaths>(`/careers/${course.profession.slug}/paths`).then(setPaths, () => setFailed(true));
  }, [course.profession.slug]);

  const attempt = async (call: () => Promise<void>) => {
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
  const save = (update: JourneyUpdate) => api<Journey>("/me/journey", { method: "PATCH", body: update });

  // The offerings only list courses whose path can be opened, so the picked one is there with a first subject.
  const path = paths?.paths.find((p) => p.courseId === course.courseId);
  const first = path?.subjects[0];
  const name = placeName(place.institution);
  const next = { busy, failed };

  if (!path || !first)
    return failed ? (
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
        onNext={() =>
          attempt(async () => {
            await save({ disciplineId: first.disciplineId });
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
        onNext={() =>
          attempt(async () => {
            await save({ weeklyGoal: goal });
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
        onNext={() =>
          attempt(async () => {
            setStop(await api<StopContent>(`/stops/${first.disciplineId}/0`));
            setStep("stop");
          })
        }
      />
    );

  if (step === "stop" && stop)
    return (
      <StopView
        stop={stop}
        caption={`${course.course} · ${name} · ${stop.discipline.name}`}
        onClose={() => setStep("how")}
        onDone={(mistakes) =>
          attempt(async () => {
            setResult(await api<StopResult>(`/stops/${first.disciplineId}/0/result`, { method: "POST", body: { mistakes } }));
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
        onAge={(age) =>
          attempt(async () => {
            await save({ age });
            setStep("google");
          })
        }
      />
    );

  return (
    <GoogleView
      {...next}
      // Linking keeps the anonymous user, and so everything above, under the Google account; it comes back to /app.
      onGoogle={() =>
        attempt(async () => {
          const { error } = await supabase.auth.linkIdentity({ provider: "google", options: { redirectTo: `${location.origin}/app` } });
          if (error) throw error;
        })
      }
      onLater={() => router.push("/app")}
    />
  );
}
