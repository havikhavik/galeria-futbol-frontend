export interface AdminDashboardMetrics {
  totalAlbums: number;
  totalSelections: number;
  totalClubs: number;
  totalImages: number | null;
}

export type OverviewResponse = {
  totalAlbums: number;
  totalSelections: number;
  totalClubs: number;
  totalImages: number;
};

export type PageResponse<T> = {
  content: T[];
  totalElements: number;
  totalPages: number;
};

export type AlbumLite = { id: number };
export type ImagesCountResponse = { totalImages: number };
