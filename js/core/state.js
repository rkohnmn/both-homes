/** Plan shape, defaults, validation, and share projections. */

import {
  addMonths,
  endOfMonth,
  isISODate,
  parts,
  startOfMonth,
} from './dates.js';
import {
  CUSTOM_ID,
  PRESETS,
  cycleFromPreset,
  presetById,
  validateCycle,
} from './patterns.js';
import { clampSpan, makeId, validateRule } from './holidays.js';

export const STORAGE_VERSION = 1;
export const LIMITS = {
  planName: 60,
  parentName: 48,
  children: 80,
  place: 80,
  note: 160,
  holidays: 80,
  overrides: 750,
};

const OWNERS = ['a', 'b'];

export function cleanText(value, max) {
  return String(value ?? '')
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

export function cleanId(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '')
    .slice(0, 40);
}

export function clampInteger(value, min, max, fallback) {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

export function createDefaultPlan(today, weekStart = 'sun') {
  const date = isISODate(today) ? today : new Date().toISOString().slice(0, 10);
  return {
    version: STORAGE_VERSION,
    planName: 'Our parenting plan',
    parents: { a: { name: '' }, b: { name: '' } },
    children: '',
    pattern: { id: '223', cycle: cycleFromPreset('223') },
    startDate: date,
    weekStart: weekStart === 'mon' ? 'mon' : 'sun',
    handoff: { time: '18:00', place: '' },
    windowOffset: 0,
    holidays: [],
    overrides: {},
  };
}

export function parentName(plan, owner) {
  return plan.parents?.[owner]?.name?.trim() || `Parent ${owner.toUpperCase()}`;
}

export function parentNames(plan) {
  return { a: parentName(plan, 'a'), b: parentName(plan, 'b') };
}

function normalizeParents(raw) {
  const source = raw && typeof raw === 'object' ? raw : {};
  return {
    a: { name: cleanText(source.a?.name, LIMITS.parentName) },
    b: { name: cleanText(source.b?.name, LIMITS.parentName) },
  };
}

function normalizePattern(raw) {
  const source = raw && typeof raw === 'object' ? raw : {};
  const requestedId = cleanId(source.id);
  if (requestedId && requestedId !== CUSTOM_ID) {
    const preset = presetById(requestedId);
    if (preset) return { id: preset.id, cycle: [...preset.cycle] };
  }
  if (validateCycle(source.cycle)) {
    const preset = PRESETS.find(
      (p) => p.cycle.length === source.cycle.length && p.cycle.every((o, i) => o === source.cycle[i]),
    );
    return { id: preset ? preset.id : CUSTOM_ID, cycle: [...source.cycle] };
  }
  return { id: '223', cycle: cycleFromPreset('223') };
}

function normalizeHoliday(raw, usedIds) {
  if (!raw || typeof raw !== 'object') return null;
  const kind = ['day', 'range', 'dates'].includes(raw.kind) ? raw.kind : null;
  if (!kind) return null;

  const base = {
    id: cleanId(raw.id) || makeId('h'),
    name: cleanText(raw.name, 60),
    kind,
    assignment: ['alternate', 'a', 'b'].includes(raw.assignment) ? raw.assignment : 'alternate',
    alternateStart: raw.alternateStart === 'b' ? 'b' : 'a',
    split: ['whole', 'halves', 'weeks'].includes(raw.split) ? raw.split : 'whole',
    spanDays: 1,
  };
  if (usedIds.has(base.id)) base.id = makeId('h');

  if (kind === 'day') {
    base.dayRule = raw.dayRule === 'nth' ? 'nth' : 'fixed';
    base.month = clampInteger(raw.month, 1, 12, 1);
    base.day = clampInteger(raw.day, 1, 31, 1);
    base.weekday = clampInteger(raw.weekday, 0, 6, 1);
    base.nth = [1, 2, 3, 4, -1].includes(Number(raw.nth)) ? Number(raw.nth) : 1;
    base.spanDays = clampSpan(clampInteger(raw.spanDays, 1, 90, 1));
  } else if (kind === 'range') {
    base.fromMonth = clampInteger(raw.fromMonth, 1, 12, 6);
    base.fromDay = clampInteger(raw.fromDay, 1, 31, 1);
    base.toMonth = clampInteger(raw.toMonth, 1, 12, 8);
    base.toDay = clampInteger(raw.toDay, 1, 31, 1);
  } else {
    base.start = isISODate(raw.start) ? raw.start : '';
    base.end = isISODate(raw.end) ? raw.end : '';
  }

  const check = validateRule(base);
  if (!check.ok) return null;
  usedIds.add(base.id);
  return base;
}

function normalizeHolidays(raw) {
  if (!Array.isArray(raw)) return [];
  const usedIds = new Set();
  const out = [];
  for (const item of raw.slice(0, LIMITS.holidays)) {
    const rule = normalizeHoliday(item, usedIds);
    if (rule) out.push(rule);
  }
  return out;
}

function normalizeOverrides(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const entries = Object.entries(raw)
    .filter(([date, value]) => isISODate(date) && value && typeof value === 'object')
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .slice(0, LIMITS.overrides);
  const out = {};
  for (const [date, value] of entries) {
    const year = parts(date).year;
    if (year < 1900 || year > 2100) continue;
    if (!OWNERS.includes(value.owner)) continue;
    out[date] = { owner: value.owner, note: cleanText(value.note, LIMITS.note) };
  }
  return out;
}

/**
 * Validate and rebuild a plan from untrusted input (localStorage, a share
 * link, or an imported JSON file). Invalid fields fall back to safe defaults;
 * malformed holiday rules are dropped rather than breaking the calendar.
 */
export function normalizePlan(raw, { today } = {}) {
  if (!raw || typeof raw !== 'object') throw new Error('That plan file is not valid JSON.');
  const version = Number(raw.version);
  if (version !== STORAGE_VERSION) {
    throw new Error('This plan was made with a newer version of Both Homes.');
  }
  const fallbackToday = isISODate(today) ? today : new Date().toISOString().slice(0, 10);
  const time = typeof raw.handoff?.time === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(raw.handoff.time)
    ? raw.handoff.time
    : '18:00';

  return {
    version: STORAGE_VERSION,
    planName: cleanText(raw.planName, LIMITS.planName) || 'Our parenting plan',
    parents: normalizeParents(raw.parents),
    children: cleanText(raw.children, LIMITS.children),
    pattern: normalizePattern(raw.pattern),
    startDate: isISODate(raw.startDate) ? raw.startDate : fallbackToday,
    weekStart: raw.weekStart === 'mon' ? 'mon' : 'sun',
    handoff: {
      time,
      place: cleanText(raw.handoff?.place, LIMITS.place),
    },
    windowOffset: clampInteger(raw.windowOffset, -24, 24, 0),
    holidays: normalizeHolidays(raw.holidays),
    overrides: normalizeOverrides(raw.overrides),
  };
}

/** The 12-whole-month planning window used for totals, print and .ics. */
export function planWindow(plan) {
  const start = startOfMonth(addMonths(plan.startDate, (plan.windowOffset || 0) * 12));
  const end = endOfMonth(addMonths(start, 11));
  return { start, end };
}

/**
 * Remove personal details before putting a plan in a share link.
 * Dates, pattern and holiday rules remain so the schedule is intact.
 */
export function toShareablePlan(plan, { names = false, notes = false } = {}) {
  const copy = normalizePlan(plan);
  if (!names) {
    copy.parents = { a: { name: '' }, b: { name: '' } };
    copy.children = '';
    copy.planName = 'Shared parenting plan';
  }
  if (!notes) {
    for (const date of Object.keys(copy.overrides)) copy.overrides[date].note = '';
    copy.handoff.place = '';
  }
  return copy;
}

export function planSummary(plan) {
  const names = parentNames(plan);
  const nights = plan.pattern.cycle.filter((o) => o === 'a').length;
  const pct = Math.round((nights / plan.pattern.cycle.length) * 100);
  return {
    patternLength: plan.pattern.cycle.length,
    split: `${pct}/${100 - pct}`,
    parents: names,
    label: plan.planName,
  };
}
