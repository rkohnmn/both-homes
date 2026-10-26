/**
 * Civil-date helpers.
 *
 * Everything here works on ISO calendar dates (YYYY-MM-DD) represented as an
 * integer "day number" (days since 1970-01-01, UTC). Using UTC arithmetic means
 * a schedule never shifts by an hour when daylight saving changes, and no part
 * of the app depends on the browser's timezone.
 */

const MS_PER_DAY = 86_400_000;

export function isLeapYear(year) {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

export function daysInMonth(year, month) {
  if (month === 2) return isLeapYear(year) ? 29 : 28;
  return [4, 6, 9, 11].includes(month) ? 30 : 31;
}

export function pad2(n) {
  return String(n).padStart(2, '0');
}

/** Build an ISO date from parts. Month is 1-12. */
export function isoDate(year, month, day) {
  return `${String(year).padStart(4, '0')}-${pad2(month)}-${pad2(day)}`;
}

/** Split an ISO date into numbers. Returns null when the input is not valid. */
export function parts(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [y, m, d] = value.split('-').map(Number);
  if (m < 1 || m > 12) return null;
  if (d < 1 || d > daysInMonth(y, m)) return null;
  return { year: y, month: m, day: d };
}

export function isISODate(value) {
  return parts(value) !== null;
}

export function toDayNumber(value) {
  const p = parts(value);
  if (!p) throw new RangeError(`Invalid ISO date: ${String(value)}`);
  return Date.UTC(p.year, p.month - 1, p.day) / MS_PER_DAY;
}

export function fromDayNumber(dayNumber) {
  const dt = new Date(dayNumber * MS_PER_DAY);
  return isoDate(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
}

export function addDays(value, amount) {
  return fromDayNumber(toDayNumber(value) + amount);
}

export function diffDays(start, end) {
  return toDayNumber(end) - toDayNumber(start);
}

/** Inclusive day count between two dates. */
export function spanDays(start, end) {
  return diffDays(start, end) + 1;
}

/** 0 = Sunday … 6 = Saturday */
export function weekdayOf(value) {
  const p = parts(value);
  if (!p) throw new RangeError(`Invalid ISO date: ${String(value)}`);
  return new Date(Date.UTC(p.year, p.month - 1, p.day)).getUTCDay();
}

export function startOfMonth(value) {
  const p = parts(value);
  return isoDate(p.year, p.month, 1);
}

export function endOfMonth(value) {
  const p = parts(value);
  return isoDate(p.year, p.month, daysInMonth(p.year, p.month));
}

/** Add whole months, clamping the day to the end of the target month. */
export function addMonths(value, amount) {
  const p = parts(value);
  const index = p.year * 12 + (p.month - 1) + amount;
  const year = Math.floor(index / 12);
  const month = (index % 12 + 12) % 12 + 1;
  const day = Math.min(p.day, daysInMonth(year, month));
  return isoDate(year, month, day);
}

export function startOfWeek(value, weekStart = 'sun') {
  const offset = weekStart === 'mon' ? 1 : 0;
  const shift = (weekdayOf(value) - offset + 7) % 7;
  return addDays(value, -shift);
}

export function startOfYear(value) {
  return isoDate(parts(value).year, 1, 1);
}

export function endOfYear(value) {
  return isoDate(parts(value).year, 12, 31);
}

/**
 * Six-week month grid (42 dates) covering the month, padded with adjacent days.
 */
export function monthGrid(year, month, weekStart = 'sun') {
  const first = isoDate(year, month, 1);
  const offset = weekStart === 'mon' ? 1 : 0;
  const lead = (weekdayOf(first) - offset + 7) % 7;
  const start = addDays(first, -lead);
  return Array.from({ length: 42 }, (_, i) => addDays(start, i));
}

/** Negative-safe modulo, used for cycle indexing. */
export function mod(n, m) {
  return ((n % m) + m) % m;
}

/** ISO date of the nth (1-4) or last (-1) weekday of a month. 0 = Sunday. */
export function nthWeekdayOfMonth(year, month, weekday, nth) {
  if (![1, 2, 3, 4, -1].includes(nth)) return null;
  if (weekday < 0 || weekday > 6) return null;
  if (nth === -1) {
    const last = daysInMonth(year, month);
    const lastWeekday = weekdayOf(isoDate(year, month, last));
    return isoDate(year, month, last - ((lastWeekday - weekday + 7) % 7));
  }
  const firstWeekday = weekdayOf(isoDate(year, month, 1));
  const day = 1 + ((weekday - firstWeekday + 7) % 7) + (nth - 1) * 7;
  if (day > daysInMonth(year, month)) return null;
  return isoDate(year, month, day);
}

/** Inclusive list of ISO dates between two dates. */
export function eachDay(start, end, limit = 20_000) {
  const count = spanDays(start, end);
  if (count < 0 || count > limit) return [];
  const first = toDayNumber(start);
  return Array.from({ length: count }, (_, i) => fromDayNumber(first + i));
}
