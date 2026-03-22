import { httpClient } from "../../../shared/api/httpClient";
import type {
  AdminDashboardMetrics,
  AlbumLite,
  ImagesCountResponse,
  OverviewResponse,
  PageResponse,
} from "./types";

async function getAlbumsTotal(path: string, extraQuery = ""): Promise<number> {
  const query = extraQuery ? `&${extraQuery}` : "";
  const page = await httpClient.getJson<PageResponse<AlbumLite>>(
    `${path}?page=0&size=1${query}`,
  );
  return page.totalElements ?? 0;
}

async function loadMetricsFrom(path: string): Promise<AdminDashboardMetrics> {
  const [totalAlbums, totalClubs, totalSelections] = await Promise.all([
    getAlbumsTotal(path),
    getAlbumsTotal(path, "teamType=CLUB"),
    getAlbumsTotal(path, "teamType=NATIONAL"),
  ]);

  return {
    totalAlbums,
    totalClubs,
    totalSelections,
    totalCollections: 0,
    totalImages: null,
  };
}

async function getTotalCollectionsReal(): Promise<number | null> {
  try {
    const collections = await httpClient.getJson<Array<{ id: number }>>(
      "admin/featured-collections",
    );
    return collections?.length ?? 0;
  } catch {
    return null;
  }
}

async function getTotalImagesReal(): Promise<number | null> {
  try {
    const response = await httpClient.getJson<ImagesCountResponse>(
      "admin/stats/images/count",
    );
    return response.totalImages;
  } catch {
    return null;
  }
}

export async function loadAdminDashboardMetrics(): Promise<AdminDashboardMetrics> {
  try {
    const overview = await httpClient.getJson<OverviewResponse>(
      "admin/stats/overview",
    );

    return {
      totalAlbums: overview.totalAlbums ?? 0,
      totalSelections: overview.totalSelections ?? 0,
      totalClubs: overview.totalClubs ?? 0,
      totalCollections: overview.totalCollections ?? 0,
      totalImages: overview.totalImages ?? 0,
    };
  } catch {
    let metrics: AdminDashboardMetrics;
    try {
      metrics = await loadMetricsFrom("admin/albums");
    } catch {
      metrics = await loadMetricsFrom("albums");
    }

    const totalCollections = await getTotalCollectionsReal();
    const totalImages = await getTotalImagesReal();
    return {
      ...metrics,
      totalCollections: totalCollections ?? metrics.totalCollections,
      totalImages: totalImages ?? metrics.totalImages,
    };
  }
}
