import { useEffect, useState } from "react";

import { httpClient } from "../../shared/api/httpClient";
import type { CategoryResponse } from "../../shared/types/categories";

import {
  type LeagueRegion,
  categoryDisplayName,
  categoryRegion,
  compareCategories,
} from "./catalogTaxonomy";

export type CatalogItem = {
  code: string;
  name: string;
  image: string | null;
  region: LeagueRegion;
};

export type CatalogTaxonomy = {
  nations: CatalogItem[];
  clubs: CatalogItem[];
  collections: CatalogItem[];
};

type FeaturedListItem = {
  slug: string;
  title: string;
  bannerImage?: string | null;
  priority?: number;
};

const EMPTY: CatalogTaxonomy = { nations: [], clubs: [], collections: [] };

const toItems = (categories: CategoryResponse[]): CatalogItem[] =>
  [...categories]
    .sort((a, b) => compareCategories(a.code, b.code))
    .map((c) => ({
      code: c.code,
      name: categoryDisplayName(c.code, c.name),
      image: c.thumbnail ?? null,
      region: categoryRegion(c.code),
    }));

const settle = <T,>(promise: Promise<T>, fallback: T) =>
  promise.catch(() => fallback);

let cached: Promise<CatalogTaxonomy> | null = null;

function loadTaxonomy(): Promise<CatalogTaxonomy> {
  cached ??= Promise.all([
    settle(httpClient.getJson<CategoryResponse[]>("categories?teamType=NATIONAL"), []),
    settle(httpClient.getJson<CategoryResponse[]>("categories?teamType=CLUB"), []),
    settle(httpClient.getJson<FeaturedListItem[]>("featured"), []),
  ]).then(([nations, clubs, featured]) => ({
    nations: toItems(nations),
    clubs: toItems(clubs),
    collections: [...featured]
      .sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0))
      .map((f) => ({
        code: f.slug,
        name: f.title,
        image: f.bannerImage || null,
        region: "Otras ligas" as const,
      })),
  }));
  return cached;
}

/** Leagues, confederations and featured collections, fetched once. */
export function useCatalogTaxonomy(): CatalogTaxonomy {
  const [taxonomy, setTaxonomy] = useState<CatalogTaxonomy>(EMPTY);

  useEffect(() => {
    let cancelled = false;
    void loadTaxonomy().then((data) => {
      if (!cancelled) setTaxonomy(data);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return taxonomy;
}
