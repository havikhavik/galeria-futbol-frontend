import type {
  AttributeFilterKey,
  AttributeFilters,
} from "./types";

export const PAGE_SIZE = 20;

export const TEAM_TYPE_LABELS: Record<string, string> = {
  CLUB: "Club",
  NATIONAL: "Selección",
  RETRO: "Retro",
};

export const ATTRIBUTE_LABELS: Record<AttributeFilterKey, string> = {
  kids: "Niños",
  women: "Mujer",
  goalkeeper: "Arquero",
  training: "Entrenamiento",
  classic: "Clásico",
  retro: "Retro",
};

export const DEFAULT_ATTRIBUTE_FILTERS: AttributeFilters = {
  kids: false,
  women: false,
  goalkeeper: false,
  training: false,
  classic: false,
  retro: false,
};
