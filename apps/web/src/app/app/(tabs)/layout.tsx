import { Suspense } from "react";
import { BottomNav } from "@/app-shell/bottom-nav";
import { EntryGate } from "@/app-shell/entry-gate";
import { Loading } from "@/ui/loading";

// The four places share the bottom nav: content scrolls above it, so it is never pushed off screen. The door reads the
// session, so it streams behind its boundary.
export default function TabsLayout({ children }: LayoutProps<"/app">) {
  return (
    <Suspense fallback={<Loading />}>
      <EntryGate>
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
        <BottomNav />
      </EntryGate>
    </Suspense>
  );
}
