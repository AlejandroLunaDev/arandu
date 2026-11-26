import type { Home } from "@arandu/contracts";
import { Suspense } from "react";
import { mine } from "@/app-shell/api";
import { HomeView } from "@/room/home";
import { Loading } from "@/ui/loading";

// Quarto (S1), the app's home.
export default function QuartoPage() {
  return (
    <Suspense fallback={<Loading />}>
      <Room />
    </Suspense>
  );
}

async function Room() {
  return <HomeView home={await mine<Home>("/me")} />;
}
