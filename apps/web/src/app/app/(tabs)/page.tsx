import type { Home } from "@arandu/contracts";
import { Suspense } from "react";
import { api } from "@/app-shell/api";
import { HomeView } from "@/room/home";

// Quarto (S1), the app's home.
export default function QuartoPage() {
  return (
    <Suspense fallback={null}>
      <Room />
    </Suspense>
  );
}

async function Room() {
  return <HomeView home={await api<Home>("/me")} />;
}
