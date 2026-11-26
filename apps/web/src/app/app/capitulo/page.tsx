import type { Home } from "@arandu/contracts";
import { Suspense } from "react";
import { mine } from "@/app-shell/api";
import { PathLesson } from "@/caminho/path-lesson";
import { Loading } from "@/ui/loading";

// P2-P7, full screen: the lesson the person entered from the path. Entering is paid there, so the lesson rides in the
// tab (caminho/lesson-entry.ts) and not in the address: opening this page alone goes back to the path.
export default function CapituloPage() {
  return (
    <Suspense fallback={<Loading />}>
      <Lesson />
    </Suspense>
  );
}

async function Lesson() {
  return <PathLesson wallet={(await mine<Home>("/me")).wallet} />;
}
