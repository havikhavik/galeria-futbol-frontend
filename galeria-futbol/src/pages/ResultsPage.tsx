import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";

import { routes, toAppPath } from "../app/router/routes";
import { HomeHeader } from "../features/discovery/components/HomeHeader";
import { httpClient } from "../shared/api/httpClient";
import { Footer } from "../shared/components/Footer/Footer";

import styles from "./ResultsPage.module.css";

/* ── Types ───────────────────────────────────────────── */

type AlbumResponse = {
  id: number;
  title: string;
  seasonLabel: string | null;
  seasonStart: number;
  teamType: "CLUB" | "NATIONAL";
  categoryCode: string;
  categoryName: string;
  thumbnail: string | null;
  description: string | null;
  kids: boolean;
  women: boolean;
  goalkeeper: boolean;
  training: boolean;
  classic: boolean;
  retro: boolean;
};

type Page<T> = {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
  first: boolean;
  last: boolean;
};

type FilterKey =
  | "kids"
  | "women"
  | "goalkeeper"
  | "training"
  | "classic"
  | "retro";

/* ── Constants ───────────────────────────────────────── */

const PAGE_SIZE = 12;

const TAG_LABELS: Record<FilterKey, string> = {
  kids: "Niños",
  women: "Mujeres",
  goalkeeper: "Arquero",
  training: "Entrenamiento",
  classic: "Clásica",
  retro: "Retro",
};

const FILTER_KEYS = Object.keys(TAG_LABELS) as FilterKey[];

/* ── Helpers ─────────────────────────────────────────── */

function readParams() {
  return new URLSearchParams(window.location.search);
}

function readFilters(p: URLSearchParams): Record<FilterKey, boolean> {
  return Object.fromEntries(
    FILTER_KEYS.map((k) => [k, p.get(k) === "true"]),
  ) as Record<FilterKey, boolean>;
}

function formatCode(code: string): string {
  return code
    .toLowerCase()
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");
}

function albumTags(a: AlbumResponse): string[] {
  return FILTER_KEYS.filter((k) => a[k]).map((k) => TAG_LABELS[k]);
}

function buildApiPath(p: URLSearchParams, page: number): string {
  const out = new URLSearchParams();

  const q = p.get("q");
  if (q) out.set("q", q);

  const cc = p.get("categoryCode");
  if (cc) out.set("categoryCode", cc);

  const tt = p.get("teamType");
  if (tt) out.set("teamType", tt);

  for (const k of FILTER_KEYS) {
    if (p.get(k) === "true") out.set(k, "true");
  }

  const ss = p.get("seasonStart");
  if (ss) out.set("seasonStart", ss);

  out.set("page", String(page));
  out.set("size", String(PAGE_SIZE));

  const sort = p.get("sort");
  if (sort) out.set("sort", sort);

  return `albums?${out.toString()}`;
}

function pageNumbers(current: number, total: number): (number | "dots")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i);

  const pages: (number | "dots")[] = [0];
  if (current > 2) pages.push("dots");

  const lo = Math.max(1, current - 1);
  const hi = Math.min(total - 2, current + 1);
  for (let i = lo; i <= hi; i++) pages.push(i);

  if (current < total - 3) pages.push("dots");
  pages.push(total - 1);

  return pages;
}

function navigateTo(mutate: (url: URL) => void) {
  const url = new URL(window.location.href);
  mutate(url);
  window.location.assign(url.toString());
}

/* ── Component ───────────────────────────────────────── */

