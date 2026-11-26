"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { LEAVE_EVENT, type Leave } from "./walk-off";
import styles from "./bottom-nav.module.css";

// The app's four places, each a thing from Arandu's own 3D kit (blender/props, rendered): a fish for the Loja (it takes
// peixinhos), his sofa for the Quarto, a house of the cat tower for the Caminho, a graduation cap for Você. As on Clash
// Royale: the current one's icon rises out of the bar, named.
const PLACES = [
  { href: "/app/loja", label: "Loja", icon: "/img/nav/loja.webp" },
  { href: "/app", label: "Quarto", icon: "/img/nav/quarto.webp" },
  { href: "/app/caminho", label: "Caminho", icon: "/img/nav/caminho.webp" },
  { href: "/app/voce", label: "Você", icon: "/img/nav/voce.webp" },
] as const;

export function BottomNav() {
  const pathname = usePathname();
  // Where the app is going while Arandu walks off (walk-off.ts): current already, as the tap asked.
  const [going, setGoing] = useState<{ href: string; from: string } | null>(null);
  useEffect(() => {
    const onLeave = (e: Event) => setGoing({ href: (e as CustomEvent<Leave>).detail.href, from: location.pathname });
    addEventListener(LEAVE_EVENT, onLeave);
    return () => removeEventListener(LEAVE_EVENT, onLeave);
  }, []);
  const at = going && going.from === pathname ? going.href : pathname;
  return (
    <nav aria-label="Principal" className={`${styles.nav} pb-safe`}>
      {PLACES.map(({ href, label, icon }) => {
        const current = href === "/app" ? at === href : at.startsWith(href);
        return (
          <Link key={href} href={href} aria-current={current ? "page" : undefined} className={styles.place}>
            <Image src={icon} alt="" width={48} height={48} />
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
