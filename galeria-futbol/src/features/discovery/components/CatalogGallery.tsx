import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";

import { routes, toAppPath } from "../../../app/router/routes";
import { httpClient } from "../../../shared/api/httpClient";
import { SearchBar } from "../../../shared/components/SearchBar/SearchBar";
import { FILTER_KEYS } from "../../../shared/constants/albumFilters";
import {
  updateUrlSearchParams,
  useUrlSearchParams,
} from "../../../shared/hooks/useUrlSearchParams";
import type { AlbumResponse, AlbumTagKey } from "../../../shared/types/albums";
import type { PageResponse } from "../../../shared/types/common";
import type { FeaturedCollectionWithAlbumsApi } from "../../../shared/types/collections";
import { navigateWithCurrentUrl, submitSearch } from "../../../shared/utils/navigation";
import { buildAlbumsApiPath, readTagFilters } from "../../../shared/utils/queryHelpers";
import { type GalleryMode, defaultSortFor } from "../catalogSort";
import { categoryDisplayName } from "../catalogTaxonomy";
import { type CatalogTaxonomy, useCatalogTaxonomy } from "../useCatalogTaxonomy";

import { AlbumTile } from "./AlbumTile";
import { CatalogTools } from "./CatalogTools";
import { type CatalogTab, CategoryBar } from "./CategoryBar";
import styles from "./CatalogGallery.module.css";

type CatalogGalleryProps = {
  /** "home" lists the latest uploads first; "search" keeps relevance. */
  mode: GalleryMode;
};

/** URL value of the «Colecciones» tab when no collection is chosen. */
const COLLECTIONS_TAB = "colecciones";

const countLabel = (n: number) => (n === 1 ? "1 camiseta" : `${n} camisetas`);

const TAB_LABEL: Record<Exclude<CatalogTab, "all">, string> = {
  nat: "Selecciones",
  club: "Clubes",
  col: "Colecciones",
};

function readTab(params: URLSearchParams): CatalogTab {
  if (params.get("featured") || params.get("tab") === COLLECTIONS_TAB) {
    return "col";
  }
  const teamType = params.get("teamType");
  if (teamType === "NATIONAL") return "nat";
  if (teamType === "CLUB") return "club";
  return "all";
}

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function headerHeight(): number {
  const value = getComputedStyle(document.documentElement).getPropertyValue("--hh");
  return parseFloat(value) || 61;
}

export function CatalogGallery({ mode }: CatalogGalleryProps) {
  const params = useUrlSearchParams();
  const taxonomy = useCatalogTaxonomy();
  const sectionRef = useRef<HTMLElement | null>(null);

  const tab = readTab(params);
  const selected =
    tab === "col" ? params.get("featured") : params.get("categoryCode");

  // Scrolls back to the top of the gallery when a change is made from
  // further down, so the new results start in view.
  const scrollToGallery = () => {
    const section = sectionRef.current;
    if (!section) return;
    const top =
      section.getBoundingClientRect().top + window.scrollY - headerHeight() + 1;
    if (window.scrollY > top - 2) {
      window.scrollTo({ top, behavior: prefersReducedMotion() ? "auto" : "smooth" });
    }
  };

  const selectTab = (next: CatalogTab) => {
    updateUrlSearchParams((p) => {
      ["teamType", "categoryCode", "featured", "tab", "page"].forEach((k) =>
        p.delete(k),
      );
      if (next === "nat") p.set("teamType", "NATIONAL");
      if (next === "club") p.set("teamType", "CLUB");
      if (next === "col") p.set("tab", COLLECTIONS_TAB);
    });
    scrollToGallery();
  };

  const selectItem = (code: string | null) => {
    updateUrlSearchParams((p) => {
      p.delete("page");
      if (tab === "col") {
        if (code) {
          p.set("featured", code);
          p.delete("tab");
        } else {
          p.delete("featured");
          p.set("tab", COLLECTIONS_TAB);
        }
        return;
      }
      if (code) p.set("categoryCode", code);
      else p.delete("categoryCode");
    });
    scrollToGallery();
  };

  // Results restart from the first page whenever the criteria change.
  const resultsKey = useMemo(() => {
    const criteria = new URLSearchParams(params);
    criteria.delete("page");
    return criteria.toString();
  }, [params]);

  return (
    <section
      ref={sectionRef}
      className={`${styles.gallery} ${
        mode === "search" ? styles.galleryUnderHeader : ""
      }`}
      aria-label="Catálogo"
    >
      <CategoryBar
        taxonomy={taxonomy}
        tab={tab}
        selected={selected}
        onSelectTab={selectTab}
        onSelectItem={selectItem}
        mobileSearchPinned={mode === "search"}
        tools={<CatalogTools mode={mode} params={params} />}
        mobileSearch={
          <SearchBar
            placeholder="Buscar camisetas…"
            initialValue={params.get("q") || ""}
            onSubmit={submitSearch}
          />
        }
      />
      <CatalogResults
        key={resultsKey}
        mode={mode}
        params={params}
        tab={tab}
        taxonomy={taxonomy}
        onSelectTab={selectTab}
        onSelectItem={selectItem}
      />
    </section>
  );
}

