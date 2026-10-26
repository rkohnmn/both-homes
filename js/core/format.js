/** Locale-aware display formatting. All dates are civil dates (no timezone). */

import { addDays, parts } from './dates.js';

const DEFAULT_LOCALE = 'en-US';
const localeCache = new Map();

/**
 * Browsers can report POSIX-style tags such as "en-US@posix", and Intl throws
 * on those. Normalize once so one odd environment cannot blank the calendar.
 */
export function safeLocale(locale, fallback = DEFAULT_LOCALE) {
  const raw = String(locale || '').trim();
  if (localeCache.has(raw)) return localeCache.get(raw);

  let resolved = fallback;
  const candidate = raw.split('@')[0].replace(/_/g, '-');
  if (candidate) {
    try {
      resolved = Intl.DateTimeFormat.supportedLocalesOf([candidate])[0] || fallback;
    } catch {
      resolved = fallback;
    }
  }
  localeCache.set(raw, resolved);
  return resolved;
}

function localeOr(locale) {
  return safeLocale(locale);
}

function civilDate(iso) {
  const p = parts(iso);
  if (!p) return null;
  return new Date(Date.UTC(p.year, p.month - 1, p.day, 12));
}

export function formatMonthYear(iso, locale) {
  const date = civilDate(iso);
  if (!date) return '';
  return new Intl.DateTimeFormat(localeOr(locale), { month: 'long', year: 'numeric' }).format(date);
}

export function formatMonthShort(iso, locale) {
  const date = civilDate(iso);
  if (!date) return '';
  return new Intl.DateTimeFormat(localeOr(locale), { month: 'short' }).format(date);
}

export function formatDateLong(iso, locale) {
  const date = civilDate(iso);
  if (!date) return '';
  return new Intl.DateTimeFormat(localeOr(locale), {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

export function formatDateMedium(iso, locale) {
  const date = civilDate(iso);
  if (!date) return '';
  return new Intl.DateTimeFormat(localeOr(locale), {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

export function formatDateShort(iso, locale) {
  const date = civilDate(iso);
  if (!date) return '';
  return new Intl.DateTimeFormat(localeOr(locale), { month: 'short', day: 'numeric' }).format(date);
}

export function formatWeekday(iso, locale, style = 'long') {
  const date = civilDate(iso);
  if (!date) return '';
  return new Intl.DateTimeFormat(localeOr(locale), { weekday: style }).format(date);
}

export function formatTime(value, locale) {
  if (typeof value !== 'string' || !/^\d{2}:\d{2}$/.test(value)) return '';
  const [h, m] = value.split(':').map(Number);
  const date = new Date(Date.UTC(2000, 0, 1, h, m));
  return new Intl.DateTimeFormat(localeOr(locale), {
    hour: 'numeric',
    minute: m === 0 ? undefined : '2-digit',
  }).format(date);
}

/**
 * Compact, unambiguous range: "Nov 2–8, 2026", "Nov 28 – Dec 4, 2026",
 * or "Dec 28, 2026 – Jan 3, 2027".
 */
export function formatRange(start, end, locale) {
  if (!start) return '';
  if (!end || start === end) return formatDateMedium(start, locale);
  const a = parts(start);
  const b = parts(end);
  if (!a || !b) return '';
  const loc = localeOr(locale);
  const monthDay = (iso) => new Intl.DateTimeFormat(loc, { month: 'short', day: 'numeric' }).format(civilDate(iso));
  const monthDayYear = (iso) => new Intl.DateTimeFormat(loc, { month: 'short', day: 'numeric', year: 'numeric' }).format(civilDate(iso));
  if (a.year === b.year && a.month === b.month) {
    const tail = new Intl.DateTimeFormat(loc, { year: 'numeric' }).format(civilDate(end));
    return `${monthDay(start)}–${b.day}, ${tail}`;
  }
  if (a.year === b.year) return `${monthDay(start)} – ${monthDay(end)}, ${a.year}`;
  return `${monthDayYear(start)} – ${monthDayYear(end)}`;
}

/** Weekday header labels, ordered by the selected week start. */
export function weekdayLabels(weekStart = 'sun', locale, style = 'short') {
  const base = '2024-01-07'; // Sunday
  const startOffset = weekStart === 'mon' ? 1 : 0;
  return Array.from({ length: 7 }, (_, i) => formatWeekday(addDays(base, i + startOffset), locale, style));
}

/** Rough locale heuristic: Monday-first in most of Europe and in several Commonwealth locales. */
export function detectWeekStart(language = '') {
  const tag = String(language).toLowerCase().split('@')[0].replace(/_/g, '-');
  const mondayRegions = ['en-gb', 'en-au', 'en-nz', 'en-ie', 'en-za'];
  if (mondayRegions.some((region) => tag === region || tag.startsWith(`${region}-`))) return 'mon';
  const lang = tag.split('-')[0];
  const mondayLanguages = [
    'de', 'fr', 'es', 'it', 'nl', 'pt', 'pl', 'ru', 'sv', 'no', 'nb', 'nn', 'da', 'fi',
    'cs', 'sk', 'hu', 'ro', 'tr', 'el', 'uk', 'hr', 'sr', 'sl', 'bg', 'et', 'lv', 'lt', 'is',
  ];
  return mondayLanguages.includes(lang) ? 'mon' : 'sun';
}

export function formatNumber(value, locale, options = {}) {
  return new Intl.NumberFormat(localeOr(locale), options).format(value);
}

export function formatPercent(value, locale) {
  return new Intl.NumberFormat(localeOr(locale), {
    minimumFractionDigits: value % 1 === 0 ? 0 : 1,
    maximumFractionDigits: 1,
  }).format(value) + '%';
}

export function formatTimestamp(date, locale) {
  return new Intl.DateTimeFormat(localeOr(locale), {
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}
