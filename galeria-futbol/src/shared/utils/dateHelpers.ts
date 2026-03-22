export function toDateInputValue(value?: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

export function toOffsetDateTime(value: string, isEnd = false): string {
  return `${value}T${isEnd ? "23:59:59" : "00:00:00"}Z`;
}

export function calculateDurationLabel(startDate: string, endDate: string): string {
  if (!startDate || !endDate) return "Duración Calculada: —";

  const start = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(`${endDate}T00:00:00Z`);
  if (
    Number.isNaN(start.getTime()) ||
    Number.isNaN(end.getTime()) ||
    end < start
  ) {
    return "Duración Calculada: —";
  }

  const diffMs = end.getTime() - start.getTime();
  const totalDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const months = Math.floor(totalDays / 30);
  const days = totalDays % 30;
  return `Duración Calculada: ${months} Meses, ${days} Días`;
}
