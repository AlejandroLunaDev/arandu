"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// The app's four places, as on the S1 board: icon over label, the current one in text color with an amber icon.
const PLACES = [
  { href: "/app", label: "Quarto", icon: <path d="M4 11l8-6 8 6v8a1 1 0 0 1-1 1h-4v-5H9v5H5a1 1 0 0 1-1-1z" /> },
  {
    href: "/app/caminho",
    label: "Caminho",
    icon: (
      <>
        <circle cx="7" cy="18" r="2.5" />
        <circle cx="17" cy="6" r="2.5" />
        <path d="M9.5 18H15a3 3 0 0 0 0-6H9a3 3 0 0 1 0-6h5.5" />
      </>
    ),
  },
  { href: "/app/estante", label: "Estante", icon: <path d="M5 4h3v16H5zM10 4h3v16h-3zM15.5 5l3-.8 3.6 15-3 .8z" /> },
  {
    href: "/app/voce",
    label: "Você",
    icon: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 20c1.5-4 4.5-6 8-6s6.5 2 8 6" />
      </>
    ),
  },
] as const;

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Principal"
      className="flex flex-none border-t border-border bg-bg px-2 pt-1 pb-safe"
    >
      {PLACES.map(({ href, label, icon }) => {
        const current = href === "/app" ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={current ? "page" : undefined}
            className={`flex flex-1 flex-col items-center gap-1 pt-2 pb-1 type-caption ${current ? "font-semibold text-text" : "text-text-muted"}`}
          >
            <svg
              viewBox="0 0 24 24"
              width="22"
              height="22"
              aria-hidden="true"
              className={`flex-none fill-none stroke-current ${current ? "text-amber-400" : ""}`}
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {icon}
            </svg>
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
