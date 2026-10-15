import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";

import { routes, toAppPath } from "../../../app/router/routes";
import { httpClient } from "../../../shared/api/httpClient";
import { FILTER_KEYS, TAG_LABELS } from "../../../shared/constants/albumFilters";
import type { AlbumResponse, AlbumTagKey } from "../../../shared/types/albums";
import type { PageResponse } from "../../../shared/types/common";
import type { FeaturedCollectionWithAlbumsApi } from "../../../shared/types/collections";
import { formatCode } from "../../../shared/utils/formatters";
import { navigateWithCurrentUrl } from "../../../shared/utils/navigation";
import { readSearchParams } from "../../../shared/utils/parsers";
import {
  RELEVANCE_SORT,
  buildAlbumsApiPath,
  readTagFilters,
} from "../../../shared/utils/queryHelpers";

import { AlbumTile } from "./AlbumTile";
import styles from "./CatalogGallery.module.css";

type CatalogGalleryProps = {
  /** "home" lists the catalog newest first; "search" keeps relevance. */
  mode: "home" | "search";
};

/** Latest uploads first: what "Recién llegadas" shows on the home page. */
const NEWEST_UPLOADS_SORT = "createdAt,desc";

// On the home page "Más recientes" means the latest uploads; in searches it
// keeps sorting by season, as before.
const sortOptions = (mode: CatalogGalleryProps["mode"]) => [
  { value: RELEVANCE_SORT, label: "Relevancia" },
  { value: "title,asc", label: "Título A-Z" },
  { value: "title,desc", label: "Título Z-A" },
  {
    value: mode === "home" ? NEWEST_UPLOADS_SORT : "seasonStart,desc",
    label: "Más recientes",
  },
  { value: "seasonStart,asc", label: "Más antiguos" },
];

const countLabel = (n: number) => (n === 1 ? "1 camiseta" : `${n} camisetas`);

