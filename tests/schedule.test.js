import test from 'node:test';
import assert from 'node:assert/strict';

import { buildSchedule, groupBlocks, groupOverrides, isWeekendNight, resolveDay, summarize } from '../js/core/schedule.js';
import { createDefaultPlan, normalizePlan } from '../js/core/state.js';

function planFor(days = 14, extra = {}) {
  const base = createDefaultPlan('2026-10-26');
  return normalizePlan({
    ...base,
    startDate: '2026-10-26',
    pattern: { id: '223' },
    ...extra,
  }, { today: '2026-10-26' });
}

test('2-2-3 rotation assigns the expected owner to each day', () => {
  const plan = planFor();
  const schedule = buildSchedule(plan, '2026-10-26', '2026-11-09');
  const owners = schedule.map((d) => d.owner).join('');
  assert.equal(owners.slice(0, 14), 'aabbaaabbaabbb');
  assert.equal(owners.slice(14), 'a', 'cycle repeats at day 15');
  assert.equal(resolveDay(plan, '2026-10-28').owner, 'b');
  assert.equal(resolveDay(plan, '2026-10-28').source, 'pattern');
});

test('holiday rules beat the base rotation; explicit swaps beat both', () => {
  const plan = planFor(14, {
    holidays: [{
      id: 'h_xmas',
      name: 'Christmas',
      kind: 'day',
      dayRule: 'fixed',
      month: 12,
      day: 25,
      spanDays: 2,
      assignment: 'a',
      alternateStart: 'a',
      split: 'whole',
    }],
    overrides: {
      '2026-12-25': { owner: 'b', note: 'Flight home' },
    },
  });
  const christmas = resolveDay(plan, '2026-12-25');
  assert.equal(christmas.owner, 'b');
  assert.equal(christmas.source, 'override');
  assert.equal(christmas.note, 'Flight home');
  assert.equal(christmas.baseOwner, 'a');
  assert.equal(resolveDay(plan, '2026-12-26').owner, 'a');
  assert.equal(resolveDay(plan, '2026-12-26').source, 'holiday');
  assert.equal(resolveDay(plan, '2026-12-26').holiday, 'Christmas');
});

test('a swap with an empty note still wins', () => {
  const plan = planFor(14, { overrides: { '2026-10-26': { owner: 'b', note: '' } } });
  const day = resolveDay(plan, '2026-10-26');
  assert.equal(day.owner, 'b');
  assert.equal(day.source, 'override');
});

test('contiguous blocks group days for calendar export', () => {
  const plan = planFor();
  const schedule = buildSchedule(plan, '2026-10-26', '2026-11-08');
  const blocks = groupBlocks(schedule);
  assert.equal(blocks.length, 6);
  assert.deepEqual(
    blocks.map((b) => [b.owner, b.start, b.end, b.nights]),
    [
      ['a', '2026-10-26', '2026-10-27', 2],
      ['b', '2026-10-28', '2026-10-29', 2],
      ['a', '2026-10-30', '2026-11-01', 3],
      ['b', '2026-11-02', '2026-11-03', 2],
      ['a', '2026-11-04', '2026-11-05', 2],
      ['b', '2026-11-06', '2026-11-08', 3],
    ],
  );
  assert.equal(groupBlocks(schedule, 'a').length, 3);
  assert.equal(isWeekendNight('2026-10-30'), true, 'Friday night');
  assert.equal(isWeekendNight('2026-10-31'), true, 'Saturday night');
  assert.equal(isWeekendNight('2026-11-01'), false, 'Sunday night');
});

test('summaries report overnights, weekend nights and longest stretch', () => {
  const plan = planFor();
  const schedule = buildSchedule(plan, '2026-10-26', '2026-11-08');
  const summary = summarize(schedule);
  assert.equal(summary.total, 14);
  assert.equal(summary.byParent.a.nights, 7);
  assert.equal(summary.byParent.b.nights, 7);
  assert.equal(summary.byParent.a.percent, 50);
  assert.equal(summary.byParent.a.longest, 3);
  assert.equal(summary.byParent.b.longest, 3);
  assert.equal(summary.byParent.a.weekendNights, 2);
  assert.equal(summary.byParent.b.weekendNights, 2);
  assert.equal(summary.transitions, 5);
  assert.equal(summary.changedDays, 0);
  assert.equal(summary.start, '2026-10-26');
  assert.equal(summary.end, '2026-11-08');
});

test('holiday days are counted separately', () => {
  const plan = planFor(14, {
    holidays: [{
      id: 'h_thanks',
      name: 'Thanksgiving',
      kind: 'day',
      dayRule: 'nth',
      month: 11,
      weekday: 4,
      nth: 4,
      spanDays: 4,
      assignment: 'a',
      alternateStart: 'a',
      split: 'whole',
    }],
  });
  const summary = summarize(buildSchedule(plan, '2026-11-24', '2026-11-30'));
  assert.equal(summary.holidayDays, 4);
  assert.equal(summary.byParent.a.holidayNights, 4);
});

test('override ranges are merged into readable rows', () => {
  const overrides = {
    '2026-12-20': { owner: 'b', note: 'Cabin' },
    '2026-12-21': { owner: 'b', note: 'Cabin' },
    '2026-12-22': { owner: 'b', note: 'Cabin' },
    '2026-12-24': { owner: 'a', note: 'Cabin' },
    '2026-12-25': { owner: 'b', note: '' },
  };
  const rows = groupOverrides(overrides);
  assert.equal(rows.length, 3);
  assert.deepEqual(rows[0], { start: '2026-12-20', end: '2026-12-22', owner: 'b', note: 'Cabin', nights: 3 });
  assert.equal(rows[1].start, '2026-12-24');
  assert.equal(rows[2].note, '');
});

test('changing the week start or pattern start date shifts ownership', () => {
  const plan = planFor();
  const shifted = normalizePlan({ ...plan, startDate: '2026-10-27' }, { today: '2026-10-26' });
  assert.equal(resolveDay(plan, '2026-10-27').owner, 'a');
  assert.equal(resolveDay(shifted, '2026-10-27').owner, 'a');
  assert.equal(resolveDay(shifted, '2026-10-28').owner, 'a');
  assert.equal(resolveDay(shifted, '2026-10-29').owner, 'b');
});
