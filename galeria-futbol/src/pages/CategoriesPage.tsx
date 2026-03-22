import { useEffect, useMemo, useState, type CSSProperties } from "react";

import { routes, toAppPath } from "../app/router/routes";
import { HomeHeader } from "../features/discovery/components/HomeHeader";
import { httpClient } from "../shared/api/httpClient";
import { Footer } from "../shared/components/Footer/Footer";
import type { CategoryResponse } from "../shared/types/categories";
import type { TeamType } from "../shared/types/common";
import { getLeagueInitials, toTitleCase } from "../shared/utils/formatters";
import { navigateWithCurrentUrl } from "../shared/utils/navigation";
import { getTeamTypeFromQuery } from "../shared/utils/parsers";
import { isDarkLogo } from "../shared/utils/theming";

import styles from "./CategoriesPage.module.css";

export function CategoriesPage() {
  const [categories, setCategories] = useState<CategoryResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [imageErrors, setImageErrors] = useState<Record<number, true>>({});

  const teamType = useMemo<TeamType>(() => getTeamTypeFromQuery(), []);
  const pageTitle =
    teamType === "NATIONAL" ? "Selecciones Nacionales" : "Clubes";
  const leaguesCountLabel =
    categories.length === 1 ? "1 liga" : `${categories.length} ligas`;

  useEffect(() => {
    const loadCategories = async () => {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const data = await httpClient.getJson<CategoryResponse[]>(
          `categories?teamType=${teamType}`,
        );
        setCategories(data);
        setImageErrors({});
      } catch {
        setErrorMessage(
          "No pudimos cargar las categorias por ahora. Intentalo nuevamente.",
        );
      } finally {
        setIsLoading(false);
      }
    };

    void loadCategories();
  }, [teamType]);

  const handleSearchSubmit = (query: string) => {
    navigateWithCurrentUrl((url) => {
      url.pathname = toAppPath(routes.search);
      url.search = "";
      if (query) {
        url.searchParams.set("q", query);
      }
    });
  };

  const handleCategoryClick = (code: string) => {
    navigateWithCurrentUrl((url) => {
      url.pathname = toAppPath(routes.search);
      url.search = "";
      url.searchParams.set("categoryCode", code);
      url.searchParams.set("teamType", teamType);
    });
  };

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <HomeHeader onSearchSubmit={handleSearchSubmit} />

        <section className={styles.hero}>
          <p className={styles.kicker}>Categorias</p>
          <div className={styles.titleRow}>
            <h1 className={styles.title}>{pageTitle}</h1>
            {!isLoading && !errorMessage ? (
              <span className={styles.countBadge}>{leaguesCountLabel}</span>
            ) : null}
          </div>
        </section>

        {isLoading ? (
          <p className={styles.message}>Cargando categorias...</p>
        ) : null}
        {errorMessage ? <p className={styles.error}>{errorMessage}</p> : null}

        {!isLoading && !errorMessage ? (
          <section className={styles.grid} aria-label="Listado de categorias">
            {categories.map((category, index) => (
              <article
                key={category.id}
                className={styles.categoryCard}
                style={{ "--card-index": index } as CSSProperties}
                onClick={() => handleCategoryClick(category.code)}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleCategoryClick(category.code);
                  }
                }}
              >
                <div className={styles.thumbnailWrap}>
                  {category.thumbnail && !imageErrors[category.id] ? (
                    <img
                      src={category.thumbnail}
                      alt={category.name}
                      className={`${styles.thumbnail} ${
                        isDarkLogo(category.code) ? styles.darkLogo : ""
                      }`}
                      referrerPolicy="no-referrer"
                      onError={() => {
                        setImageErrors((prev) => ({
                          ...prev,
                          [category.id]: true,
                        }));
                      }}
                    />
                  ) : (
                    <div
                      className={styles.thumbnailPlaceholder}
                      aria-hidden="true"
                    >
                      <span className={styles.thumbnailInitials}>
                        {getLeagueInitials(category.name)}
                      </span>
                    </div>
                  )}
                </div>
                <h2 className={styles.cardTitle}>
                  {toTitleCase(category.name)}
                </h2>
              </article>
            ))}
          </section>
        ) : null}
      </div>

      <Footer />
    </main>
  );
}
