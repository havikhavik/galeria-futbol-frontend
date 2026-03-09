import { useEffect, useMemo, useState, type CSSProperties } from "react";

import { routes, toAppPath } from "../app/router/routes";
import { HomeHeader } from "../features/discovery/components/HomeHeader";
import { httpClient } from "../shared/api/httpClient";
import { Footer } from "../shared/components/Footer/Footer";

import styles from "./CategoriesPage.module.css";

type TeamType = "CLUB" | "NATIONAL";

type CategoryResponse = {
  id: number;
  code: string;
  name: string;
  teamType: TeamType;
  thumbnail?: string | null;
};

function toTitleCase(value: string): string {
  return value
    .toLowerCase()
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(" ");
}

function getLeagueInitials(value: string): string {
  const tokens = value
    .split(/[_\s-]+/)
    .filter(Boolean)
    .slice(0, 2);

  if (tokens.length === 0) {
    return "LG";
  }

  return tokens.map((token) => token[0]?.toUpperCase() ?? "").join("");
}

function isDarkLogo(code: string): boolean {
  const darkLogoCodes = new Set([
    "LIGUE_1",
    "PREMIER_LEAGUE",
    "SERIE_A",
    "LA_LIGA",
    "BUNDESLIGA",
  ]);

  return darkLogoCodes.has(code);
}

function getTeamTypeFromQuery(): TeamType {
  const teamType = new URLSearchParams(window.location.search).get("teamType");
  return teamType === "CLUB" ? "CLUB" : "NATIONAL";
}

export function CategoriesPage() {
  const [categories, setCategories] = useState<CategoryResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [imageErrors, setImageErrors] = useState<Record<number, true>>({});

  const teamType = useMemo(getTeamTypeFromQuery, []);
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
    const url = new URL(window.location.href);
    url.pathname = toAppPath(routes.search);
    url.search = "";
    if (query) {
      url.searchParams.set("q", query);
    }
    window.location.assign(url.toString());
  };

  const handleCategoryClick = (code: string) => {
    const url = new URL(window.location.href);
    url.pathname = toAppPath(routes.search);
    url.search = "";
    url.searchParams.set("categoryCode", code);
    url.searchParams.set("teamType", teamType);
    window.location.assign(url.toString());
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
