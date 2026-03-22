const darkLogoCodes = new Set([
  "LIGUE_1",
  "PREMIER_LEAGUE",
  "SERIE_A",
  "LA_LIGA",
  "BUNDESLIGA",
]);

export function isDarkLogo(code: string): boolean {
  return darkLogoCodes.has(code);
}
