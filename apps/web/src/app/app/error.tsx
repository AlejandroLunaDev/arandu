"use client";

import { MainButton } from "@/ui/main-button";

// The app's screens when the API did not answer (asleep, busy, down): the person tries again rather than staring at a
// blank page.
export default function AppError({ retry }: { error: unknown; retry: () => void }) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-4 text-center">
      <p className="type-body text-error" role="alert">
        Não consegui abrir isso agora.
      </p>
      <MainButton onClick={retry}>Tentar de novo</MainButton>
    </main>
  );
}
