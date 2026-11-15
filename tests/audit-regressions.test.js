import test from 'node:test';
import assert from 'node:assert/strict';

import { addDays, fromDayNumber, toDayNumber, weekdayOf } from '../js/core/dates.js';
import { buildPlanCalendar } from '../js/core/ics.js';
import { buildSchedule } from '../js/core/schedule.js';
import { buildShareUrl, planFromHash } from '../js/core/share.js';
import { createDefaultPlan, normalizePlan } from '../js/core/state.js';

test('handoff reminders crossing midnight end on the next civil date', () => {
  const plan = createDefaultPlan('2026-11-02');
  plan.handoff.time = '23:50';
  const days = buildSchedule(plan, '2026-11-02', '2026-11-07');
  const result = buildPlanCalendar({ plan, days, includeHandoffs: true });
  const handoff = result.ics.split('BEGIN:VEVENT').find((event) => event.includes('SUMMARY:Handoff'));
  assert.ok(handoff, 'expected a handoff event');
  assert.match(handoff, /DTSTART:20261104T235000/);
  assert.match(handoff, /DTEND:20261105T001000/);
});

test('year 0099 stays in year 0099 in all civil-date helpers', () => {
  assert.equal(fromDayNumber(toDayNumber('0099-03-01')), '0099-03-01');
  assert.equal(addDays('0099-03-01', 1), '0099-03-02');
  const expected = new Date(0);
  expected.setUTCFullYear(99, 2, 1);
  expected.setUTCHours(0, 0, 0, 0);
  assert.equal(weekdayOf('0099-03-01'), expected.getUTCDay());
});

test('share link creation rejects plans the receiving parser cannot open', () => {
  const plan = createDefaultPlan('2026-01-01');
  let date = '2026-01-01';
  const overrides = {};
  for (let i = 0; i < 750; i += 1) {
    overrides[date] = { owner: 'a', note: 'X'.repeat(160) };
    date = addDays(date, 1);
  }
  const holidays = Array.from({ length: 80 }, (_, i) => ({
    id: `h${i}`,
    name: 'H'.repeat(60),
    kind: 'day',
    assignment: 'alternate',
    alternateStart: 'a',
    split: 'whole',
    spanDays: 90,
    dayRule: 'fixed',
    month: 11,
    day: 1,
  }));
  const normalized = normalizePlan({ ...plan, overrides, holidays }, { today: '2026-01-01' });
  assert.equal(Object.keys(normalized.overrides).length, 750);
  assert.equal(normalized.holidays.length, 80);
  assert.throws(
    () => buildShareUrl(normalized, { names: true, notes: true }, 'https://example.test/both-homes/'),
    /too large/i,
  );
});

test('ordinary share links still round-trip', () => {
  const plan = createDefaultPlan('2026-11-02');
  const url = buildShareUrl(plan, {}, 'https://example.test/both-homes/');
  const restored = planFromHash(new URL(url).hash, { today: '2026-11-02' });
  assert.equal(restored.startDate, plan.startDate);
});
