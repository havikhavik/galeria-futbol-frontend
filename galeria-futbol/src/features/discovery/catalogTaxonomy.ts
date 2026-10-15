import { formatCode } from "../../shared/utils/formatters";

export const LEAGUE_REGIONS = [
  "Sudamérica",
  "Norteamérica",
  "Europa",
  "Asia y África",
  "Otras ligas",
] as const;

export type LeagueRegion = (typeof LEAGUE_REGIONS)[number];

type KnownCategory = { name: string; region?: LeagueRegion };

// The API has no region nor display name for leagues: this table supplies
// both, and its order is the order of the category bar. Codes missing here
// fall back to the API name and the "Otras ligas" group.
const KNOWN_CATEGORIES: Record<string, KnownCategory> = {
  ARGENTINA_PRIMERA_DIV: { name: "Argentina Primera División", region: "Sudamérica" },
  BRASILEIRAO_SERIE_A: { name: "Brasileirão Serie A", region: "Sudamérica" },
  CHILE_PRIMERA_DIV: { name: "Chile Primera División", region: "Sudamérica" },
  LIGA_MX: { name: "Liga MX", region: "Norteamérica" },
  MLS: { name: "MLS", region: "Norteamérica" },
  PREMIER_LEAGUE: { name: "Premier League", region: "Europa" },
  LA_LIGA: { name: "LaLiga", region: "Europa" },
  SERIE_A: { name: "Serie A", region: "Europa" },
  BUNDESLIGA: { name: "Bundesliga", region: "Europa" },
  LIGUE_1: { name: "Ligue 1", region: "Europa" },
  PRIMEIRA_LIGA: { name: "Primeira Liga", region: "Europa" },
  EREDIVISIE: { name: "Eredivisie", region: "Europa" },
  EFL_CHAMPIONSHIP: { name: "EFL Championship", region: "Europa" },
  EFL_LEAGUE_ONE: { name: "EFL League One", region: "Europa" },
  EFL_LEAGUE_TWO: { name: "EFL League Two", region: "Europa" },
  BUNDESLIGA_2: { name: "2. Bundesliga", region: "Europa" },
  SEGUNDA_DIVISION: { name: "Segunda División", region: "Europa" },
  PRIMERA_FEDERACION: { name: "Primera Federación", region: "Europa" },
  SERIE_B: { name: "Serie B", region: "Europa" },
  LIGUE_2: { name: "Ligue 2", region: "Europa" },
  SCOTTISH_PREMIERSHIP: { name: "Scottish Premiership", region: "Europa" },
  TURKEY_SUPER_LIG: { name: "Süper Lig", region: "Europa" },
  GREECE_SUPER_LEAGUE: { name: "Greece Super League", region: "Europa" },
  UKRAINIAN_PREMIER_LEAGUE: { name: "Ukrainian Premier League", region: "Europa" },
  ISRAEL_PREMIER_LEAGUE: { name: "Israel Premier League", region: "Europa" },
  SAUDI_PRO_LEAGUE: { name: "Saudi Pro League", region: "Asia y África" },
  EGYPT_PREMIER_LEAGUE: { name: "Egypt Premier League", region: "Asia y África" },
  AFC: { name: "AFC" },
  CAF: { name: "CAF" },
  CONCACAF: { name: "Concacaf" },
  CONMEBOL: { name: "Conmebol" },
  OFC: { name: "OFC" },
  UEFA: { name: "UEFA" },
};

const KNOWN_ORDER = Object.keys(KNOWN_CATEGORIES);

export function categoryDisplayName(code: string, apiName?: string): string {
  return KNOWN_CATEGORIES[code]?.name ?? formatCode(apiName || code);
}

export function categoryRegion(code: string): LeagueRegion {
  return KNOWN_CATEGORIES[code]?.region ?? "Otras ligas";
}

/** Sorts by the table order; unknown codes go last, alphabetically. */
export function compareCategories(a: string, b: string): number {
  const ia = KNOWN_ORDER.indexOf(a);
  const ib = KNOWN_ORDER.indexOf(b);
  if (ia === -1 && ib === -1) return a.localeCompare(b);
  if (ia === -1) return 1;
  if (ib === -1) return -1;
  return ia - ib;
}
