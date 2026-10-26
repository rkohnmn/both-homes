/** Turns a plan into one resolved owner for every date in a range. */

import { addDays, eachDay, mod, toDayNumber, weekdayOf } from './dates.js';
import { resolveHoliday } from './holidays.js';

/**
 * Resolve a single date using the same priority order as the whole calendar:
 * an explicit swap beats a holiday rule, which beats the base rotation.
 */
export function resolveDay(plan, date) {
  const cycle = plan.pattern.cycle;
  const offset = toDayNumber(date) - toDayNumber(plan.startDate);
  const baseOwner = cycle[mod(offset, cycle.length)];
  const holiday = resolveHoliday(plan.holidays, date);
  const override = plan.overrides[date];
  const owner = override?.owner || holiday?.owner || baseOwner;
  return {
    date,
    owner,
    baseOwner,
    source: override ? 'override' : holiday ? 'holiday' : 'pattern',
    holiday: holiday?.holiday || '',
    holidayPart: holiday?.part || '',
    note: override?.note || '',
  };
}

export function buildSchedule(plan, start, end) {
  return eachDay(start, end).map((date) => resolveDay(plan, date));
}

/** True when this date deviates from the base rotation. */
export function isChanged(day) {
  return day.owner !== day.baseOwner;
}

export function isWeekendNight(date) {
  const wd = weekdayOf(date);
  return wd === 5 || wd === 6; // Friday and Saturday nights
}

/** Contiguous blocks of days owned by the same parent. */
export function groupBlocks(days, owner = null) {
  const blocks = [];
  for (const day of days) {
    const last = blocks[blocks.length - 1];
    const isNextDay = last && last.end !== day.date && addDays(last.end, 1) === day.date;
    if (last && last.owner === day.owner && isNextDay) {
      last.end = day.date;
      last.nights += 1;
      last.days.push(day);
    } else {
      blocks.push({ owner: day.owner, start: day.date, end: day.date, nights: 1, days: [day] });
    }
  }
  return owner ? blocks.filter((block) => block.owner === owner) : blocks;
}

/** Notes and holiday names inside a block, de-duplicated and capped. */
export function blockDetails(block) {
  const holidays = [];
  const notes = [];
  for (const day of block.days) {
    if (day.holiday && !holidays.includes(day.holiday)) holidays.push(day.holiday);
    if (day.note && !notes.includes(day.note)) notes.push(day.note);
  }
  return { holidays, notes };
}

export function summarize(days) {
  const total = days.length;
  const byParent = {
    a: { owner: 'a', nights: 0, weekendNights: 0, holidayNights: 0, percent: 0, longest: 0, longestRange: null },
    b: { owner: 'b', nights: 0, weekendNights: 0, holidayNights: 0, percent: 0, longest: 0, longestRange: null },
  };
  let transitions = 0;
  let runOwner = null;
  let runStart = null;
  let runNights = 0;

  days.forEach((day, index) => {
    const stats = byParent[day.owner];
    stats.nights += 1;
    if (isWeekendNight(day.date)) stats.weekendNights += 1;
    if (day.source === 'holiday') stats.holidayNights += 1;
    if (index > 0 && day.owner !== days[index - 1].owner) transitions += 1;
    if (day.owner !== runOwner) {
      runOwner = day.owner;
      runStart = day.date;
      runNights = 0;
    }
    runNights += 1;
    if (runNights > stats.longest) {
      stats.longest = runNights;
      stats.longestRange = { start: runStart, end: day.date };
    }
  });

  if (total > 0) {
    byParent.a.percent = (byParent.a.nights / total) * 100;
    byParent.b.percent = (byParent.b.nights / total) * 100;
  }

  return {
    total,
    byParent,
    transitions,
    changedDays: days.filter(isChanged).length,
    holidayDays: days.filter((d) => d.source === 'holiday').length,
    start: days[0]?.date || '',
    end: days[days.length - 1]?.date || '',
  };
}

/**
 * Merge the day-level override map into human-friendly ranges for the UI.
 * Consecutive dates with the same owner and note become one row.
 */
export function groupOverrides(overrides) {
  const dates = Object.keys(overrides).sort();
  const groups = [];
  for (const date of dates) {
    const entry = overrides[date];
    const last = groups[groups.length - 1];
    const previousDay = last ? new Date(`${last.end}T00:00:00Z`) : null;
    if (previousDay) previousDay.setUTCDate(previousDay.getUTCDate() + 1);
    const previousISO = previousDay ? previousDay.toISOString().slice(0, 10) : '';
    if (last && previousISO === date && last.owner === entry.owner && last.note === (entry.note || '')) {
      last.end = date;
      last.nights += 1;
    } else {
      groups.push({ start: date, end: date, owner: entry.owner, note: entry.note || '', nights: 1 });
    }
  }
  return groups;
}
