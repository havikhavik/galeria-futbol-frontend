import { FILTER_KEYS } from "../constants/albumFilters";
import type { AlbumTagKey } from "../types/albums";

export function readTagFilters<K extends string>(
  params: URLSearchParams,
  keys: readonly K[],
): Record<K, boolean> {
  return Object.fromEntries(keys.map((key) => [key, params.get(key) === "true"])) as Record<
    K,
    boolean
  >;
}

type BuildAlbumsApiPathOptions = {
  pageSize?: number;
  filterKeys?: readonly AlbumTagKey[];
};

export function buildAlbumsApiPath(
  params: URLSearchParams,
  page: number,
  { pageSize = 12, filterKeys = FILTER_KEYS }: BuildAlbumsApiPathOptions = {},
): string {
  const out = new URLSearchParams();

  const q = params.get("q");
  if (q) out.set("q", q);

  const categoryCode = params.get("categoryCode");
  if (categoryCode) out.set("categoryCode", categoryCode);

  const teamType = params.get("teamType");
  if (teamType) out.set("teamType", teamType);

  for (const key of filterKeys) {
    if (params.get(key) === "true") out.set(key, "true");
  }

  const seasonStart = params.get("seasonStart");
  if (seasonStart) out.set("seasonStart", seasonStart);

  out.set("page", String(page));
  out.set("size", String(pageSize));

  const sort = params.get("sort");
  if (sort) out.set("sort", sort);

  return `albums?${out.toString()}`;
}
