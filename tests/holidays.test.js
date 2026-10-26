import test from 'node:test';
import assert from 'node:assert/strict';

import {
  dayRuleAnchor,
  describeRule,
  matchRule,
  occurrencesInRange,
  ownerForYear,
  resolveHoliday,
  validateRule,
} from '../js/core/holidays.js';

const thanksgiving = {
  id: 'h_thanks',
  name: 'Thanksgiving',
  kind: 'day',
  dayRule: 'nth',
  month: 11,
  weekday: 4,
  nth: 4,
  spanDays: 4,
  assignment: 'alternate',
  alternateStart: 'a',
  split: 'whole',
};

const christmas = {
  id: 'h_xmas',
  name: 'Christmas',
  kind: 'day',
  dayRule: 'fixed',
  month: 12,
  day: 25,
  spanDays: 1,
  assignment: 'alternate',
  alternateStart: 'a',
  split: 'whole',
};

const summer = {
  id: 'h_summer',
  name: 'Summer break',
  kind: 'range',
  fromMonth: 6,
  fromDay: 15,
  toMonth: 8,
  toDay: 15,
  split: 'halves',
  assignment: 'alternate',
  alternateStart: 'a',
};
const summerWeeks = { ...summer, id: 'h_summer_weeks', split: 'weeks' };

test('fixed and nth day anchors resolve correctly', () => {
  assert.equal(dayRuleAnchor(thanksgiving, 2026), '2026-11-26');
  assert.equal(dayRuleAnchor(thanksgiving, 2027), '2027-11-25');
  assert.equal(dayRuleAnchor(christmas, 2026), '2026-12-25');
  assert.equal(dayRuleAnchor({ ...christmas, day: 29, month: 2 }, 2026), null);
  assert.equal(dayRuleAnchor({ ...christmas, day: 29, month: 2 }, 2028), '2028-02-29');
});

test('yearly alternation starts with the chosen parent in odd years', () => {
  assert.equal(ownerForYear(thanksgiving, 2025), 'a');
  assert.equal(ownerForYear(thanksgiving, 2026), 'b');
  assert.equal(ownerForYear({ ...thanksgiving, alternateStart: 'b' }, 2025), 'b');
  assert.equal(ownerForYear({ ...thanksgiving, assignment: 'b' }, 2025), 'b');
});

test('a multi-day holiday keeps one owner across its span', () => {
  const hit = matchRule(thanksgiving, '2026-11-28');
  assert.equal(hit.owner, 'b');
  assert.equal(hit.occurrence.start, '2026-11-26');
  assert.equal(hit.occurrence.end, '2026-11-29');
  assert.equal(matchRule(thanksgiving, '2026-11-30'), null);
});

test('holiday spans can cross New Year without changing the assignment year', () => {
  const newYear = {
    id: 'h_ny',
    name: 'New Year break',
    kind: 'day',
    dayRule: 'fixed',
    month: 12,
    day: 30,
    spanDays: 5,
    assignment: 'alternate',
    alternateStart: 'a',
    split: 'whole',
  };
  assert.equal(matchRule(newYear, '2027-01-02').owner, 'b', 'even 2026 occurrence belongs to B');
  assert.equal(matchRule(newYear, '2026-12-31').owner, 'b');
});

test('annual ranges split in halves and alternate weeks', () => {
  const start = '2026-06-15';
  const firstHalf = matchRule(summer, start);
  assert.equal(firstHalf.owner, 'b', '2026 is even and starts with B');
  assert.equal(matchRule(summer, '2026-06-30').owner, 'b');
  assert.equal(matchRule(summer, '2026-08-15').owner, 'a');
  assert.equal(matchRule(summer, '2026-06-14'), null);

  assert.equal(matchRule(summerWeeks, '2026-06-15').owner, 'b');
  assert.equal(matchRule(summerWeeks, '2026-06-22').owner, 'a');
  assert.equal(matchRule(summerWeeks, '2026-08-10').owner, 'b', 'day 57 of 62 falls in block 9');
});

test('wrapping annual range starts in the previous year', () => {
  const winter = {
    id: 'h_winter',
    name: 'Winter break',
    kind: 'range',
    fromMonth: 12,
    fromDay: 22,
    toMonth: 1,
    toDay: 4,
    split: 'whole',
    assignment: 'alternate',
    alternateStart: 'a',
  };
  assert.equal(matchRule(winter, '2026-12-23').owner, 'b');
  assert.equal(matchRule(winter, '2027-01-02').owner, 'b', 'same occurrence as 2026-12-23');
  assert.equal(matchRule(winter, '2027-12-23').owner, 'a', 'odd 2027 belongs to A');
  assert.equal(matchRule(winter, '2027-01-06'), null);
});

test('specific dates rules ignore the year of the query', () => {
  const dates = {
    id: 'h_dates',
    name: 'Grandma’s visit',
    kind: 'dates',
    start: '2027-03-06',
    end: '2027-03-09',
    split: 'halves',
    assignment: 'a',
    alternateStart: 'a',
  };
  assert.equal(matchRule(dates, '2027-03-06').owner, 'a');
  assert.equal(matchRule(dates, '2027-03-08').owner, 'b');
  assert.equal(matchRule(dates, '2027-03-09').owner, 'b');
  assert.equal(matchRule(dates, '2028-03-06'), null);
});

test('first matching rule wins', () => {
  const rules = [{ ...thanksgiving, assignment: 'a' }, { ...christmas, assignment: 'b' }];
  assert.equal(resolveHoliday(rules, '2026-11-26').owner, 'a');
  assert.equal(resolveHoliday(rules, '2026-12-25').owner, 'b');
  assert.equal(resolveHoliday(rules, '2026-01-01'), null);
});

test('occurrencesInRange returns overlapping years without duplicates', () => {
  const list = occurrencesInRange(christmas, '2026-12-01', '2027-01-31');
  assert.equal(list.length, 1);
  assert.equal(list[0].start, '2026-12-25');
});

test('rule descriptions are human readable', () => {
  const description = describeRule(thanksgiving, { a: 'Sam', b: 'Alex' });
  assert.match(description, /4th Thursday of November/);
  assert.match(description, /odd years Sam, even years Alex/);
  assert.match(description, /4 days/);
  assert.match(describeRule(summer), /split in half/);
  assert.match(describeRule({ ...summer, split: 'weeks' }), /alternating weeks/);
});

test('validation rejects impossible dates and missing names', () => {
  assert.equal(validateRule(thanksgiving).ok, true);
  assert.equal(validateRule({ ...christmas, name: '' }).ok, false);
  assert.equal(validateRule({ ...christmas, day: 31, month: 4 }).ok, false);
  assert.equal(validateRule({ ...christmas, day: 30, month: 2 }).ok, false);
  assert.equal(validateRule({ ...summer, toMonth: 6, toDay: 15 }).ok, false);
  assert.equal(validateRule({ ...summer, split: 'nope' }).ok, false);
  assert.equal(validateRule({ kind: 'dates', name: 'x', start: '2026-01-02', end: '2026-01-01', split: 'whole', assignment: 'a' }).ok, false);
});
