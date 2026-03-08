import { useCallback } from "react";

import { HeroSection } from "../features/discovery/components/HeroSection";
import { HomeHeader } from "../features/discovery/components/HomeHeader";
import { NavigationCards } from "../features/discovery/components/NavigationCards";
import heroBackground from "../features/discovery/assets/hero.jpg";
import { Footer } from "../shared/components/Footer/Footer";

import styles from "./HomePage.module.css";

export function HomePage() {
  const handleSearchSubmit = useCallback((query: string) => {
    if (!query) {
      return;
    }
    const url = new URL(window.location.href);
    url.pathname = "/search";
    url.searchParams.set("q", query);
    window.location.assign(url.toString());
  }, []);

  return (
    <main className={styles.page}>
      <img
        className={styles.backgroundImage}
        src={heroBackground}
        alt=""
        aria-hidden="true"
      />
      <div className={styles.backgroundOverlay} aria-hidden="true" />
      <div className={styles.container}>
        <HomeHeader onSearchSubmit={handleSearchSubmit} />
        <div className={styles.content}>
          <HeroSection />
          <NavigationCards />
        </div>
      </div>
      <Footer />
    </main>
  );
}
