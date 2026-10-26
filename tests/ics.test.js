import test from 'node:test';
import assert from 'node:assert/strict';

import {
  addMinutes,
  buildCalendar,
  buildPlanCalendar,
  escapeICSText,
  foldLine,
  formatICSDateTime,
  utcStamp,
} from '../js/core/ics.js';
import { buildSchedule } from '../js/core/schedule.js';
import { createDefaultPlan, normalizePlan } from '../js/core/state.js';

const FIXED_NOW = new Date('2026-10-26T15:04:05Z');

function makePlan(extra = {}) {
  const base = createDefaultPlan('2026-10-26');
  return normalizePlan({
    ...base,
    planName: 'Our parenting plan',
    children: 'Ava, Noah',
    startDate: '2026-10-26',
    handoff: { time: '18:00', place: 'School gate' },
    ...extra,
  }, { today: '2026-10-26' });
}

function scheduleFor(plan, start = '2026-11-02', end = '2026-11-15') {
  return buildSchedule(plan, start, end);
}

function lineLengths(ics) {
  const encoder = new TextEncoder();
  return ics.split('\r\n').map((line) => encoder.encode(line).length);
}

test('text escaping follows RFC 5545', () => {
  assert.equal(escapeICSText('Ava, Noah; 2pm\\home'), 'Ava\\, Noah\\; 2pm\\\\home');
  assert.equal(escapeICSText('line one\nline two'), 'line one\\nline two');
  assert.equal(escapeICSText(''), '');
});

test('long lines fold under 75 octets without splitting characters', () => {
  const line = `SUMMARY:${'Café ☕ with Ava & Noah '.repeat(8)}`;
  const folded = foldLine(line);
  const encoder = new TextEncoder();
  for (const physical of folded.split('\r\n')) {
    assert.ok(encoder.encode(physical).length <= 75, `line too long: ${physical.length}`);
  }
  assert.ok(folded.includes('\r\n '), 'continuation line starts with a space');
  const unfolded = folded.replace(/\r\n /g, '');
  assert.equal(unfolded, line);
});

test('ICS dates and timestamps format correctly', () => {
  assert.equal(formatICSDateTime('2026-11-02', '18:00'), '20261102T180000');
  assert.equal(utcStamp(FIXED_NOW), '20261026T150405Z');
  assert.deepEqual(addMinutes('18:00', 20), { time: '18:20', dayOffset: 0 });
  assert.deepEqual(addMinutes('23:50', 20), { time: '00:10', dayOffset: 1 });
});

test('calendar uses CRLF and includes a valid VCALENDAR envelope', () => {
  const ics = buildCalendar({
    name: 'Test calendar',
    events: [{
      uid: 'event-1@both-homes.local',
      start: { date: '2026-11-02', time: '18:00' },
      end: { date: '2026-11-03', time: '18:00' },
      summary: 'With Ava, Noah',
      description: 'First line\nSecond line',
      location: 'School gate',
    }],
    now: FIXED_NOW,
  });
  assert.ok(ics.startsWith('BEGIN:VCALENDAR\r\n'));
  assert.ok(ics.endsWith('END:VCALENDAR\r\n'));
  assert.ok(ics.includes('VERSION:2.0\r\n'));
  assert.ok(ics.includes('DTSTART:20261102T180000\r\n'));
  assert.ok(ics.includes('SUMMARY:With Ava\\, Noah\r\n'));
  assert.ok(ics.includes('DESCRIPTION:First line\\nSecond line\r\n'));
  assert.ok(!/[^\r]\n/.test(ics), 'no bare newlines');
  assert.ok(lineLengths(ics).every((n) => n <= 75));
});

test('per-parent export contains only that parent’s blocks', () => {
  const plan = makePlan();
  const days = scheduleFor(plan);
  const a = buildPlanCalendar({ plan, days, forParent: 'a', now: FIXED_NOW });
  const b = buildPlanCalendar({ plan, days, forParent: 'b', now: FIXED_NOW });
  const both = buildPlanCalendar({ plan, days, forParent: 'both', now: FIXED_NOW });

  assert.equal(a.events, 3);
  assert.equal(b.events, 3);
  assert.equal(both.events, 6);
  assert.match(a.ics, /SUMMARY:With Ava\\, Noah/);
  assert.match(both.ics, /SUMMARY:Parent A: with Ava\\, Noah/);
  assert.match(a.ics, /DTSTART:20261104T180000/);
  assert.match(a.ics, /DTEND:20261106T180000/);
  assert.ok(a.ics.includes('LOCATION:School gate'));
  assert.ok(a.ics.includes('X-WR-CALNAME:'));
  assert.ok(a.filename.endsWith('.ics'));
  assert.ok(a.filename.includes('2026-11_2026-11'));
});

test('handoff reminders are generated at each transition', () => {
  const plan = makePlan();
  const days = scheduleFor(plan);
  const result = buildPlanCalendar({ plan, days, forParent: 'b', includeHandoffs: true, now: FIXED_NOW });
  const handoffs = result.ics.split('BEGIN:VEVENT').length - 1 - 3;
  assert.equal(handoffs, 5, 'one reminder per exchange in the 14-day window');
  assert.match(result.ics, /SUMMARY:Handoff\r\n/);
  assert.match(result.ics, /DTSTART:20261104T180000/);
});

test('a block crossing midnight uses the next day for DTEND', () => {
  const plan = makePlan({ handoff: { time: '23:30', place: '' } });
  const days = scheduleFor(plan, '2026-11-04', '2026-11-05');
  const result = buildPlanCalendar({ plan, days, forParent: 'a', now: FIXED_NOW });
  assert.match(result.ics, /DTSTART:20261104T233000/);
  assert.match(result.ics, /DTEND:20261106T233000/);
});

test('export without children uses a neutral summary', () => {
  const plan = makePlan({ children: '' });
  const days = scheduleFor(plan, '2026-11-04', '2026-11-05');
  const result = buildPlanCalendar({ plan, days, forParent: 'a', now: FIXED_NOW });
  assert.match(result.ics, /SUMMARY:Parenting time/);
});
