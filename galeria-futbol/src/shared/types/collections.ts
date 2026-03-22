import type { TeamType } from "./common";

export type FeaturedCollectionAdminApi = {
  id: number;
  slug: string;
  title: string;
  description?: string | null;
  startDate: string;
  endDate: string;
  active: boolean;
  priority: number;
  albumCount?: number;
  bannerImage: string;
};

export type FeaturedCollectionPatchRequest = {
  slug?: string;
  title?: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  priority?: number;
  bannerImage?: string;
  active?: boolean;
};

export type FeaturedCollectionCreateRequest = {
  slug: string;
  title: string;
  description: string | null;
  startDate: string;
  endDate: string;
  active: boolean;
  priority: number;
  bannerImage: string;
};

export type CollectionAlbumItem = {
  id: number;
  title: string;
  thumbnail?: string | null;
  teamType?: TeamType;
};

export type FeaturedCollectionWithAlbumsApi = {
  slug: string;
  title: string;
  description?: string | null;
  startDate: string;
  endDate: string;
  bannerImage: string;
  albums?: CollectionAlbumItem[];
};

export type CollectionForm = {
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  active: boolean;
  priority: string;
  bannerImage: string;
};

export type CollectionFieldErrors = Partial<
  Record<"title" | "startDate" | "endDate", string>
>;
