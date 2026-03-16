import { httpClient } from "../../../shared/api/httpClient";
import type {
  AdminAlbumApi,
  AlbumRow,
  AttributeFilterKey,
  AttributeFilters,
  PageResponse,
  PublicAlbumApi,
  TeamTypeFilter,
} from "./types";
import { PAGE_SIZE } from "./constants";

const rawMediaBaseUrl = import.meta.env.VITE_MEDIA_BASE_URL as
  | string
  | undefined;
const mediaBaseUrl = (rawMediaBaseUrl ?? "https://media.galeriafutbol.com")
  .trim()
  .replace(/\/+$/, "");

export function normalizeImageUrl(url?: string): string | null {
  if (!url || !url.trim()) return null;
  const value = url.trim();
  if (value.startsWith("http://") || value.startsWith("https://")) return value;
  if (value.startsWith("//")) return `https:${value}`;
  if (value.startsWith("/")) return `${httpClient.baseUrl}${value}`;
  return `${mediaBaseUrl}/${value.replace(/^\/+/, "")}`;
}

export function mapAdminAlbumToRow(album: AdminAlbumApi): AlbumRow {
  return {
    id: album.id,
    name: album.title,
    thumbnail: normalizeImageUrl(album.thumbnail) ?? undefined,
    league: album.categoryName ?? "—",
    season: album.seasonLabel ?? "—",
    teamType: album.teamType,
    kids: album.kids,
    women: album.women,
    goalkeeper: album.goalkeeper,
    training: album.training,
    classic: album.classic,
    retro: album.retro,
    imageCount: album.imageCount ?? null,
  };
}

export async function fetchAdminAlbumsPageWithFallback(
  page: number,
  search: string,
  typeFilter: TeamTypeFilter,
  attributeFilters: AttributeFilters,
): Promise<PageResponse<AdminAlbumApi>> {
  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("size", String(PAGE_SIZE));

  const trimmedSearch = search.trim();
  if (trimmedSearch) {
    params.set("q", trimmedSearch);
  }

  if (typeFilter) {
    params.set("teamType", typeFilter);
  }

  (Object.keys(attributeFilters) as AttributeFilterKey[]).forEach((key) => {
    if (attributeFilters[key]) {
      params.set(key, "true");
    }
  });

  try {
    return await httpClient.getJson<PageResponse<AdminAlbumApi>>(
      `admin/albums?${params.toString()}`,
    );
  } catch {
    const publicPage = await httpClient.getJson<PageResponse<PublicAlbumApi>>(
      `albums?${params.toString()}`,
    );
    return {
      ...publicPage,
      content: (publicPage.content ?? []).map((album) => ({
        id: album.id,
        title: album.title,
        thumbnail: album.thumbnail,
        categoryName: album.categoryName,
        seasonLabel: album.seasonLabel,
        teamType: album.teamType,
        kids: album.kids,
        women: album.women,
        goalkeeper: album.goalkeeper,
        training: album.training,
        classic: album.classic,
        retro: album.retro,
      })),
    };
  }
}
