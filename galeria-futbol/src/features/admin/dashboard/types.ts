import type { PageResponse } from "../../../shared/types/common";

export type { PageResponse };

export interface AdminDashboardMetrics {
  totalAlbums: number;
  totalSelections: number;
  totalClubs: number;
  totalCollections: number;
  totalImages: number | null;
}

export type OverviewResponse = {
  totalAlbums: number;
  totalSelections: number;
  totalClubs: number;
  totalCollections: number; // Updated to be required
  totalImages: number;
};

export type AlbumLite = { id: number };
export type ImagesCountResponse = { totalImages: number };
