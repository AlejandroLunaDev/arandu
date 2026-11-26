import type { Home } from "@arandu/contracts";
import { Suspense } from "react";
import { api } from "@/app-shell/api";
import { PathLesson } from "@/caminho/path-lesson";

// P2-P7, full screen: the lesson the person entered from the path. Entering is paid there, so the lesson rides in the
// tab (caminho/lesson-entry.ts) and not in the address: opening this page alone goes back to the path.
export default function CapituloPage() {
  return (
    <Suspense fallback={null}>
      <Lesson />
    </Suspense>
  );
}

async function Lesson() {
  return <PathLesson wallet={(await api<Home>("/me")).wallet} />;
}
