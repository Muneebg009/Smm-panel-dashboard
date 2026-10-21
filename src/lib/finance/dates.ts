export const REPORTING_TIMEZONE = "Asia/Karachi";
const formatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: REPORTING_TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
export function dateKey(value: string | Date): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) throw Error("Invalid timestamp");
  const parts = formatter.formatToParts(date);
  return ["year", "month", "day"]
    .map((key) => parts.find((p) => p.type === key)!.value)
    .join("-");
}
export function validDate(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(Date.parse(value + "T00:00:00Z")) &&
    new Date(value + "T00:00:00Z").toISOString().slice(0, 10) === value
  );
}
export function shiftDate(value: string, days: number): string {
  if (!validDate(value)) throw Error("Invalid date");
  const date = new Date(value + "T00:00:00Z");
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
export function daysBetween(start: string, end: string): number {
  if (!validDate(start) || !validDate(end) || end < start)
    throw Error("Invalid date range");
  return (
    Math.round(
      (Date.parse(end + "T00:00:00Z") - Date.parse(start + "T00:00:00Z")) /
        86400000,
    ) + 1
  );
}
export function periods(today: string) {
  if (!validDate(today)) throw Error("Invalid date");
  const monthStart = today.slice(0, 7) + "-01";
  const lastMonthEnd = shiftDate(monthStart, -1);
  return {
    today: { start: today, end: today },
    yesterday: { start: shiftDate(today, -1), end: shiftDate(today, -1) },
    week: { start: shiftDate(today, -6), end: today },
    month: { start: monthStart, end: today },
    lastMonth: { start: lastMonthEnd.slice(0, 7) + "-01", end: lastMonthEnd },
  };
}
export function comparisonRange(
  start: string,
  end: string,
  unit: "daily" | "weekly" | "monthly",
) {
  if (unit === "daily")
    return { start: shiftDate(end, -1), end: shiftDate(end, -1) };
  if (unit === "weekly")
    return { start: shiftDate(end, -13), end: shiftDate(end, -7) };
  const first = end.slice(0, 7) + "-01";
  const last = shiftDate(first, -1);
  return { start: last.slice(0, 7) + "-01", end: last };
}
