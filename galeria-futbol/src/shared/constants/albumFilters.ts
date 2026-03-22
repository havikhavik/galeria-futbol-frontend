import type { AlbumTagKey } from "../types/albums";

export const TAG_LABELS: Record<AlbumTagKey, string> = {
  kids: "Niños",
  women: "Mujeres",
  goalkeeper: "Arquero",
  training: "Entrenamiento",
  classic: "Clásica",
  retro: "Retro",
};

export const FILTER_KEYS = Object.keys(TAG_LABELS) as AlbumTagKey[];
