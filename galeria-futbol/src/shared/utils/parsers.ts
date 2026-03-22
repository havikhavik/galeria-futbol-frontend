import type { TeamType } from "../types/common";

export function parseSeasonStart(value: string): number | null {
  const match = /^(\d{4})-(\d{4})$/.exec(value.trim());
  if (!match) return null;
  const startYear = Number(match[1]);
  const endYear = Number(match[2]);
  return endYear === startYear + 1 ? startYear : null;
}

export function getTeamTypeFromQuery(
  search: string = window.location.search,
  fallback: TeamType = "NATIONAL",
): TeamType {
  const teamType = new URLSearchParams(search).get("teamType");
  return teamType === "CLUB" || teamType === "NATIONAL"
    ? teamType
    : fallback;
}

export function readSearchParams(
  search: string = window.location.search,
): URLSearchParams {
  return new URLSearchParams(search);
}
