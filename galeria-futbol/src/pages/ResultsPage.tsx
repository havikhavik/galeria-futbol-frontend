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
import { FILTER_KEYS, TAG_LABELS } from "../shared/constants/albumFilters";
import { Footer } from "../shared/components/Footer/Footer";
import type { AlbumResponse, AlbumTagKey } from "../shared/types/albums";
import type { PageResponse } from "../shared/types/common";
import type { FeaturedCollectionWithAlbumsApi } from "../shared/types/collections";
import { albumTags } from "../shared/utils/albumHelpers";
import { formatCode } from "../shared/utils/formatters";
import { navigateWithCurrentUrl } from "../shared/utils/navigation";
import {
  buildAlbumsApiPath,
  readTagFilters,
} from "../shared/utils/queryHelpers";
import { readSearchParams } from "../shared/utils/parsers";

import styles from "./ResultsPage.module.css";

/* ── Component ───────────────────────────────────────── */

export function ResultsPage() {
  const params = useMemo(readSearchParams, []);
  const featuredSlug = params.get("featured") || "";
  const isFeaturedMode = Boolean(featuredSlug);
  const query = params.get("q") || "";
  const categoryCode = params.get("categoryCode") || "";
  const teamType = params.get("teamType") || "";
  const guidedTeamType =
    teamType === "CLUB" || teamType === "NATIONAL" ? teamType : null;
  const initialPage = parseInt(params.get("page") || "0", 10);
  const sortBy = params.get("sort") || "";
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
  const [imgErrors, setImgErrors] = useState<Record<number, true>>({});
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
        ? "Selecciones Nacionales"
        : "";
  const teamTypeDiscoveryHref = guidedTeamType
    ? `${toAppPath(routes.categories)}?teamType=${guidedTeamType}`
    : "";

  const breadcrumb = isFeaturedMode
    ? featuredTitle
      ? `Colección: "${featuredTitle}"`
      : "Colección destacada"
    : query
      ? `Búsqueda: "${query}"`
      : categoryCode
        ? formatCode(categoryCode)
        : "Todos los álbumes";

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
          if (page === initialPage) setImgErrors({});
          return;
        }

        const data = await httpClient.getJson<PageResponse<AlbumResponse>>(
          buildAlbumsApiPath(params, page),
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
        if (page === initialPage) setImgErrors({});
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
  }, [featuredSlug, initialPage, isFeaturedMode, page, params]);

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

  /* ── Handlers ── */

  const handleSearch = (q: string) => {
    navigateWithCurrentUrl((url) => {
      url.pathname = toAppPath(routes.search);
      url.search = "";
      if (q) {
        url.searchParams.set("q", q);
      }
    });
  };

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
      if (s) url.searchParams.set("sort", s);
      else url.searchParams.delete("sort");
      url.searchParams.set("page", "0");
    });

  const toggle = (k: AlbumTagKey) =>
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

            {!isLoading && totalPages > 1 && hasMore && (
              <div ref={loadMoreRef} className={styles.loadMoreTrigger}>
                {isLoadingMore ? "Cargando más resultados…" : ""}
              </div>
            )}
          </div>
        </div>
      </div>

      <Footer />
    </main>
  );
}
