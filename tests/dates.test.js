import test from 'node:test';
import assert from 'node:assert/strict';

import {
  addDays,
  addMonths,
  daysInMonth,
  diffDays,
  eachDay,
  endOfMonth,
  fromDayNumber,
  isISODate,
  isoDate,
  mod,
  monthGrid,
  nthWeekdayOfMonth,
  parts,
  spanDays,
  startOfWeek,
  toDayNumber,
  weekdayOf,
} from '../js/core/dates.js';

test('validates ISO dates including leap years', () => {
  assert.equal(isISODate('2026-10-26'), true);
  assert.equal(isISODate('2024-02-29'), true);
  assert.equal(isISODate('2025-02-29'), false);
  assert.equal(isISODate('2026-13-01'), false);
  assert.equal(isISODate('2026-04-31'), false);
  assert.equal(isISODate('26-10-26'), false);
  assert.equal(parts('2026-10-26').year, 2026);
  assert.equal(parts('not-a-date'), null);
});

test('day numbers round-trip without timezone drift', () => {
  assert.equal(fromDayNumber(toDayNumber('2026-01-01')), '2026-01-01');
  assert.equal(addDays('2026-12-31', 1), '2027-01-01');
  assert.equal(addDays('2024-02-28', 1), '2024-02-29');
  assert.equal(addDays('2025-02-28', 1), '2025-03-01');
  assert.equal(addDays('2026-03-08', 1), '2026-03-09', 'US DST start does not shift the date');
  assert.equal(addDays('2026-10-26', -1), '2026-10-25');
  assert.equal(diffDays('2026-10-26', '2026-11-02'), 7);
  assert.equal(spanDays('2026-10-26', '2026-10-26'), 1);
});

test('month arithmetic clamps to the end of short months', () => {
  assert.equal(addMonths('2026-01-31', 1), '2026-02-28');
  assert.equal(addMonths('2024-01-31', 1), '2024-02-29');
  assert.equal(addMonths('2026-11-15', -12), '2025-11-15');
  assert.equal(addMonths('2026-03-31', -1), '2026-02-28');
  assert.equal(addMonths('2026-12-15', 1), '2027-01-15');
  assert.equal(startOfWeek('2026-10-26', 'sun'), '2026-10-25');
  assert.equal(startOfWeek('2026-10-26', 'mon'), '2026-10-26');
  assert.equal(endOfMonth('2024-02-10'), '2024-02-29');
  assert.equal(daysInMonth(2026, 4), 30);
  assert.equal(daysInMonth(2024, 2), 29);
});

test('weekdays are correct', () => {
  assert.equal(weekdayOf('2026-10-26'), 1, 'Monday');
  assert.equal(weekdayOf('2026-10-25'), 0, 'Sunday');
  assert.equal(weekdayOf('2026-11-26'), 4, 'Thanksgiving Thursday');
});

test('nth weekday of month, including last', () => {
  assert.equal(nthWeekdayOfMonth(2026, 11, 4, 4), '2026-11-26');
  assert.equal(nthWeekdayOfMonth(2026, 5, 0, 2), '2026-05-10', 'second Sunday of May');
  assert.equal(nthWeekdayOfMonth(2026, 5, 1, -1), '2026-05-25', 'last Monday of May');
  assert.equal(nthWeekdayOfMonth(2026, 2, 1, 4), '2026-02-23', 'fourth Monday of February');
  assert.equal(nthWeekdayOfMonth(2026, 2, 0, -1), '2026-02-22', 'last Sunday of February');
  assert.equal(nthWeekdayOfMonth(2026, 1, 7, 1), null, 'invalid weekday');
  assert.equal(nthWeekdayOfMonth(2026, 1, 1, 5), null, 'unsupported fifth occurrence');
});

test('month grid always covers six weeks and starts on the chosen weekday', () => {
  const sun = monthGrid(2026, 11, 'sun');
  assert.equal(sun.length, 42);
  assert.equal(weekdayOf(sun[0]), 0);
  assert.ok(sun.includes('2026-11-01'));
  assert.ok(sun.includes('2026-11-30'));
  const mon = monthGrid(2026, 11, 'mon');
  assert.equal(weekdayOf(mon[0]), 1);
  assert.equal(mon[0], '2026-10-26');
});

test('negative modulo keeps cycle indexing positive', () => {
  assert.equal(mod(-1, 14), 13);
  assert.equal(mod(0, 14), 0);
  assert.equal(mod(15, 14), 1);
});

test('eachDay is inclusive and rejects oversized ranges', () => {
  assert.deepEqual(eachDay('2026-10-30', '2026-11-02'), [
    '2026-10-30', '2026-10-31', '2026-11-01', '2026-11-02',
  ]);
  assert.deepEqual(eachDay('2026-11-02', '2026-10-30'), []);
  assert.deepEqual(eachDay('2026-01-01', '2027-01-01', 10), []);
  assert.equal(isoDate(2026, 1, 5), '2026-01-05');
});
