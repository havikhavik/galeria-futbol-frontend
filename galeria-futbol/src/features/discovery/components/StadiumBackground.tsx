import { useEffect } from "react";

import heroBackground from "../assets/hero.jpg";

import styles from "./StadiumBackground.module.css";

type StadiumBackgroundProps = {
  /** Fully darkened from the start (pages without hero). Default false. */
  dimmed?: boolean;
};

export function StadiumBackground({ dimmed = false }: StadiumBackgroundProps) {

  useEffect(() => {
    // Scroll progress (0 to 1 over the first 80% of the screen height), on
    // the root so the hero content can fade with the stadium.
    const root = document.documentElement;

    if (dimmed) {
      root.style.setProperty("--p", "1");
      return () => root.style.removeProperty("--p");
    }

    let ticking = false;
    const update = () => {
      ticking = false;
      const progress = Math.min(1, window.scrollY / (window.innerHeight * 0.8));
      root.style.setProperty("--p", progress.toFixed(4));
    };
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      root.style.removeProperty("--p");
    };
  }, [dimmed]);

  return (
    <div className={styles.background} aria-hidden="true">
      <img
        className={styles.image}
        src={heroBackground}
        width={1376}
        height={768}
        alt=""
        fetchPriority="high"
      />
    </div>
  );
}
