import { useCallback } from "react";

import { routes, toAppPath } from "../../../app/router/routes";
import championsIcon from "../assets/champions-icono.png";
import nationalIcon from "../assets/icono-pelota.png";

import { CategoryCard } from "./CategoryCard";
import styles from "./NavigationCards.module.css";

type TeamType = "CLUB" | "NATIONAL";

export function NavigationCards() {
  const handleCategoryClick = useCallback((teamType: TeamType) => {
    const url = new URL(window.location.href);
    url.pathname = toAppPath(routes.categories);
    url.searchParams.set("teamType", teamType);
    window.location.assign(url.toString());
  }, []);

  return (
    <section
      className={styles.grid}
      aria-label="Navegacion principal del catalogo"
    >
      <CategoryCard
        title="SELECCIONES NACIONALES"
        description="Descubre camisetas iconicas de selecciones nacionales."
        onClick={() => handleCategoryClick("NATIONAL")}
        glow="orange"
        iconSrc={nationalIcon}
        iconAlt="Icono de seleccion nacional"
      />
      <CategoryCard
        title="CLUBES"
        description="Explora camisetas historicas y actuales de clubes."
        onClick={() => handleCategoryClick("CLUB")}
        glow="green"
        iconSrc={championsIcon}
        iconAlt="Trofeo de clubes"
        iconVariant="trophy"
      />
    </section>
  );
}