type CatalogResultsProps = {
  mode: GalleryMode;
  params: URLSearchParams;
  tab: CatalogTab;
  taxonomy: CatalogTaxonomy;
  onSelectTab: (tab: CatalogTab) => void;
  onSelectItem: (code: string | null) => void;
};

function CatalogResults({
  mode,
  params,
  tab,
  taxonomy,
  onSelectTab,
  onSelectItem,
}: CatalogResultsProps) {
  const featuredSlug = params.get("featured") || "";
  const isCollections = tab === "col";
  const query = params.get("q") || "";
  const categoryCode = params.get("categoryCode") || "";
  const initialPage = parseInt(params.get("page") || "0", 10);
  const sortBy = params.get("sort") || defaultSortFor(mode);
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
  const [collectionTitle, setCollectionTitle] = useState("");
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const hasFilters = FILTER_KEYS.some((k) => urlFilters[k]);

  /* ── Fetch albums ── */

  useEffect(() => {
    let cancelled = false;

    const loadCollections = async (): Promise<AlbumResponse[]> => {
      if (featuredSlug) {
        const details = await httpClient.getJson<FeaturedCollectionWithAlbumsApi>(
          `featured/${featuredSlug}`,
        );
        if (!cancelled) setCollectionTitle(details.title ?? "");
        return (details.albums ?? []) as AlbumResponse[];
      }

      // «Colecciones» with nothing chosen: every collection, without repeats.
      const list = await httpClient.getJson<{ slug: string }[]>("featured");
      const details = await Promise.all(
        list.map((item) =>
          httpClient.getJson<FeaturedCollectionWithAlbumsApi>(
            `featured/${item.slug}`,
          ),
        ),
      );
      const seen = new Set<number>();
      return details
        .flatMap((d) => (d.albums ?? []) as AlbumResponse[])
        .filter((album) => {
          if (seen.has(album.id)) return false;
          seen.add(album.id);
          return true;
        });
    };

    const load = async () => {
      if (isCollections && page !== initialPage) {
        setHasMore(false);
        return;
      }

      if (page === initialPage) setIsLoading(true);
      else setIsLoadingMore(true);
      setError(null);
      try {
        if (isCollections) {
          const collectionAlbums = await loadCollections();
          if (cancelled) return;
          setAlbums(collectionAlbums);
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
  }, [featuredSlug, initialPage, isCollections, page, params, sortBy]);

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

  // Clearing the search may leave the search page with nothing to search
  // for: in that case the catalog lives on the home page.
  const clearQuery = () => {
    const hasOtherCriteria = ["categoryCode", "teamType", "featured", "tab"].some(
      (k) => params.get(k),
    );
    if (mode === "search" && !hasOtherCriteria) {
      navigateWithCurrentUrl((url) => {
        url.pathname = toAppPath(routes.home);
        url.searchParams.delete("q");
        url.searchParams.delete("page");
      });
      return;
    }
    updateUrlSearchParams((p) => {
      p.delete("q");
      p.delete("page");
    });
  };

  const clearFilters = () =>
    updateUrlSearchParams((p) => {
      for (const k of FILTER_KEYS) p.delete(k);
      p.delete("sort");
      p.delete("page");
    });

  /* ── Status line ── */

  const items =
    tab === "nat"
      ? taxonomy.nations
      : tab === "club"
        ? taxonomy.clubs
        : tab === "col"
          ? taxonomy.collections
          : [];
  const selectedCode = isCollections ? featuredSlug : categoryCode;
  const selectedItem = items.find((item) => item.code === selectedCode);

  const count = (
    <span className={styles.count}>
      {isLoading ? "Buscando…" : countLabel(totalElements)}
    </span>
  );

  const chip = (
    key: string,
    label: ReactNode,
    onClick: () => void,
    srLabel?: string,
  ) => (
    <button key={key} type="button" className={styles.clear} onClick={onClick}>
      {label} <span aria-hidden="true">×</span>
      {srLabel && <span className={styles.srOnly}>{srLabel}</span>}
    </button>
  );

  let crumb: ReactNode;
  let title: ReactNode;
  let image: string | null = null;
  let showCount = true;
  const chips: ReactNode[] = [];

  if (query) {
    chips.push(chip("query", `“${query}”`, clearQuery, "Borrar búsqueda"));
  }

  if (tab !== "all" && selectedCode) {
    crumb = (
      <>
        <button
          type="button"
          className={styles.crumbButton}
          onClick={() => onSelectItem(null)}
        >
          {TAB_LABEL[tab]}
        </button>
        <span aria-hidden="true">›</span>
      </>
    );
    title = isCollections
      ? selectedItem?.name || collectionTitle || "Colección"
      : selectedItem?.name || categoryDisplayName(selectedCode);
    image = selectedItem?.image ?? null;
    chips.push(chip("item", "Quitar filtro", () => onSelectItem(null)));
  } else if (tab !== "all") {
    crumb = query ? "Búsqueda" : "Catálogo";
    title = tab === "nat" ? "Selecciones nacionales" : TAB_LABEL[tab];
    chips.push(chip("tab", "Ver todo", () => onSelectTab("all")));
  } else if (query) {
    crumb = "Búsqueda";
    title = `“${query}”`;
  } else {
    crumb = mode === "home" ? "Catálogo" : "Búsqueda";
    title = mode === "home" ? "Recién llegadas" : "Todas las camisetas";
    showCount = mode !== "home";
  }

  if (hasFilters) chips.push(chip("filters", "Limpiar filtros", clearFilters));

  // The detail page offers «Volver a {contexto}» back to this exact view.
  const contextLabel =
    tab !== "all" && selectedCode
      ? String(title)
      : query
        ? `“${query}”`
        : tab !== "all"
          ? TAB_LABEL[tab]
          : "la galería";
  const detailQuery = new URLSearchParams({
    ctx: contextLabel,
    ret: `${window.location.pathname}${window.location.search}`,
  }).toString();

  /* ── Render ── */

  return (
    <div className={styles.inner}>
      <div className={styles.status} aria-live="polite">
        <div className={styles.statusLead}>
          {image && (
            <img
              className={styles.statusImage}
              src={image}
              alt=""
              referrerPolicy="no-referrer"
            />
          )}
          <div className={styles.statusText}>
            <div className={styles.crumb}>{crumb}</div>
            <h2 className={styles.title}>
              {title} {showCount ? count : null}
            </h2>
          </div>
        </div>
        {chips.length > 0 && <div className={styles.chips}>{chips}</div>}
      </div>

      {error && <p className={styles.error}>{error}</p>}

      {isLoading ? (
        <p className={styles.message}>Cargando resultados…</p>
      ) : albums.length === 0 && !error ? (
        <p className={styles.message}>No se encontraron resultados.</p>
      ) : (
        <div className={styles.grid}>
          {albums.map((album) => (
            <AlbumTile key={album.id} album={album} linkQuery={detailQuery} />
          ))}
        </div>
      )}

      {!isLoading && totalPages > 1 && hasMore && (
        <div ref={loadMoreRef} className={styles.loadMoreTrigger}>
          {isLoadingMore ? "Cargando más resultados…" : ""}
        </div>
      )}
    </div>
  );
}
