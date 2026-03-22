import type { TeamType } from "./common";

export type AlbumTagKey =
  | "kids"
  | "women"
  | "goalkeeper"
  | "training"
  | "classic"
  | "retro";

export type AlbumFlags = Record<AlbumTagKey, boolean>;

export type AlbumResponse = {
  id: number;
  title: string;
  seasonLabel: string | null;
  seasonStart: number;
  teamType: TeamType;
  categoryCode: string;
  categoryName: string;
  thumbnail: string | null;
  description: string | null;
  kids: boolean;
  women: boolean;
  goalkeeper: boolean;
  training: boolean;
  classic: boolean;
  retro: boolean;
};

export type ImageResponse = {
  id: number;
  url: string;
  position: number;
  primary: boolean;
};

export type AdminAlbumApi = {
  id: number;
  title: string;
  seasonLabel?: string | null;
  seasonStart?: number | null;
  teamType?: TeamType | null;
  status?: "DRAFT" | "PUBLISHED" | null;
  categoryCode?: string | null;
  categoryName?: string | null;
  thumbnail?: string | null;
  description?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  imageCount?: number;
  kids: boolean;
  women: boolean;
  goalkeeper: boolean;
  training: boolean;
  classic: boolean;
  retro: boolean;
};
