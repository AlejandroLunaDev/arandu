import Image from "next/image";
import { AppScreen } from "../app-screen/app-screen";
import { GITHUB_URL } from "../links";
import { Scene } from "../scene/scene";
import styles from "./hero.module.css";

// The hero: the title, and under it Arandu talking with a student on a phone beside the brand and
// the pitch. On the right, the room where Arandu waits: the stage draws it in 3D, the page only
// keeps its place in the layout.
export function Hero() {
  return (
    <Scene
      length="hero"
      labelledBy="hero-title"
      copy={
        <div className={styles.intro}>
          <h1 id="hero-title" data-reveal className={`${styles.head} type-display text-balance`}>
            A busca da sabedoria começa por você.
          </h1>
          <div data-reveal className={styles.app}>
            <AppScreen src="/screens/G1-Arandu-fala.html" title="Tela do app: o Arandu conversa com o aluno" />
          </div>
          <div className={styles.pitch}>
            <p data-reveal className={styles.brand}>
              <Image src="/img/head.svg" alt="" width={44} height={44} />
              <span className={`${styles.wordmark} type-display`}>
                Arandu <span className="text-primary">Reka</span>
              </span>
            </p>
            <p data-reveal className="type-body-lg text-pretty text-text-muted">
              Um app de orientação vocacional com inteligência artificial, onde o aluno do ensino médio vive
              uma carreira antes de escolher.
            </p>
            <div data-reveal className="flex flex-wrap items-center gap-2">
              <a className="ar-btn ar-btn--primary" href="#como">
                <svg className="ar-icon" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12 5v14" />
                  <path d="m6 13 6 6 6-6" />
                </svg>
                Como funciona
              </a>
              <a className="ar-btn ar-btn--ghost" href={GITHUB_URL}>
                Ver no GitHub
              </a>
            </div>
          </div>
        </div>
      }
      art={
        <span data-room="hero" className={styles.room}>
          <Image className={styles.fallback} src="/img/cat.svg" alt="" width={600} height={370} />
        </span>
      }
    />
  );
}
