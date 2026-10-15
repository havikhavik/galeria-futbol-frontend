import { type ReactNode, useEffect, useRef, useState } from "react";

import { type ScrollEdges, useScrollEdges } from "../../../shared/hooks/useScrollEdges";
import nationalIcon from "../assets/icono-pelota-sm.png";
import clubIcon from "../assets/icono-copa-sm.png";
import { LEAGUE_REGIONS } from "../catalogTaxonomy";
import type { CatalogItem, CatalogTaxonomy } from "../useCatalogTaxonomy";

import styles from "./CategoryBar.module.css";

export type CatalogTab = "all" | "nat" | "club" | "col";

type CategoryBarProps = {
  taxonomy: CatalogTaxonomy;
  tab: CatalogTab;
  /** Selected league, confederation or collection code. */
  selected: string | null;
  onSelectTab: (tab: CatalogTab) => void;
  onSelectItem: (code: string | null) => void;
  /** Search field shown inside the bar on mobile. */
  mobileSearch?: ReactNode;
  /** Keep the mobile search field visible (search page). Otherwise it shows
      only while the bar is pinned and the user asked for search. */
  mobileSearchPinned?: boolean;
  /** Filters and sort buttons, at the end of the first row. */
  tools?: ReactNode;
};

const TABS: { id: CatalogTab; label: string }[] = [
  { id: "all", label: "Todo" },
  { id: "nat", label: "Selecciones" },
  { id: "club", label: "Clubes" },
  { id: "col", label: "Colecciones" },
];

const ITEMS_LABEL: Record<Exclude<CatalogTab, "all">, string> = {
  nat: "Confederaciones",
  club: "Ligas",
  col: "Colecciones",
};

const edgeClasses = (edges: ScrollEdges) =>
  [
    edges.overflows ? styles.overflows : "",
    edges.scrolled ? styles.scrolled : "",
    edges.atEnd ? styles.atEnd : "",
  ].join(" ");

