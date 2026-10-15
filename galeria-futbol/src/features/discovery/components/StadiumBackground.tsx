import { useEffect, useRef } from "react";

import heroBackground from "../assets/hero.jpg";

import styles from "./StadiumBackground.module.css";

type StadiumBackgroundProps = {
  /** Fully darkened from the start (pages without hero). Default false. */
  dimmed?: boolean;
};

export function StadiumBackground({ dimmed = false }: StadiumBackgroundProps) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    if (dimmed) {
      element.style.setProperty("--p", "1");
      return;
    }

    let ticking = false;
    const update = () => {
      ticking = false;
      const progress = Math.min(1, window.scrollY / (window.innerHeight * 0.8));
      element.style.setProperty("--p", progress.toFixed(4));
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
    };
  }, [dimmed]);

  return (
    <div ref={ref} className={styles.background} aria-hidden="true">
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
