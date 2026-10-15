import { routes, toAppPath } from "../../../app/router/routes";
import { BrandLogo } from "../../../shared/components/BrandLogo/BrandLogo";
import { SearchBar } from "../../../shared/components/SearchBar/SearchBar";
import { submitSearch } from "../../../shared/utils/navigation";

import styles from "./SiteHeader.module.css";

type SiteHeaderProps = {
  /** Opaque surface (after scrolling past the hero, or pages without hero). */
  solid: boolean;
  /** The category bar is pinned below: it draws the shared surface. */
  docked: boolean;
  searchValue?: string;
  /** Mobile search button: takes the user to the gallery search field. */
  onMobileSearch: () => void;
};

export function SiteHeader({
  solid,
  docked,
  searchValue,
  onMobileSearch,
}: SiteHeaderProps) {
  const classes = [
    styles.header,
    solid ? styles.solid : "",
    docked ? styles.docked : "",
  ].join(" ");

  return (
    <header className={classes}>
      <a
        href={toAppPath(routes.home)}
        className={styles.logo}
        aria-label="Galería Fútbol, inicio"
      >
        <BrandLogo />
      </a>

      <div className={styles.search}>
        <SearchBar
          placeholder="Buscar camisetas…"
          initialValue={searchValue}
          onSubmit={submitSearch}
        />
      </div>

      <div className={styles.actions}>
        <button
          type="button"
          className={`${styles.iconButton} ${styles.mobileOnly}`}
          aria-label="Buscar"
          onClick={onMobileSearch}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-3.5-3.5" />
          </svg>
        </button>
        <a
          className={`${styles.iconButton} ${styles.instagram}`}
          href="https://www.instagram.com/galeria_futboll?igsh=cXV6MjgxdjJydHgz"
          target="_blank"
          rel="noreferrer"
          aria-label="Instagram (se abre en otra pestaña)"
        >
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <rect
              x="3.5"
              y="3.5"
              width="17"
              height="17"
              rx="5"
              stroke="currentColor"
              strokeWidth="2"
            />
            <circle
              cx="12"
              cy="12"
              r="4"
              stroke="currentColor"
              strokeWidth="2"
            />
            <circle cx="17.3" cy="6.7" r="1.2" fill="currentColor" />
          </svg>
        </a>
      </div>
    </header>
  );
}
