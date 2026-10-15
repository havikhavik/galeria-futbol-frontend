import { SearchBar } from "../../../shared/components/SearchBar/SearchBar";

import styles from "./HeroSection.module.css";

type HeroSectionProps = {
  /** Called with the trimmed query when the hero search is submitted. */
  onSearchSubmit?: (query: string) => void;
};

export function HeroSection({ onSearchSubmit }: HeroSectionProps) {
  return (
    <section className={styles.hero} aria-labelledby="home-title">
      <div className={styles.lead}>
        <p className={styles.meta}>
          <span className={styles.metaPart}>Más de 4000 camisetas</span>
          <span className={styles.separator}> · </span>
          <span className={styles.metaPart}>27 ligas · 6 confederaciones</span>
        </p>
        <h1 id="home-title" className={styles.title}>
          Camisetas de clubes y selecciones
        </h1>
      </div>
      <div className={styles.side}>
        <p className={styles.prompt}>
          Buscá por club, selección, jugador o temporada.
        </p>
        <SearchBar
          placeholder="Buscar por club, selección o temporada…"
          onSubmit={onSearchSubmit}
        />
      </div>
    </section>
  );
}
