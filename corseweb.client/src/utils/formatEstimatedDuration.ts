export type DurationLocale = "pt-BR" | "en" | "es";

const durationUnits: Record<DurationLocale, { hour: string; hours: string; minute: string; minutes: string }> = {
  "pt-BR": { hour: "h", hours: "h", minute: "min", minutes: "min" },
  en: { hour: "hr", hours: "hrs", minute: "min", minutes: "min" },
  es: { hour: "h", hours: "h", minute: "min", minutes: "min" },
};

/**
 * Formats a course's estimated duration without rounding short courses up to an hour.
 * Examples: 6 -> "6 min", 60 -> "1 h", 75 -> "1 h 15 min".
 */
export function formatEstimatedDuration(totalMinutes: number, locale: DurationLocale = "pt-BR"): string {
  const total = Number.isFinite(totalMinutes) ? Math.max(0, Math.round(totalMinutes)) : 0;
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  const units = durationUnits[locale] ?? durationUnits["pt-BR"];
  const parts: string[] = [];

  if (hours > 0) {
    parts.push(`${hours} ${hours === 1 ? units.hour : units.hours}`);
  }
  if (minutes > 0 || hours === 0) {
    parts.push(`${minutes} ${minutes === 1 ? units.minute : units.minutes}`);
  }

  return parts.join(" ");
}
