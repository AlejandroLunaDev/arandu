import { BottomNav } from "@/app-shell/bottom-nav";

// The four places share the bottom nav: content scrolls above it, so it is never pushed off screen.
export default function TabsLayout({ children }: LayoutProps<"/app">) {
  return (
    <>
      <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      <BottomNav />
    </>
  );
}
