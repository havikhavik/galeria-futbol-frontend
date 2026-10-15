import { useCallback, useMemo, useRef, useState } from "react";

import { FILTER_KEYS, TAG_LABELS } from "../../../shared/constants/albumFilters";
import { updateUrlSearchParams } from "../../../shared/hooks/useUrlSearchParams";
import type { AlbumTagKey } from "../../../shared/types/albums";
import { readTagFilters } from "../../../shared/utils/queryHelpers";
import { type GalleryMode, defaultSortFor, sortOptions } from "../catalogSort";
import { scrollToGallery } from "../galleryScroll";

import { AnchoredPopover } from "./AnchoredPopover";
import styles from "./CatalogTools.module.css";

type CatalogToolsProps = {
  mode: GalleryMode;
  params: URLSearchParams;
};

type OpenMenu = "filters" | "sort" | null;

// Tag filters and sort don't apply to collections: using them leaves the
// collection and goes back to the whole catalog.
const leaveCollections = (p: URLSearchParams) => {
  p.delete("featured");
  p.delete("tab");
};

export function CatalogTools({ mode, params }: CatalogToolsProps) {
  const [open, setOpen] = useState<OpenMenu>(null);
  const filtersButtonRef = useRef<HTMLButtonElement | null>(null);
  const sortButtonRef = useRef<HTMLButtonElement | null>(null);

  const urlFilters = useMemo(
    () => readTagFilters<AlbumTagKey>(params, FILTER_KEYS),
    [params],
  );
  const [pending, setPending] = useState(urlFilters);
  const activeCount = FILTER_KEYS.filter((k) => urlFilters[k]).length;

  const defaultSort = defaultSortFor(mode, params.get("q") || "");
  const options = sortOptions(mode);
  const sortBy = params.get("sort") || defaultSort;
  const sortLabel =
    options.find((option) => option.value === sortBy)?.label || "Relevancia";

  const close = useCallback(
    (returnFocus: boolean) => {
      const button =
        open === "filters" ? filtersButtonRef.current : sortButtonRef.current;
      setOpen(null);
      if (returnFocus) button?.focus({ preventScroll: true });
    },
    [open],
  );

  const toggleMenu = (menu: Exclude<OpenMenu, null>) => {
    if (open === menu) {
      setOpen(null);
      return;
    }
    if (menu === "filters") setPending(urlFilters);
    // Opened from the hero, the dropdown would hang off the bottom of the
    // screen: bring the gallery up first so the bar pins at the top. The
    // dropdown follows its button while the page scrolls.
    scrollToGallery();
    setOpen(menu);
  };

  const applyFilters = () => {
    updateUrlSearchParams((p) => {
      leaveCollections(p);
      for (const k of FILTER_KEYS) {
        if (pending[k]) p.set(k, "true");
        else p.delete(k);
      }
      p.delete("page");
    });
    close(true);
    scrollToGallery();
  };

  const changeSort = (value: string) => {
    close(true);
    updateUrlSearchParams((p) => {
      leaveCollections(p);
      if (value === defaultSort) p.delete("sort");
      else p.set("sort", value);
      p.delete("page");
    });
    scrollToGallery();
  };

  return (
    <div className={styles.tools}>
      <button
        ref={filtersButtonRef}
        type="button"
        className={styles.tool}
        aria-expanded={open === "filters"}
        aria-controls="catalog-filters"
        aria-haspopup="dialog"
        aria-label={activeCount ? `Filtros, ${activeCount} activos` : "Filtros"}
        onClick={() => toggleMenu("filters")}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M3.5 5h17l-6.5 7.6V19l-4 1.8v-8.2Z" />
        </svg>
        <span className={styles.label}>Filtros</span>
        {activeCount > 0 && <b className={styles.count}>{activeCount}</b>}
      </button>

      <button
        ref={sortButtonRef}
        type="button"
        className={styles.tool}
        aria-expanded={open === "sort"}
        aria-controls="catalog-sort"
        aria-haspopup="listbox"
        aria-label={`Ordenar: ${sortLabel}`}
        onClick={() => toggleMenu("sort")}
      >
        <svg
          className={styles.sortIcon}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M7 4v16M3.5 7.5 7 4l3.5 3.5M17 20V4M13.5 16.5 17 20l3.5-3.5" />
        </svg>
        <span className={styles.label}>Ordenar:</span>
        <b className={styles.sortValue}>{sortLabel}</b>
        <svg
          className={styles.chevron}
          viewBox="0 0 12 12"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M3 4.5 6 7.5 9 4.5" />
        </svg>
      </button>

      <AnchoredPopover
        id="catalog-filters"
        open={open === "filters"}
        anchorRef={filtersButtonRef}
        onClose={close}
        labelledBy="catalog-filters-title"
      >
        <div className={styles.header}>
          <b id="catalog-filters-title">Filtrar por</b>
          <button
            type="button"
            className={styles.link}
            onClick={() =>
              setPending(
                Object.fromEntries(FILTER_KEYS.map((k) => [k, false])) as Record<
                  AlbumTagKey,
                  boolean
                >,
              )
            }
          >
            Limpiar
          </button>
        </div>
        <div className={styles.body}>
          {FILTER_KEYS.map((k) => (
            <label key={k} className={styles.option}>
              <input
                type="checkbox"
                checked={pending[k]}
                onChange={() =>
                  setPending((prev) => ({ ...prev, [k]: !prev[k] }))
                }
              />
              {TAG_LABELS[k]}
            </label>
          ))}
        </div>
        <div className={styles.footer}>
          <button type="button" className={styles.primary} onClick={applyFilters}>
            Aplicar filtros
          </button>
        </div>
      </AnchoredPopover>

      <AnchoredPopover
        id="catalog-sort"
        open={open === "sort"}
        anchorRef={sortButtonRef}
        onClose={close}
        narrow
        role="group"
        labelledBy="catalog-sort-title"
      >
        <div className={styles.header}>
          <b id="catalog-sort-title">Ordenar por</b>
        </div>
        <div
          className={`${styles.body} ${styles.sortBody}`}
          role="listbox"
          aria-labelledby="catalog-sort-title"
        >
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              role="option"
              aria-selected={option.value === sortBy}
              className={`${styles.option} ${styles.sortOption}`}
              onClick={() => changeSort(option.value)}
            >
              {option.label}
              <svg
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M3 8.5l3.2 3L13 4.5" />
              </svg>
            </button>
          ))}
        </div>
      </AnchoredPopover>
    </div>
  );
}
