import { routes } from "../../../app/router/routes";
import { BrandLogo } from "../../../shared/components/BrandLogo/BrandLogo";
import { SearchBar } from "../../../shared/components/SearchBar/SearchBar";

import styles from "./HomeHeader.module.css";

type HomeHeaderProps = {
  onSearchSubmit: (query: string) => void;
  searchValue?: string;
};

export function HomeHeader({ onSearchSubmit, searchValue }: HomeHeaderProps) {
  return (
    <header className={styles.header}>
      <a
        href={routes.home}
        className={styles.logoLink}
        aria-label="Ir al inicio"
      >
        <BrandLogo />
      </a>
      <SearchBar onSubmit={onSearchSubmit} initialValue={searchValue} />
    </header>
  );
}