export function CatalogGallery({ mode }: CatalogGalleryProps) {
  const params = useMemo(readSearchParams, []);
  const featuredSlug = params.get("featured") || "";
  const isFeaturedMode = Boolean(featuredSlug);
  const query = params.get("q") || "";
  const categoryCode = params.get("categoryCode") || "";
  const teamType = params.get("teamType") || "";
  const guidedTeamType =
    teamType === "CLUB" || teamType === "NATIONAL" ? teamType : null;
  const initialPage = parseInt(params.get("page") || "0", 10);
  const defaultSort = mode === "home" ? NEWEST_UPLOADS_SORT : RELEVANCE_SORT;
  const options = sortOptions(mode);
  const sortBy = params.get("sort") || defaultSort;
  const urlFilters = useMemo(
    () => readTagFilters<AlbumTagKey>(params, FILTER_KEYS),
    [params],
  );

  const [albums, setAlbums] = useState<AlbumResponse[]>([]);
  const [page, setPage] = useState(initialPage);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [featuredTitle, setFeaturedTitle] = useState("");
  const [pending, setPending] = useState(urlFilters);
  const [sortOpen, setSortOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const sortDropdownRef = useRef<HTMLDivElement | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const hasFilters = FILTER_KEYS.some((k) => urlFilters[k]);
  const teamTypeLabel =
    guidedTeamType === "CLUB"
      ? "Clubes"
      : guidedTeamType === "NATIONAL"
        ? "Selecciones"
        : "";

  /* ── Fetch albums ── */

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (isFeaturedMode && page !== initialPage) {
        setHasMore(false);
        return;
      }

      if (page === initialPage) setIsLoading(true);
      else setIsLoadingMore(true);
      setError(null);
      try {
        if (isFeaturedMode) {
          const details =
            await httpClient.getJson<FeaturedCollectionWithAlbumsApi>(
              `featured/${featuredSlug}`,
            );

          if (cancelled) return;

          const collectionAlbums = (details.albums ?? []) as AlbumResponse[];
          setAlbums(collectionAlbums);
          setFeaturedTitle(details.title ?? "");
          setTotalElements(collectionAlbums.length);
          setTotalPages(1);
          setHasMore(false);
          return;
        }

        const apiParams = new URLSearchParams(params);
        apiParams.set("sort", sortBy);
        const data = await httpClient.getJson<PageResponse<AlbumResponse>>(
          buildAlbumsApiPath(apiParams, page),
        );
        if (cancelled) return;
        setFeaturedTitle("");
        const nextTotalElements = data.totalElements ?? 0;
        const nextTotalPages = data.totalPages ?? 0;
        setAlbums((prev) =>
          page === initialPage ? data.content : [...prev, ...data.content],
        );
        setTotalElements(nextTotalElements);
        setTotalPages(nextTotalPages);
        setHasMore(page < nextTotalPages - 1);
      } catch {
        if (!cancelled)
          setError("No pudimos cargar los resultados. Intenta nuevamente.");
      } finally {
        if (!cancelled) {
          setIsLoading(false);
          setIsLoadingMore(false);
        }
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [featuredSlug, initialPage, isFeaturedMode, page, params, sortBy]);

  useEffect(() => {
    if (!loadMoreRef.current || isLoading || isLoadingMore || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setPage((prev) => prev + 1);
        }
      },
      { rootMargin: "240px" },
    );

    observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [hasMore, isLoading, isLoadingMore]);

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

  /* ── Handlers ── */

  // Removing the search or the category may leave nothing to search for:
  // in that case the catalog lives on the home page.
  const updateCatalog = (mutate: (url: URL) => void) =>
    navigateWithCurrentUrl((url) => {
      mutate(url);
      url.searchParams.delete("page");
      const hasCriteria = ["q", "categoryCode", "teamType", "featured"].some(
        (k) => url.searchParams.get(k),
      );
      if (!hasCriteria) url.pathname = toAppPath(routes.home);
    });

  const clearQuery = () => updateCatalog((url) => url.searchParams.delete("q"));
  const clearCategory = () =>
    updateCatalog((url) => url.searchParams.delete("categoryCode"));
  const clearTeamType = () =>
    updateCatalog((url) => {
      url.searchParams.delete("teamType");
      url.searchParams.delete("categoryCode");
    });

  const applyFilters = () =>
    navigateWithCurrentUrl((url) => {
      if (isFeaturedMode) {
        url.searchParams.delete("featured");
      }
      for (const k of FILTER_KEYS) {
        if (pending[k]) url.searchParams.set(k, "true");
        else url.searchParams.delete(k);
      }
      url.searchParams.set("page", "0");
    });

  const clearFilters = () =>
    navigateWithCurrentUrl((url) => {
      url.search = "";
      if (isFeaturedMode) url.searchParams.set("featured", featuredSlug);
      if (query) url.searchParams.set("q", query);
      if (categoryCode) url.searchParams.set("categoryCode", categoryCode);
      if (teamType) url.searchParams.set("teamType", teamType);
    });

  const changeSort = (s: string) =>
    navigateWithCurrentUrl((url) => {
      if (isFeaturedMode) {
        url.searchParams.delete("featured");
      }
      if (s === defaultSort) url.searchParams.delete("sort");
      else url.searchParams.set("sort", s);
      url.searchParams.set("page", "0");
    });

  const toggle = (k: AlbumTagKey) =>
    setPending((prev) => ({ ...prev, [k]: !prev[k] }));

  const currentSortLabel =
    options.find((option) => option.value === sortBy)?.label ||
    "Relevancia";

  /* ── Status line ── */

  const count = (
    <span className={styles.count}>
      {isLoading ? "Buscando…" : countLabel(totalElements)}
    </span>
  );

  const queryChip = query ? (
    <button type="button" className={styles.clear} onClick={clearQuery}>
      “{query}” <span aria-hidden="true">×</span>
      <span className={styles.srOnly}>Borrar búsqueda</span>
    </button>
  ) : null;

  const filtersChip = hasFilters ? (
    <button type="button" className={styles.clear} onClick={clearFilters}>
      Limpiar filtros <span aria-hidden="true">×</span>
    </button>
  ) : null;

  let crumb: ReactNode;
  let title: ReactNode;
  let showCount = true;
  let extraChip: ReactNode = null;

  if (isFeaturedMode) {
    crumb = "Colección";
    title = featuredTitle || "Colección destacada";
  } else if (categoryCode) {
    crumb = guidedTeamType ? (
      <>
        <a
          className={styles.crumbLink}
          href={`${toAppPath(routes.categories)}?teamType=${guidedTeamType}`}
        >
          {teamTypeLabel}
        </a>
        <span aria-hidden="true">›</span>
      </>
    ) : (
      "Catálogo"
    );
    title = formatCode(categoryCode);
    extraChip = (
      <button type="button" className={styles.clear} onClick={clearCategory}>
        Quitar filtro <span aria-hidden="true">×</span>
      </button>
    );
  } else if (guidedTeamType) {
    crumb = query ? "Búsqueda" : "Catálogo";
    title =
      guidedTeamType === "NATIONAL" ? "Selecciones nacionales" : "Clubes";
    extraChip = (
      <button type="button" className={styles.clear} onClick={clearTeamType}>
        Ver todo <span aria-hidden="true">×</span>
      </button>
    );
  } else if (query) {
    crumb = "Búsqueda";
    title = `“${query}”`;
  } else {
    crumb = mode === "home" ? "Catálogo" : "Búsqueda";
    title = mode === "home" ? "Recién llegadas" : "Todas las camisetas";
    showCount = mode !== "home";
  }

  const chips = [queryChip, extraChip, filtersChip].filter(Boolean);

  /* ── Render ── */

  return (
    <section className={styles.gallery} aria-label="Catálogo">
      <div className={styles.inner}>
        <div className={styles.status} aria-live="polite">
          <div className={styles.statusText}>
            <div className={styles.crumb}>{crumb}</div>
            <h2 className={styles.title}>
              {title} {showCount ? count : null}
            </h2>
          </div>
          {chips.length > 0 && <div className={styles.chips}>{chips}</div>}
        </div>

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
                {options.map((option) => (
                  <li key={option.value}>
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

          <div className={styles.results}>
            {isLoading ? (
              <p className={styles.message}>Cargando resultados…</p>
            ) : albums.length === 0 && !error ? (
              <p className={styles.message}>No se encontraron resultados.</p>
            ) : (
              <div className={styles.grid}>
                {albums.map((album) => (
                  <AlbumTile key={album.id} album={album} />
                ))}
              </div>
            )}

            {!isLoading && totalPages > 1 && hasMore && (
              <div ref={loadMoreRef} className={styles.loadMoreTrigger}>
                {isLoadingMore ? "Cargando más resultados…" : ""}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
