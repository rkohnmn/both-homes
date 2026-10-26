/**
 * Holiday and school-break rules.
 *
 * Rules are evaluated in the order the user sees them: the first rule that
 * covers a date wins. Explicit day overrides (swaps, trips) beat every rule.
 */

import {
  addDays,
  diffDays,
  isoDate,
  isISODate,
  nthWeekdayOfMonth,
  parts,
  spanDays,
} from './dates.js';

export const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export function other(owner) {
  return owner === 'a' ? 'b' : 'a';
}

/** Which parent the rule assigns for a given occurrence year. */
export function ownerForYear(rule, year) {
  if (rule.assignment === 'a' || rule.assignment === 'b') return rule.assignment;
  const start = rule.alternateStart === 'b' ? 'b' : 'a';
  return year % 2 === 1 ? start : other(start);
}

/** True when the rule recurs every year (as opposed to fixed dates). */
export function isRecurring(rule) {
  return rule.kind === 'day' || rule.kind === 'range';
}

/** Anchor date for a one-day rule in a given year, or null if it cannot occur. */
export function dayRuleAnchor(rule, year) {
  if (rule.dayRule === 'nth') {
    return nthWeekdayOfMonth(year, rule.month, rule.weekday, rule.nth);
  }
  const day = Number(rule.day);
  const month = Number(rule.month);
  if (!Number.isInteger(month) || month < 1 || month > 12) return null;
  const test = isoDate(year, month, day);
  const p = parts(test);
  // Reject impossible dates such as 29 February in a non-leap year.
  if (!p || p.month !== month || p.day !== day) return null;
  return test;
}

export function clampSpan(value) {
  const n = Math.round(Number(value) || 1);
  return Math.max(1, Math.min(90, n));
}

/** Inclusive start/end of a one-day rule's occurrence for the given year. */
export function dayRuleRange(rule, year) {
  const anchor = dayRuleAnchor(rule, year);
  if (!anchor) return null;
  return { start: anchor, end: addDays(anchor, clampSpan(rule.spanDays) - 1), year };
}

/** Inclusive start/end of a range rule starting in the given year. */
export function rangeRuleRange(rule, year) {
  if (rule.kind === 'dates') {
    if (!isISODate(rule.start) || !isISODate(rule.end)) return null;
    if (diffDays(rule.start, rule.end) < 0) return null;
    return { start: rule.start, end: rule.end, year: parts(rule.start).year };
  }
  const fromMonth = Number(rule.fromMonth);
  const fromDay = Number(rule.fromDay);
  const toMonth = Number(rule.toMonth);
  const toDay = Number(rule.toDay);
  const start = isoDate(year, fromMonth, fromDay);
  const p1 = parts(start);
  if (!p1 || p1.month !== fromMonth || p1.day !== fromDay) return null;
  let endYear = year;
  if (toMonth < fromMonth || (toMonth === fromMonth && toDay < fromDay)) endYear = year + 1;
  const end = isoDate(endYear, toMonth, toDay);
  const p2 = parts(end);
  if (!p2 || p2.month !== toMonth || p2.day !== toDay) return null;
  return { start, end, year };
}

function splitOwner(rule, occurrence, isoDateValue) {
  const assigned = ownerForYear(rule, occurrence.year);
  const split = rule.kind === 'day' ? 'whole' : (rule.split || 'whole');
  if (split === 'halves') {
    const total = spanDays(occurrence.start, occurrence.end);
    const offset = diffDays(occurrence.start, isoDateValue);
    return offset < Math.ceil(total / 2) ? assigned : other(assigned);
  }
  if (split === 'weeks') {
    const offset = diffDays(occurrence.start, isoDateValue);
    return Math.floor(offset / 7) % 2 === 0 ? assigned : other(assigned);
  }
  return assigned;
}

/**
 * Resolve a rule against a date.
 * Returns { owner, rule, occurrence, part } or null.
 */
