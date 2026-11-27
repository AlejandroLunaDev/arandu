import { signOut } from "@/auth/actions";
import { MainButton } from "@/ui/main-button";
import styles from "./voce.module.css";

// Você: built in a later step; for now only the way out of the account.
export default function VocePage() {
  return (
    <main className={styles.voce}>
      <h1 className="sr-only">Você</h1>
      <form action={signOut}>
        <MainButton type="submit">Sair da conta</MainButton>
      </form>
    </main>
  );
}
