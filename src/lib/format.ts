/** Formats a NGN amount with comma separators and 2 decimals. */
export function formatNaira(value: number | null | undefined): string {
  const n = typeof value === "number" && Number.isFinite(value) ? value : 0;
  return `₦${n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Parses a timestamp coming from the backend. The .NET API serializes
 * `DateTime` values with `Kind = Unspecified` — i.e. an ISO string with
 * NO timezone suffix (`2026-05-04T16:30:00.123` instead of `…Z`). The
 * JS `Date` constructor treats those as the device's local time, so a
 * UTC value gets parsed as Nigeria time (UTC+1) and the relative-time
 * formatter shows "1h ago" the moment a notification arrives.
 *
 * Fix: if the string lacks a timezone marker, treat it as UTC by
 * appending `Z`. Anything already carrying `Z` or a `±HH:MM` offset is
 * trusted as-is.
 */
export function parseBackendDate(input: string | Date): Date {
  if (input instanceof Date) return input;
  if (typeof input !== "string" || !input) return new Date(NaN);
  const hasTimezone = /(?:Z|[+-]\d{2}:?\d{2})$/.test(input);
  return new Date(hasTimezone ? input : input + "Z");
}

/**
 * Human-readable relative time. "Just now", "5m ago", "2h ago", "Yesterday",
 * "Mon", "Mar 12". Designed for dense list rows — short and unambiguous.
 */
export function formatRelativeTime(input: string | Date): string {
  const date = parseBackendDate(input);
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "";

  const now = Date.now();
  const diffMs = now - date.getTime();
  const diffMin = Math.round(diffMs / 60_000);
  const diffH = Math.round(diffMs / 3_600_000);
  const diffDays = Math.round(diffMs / 86_400_000);

  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffH < 24) return `${diffH}h ago`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) {
    return date.toLocaleDateString(undefined, { weekday: "short" });
  }
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/** Returns "Good morning|afternoon|evening" for the device's local time. */
export function getGreeting(date: Date = new Date()): string {
  const h = date.getHours();
  if (h < 5) return "Good evening";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

/**
 * Computes percentage change between current and previous values, returning
 * structured info we render as a chip (▲ +12.5%).
 */
export function computeTrend(
  current: number,
  previous: number
): { percent: number; direction: "up" | "down" | "flat" } {
  if (!Number.isFinite(current) || !Number.isFinite(previous)) {
    return { percent: 0, direction: "flat" };
  }
  if (previous === 0) {
    return current > 0
      ? { percent: 100, direction: "up" }
      : { percent: 0, direction: "flat" };
  }
  const pct = ((current - previous) / Math.abs(previous)) * 100;
  if (Math.abs(pct) < 0.05) return { percent: 0, direction: "flat" };
  return {
    percent: Math.abs(pct),
    direction: pct > 0 ? "up" : "down",
  };
}