export function matchRule(rule, date) {
  if (!isISODate(date) || !rule) return null;
  const year = parts(date).year;

  if (rule.kind === 'day') {
    for (const candidate of [year, year - 1]) {
      const occurrence = dayRuleRange(rule, candidate);
      if (!occurrence) continue;
      if (date >= occurrence.start && date <= occurrence.end) {
        return { owner: splitOwner(rule, occurrence, date), occurrence, holiday: rule.name, part: 'whole' };
      }
    }
    return null;
  }

  if (rule.kind === 'dates') {
    const occurrence = rangeRuleRange(rule, year);
    if (!occurrence) return null;
    if (date >= occurrence.start && date <= occurrence.end) {
      const split = rule.split || 'whole';
      const owner = splitOwner(rule, occurrence, date);
      const part = split === 'whole' ? 'whole' : split;
      return { owner, occurrence, holiday: rule.name, part };
    }
    return null;
  }

  if (rule.kind === 'range') {
    for (const candidate of [year, year - 1]) {
      const occurrence = rangeRuleRange(rule, candidate);
      if (!occurrence) continue;
      if (date >= occurrence.start && date <= occurrence.end) {
        return {
          owner: splitOwner(rule, occurrence, date),
          occurrence,
          holiday: rule.name,
          part: rule.split || 'whole',
        };
      }
    }
  }
  return null;
}

/** First matching holiday rule for a date, respecting list order. */
export function resolveHoliday(holidays, date) {
  if (!Array.isArray(holidays)) return null;
  for (const rule of holidays) {
    const hit = matchRule(rule, date);
    if (hit) return hit;
  }
  return null;
}

/** All occurrences of a rule that overlap a date window, for summaries/print. */
export function occurrencesInRange(rule, start, end) {
  if (!isISODate(start) || !isISODate(end)) return [];
  const firstYear = parts(start).year - 1;
  const lastYear = parts(end).year + 1;
  const out = [];
  const push = (occurrence) => {
    if (!occurrence) return;
    if (occurrence.end < start || occurrence.start > end) return;
    const key = `${occurrence.start}|${rule.id}`;
    if (!out.some((o) => o.key === key)) out.push({ ...occurrence, key });
  };
  if (rule.kind === 'dates') {
    push(rangeRuleRange(rule, parts(rule.start).year));
  } else {
    for (let y = firstYear; y <= lastYear; y += 1) {
      push(rule.kind === 'day' ? dayRuleRange(rule, y) : rangeRuleRange(rule, y));
    }
  }
  return out.sort((x, y) => (x.start < y.start ? -1 : 1));
}

/** Lines such as "4th Thursday of November" or "24 Dec – 1 Jan". */
export function describeRule(rule, parentNames = { a: 'Parent A', b: 'Parent B' }) {
  const ordinal = { 1: '1st', 2: '2nd', 3: '3rd', 4: '4th', '-1': 'Last' };
  const when = (() => {
    if (rule.kind === 'dates') {
      return `${formatMDY(rule.start)} – ${formatMDY(rule.end)}`;
    }
    if (rule.kind === 'range') {
      return `${rule.fromDay} ${MONTH_NAMES[rule.fromMonth - 1].slice(0, 3)} – ${rule.toDay} ${MONTH_NAMES[rule.toMonth - 1].slice(0, 3)}`;
    }
    if (rule.dayRule === 'nth') {
      return `${ordinal[rule.nth] || ''} ${WEEKDAY_NAMES[rule.weekday]} of ${MONTH_NAMES[rule.month - 1]}`.trim();
    }
    return `${rule.day} ${MONTH_NAMES[rule.month - 1]}`;
  })();

  let assignmentText;
  if (rule.assignment === 'a' || rule.assignment === 'b') {
    assignmentText = `with ${parentNames[rule.assignment]}`;
  } else {
    const start = parentNames[rule.alternateStart === 'b' ? 'b' : 'a'];
    const even = parentNames[rule.alternateStart === 'b' ? 'a' : 'b'];
    assignmentText = `alternates: odd years ${start}, even years ${even}`;
  }

  const split = rule.kind !== 'day' && rule.split === 'halves'
    ? ', split in half'
    : rule.kind !== 'day' && rule.split === 'weeks'
      ? ', alternating weeks'
      : '';

  const span = rule.kind === 'day' && clampSpan(rule.spanDays) > 1
    ? ` (${clampSpan(rule.spanDays)} days)`
    : '';

  return `${when}${span} · ${assignmentText}${split}`;
}

