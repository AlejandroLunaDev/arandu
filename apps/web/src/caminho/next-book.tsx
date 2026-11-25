"use client";

import type { PathSubject } from "@arandu/contracts";
import { useRouter } from "next/navigation";
import styles from "@/onboarding/onboarding.module.css";
import { MainButton } from "@/ui/main-button";
import { useAttempt } from "@/ui/use-attempt";
import { startBook } from "./actions";
import c from "./caminho.module.css";

// The book is done: the semester's next subject opens as the new path.
// shortcut: S4-S5 (the book's reading, "Pra onde") come with the room step; until then the next book is one tap.
export function NextBook({ subject }: { subject: PathSubject }) {
  const router = useRouter();
  const { busy, failed, attempt } = useAttempt();
  return (
    <section className={c.next}>
      <p className={c.cap} data-amber>
        Livro completo!
      </p>
      <p className={c.popTitle}>Próximo livro do semestre: {subject.name}</p>
      {failed && (
        <p className={styles.error} role="alert">
          Não consegui abrir agora. Tenta de novo?
        </p>
      )}
      <MainButton
        disabled={busy}
        onClick={() =>
          attempt(async () => {
            await startBook(subject.disciplineId);
            router.refresh();
          })
        }
      >
        Abrir {subject.name}
      </MainButton>
    </section>
  );
}
