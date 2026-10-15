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
import { scrollToGallery } from "../galleryScroll";
import { useLiveSearchContext } from "../liveSearch";
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

export function CatalogGallery({ mode }: CatalogGalleryProps) {
  const params = useUrlSearchParams();
  const taxonomy = useCatalogTaxonomy();
  const live = useLiveSearchContext();
  const sectionRef = useRef<HTMLElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);

  const tab = readTab(params);
  const selected =
    tab === "col" ? params.get("featured") : params.get("categoryCode");

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
  const criteriaKey = useMemo(() => {
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
      data-busy={busy ? "true" : undefined}
    >
      <CategoryBar
        taxonomy={taxonomy}
        tab={tab}
        selected={selected}
        onSelectTab={selectTab}
        onSelectItem={selectItem}
        mobileSearchPinned={mode === "search"}
        tools={<CatalogTools mode={mode} params={params} />}
        panelOpen={panelOpen}
        onPanelOpenChange={setPanelOpen}
        mobileSearch={
          live ? (
            <SearchBar
              placeholder="Buscar camisetas…"
              value={live.value}
              onChange={live.change}
              onSubmit={live.commit}
            />
          ) : (
            <SearchBar
              placeholder="Buscar camisetas…"
              initialValue={params.get("q") || ""}
              onSubmit={submitSearch}
            />
          )
        }
      />
      <CatalogResults
        criteriaKey={criteriaKey}
        onBusyChange={setBusy}
        mode={mode}
        params={params}
        tab={tab}
        taxonomy={taxonomy}
        onSelectTab={selectTab}
        onSelectItem={selectItem}
        onOpenLeagues={() => setPanelOpen(true)}
      />
    </section>
  );
}

type CatalogResultsProps = {
  /** Query string without paging: a change starts a new first page. */
  criteriaKey: string;
  /** A new first page is loading while the previous results stay in view. */
  onBusyChange: (busy: boolean) => void;
  mode: GalleryMode;
  params: URLSearchParams;
  tab: CatalogTab;
  taxonomy: CatalogTaxonomy;
  onSelectTab: (tab: CatalogTab) => void;
  onSelectItem: (code: string | null) => void;
  onOpenLeagues: () => void;
};

type EmptyAction = { label: string; primary?: boolean; onClick: () => void };

const SKELETON_FIRST_LOAD = 12;
const SKELETON_NEXT_PAGE = 4;

const skeletons = (count: number) =>
  Array.from({ length: count }, (_, i) => (
    <div key={`skeleton-${i}`} className={styles.skeleton} aria-hidden="true">
      <div className={styles.skeletonPhoto} />
      <i />
      <i />
    </div>
  ));

