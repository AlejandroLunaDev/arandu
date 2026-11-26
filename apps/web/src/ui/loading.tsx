import Image from "next/image";

/**
 * What the app shows while it waits: Arandu's head bouncing in the middle of the room it is given, with the word for
 * it. Styled with the global utilities only: a fallback can paint before a CSS module's sheet is in.
 */
export function Loading() {
  return (
    <div role="status" className="flex min-h-full flex-1 flex-col items-center justify-center gap-3 py-16">
      <Image className="animate-bounce motion-reduce:animate-none" src="/img/head.svg" alt="" width={48} height={48} priority />
      <span className="type-caption text-text-muted">Carregando…</span>
    </div>
  );
}