function formatMDY(value) {
  if (!isISODate(value)) return '';
  const p = parts(value);
  return `${p.day} ${MONTH_NAMES[p.month - 1].slice(0, 3)} ${p.year}`;
}

/** Short label for a day cell or print key, e.g. "Christmas break". */
export function holidayLabel(hit) {
  return hit && hit.holiday ? hit.holiday : '';
}

/**
 * Validate a rule from user input. Returns { ok, errors } without throwing.
 */
export function validateRule(rule) {
  const errors = [];
  if (!rule || typeof rule !== 'object') return { ok: false, errors: ['Rule is missing.'] };
  const name = String(rule.name || '').trim();
  if (name.length < 1) errors.push('Give the holiday a name.');
  if (name.length > 60) errors.push('Keep the name under 60 characters.');

  if (!['day', 'range', 'dates'].includes(rule.kind)) errors.push('Choose a rule type.');

  if (rule.kind === 'day') {
    if (rule.dayRule === 'nth') {
      if (!Number.isInteger(rule.month) || rule.month < 1 || rule.month > 12) errors.push('Choose a month.');
      if (!Number.isInteger(rule.weekday) || rule.weekday < 0 || rule.weekday > 6) errors.push('Choose a weekday.');
      if (![1, 2, 3, 4, -1].includes(rule.nth)) errors.push('Choose which weekday of the month.');
    } else {
      if (!Number.isInteger(rule.month) || rule.month < 1 || rule.month > 12) errors.push('Choose a month.');
      if (!Number.isInteger(rule.day) || rule.day < 1 || rule.day > 31) errors.push('Enter a day of the month.');
      else if (rule.day > 29 && rule.month === 2) errors.push('February only has 29 days in a leap year.');
      else if (rule.day === 31 && [4, 6, 9, 11].includes(rule.month)) errors.push('That month has only 30 days.');
    }
    if (clampSpan(rule.spanDays) !== Math.round(Number(rule.spanDays) || 1)) {
      errors.push('Length must be between 1 and 90 days.');
    }
  }

  if (rule.kind === 'range') {
    const pFrom = parts(isoDate(2000, Number(rule.fromMonth), Number(rule.fromDay)));
    const pTo = parts(isoDate(2000, Number(rule.toMonth), Number(rule.toDay)));
    if (!pFrom || pFrom.month !== Number(rule.fromMonth) || pFrom.day !== Number(rule.fromDay)) {
      errors.push('Enter a valid start date for the yearly stretch.');
    }
    if (!pTo || pTo.month !== Number(rule.toMonth) || pTo.day !== Number(rule.toDay)) {
      errors.push('Enter a valid end date for the yearly stretch.');
    }
    if (pFrom && pTo && pFrom.month === pTo.month && pFrom.day === pTo.day) {
      errors.push('A stretch needs more than one day. Use a one-day rule instead.');
    }
    if (!['whole', 'halves', 'weeks'].includes(rule.split)) errors.push('Choose how to split the stretch.');
  }

  if (rule.kind === 'dates') {
    if (!isISODate(rule.start) || !isISODate(rule.end)) errors.push('Enter both dates.');
    else if (diffDays(rule.start, rule.end) < 0) errors.push('The end date must come after the start date.');
    else if (spanDays(rule.start, rule.end) > 366) errors.push('Keep a specific break under one year.');
    if (!['whole', 'halves', 'weeks'].includes(rule.split)) errors.push('Choose how to split these dates.');
  }

  if (!['alternate', 'a', 'b'].includes(rule.assignment)) errors.push('Choose which parent has this time.');
  if (rule.assignment === 'alternate' && !['a', 'b'].includes(rule.alternateStart)) {
    errors.push('Choose which parent starts in odd years.');
  }
  return { ok: errors.length === 0, errors };
}

/** Stable-ish unique id without external dependencies. */
export function makeId(prefix = 'h') {
  const random = Math.random().toString(36).slice(2, 8);
  return `${prefix}_${Date.now().toString(36)}${random}`;
}
