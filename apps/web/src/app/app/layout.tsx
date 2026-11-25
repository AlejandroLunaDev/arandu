import type { Metadata, Viewport } from "next";
import { FitViewport } from "@/app-shell/fit-viewport";
import { InstallGate } from "@/install/install-gate";
import tokens from "@/design-system/tokens.json";

const bg = tokens.color.tokens.find((t) => t.name === "bg")!.value as { dark: string };

export const metadata: Metadata = {
  title: "Arandu",
  robots: { index: false },
  appleWebApp: { capable: true, title: "Arandu", statusBarStyle: "black-translucent" },
};

// cover: the app draws under the notch and the home bar, and pads itself with the safe-area insets.
// resizes-content: the keyboard shrinks the layout (h-app), so the composer rides above it instead of the page
// scrolling up and hiding it (Chrome on Android; Safari already keeps the focused field in view).
export const viewport: Viewport = { viewportFit: "cover", themeColor: bg.dark, interactiveWidget: "resizes-content" };

// The app: a phone-sized column, full screen on a phone, centered on a desktop.
export default function AppLayout({ children }: LayoutProps<"/app">) {
  return (
    <div className="mx-auto flex h-app max-w-md flex-col pt-safe px-safe md:border-x md:border-border">
      <FitViewport />
      <InstallGate>{children}</InstallGate>
    </div>
  );
}
