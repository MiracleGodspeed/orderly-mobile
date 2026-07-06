/**
 * Calendar-anchored date-range presets for the Home dashboard.
 *
 * The previous implementation sent a "last N days" integer to the backend
 * which then computed `UtcNow - N days` as the lower bound — a rolling
 * window that drifted with the current time of day. Vendors expect
 * "Today" to mean "since this midnight," not "the last 24 hours," so we
 * compute precise start/end timestamps in the user's local timezone here
 * and ship them as UTC ISO strings the backend honors verbatim.
 *
 * All ranges are inclusive: `from` is the start-of-day, `to` is the
 * end-of-day with millisecond precision, so a `>= from && <= to`
 * comparison on the backend captures the entire calendar period.
 */

export type RangeKey =
  | "today"
  | "yesterday"
  | "thisweek"
  | "thismonth"
  | "lastweek"
  | "lastmonth"
  | "lastyear"
  | "custom";

export interface DateRange {
  from: Date;
  to: Date;
}

const startOfDay = (d: Date): Date => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

const endOfDay = (d: Date): Date => {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
};

/** Returns today's full calendar day in the user's local timezone. */
export function todayRange(now: Date = new Date()): DateRange {
  return { from: startOfDay(now), to: endOfDay(now) };
}

/** Yesterday — full calendar day. */
export function yesterdayRange(now: Date = new Date()): DateRange {
  const d = new Date(now);
  d.setDate(d.getDate() - 1);
  return { from: startOfDay(d), to: endOfDay(d) };
}

/**
 * "This week" — Monday of the current ISO week → end of today. Uses
 * Monday as the week start to match `lastWeekRange` and the GrowthTrend
 * weekly tiles.
 */
export function thisWeekRange(now: Date = new Date()): DateRange {
  const day = now.getDay(); // 0 = Sun, 1 = Mon, ...
  const sinceMonday = (day + 6) % 7;
  const monday = new Date(now);
  monday.setDate(now.getDate() - sinceMonday);
  return { from: startOfDay(monday), to: endOfDay(now) };
}

/**
 * "Last week" — Monday → Sunday of the previous ISO week. Most vendors
 * read calendar weeks (not "the last 7 days") when comparing to a
 * previous period. We use Monday as the start to match the rest of
 * the app's weekly tiles in GrowthTrend.
 */
export function lastWeekRange(now: Date = new Date()): DateRange {
  const day = now.getDay(); // 0 = Sun, 1 = Mon, ...
  // Days since Monday of the *current* week (Mon = 0, Sun = 6).
  const sinceMonday = (day + 6) % 7;
  const lastMonday = new Date(now);
  lastMonday.setDate(now.getDate() - sinceMonday - 7);
  const lastSunday = new Date(lastMonday);
  lastSunday.setDate(lastMonday.getDate() + 6);
  return { from: startOfDay(lastMonday), to: endOfDay(lastSunday) };
}

/** "This month" — first of the current month through the end of today. */
export function thisMonthRange(now: Date = new Date()): DateRange {
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  return { from: startOfDay(firstOfMonth), to: endOfDay(now) };
}

/** "Last month" — full calendar month preceding the current one. */
export function lastMonthRange(now: Date = new Date()): DateRange {
  const firstOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastDayOfLastMonth = new Date(firstOfThisMonth);
  lastDayOfLastMonth.setDate(0); // step back one day → last day of prev month
  const firstDayOfLastMonth = new Date(
    lastDayOfLastMonth.getFullYear(),
    lastDayOfLastMonth.getMonth(),
    1
  );
  return {
    from: startOfDay(firstDayOfLastMonth),
    to: endOfDay(lastDayOfLastMonth),
  };
}

/** "Last year" — full calendar year preceding the current one. */
export function lastYearRange(now: Date = new Date()): DateRange {
  const lastYear = now.getFullYear() - 1;
  return {
    from: startOfDay(new Date(lastYear, 0, 1)),
    to: endOfDay(new Date(lastYear, 11, 31)),
  };
}

export function rangeForKey(
  key: Exclude<RangeKey, "custom">,
  now: Date = new Date()
): DateRange {
  switch (key) {
    case "today":
      return todayRange(now);
    case "yesterday":
      return yesterdayRange(now);
    case "thisweek":
      return thisWeekRange(now);
    case "thismonth":
      return thisMonthRange(now);
    case "lastweek":
      return lastWeekRange(now);
    case "lastmonth":
      return lastMonthRange(now);
    case "lastyear":
      return lastYearRange(now);
  }
}

export const RANGE_LABEL: Record<Exclude<RangeKey, "custom">, string> = {
  today: "Today",
  yesterday: "Yesterday",
  thisweek: "This week",
  thismonth: "This month",
  lastweek: "Last week",
  lastmonth: "Last month",
  lastyear: "Last year",
};