export function ResultsPage() {
  const params = useMemo(readParams, []);
  const query = params.get("q") || "";
  const categoryCode = params.get("categoryCode") || "";
  const teamType = params.get("teamType") || "";
  const guidedTeamType =
    teamType === "CLUB" || teamType === "NATIONAL" ? teamType : null;
  const currentPage = parseInt(params.get("page") || "0", 10);
  const sortBy = params.get("sort") || "";
  const urlFilters = useMemo(() => readFilters(params), [params]);

  const [albums, setAlbums] = useState<AlbumResponse[]>([]);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imgErrors, setImgErrors] = useState<Record<number, true>>({});
  const [pending, setPending] = useState(urlFilters);
  const [sortOpen, setSortOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const sortDropdownRef = useRef<HTMLDivElement | null>(null);

  const hasFilters = FILTER_KEYS.some((k) => urlFilters[k]);
  const teamTypeLabel =
    guidedTeamType === "CLUB"
      ? "Clubes"
      : guidedTeamType === "NATIONAL"
        ? "Selecciones Nacionales"
        : "";
  const teamTypeDiscoveryHref = guidedTeamType
    ? `${toAppPath(routes.categories)}?teamType=${guidedTeamType}`
    : "";

  const breadcrumb = query
    ? `Búsqueda: "${query}"`
    : categoryCode
      ? formatCode(categoryCode)
      : "Todos los álbumes";

  /* ── Fetch albums ── */

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await httpClient.getJson<Page<AlbumResponse>>(
          buildApiPath(params, currentPage),
        );
        if (cancelled) return;
        setAlbums(data.content);
        setTotalElements(data.totalElements);
        setTotalPages(data.totalPages);
        setImgErrors({});
      } catch {
        if (!cancelled)
          setError("No pudimos cargar los resultados. Intenta nuevamente.");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [params, currentPage]);

  /* ── Handlers ── */

  const handleSearch = (q: string) => {
    navigateTo((url) => {
      url.pathname = toAppPath(routes.search);
      url.search = "";
      if (q) {
        url.searchParams.set("q", q);
      }
    });
  };

  const applyFilters = () =>
    navigateTo((url) => {
      for (const k of FILTER_KEYS) {
        if (pending[k]) url.searchParams.set(k, "true");
        else url.searchParams.delete(k);
      }
      url.searchParams.set("page", "0");
    });

  const clearFilters = () =>
    navigateTo((url) => {
      url.search = "";
      if (query) url.searchParams.set("q", query);
      if (categoryCode) url.searchParams.set("categoryCode", categoryCode);
      if (teamType) url.searchParams.set("teamType", teamType);
    });

  const changePage = (p: number) =>
    navigateTo((url) => url.searchParams.set("page", String(p)));

  const changeSort = (s: string) =>
    navigateTo((url) => {
      if (s) url.searchParams.set("sort", s);
      else url.searchParams.delete("sort");
      url.searchParams.set("page", "0");
    });

  const toggle = (k: FilterKey) =>
    setPending((prev) => ({ ...prev, [k]: !prev[k] }));

  const resultsLabel =
    totalElements === 1 ? "1 resultado" : `${totalElements} resultados`;

  const sortOptions = [
    { value: "", label: "Relevancia" },
    { value: "title,asc", label: "Titulo A-Z" },
    { value: "title,desc", label: "Titulo Z-A" },
    { value: "seasonStart,desc", label: "Mas recientes" },
    { value: "seasonStart,asc", label: "Mas antiguos" },
  ];

  const currentSortLabel =
    sortOptions.find((option) => option.value === sortBy)?.label ||
    "Relevancia";

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!sortDropdownRef.current) return;
      if (!sortDropdownRef.current.contains(event.target as Node)) {
        setSortOpen(false);
      }
    };

    window.addEventListener("mousedown", onPointerDown);
    return () => window.removeEventListener("mousedown", onPointerDown);
  }, []);

  /* ── Render ── */

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <HomeHeader onSearchSubmit={handleSearch} searchValue={query} />

        {/* Breadcrumb */}
        <nav className={styles.breadcrumb}>
          <div className={styles.breadcrumbPath}>
            <a href={toAppPath(routes.home)} className={styles.breadcrumbLink}>
              Inicio
            </a>
            <span className={styles.breadcrumbSep}>›</span>
            {!query && teamTypeLabel ? (
              <>
                <a
                  href={teamTypeDiscoveryHref}
                  className={styles.breadcrumbLink}
                >
                  {teamTypeLabel}
                </a>
                {categoryCode ? (
                  <>
                    <span className={styles.breadcrumbSep}>›</span>
                    <span className={styles.breadcrumbCurrent}>
                      {breadcrumb}
                    </span>
                  </>
                ) : null}
              </>
            ) : (
              <span className={styles.breadcrumbCurrent}>{breadcrumb}</span>
            )}
          </div>
          {hasFilters && (
            <button
              className={styles.clearBtn}
              onClick={clearFilters}
              type="button"
            >
              Limpiar filtros
            </button>
          )}
        </nav>

        {/* Total results count */}
        <p className={styles.totalCount}>
          {isLoading ? "Buscando…" : resultsLabel}
        </p>

        {error && <p className={styles.error}>{error}</p>}

        <div className={styles.toolbar}>
          <div className={styles.sortWrap} ref={sortDropdownRef}>
            <span className={styles.sortLabel}>Ordenar por:</span>
            <button
              type="button"
              className={styles.sortTrigger}
              aria-haspopup="listbox"
              aria-expanded={sortOpen}
              onClick={() => setSortOpen((open) => !open)}
            >
              <span>{currentSortLabel}</span>
              <svg
                viewBox="0 0 16 16"
                className={styles.chevron}
                aria-hidden="true"
              >
                <path
                  d="M4 6l4 4 4-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>

            {sortOpen && (
              <ul
                className={styles.sortMenu}
                role="listbox"
                aria-label="Ordenar resultados"
              >
                {sortOptions.map((option) => (
                  <li key={option.value || "relevance"}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={sortBy === option.value}
                      className={`${styles.sortOption} ${
                        sortBy === option.value ? styles.sortOptionActive : ""
                      }`}
                      onClick={() => {
                        setSortOpen(false);
                        changeSort(option.value);
                      }}
                    >
                      {option.label}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <button
            type="button"
            className={styles.filterToggle}
            aria-expanded={filtersOpen}
            onClick={() => setFiltersOpen((o) => !o)}
          >
            <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true">
              <path
                d="M3 5h14M3 10h14M3 15h14"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
            Filtros
          </button>
        </div>

        <div className={styles.layout}>
          {/* ── Sidebar ── */}
          <aside
            className={`${styles.sidebar} ${filtersOpen ? styles.sidebarOpen : ""}`}
          >
            <h3 className={styles.sidebarHeading}>Filtros</h3>

            <fieldset className={styles.filterGroup}>
              <legend className={styles.groupLabel}>Categoría</legend>
              {FILTER_KEYS.map((k) => (
                <label key={k} className={styles.checkRow}>
                  <input
                    type="checkbox"
                    checked={pending[k]}
                    onChange={() => toggle(k)}
                    className={styles.checkbox}
                  />
                  <span>{TAG_LABELS[k]}</span>
                  {urlFilters[k] && <span className={styles.dot} />}
                </label>
              ))}
            </fieldset>

            <button
              className={styles.applyBtn}
              onClick={applyFilters}
              type="button"
            >
              Aplicar filtros
            </button>
          </aside>

          {/* ── Results area ── */}
          <div className={styles.results}>
            {isLoading ? (
              <p className={styles.message}>Cargando resultados…</p>
            ) : albums.length === 0 && !error ? (
              <p className={styles.message}>No se encontraron resultados.</p>
            ) : (
              <section
                className={styles.grid}
                aria-label="Resultados de búsqueda"
              >
                {albums.map((album, i) => (
                  <a
                    key={album.id}
                    href={toAppPath(`/albums/${album.id}`)}
                    className={styles.card}
                    style={{ "--card-index": i } as CSSProperties}
                  >
                    <div className={styles.cardImageContainer}>
                      {album.thumbnail && !imgErrors[album.id] ? (
                        <img
                          src={album.thumbnail}
                          alt={album.title}
                          className={styles.cardImage}
                          referrerPolicy="no-referrer"
                          onError={() =>
                            setImgErrors((prev) => ({
                              ...prev,
                              [album.id]: true,
                            }))
                          }
                        />
                      ) : (
                        <div
                          className={styles.cardImageFallback}
                          aria-hidden="true"
                        >
                          <svg
                            viewBox="0 0 24 24"
                            className={styles.fallbackIcon}
                          >
                            <path
                              d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                              stroke="currentColor"
                              strokeWidth="1.5"
                              fill="none"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </div>
                      )}
                    </div>
                    <div className={styles.cardBody}>
                      <h3 className={styles.cardTitle}>{album.title}</h3>
                      <div className={styles.meta}>
                        {album.seasonLabel && (
                          <span className={styles.seasonBadge}>
                            {album.seasonLabel}
                          </span>
                        )}
                        {album.categoryName && (
                          <span className={styles.catBadge}>
                            {formatCode(album.categoryName)}
                          </span>
                        )}
                      </div>
                      {albumTags(album).length > 0 && (
                        <div className={styles.tags}>
                          {albumTags(album).map((t) => (
                            <span key={t} className={styles.tag}>
                              {t}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </a>
                ))}
              </section>
            )}

            {/* Pagination */}
            {totalPages > 1 && !isLoading && (
              <nav className={styles.pagination} aria-label="Paginación">
                <button
                  className={styles.pageBtn}
                  disabled={currentPage === 0}
                  onClick={() => changePage(currentPage - 1)}
                  type="button"
                >
                  ‹ Anterior
                </button>

                {pageNumbers(currentPage, totalPages).map((p, i) =>
                  p === "dots" ? (
                    <span key={`d${i}`} className={styles.ellipsis}>
                      …
                    </span>
                  ) : (
                    <button
                      key={p}
                      className={`${styles.pageBtn} ${
                        p === currentPage ? styles.active : ""
                      }`}
                      onClick={() => changePage(p)}
                      type="button"
                    >
                      {p + 1}
                    </button>
                  ),
                )}

                <button
                  className={styles.pageBtn}
                  disabled={currentPage >= totalPages - 1}
                  onClick={() => changePage(currentPage + 1)}
                  type="button"
                >
                  Siguiente ›
                </button>

                <span className={styles.pageInfo}>
                  Página {currentPage + 1} de {totalPages}
                </span>
              </nav>
            )}
          </div>
        </div>
      </div>

      <Footer />
    </main>
  );
}
