export function formatCode(code: string): string {
  return code
    .toLowerCase()
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(" ");
}

export function toTitleCase(value: string): string {
  return value
    .toLowerCase()
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(" ");
}

export function getLeagueInitials(value: string): string {
  const tokens = value
    .split(/[_\s-]+/)
    .filter(Boolean)
    .slice(0, 2);

  if (tokens.length === 0) {
    return "LG";
  }

  return tokens.map((token) => token[0]?.toUpperCase() ?? "").join("");
}

export function normalizeSeasonLabel(
  seasonLabel?: string | null,
  seasonStart?: number | null,
): string {
  if (seasonLabel && seasonLabel.trim()) return seasonLabel.trim();
  if (typeof seasonStart === "number") {
    return `${seasonStart}-${seasonStart + 1}`;
  }
  return "";
}

export function formatDateTime(value?: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