export function CategoryBar({
  taxonomy,
  tab,
  selected,
  onSelectTab,
  onSelectItem,
  mobileSearch,
  mobileSearchPinned = false,
  tools,
}: CategoryBarProps) {
  const [panelOpen, setPanelOpen] = useState(false);
  const [panelFilter, setPanelFilter] = useState("");
  const tabsRef = useRef<HTMLDivElement | null>(null);
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const openAllRef = useRef<HTMLButtonElement | null>(null);
  const filterRef = useRef<HTMLInputElement | null>(null);

  const items: CatalogItem[] =
    tab === "nat"
      ? taxonomy.nations
      : tab === "club"
        ? taxonomy.clubs
        : tab === "col"
          ? taxonomy.collections
          : [];

  const tabsEdges = useScrollEdges(tabsRef, taxonomy);
  const chipsEdges = useScrollEdges(scrollerRef, `${tab}:${items.length}`);

  const closePanel = (returnFocus: boolean) => {
    setPanelOpen(false);
    if (returnFocus) openAllRef.current?.focus({ preventScroll: true });
  };

  // Bring the selected chip into view without animating.
  useEffect(() => {
    const scroller = scrollerRef.current;
    const chip = scroller?.querySelector<HTMLElement>('[aria-pressed="true"]');
    if (scroller && chip) {
      scroller.scrollTo({ left: Math.max(0, chip.offsetLeft - 80) });
    }
  }, [tab, selected, items.length]);

  useEffect(() => {
    if (!panelOpen) return;

    const focusTimer = window.setTimeout(
      () => filterRef.current?.focus({ preventScroll: true }),
      50,
    );
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setPanelOpen(false);
      openAllRef.current?.focus({ preventScroll: true });
    };
    window.addEventListener("keydown", onKeyDown);

    // The panel is a bottom sheet on phones: keep the page from scrolling.
    const root = document.documentElement;
    const lock = window.matchMedia("(max-width: 640px)").matches;
    if (lock) root.style.overflow = "hidden";

    return () => {
      window.clearTimeout(focusTimer);
      window.removeEventListener("keydown", onKeyDown);
      if (lock) root.style.overflow = "";
    };
  }, [panelOpen]);

  const selectTab = (next: CatalogTab) => {
    setPanelOpen(false);
    onSelectTab(next);
  };

  const filterText = panelFilter.trim().toLowerCase();
  const panelItems = taxonomy.clubs.filter((club) =>
    club.name.toLowerCase().includes(filterText),
  );

  return (
    <>
      <div className={styles.bar} data-category-bar="">
        <div className={styles.inner}>
          {mobileSearch && (
            <div
              className={`${styles.mobileSearch} ${
                mobileSearchPinned ? styles.mobileSearchPinned : ""
              }`}
              data-mobile-search=""
            >
              {mobileSearch}
            </div>
          )}

          <div className={styles.level1}>
            <div
              ref={tabsRef}
              className={`${styles.tabs} ${edgeClasses(tabsEdges)}`}
              role="tablist"
              aria-label="Tipo de equipo"
            >
              {TABS.map(({ id, label }) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={tab === id}
                  className={`${styles.tab} ${
                    id === "nat" || id === "club" ? styles.tabWithIcon : ""
                  }`}
                  onClick={() => selectTab(id)}
                >
                  {id === "nat" && <img src={nationalIcon} alt="" />}
                  {id === "club" && <img src={clubIcon} alt="" />}
                  {label}
                  {id === "nat" && taxonomy.nations.length > 0 && (
                    <small>{taxonomy.nations.length}</small>
                  )}
                  {id === "club" && taxonomy.clubs.length > 0 && (
                    <small>{taxonomy.clubs.length}</small>
                  )}
                </button>
              ))}
            </div>
            {tools}
          </div>

          <div
            className={`${styles.level2Wrap} ${
              tab !== "all" ? styles.level2Open : ""
            }`}
          >
            <div>
              {tab !== "all" && (
                <div className={styles.level2}>
                  {tab === "club" && (
                    <button
                      ref={openAllRef}
                      type="button"
                      className={styles.openAll}
                      aria-expanded={panelOpen}
                      aria-controls="all-leagues"
                      aria-label="Todas las ligas"
                      onClick={() => setPanelOpen((open) => !open)}
                    >
                      <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                        <rect x="1" y="1" width="6" height="6" rx="1.5" />
                        <rect x="9" y="1" width="6" height="6" rx="1.5" />
                        <rect x="1" y="9" width="6" height="6" rx="1.5" />
                        <rect x="9" y="9" width="6" height="6" rx="1.5" />
                      </svg>
                      <span className={styles.openAllLabel}>Todas las ligas</span>
                    </button>
                  )}

                  <div className={styles.scrollerWrap}>
                    <div
                      ref={scrollerRef}
                      className={`${styles.scroller} ${edgeClasses(chipsEdges)}`}
                      role="group"
                      aria-label={ITEMS_LABEL[tab]}
                    >
                      {items.map((item) => (
                        <button
                          key={item.code}
                          type="button"
                          className={`${styles.chip} ${styles[`chip_${tab}`]}`}
                          aria-pressed={selected === item.code}
                          onClick={() =>
                            onSelectItem(selected === item.code ? null : item.code)
                          }
                        >
                          {item.image ? (
                            <img src={item.image} alt="" referrerPolicy="no-referrer" />
                          ) : (
                            <span className={styles.chipImagePlaceholder} />
                          )}
                          {item.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {tab === "club" && (
                    <>
                      <button
                        type="button"
                        className={styles.arrow}
                        aria-label="Ligas anteriores"
                        hidden={!chipsEdges.scrolled}
                        onClick={() =>
                          scrollerRef.current?.scrollBy({ left: -320, behavior: "smooth" })
                        }
                      >
                        ←
                      </button>
                      <button
                        type="button"
                        className={styles.arrow}
                        aria-label="Ver más ligas"
                        hidden={!chipsEdges.overflows || chipsEdges.atEnd}
                        onClick={() =>
                          scrollerRef.current?.scrollBy({ left: 320, behavior: "smooth" })
                        }
                      >
                        →
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {tab === "club" && (
          <div
            id="all-leagues"
            className={`${styles.panel} ${panelOpen ? styles.panelOpen : ""}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="all-leagues-title"
          >
            <span className={styles.grab} aria-hidden="true" />
            <div className={styles.panelHeader}>
              <h2 id="all-leagues-title">
                Clubes<small>{taxonomy.clubs.length} ligas</small>
              </h2>
              <label className={styles.panelFilter}>
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
                <input
                  ref={filterRef}
                  type="search"
                  placeholder="Filtrar ligas"
                  aria-label="Filtrar ligas"
                  value={panelFilter}
                  onChange={(event) => setPanelFilter(event.target.value)}
                />
              </label>
              <button
                type="button"
                className={styles.panelClose}
                aria-label="Cerrar"
                onClick={() => closePanel(true)}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  aria-hidden="true"
                >
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>
            <div className={styles.panelBody}>
              {panelItems.length === 0 ? (
                <p className={styles.noResults}>
                  Ninguna liga coincide con «{panelFilter.trim()}».
                </p>
              ) : (
                LEAGUE_REGIONS.map((region) => {
                  const group = panelItems.filter((club) => club.region === region);
                  if (group.length === 0) return null;
                  return (
                    <div key={region}>
                      <h3 className={styles.groupTitle}>{region}</h3>
                      <div className={styles.tiles}>
                        {group.map((club) => (
                          <button
                            key={club.code}
                            type="button"
                            className={styles.tile}
                            aria-pressed={selected === club.code}
                            onClick={() => {
                              setPanelOpen(false);
                              onSelectItem(club.code);
                            }}
                          >
                            {club.image ? (
                              <img src={club.image} alt="" referrerPolicy="no-referrer" />
                            ) : (
                              <span className={styles.chipImagePlaceholder} />
                            )}
                            {club.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      <div
        className={`${styles.scrim} ${panelOpen && tab === "club" ? styles.scrimOn : ""}`}
        onClick={() => closePanel(false)}
        aria-hidden="true"
      />
    </>
  );
}
