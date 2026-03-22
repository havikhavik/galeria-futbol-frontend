import type { PageResponse, TeamType } from "../../../shared/types/common";

export type { PageResponse };

export type TeamTypeFilter = "" | TeamType;

export type AlbumStatus = "DRAFT" | "PUBLISHED";

export type AttributeFilterKey =
  | "kids"
  | "women"
  | "goalkeeper"
  | "training"
  | "classic"
  | "retro";

export type AttributeKey = AttributeFilterKey;

export type AttributeFilters = Record<AttributeFilterKey, boolean>;

export interface AlbumRow {
  id: number;
  name: string;
  thumbnail?: string;
  fallbackThumbnail?: string;
  league: string;
  season: string;
  teamType: TeamType;
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
  teamType: TeamType;
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
  teamType: TeamType;
  kids: boolean;
  women: boolean;
  goalkeeper: boolean;
  training: boolean;
  classic: boolean;
  retro: boolean;
};

export type CategoryApi = {
  id: number;
  code: string;
  name: string;
  teamType: TeamType;
};

export type AdminAlbumDetailApi = {
  id: number;
  title: string;
  seasonLabel?: string | null;
  seasonStart?: number | null;
  teamType?: TeamType | null;
  status?: AlbumStatus | null;
  categoryCode?: string | null;
  categoryName?: string | null;
  thumbnail?: string | null;
  description?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  kids: boolean;
  women: boolean;
  goalkeeper: boolean;
  training: boolean;
  classic: boolean;
  retro: boolean;
};

export type ImageApi = {
  id: number;
  url: string;
  position?: number | null;
  primary: boolean;
};

export type UploadImageApi = {
  url?: string;
};

export type AlbumForm = {
  title: string;
  description: string;
  seasonLabel: string;
  teamType: TeamType;
  categoryCode: string;
  status: AlbumStatus;
  thumbnail: string;
  kids: boolean;
  women: boolean;
  goalkeeper: boolean;
  training: boolean;
  classic: boolean;
  retro: boolean;
};

export type AlbumFieldErrors = Partial<
  Record<"title" | "seasonLabel" | "categoryCode", string>
>;