function CatalogResults({
  criteriaKey,
  onBusyChange,
  mode,
  params,
  tab,
  taxonomy,
  onSelectTab,
  onSelectItem,
  onOpenLeagues,
}: CatalogResultsProps) {
  const live = useLiveSearchContext();
  const featuredSlug = params.get("featured") || "";
  const isCollections = tab === "col";
  const query = params.get("q") || "";
  const categoryCode = params.get("categoryCode") || "";
  const sortBy = params.get("sort") || defaultSortFor(mode, query);
  const urlFilters = useMemo(
    () => readTagFilters<AlbumTagKey>(params, FILTER_KEYS),
    [params],
  );

  const [albums, setAlbums] = useState<AlbumResponse[]>([]);
  const [page, setPage] = useState(0);
  const [loadedKey, setLoadedKey] = useState(criteriaKey);
  const [totalElements, setTotalElements] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  // "initial": first load, nothing to show yet. "refreshing": new criteria,
  // the previous results stay in view until the answer arrives.
  const [phase, setPhase] = useState<"initial" | "ready" | "refreshing" | "error">(
    "initial",
  );
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [loadMoreFailed, setLoadMoreFailed] = useState(false);
  const [totalPages, setTotalPages] = useState(0);
  // Bumped by «Reintentar» and «Cargar más» to repeat the last request.
  const [attempt, setAttempt] = useState(0);
  const [collectionTitle, setCollectionTitle] = useState("");
  const requestSeq = useRef(0);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const hasFilters = FILTER_KEYS.some((k) => urlFilters[k]);

  // New criteria: back to the first page.
  if (loadedKey !== criteriaKey) {
    setLoadedKey(criteriaKey);
    setPage(0);
    setLoadMoreFailed(false);
  }

  const retry = () => {
    setLoadMoreFailed(false);
    setAttempt((n) => n + 1);
  };

  useEffect(() => {
    onBusyChange(phase === "refreshing");
  }, [phase, onBusyChange]);

  /* ── Fetch albums ── */

  // Each request aborts the previous one, and only the answer to the latest
  // request is applied (a slow earlier answer may still arrive).
  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;
    const seq = ++requestSeq.current;
    const isLatest = () => seq === requestSeq.current && !signal.aborted;
    const firstPage = page === 0;

    const loadCollections = async (): Promise<AlbumResponse[]> => {
      if (featuredSlug) {
        const details = await httpClient.getJson<FeaturedCollectionWithAlbumsApi>(
          `featured/${featuredSlug}`,
          { signal },
        );
        if (isLatest()) setCollectionTitle(details.title ?? "");
        return (details.albums ?? []) as AlbumResponse[];
      }

      // «Colecciones» with nothing chosen: every collection, without repeats.
      const list = await httpClient.getJson<{ slug: string }[]>("featured", {
        signal,
      });
      const details = await Promise.all(
        list.map((item) =>
          httpClient.getJson<FeaturedCollectionWithAlbumsApi>(
            `featured/${item.slug}`,
            { signal },
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
      // Skeleton on the first load (and when retrying after an error);
      // dimmed previous results on later searches.
      if (firstPage) {
        setPhase((prev) =>
          prev === "initial" || prev === "error" ? "initial" : "refreshing",
        );
      } else {
        setIsLoadingMore(true);
      }

      try {
        if (isCollections) {
          const collectionAlbums = await loadCollections();
          if (!isLatest()) return;
          setAlbums(collectionAlbums);
          setTotalElements(collectionAlbums.length);
          setTotalPages(1);
          setHasMore(false);
          setPhase("ready");
          return;
        }

        const apiParams = new URLSearchParams(params);
        apiParams.set("sort", sortBy);
        const data = await httpClient.getJson<PageResponse<AlbumResponse>>(
          buildAlbumsApiPath(apiParams, page),
          { signal },
        );
        if (!isLatest()) return;
        const totalPages = data.totalPages ?? 0;
        setAlbums((prev) => (firstPage ? data.content : [...prev, ...data.content]));
        setTotalElements(data.totalElements ?? 0);
        setTotalPages(totalPages);
        setHasMore(page < totalPages - 1);
        setPhase("ready");
      } catch {
        if (!isLatest()) return;
        if (firstPage) setPhase("error");
        // A failed next page shows «Cargar más» instead of retrying on scroll.
        else setLoadMoreFailed(true);
      } finally {
        if (isLatest()) setIsLoadingMore(false);
      }
    };

    void load();
    return () => controller.abort();
    // criteriaKey stands for params, sortBy and the collection fields.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [criteriaKey, page, attempt]);

  useEffect(() => {
    if (
      !loadMoreRef.current ||
      phase !== "ready" ||
      isLoadingMore ||
      loadMoreFailed ||
      !hasMore
    ) {
      return;
    }

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
  }, [hasMore, phase, isLoadingMore, loadMoreFailed]);

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
    if (live) {
      live.change("");
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
      {phase === "initial" || phase === "refreshing"
        ? "Buscando…"
        : countLabel(totalElements)}
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

  /* ── Empty and error states ── */

  const searchEverywhere = () =>
    updateUrlSearchParams((p) => {
      ["teamType", "categoryCode", "featured", "tab", "page", ...FILTER_KEYS].forEach(
        (k) => p.delete(k),
      );
    });

  const retryAction: EmptyAction = { label: "Reintentar", primary: true, onClick: retry };

  let empty: { title: string; text?: string; actions: EmptyAction[] };
  if (phase === "error") {
    empty = query
      ? {
          title: "No pudimos buscar ahora",
          text: "Revisá tu conexión. Lo que escribiste sigue en el buscador.",
          actions: [retryAction],
        }
      : { title: "No pudimos cargar las camisetas", actions: [retryAction] };
  } else if (query) {
    empty = {
      title: `Sin resultados para «${query}»`,
      text: "Revisá cómo está escrito o probá con el nombre del club, la selección o la temporada.",
      actions: [
        { label: "Borrar búsqueda", primary: true, onClick: clearQuery },
        ...(tab !== "all" || hasFilters
          ? [{ label: "Buscar en todo el catálogo", onClick: searchEverywhere }]
          : []),
      ],
    };
  } else if (tab !== "all" && selectedCode) {
    empty = {
      title: `Todavía no hay camisetas de ${String(title)}`,
      text: `Seguimos sumando ligas y temporadas. Mientras tanto, probá con otra ${
        tab === "club" ? "liga" : "categoría"
      }.`,
      actions:
        tab === "club"
          ? [
              {
                label: "Ver todos los clubes",
                primary: true,
                onClick: () => onSelectItem(null),
              },
              { label: "Elegir otra liga", onClick: onOpenLeagues },
            ]
          : [{ label: "Ver todo", primary: true, onClick: () => onSelectTab("all") }],
    };
  } else if (hasFilters) {
    empty = {
      title: "No hay camisetas con estos filtros",
      text: "Probá quitando alguno.",
      actions: [{ label: "Limpiar filtros", primary: true, onClick: clearFilters }],
    };
  } else {
    empty = {
      title: "Todavía no hay camisetas acá",
      text: "Seguimos sumando ligas y temporadas.",
      actions:
        tab !== "all"
          ? [{ label: "Ver todo", primary: true, onClick: () => onSelectTab("all") }]
          : [],
    };
  }

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

      {live?.showHint && (
        <p className={styles.hint}>
          Seguí escribiendo: la búsqueda empieza con 2 letras.
        </p>
      )}

      <div className={`${styles.results} ${phase === "refreshing" ? styles.busy : ""}`}>
        {phase === "initial" ? (
          <div className={styles.grid}>{skeletons(SKELETON_FIRST_LOAD)}</div>
        ) : phase === "error" || albums.length === 0 ? (
          <div className={styles.empty}>
            <h3>{empty.title}</h3>
            {empty.text && <p>{empty.text}</p>}
            {empty.actions.length > 0 && (
              <div className={styles.actions}>
                {empty.actions.map((action) => (
                  <button
                    key={action.label}
                    type="button"
                    className={`${styles.button} ${
                      action.primary ? styles.buttonPrimary : styles.buttonSecondary
                    }`}
                    onClick={action.onClick}
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <>
            <div className={styles.grid}>
              {albums.map((album) => (
                <AlbumTile key={album.id} album={album} linkQuery={detailQuery} />
              ))}
              {isLoadingMore && skeletons(SKELETON_NEXT_PAGE)}
            </div>

            {hasMore && !loadMoreFailed && (
              <div ref={loadMoreRef} className={styles.loadMoreTrigger} />
            )}
            {loadMoreFailed && (
              <div className={styles.more}>
                <button
                  type="button"
                  className={`${styles.button} ${styles.buttonSecondary}`}
                  onClick={retry}
                >
                  Cargar más
                </button>
              </div>
            )}
            {!hasMore && totalPages > 1 && (
              <p className={styles.end}>Llegaste al final</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
