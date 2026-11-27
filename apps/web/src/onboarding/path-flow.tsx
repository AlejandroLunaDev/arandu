"use client";

import type { CareerPaths, ChapterContent } from "@arandu/contracts";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { signInWithGoogle } from "@/auth/actions";
import { useAttempt } from "@/ui/use-attempt";
import { getCareerPaths, getChapter, isGuest, saveJourney } from "./actions";
import { AgeView, DoneView, GoogleView, HowView, RhythmView, SemesterView } from "./path-steps";
import { Loading } from "@/ui/loading";
import type { PlaceCourse } from "./places";
import { ChapterView } from "./chapter-view";

type Step = "semester" | "rhythm" | "how" | "chapter" | "done" | "age" | "google";

/** The sample holds the four kinds of a subject's first chapter, however many more the chapter has (O15-O18). */
const SAMPLE = new Set<ChapterContent["exercises"][number]["kind"]>(["escolha_uma", "una_os_pares", "verdadeiro_ou_falso", "complete_a_frase"]);
const sample = (c: ChapterContent): ChapterContent => ({ ...c, exercises: c.exercises.filter((e) => SAMPLE.has(e.kind)) });

// O11-O21, after the person picked a course at O10: its first semester, the weekly goal, a sample of the first chapter
// (its cards and basic exercises), its end, the age and Google. Each choice is saved to the journey as it is made;
// the sample is not: inside the app, chapter 1 starts from zero as a full round.
export function PathFlow({ course, onBack }: { course: PlaceCourse; onBack: () => void }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("semester");
  const [paths, setPaths] = useState<CareerPaths | null>(null);
  const [goal, setGoal] = useState<3 | 5 | 7 | null>(null);
  /** The sample chapter, with the subject it belongs to: one of a subject picked before is not this one's. */
  const [loaded, setLoaded] = useState<{ id: number; chapter: ChapterContent } | null>(null);
  const [lost, setLost] = useState(false);
  /** The subject the person starts with: the book they tapped on the shelf, the first one otherwise. */
  const [start, setStart] = useState(0);
  const { busy, failed, attempt } = useAttempt();

  useEffect(() => {
    getCareerPaths(course.profession.slug).then(setPaths, () => setLost(true));
  }, [course.profession.slug]);

  // The offerings only list courses whose path can be opened, so the picked one is there with a first subject.
  const path = paths?.paths.find((p) => p.courseId === course.courseId);
  const first = path?.subjects[start] ?? path?.subjects[0];
  const career = course.profession.name;
  const next = { busy, failed };

  // The first chapter comes while the person picks the goal and reads how the game works (O12-O13): "Continuar" at O13
  // opens it at once instead of waiting for it.
  const firstId = first?.disciplineId;
  const chapter = loaded && loaded.id === firstId ? loaded.chapter : null;
  useEffect(() => {
    // A failed prefetch is not an error yet: "Continuar" asks again.
    if (firstId !== undefined)
      getChapter(firstId, 0).then((s) => setLoaded({ id: firstId, chapter: sample(s) }), () => undefined);
  }, [firstId]);

  if (!path || !first)
    return lost ? (
      <p className="type-body p-4 text-center text-error" role="alert">
        Não consegui abrir esse caminho agora. Tenta de novo mais tarde?
      </p>
    ) : (
      <Loading />
    );

  if (step === "semester")
    return (
      <SemesterView
        {...next}
        course={course}
        path={path}
        onBack={onBack}
        onPick={(index) => {
          const picked = path.subjects[index];
          if (!picked) return;
          setStart(index);
          attempt(async () => {
            await saveJourney({ disciplineId: picked.disciplineId });
            setStep("rhythm");
          });
        }}
        onNext={() =>
          attempt(async () => {
            setStart(0);
            await saveJourney({ disciplineId: path.subjects[0]!.disciplineId });
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
        course={career}
        onBack={() => setStep("rhythm")}
        onNext={() =>
          attempt(async () => {
            if (!chapter) setLoaded({ id: first.disciplineId, chapter: sample(await getChapter(first.disciplineId, 0)) });
            setStep("chapter");
          })
        }
      />
    );

  if (step === "chapter" && chapter)
    return (
      <ChapterView
        {...next}
        chapter={chapter}
        caption={`${career} · ${chapter.discipline.name}`}
        onClose={() => setStep("how")}
        onDone={() => setStep("done")}
      />
    );

  if (step === "done") return <DoneView {...next} course={career} subject={first.name} onNext={() => setStep("age")} />;

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
