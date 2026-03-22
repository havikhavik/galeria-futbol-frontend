import { FILTER_KEYS, TAG_LABELS } from "../constants/albumFilters";
import type { AlbumTagKey } from "../types/albums";

export function albumTags(album: Record<AlbumTagKey, boolean>): string[] {
  return FILTER_KEYS.filter((key) => album[key]).map((key) => TAG_LABELS[key]);
}
