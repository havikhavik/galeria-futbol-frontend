export type TeamTypeFilter = "" | "CLUB" | "NATIONAL";

export type AttributeFilterKey =
  | "kids"
  | "women"
  | "goalkeeper"
  | "training"
  | "classic"
  | "retro";

export type AttributeFilters = Record<AttributeFilterKey, boolean>;

export interface AlbumRow {
  id: number;
  name: string;
  thumbnail?: string;
  fallbackThumbnail?: string;
  league: string;
  season: string;
  teamType: "CLUB" | "NATIONAL";
  kids: boolean;
  women: boolean;
  goalkeeper: boolean;
  training: boolean;
  classic: boolean;
  retro: boolean;
  imageCount: number | null;
}

export type AdminAlbumApi = {
  id: number;
  title: string;
  thumbnail?: string;
  imageCount?: number;
  categoryName?: string;
  seasonLabel?: string;
  teamType: "CLUB" | "NATIONAL";
  kids: boolean;
  women: boolean;
  goalkeeper: boolean;
  training: boolean;
  classic: boolean;
  retro: boolean;
};

export type PublicAlbumApi = {
  id: number;
  title: string;
  thumbnail?: string;
  categoryName?: string;
  seasonLabel?: string;
  teamType: "CLUB" | "NATIONAL";
  kids: boolean;
  women: boolean;
  goalkeeper: boolean;
  training: boolean;
  classic: boolean;
  retro: boolean;
};

export type PageResponse<T> = {
  content: T[];
  totalPages: number;
  totalElements: number;
  number?: number;
};
