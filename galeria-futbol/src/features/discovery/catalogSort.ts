import { RELEVANCE_SORT } from "../../shared/utils/queryHelpers";

export type GalleryMode = "home" | "search";

/** Latest uploads first: what "Recién llegadas" shows on the home page. */
export const NEWEST_UPLOADS_SORT = "createdAt,desc";

export function defaultSortFor(mode: GalleryMode): string {
  return mode === "home" ? NEWEST_UPLOADS_SORT : RELEVANCE_SORT;
}

// On the home page "Más recientes" means the latest uploads; in searches it
// keeps sorting by season, as before.
export function sortOptions(mode: GalleryMode) {
  return [
    { value: RELEVANCE_SORT, label: "Relevancia" },
    { value: "title,asc", label: "Título A-Z" },
    { value: "title,desc", label: "Título Z-A" },
    {
      value: mode === "home" ? NEWEST_UPLOADS_SORT : "seasonStart,desc",
      label: "Más recientes",
    },
    { value: "seasonStart,asc", label: "Más antiguos" },
  ];
}
