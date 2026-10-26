import test from 'node:test';
import assert from 'node:assert/strict';

import {
  LIMITS,
  cleanText,
  createDefaultPlan,
  normalizePlan,
  parentName,
  planWindow,
  toShareablePlan,
} from '../js/core/state.js';

const TODAY = '2026-10-26';

function raw(extra = {}) {
  return {
    version: 1,
    planName: 'Our plan',
    parents: { a: { name: 'Sam' }, b: { name: 'Alex' } },
    children: 'Ava',
    pattern: { id: '223' },
    startDate: TODAY,
    weekStart: 'sun',
    handoff: { time: '18:00', place: 'School' },
    windowOffset: 0,
    holidays: [],
    overrides: {},
    ...extra,
  };
}

test('default plan is immediately usable', () => {
  const plan = createDefaultPlan(TODAY);
  assert.equal(plan.version, 1);
  assert.equal(plan.startDate, TODAY);
  assert.equal(plan.pattern.cycle.length, 14);
  assert.equal(plan.parents.a.name, '');
  assert.equal(parentName(plan, 'a'), 'Parent A');
  assert.equal(parentName({ ...plan, parents: { a: { name: 'Sam' }, b: { name: '' } } }, 'a'), 'Sam');
});

test('normalization trims text and rejects unknown versions', () => {
  const plan = normalizePlan(raw({
    planName: '   Our   plan   ',
    parents: { a: { name: '  Sam   Smith ' }, b: { name: 'Alex' } },
    children: ' Ava  &  Noah ',
  }), { today: TODAY });
  assert.equal(plan.planName, 'Our plan');
  assert.equal(plan.parents.a.name, 'Sam Smith');
  assert.equal(plan.children, 'Ava & Noah');
  assert.equal(cleanText('x'.repeat(100), 10).length, 10);
  assert.throws(() => normalizePlan({ ...raw(), version: 2 }, { today: TODAY }), /newer version/);
  assert.throws(() => normalizePlan(null), /not valid JSON/);
  assert.throws(() => normalizePlan({ ...raw(), version: undefined }, { today: TODAY }));
});

test('invalid dates and times fall back safely', () => {
  const plan = normalizePlan(raw({
    startDate: '2026-02-30',
    handoff: { time: '25:99', place: 'Gate' },
  }), { today: TODAY });
  assert.equal(plan.startDate, TODAY);
  assert.equal(plan.handoff.time, '18:00');
  assert.equal(plan.handoff.place, 'Gate');
});

test('known pattern ids restore the official cycle', () => {
  const plan = normalizePlan(raw({ pattern: { id: '223', cycle: ['b', 'a'] } }), { today: TODAY });
  assert.equal(plan.pattern.id, '223');
  assert.equal(plan.pattern.cycle.length, 14);
  assert.equal(plan.pattern.cycle.join(''), 'aabbaaabbaabbb');
});

test('a valid custom cycle is preserved, invalid cycles fall back', () => {
  const custom = normalizePlan(raw({ pattern: { id: 'custom', cycle: ['a', 'b', 'b'] } }), { today: TODAY });
  assert.equal(custom.pattern.id, 'custom');
  assert.deepEqual(custom.pattern.cycle, ['a', 'b', 'b']);

  const invalid = normalizePlan(raw({ pattern: { id: 'custom', cycle: ['a', 'z'] } }), { today: TODAY });
  assert.equal(invalid.pattern.id, '223');
  assert.equal(invalid.pattern.cycle.length, 14);
});

test('holiday rules are sanitized and malformed rules are dropped', () => {
  const plan = normalizePlan(raw({
    holidays: [
      {
        id: 'h_good',
        name: '  Thanksgiving ',
        kind: 'day',
        dayRule: 'nth',
        month: 11,
        weekday: 4,
        nth: 4,
        spanDays: 4,
        assignment: 'alternate',
        alternateStart: 'a',
      },
      {
        id: 'h_bad',
        name: 'Broken',
        kind: 'day',
        dayRule: 'fixed',
        month: 2,
        day: 30,
        assignment: 'a',
      },
      { name: '', kind: 'day', month: 1, day: 1, assignment: 'a' },
      'not a rule',
    ],
  }), { today: TODAY });
  assert.equal(plan.holidays.length, 1);
  assert.equal(plan.holidays[0].name, 'Thanksgiving');
  assert.equal(plan.holidays[0].spanDays, 4);
  assert.equal(plan.holidays[0].split, 'whole');
});

test('duplicate holiday ids are replaced', () => {
  const rule = {
    id: 'same',
    name: 'Christmas',
    kind: 'day',
    dayRule: 'fixed',
    month: 12,
    day: 25,
    assignment: 'a',
    split: 'whole',
  };
  const plan = normalizePlan(raw({ holidays: [rule, { ...rule, name: 'Boxing Day', month: 12, day: 26 }] }), { today: TODAY });
  assert.equal(plan.holidays.length, 2);
  assert.notEqual(plan.holidays[0].id, plan.holidays[1].id);
});

test('overrides keep only valid dates and owners, and cap notes', () => {
  const plan = normalizePlan(raw({
    overrides: {
      '2026-12-24': { owner: 'b', note: 'x'.repeat(500) },
      '2026-12-25': { owner: 'nobody', note: 'bad' },
      '2026-02-30': { owner: 'a', note: 'bad date' },
      '1800-01-01': { owner: 'a', note: 'too old' },
    },
  }), { today: TODAY });
  assert.deepEqual(Object.keys(plan.overrides), ['2026-12-24']);
  assert.equal(plan.overrides['2026-12-24'].owner, 'b');
  assert.equal(plan.overrides['2026-12-24'].note.length, LIMITS.note);
});

test('plan window covers twelve whole months and can move by year', () => {
  const plan = normalizePlan(raw({ startDate: TODAY }), { today: TODAY });
  assert.deepEqual(planWindow(plan), { start: '2026-10-01', end: '2027-09-30' });
  const next = normalizePlan({ ...raw(), windowOffset: 1 }, { today: TODAY });
  assert.deepEqual(planWindow(next), { start: '2027-10-01', end: '2028-09-30' });
  const previous = normalizePlan({ ...raw(), windowOffset: -1 }, { today: TODAY });
  assert.deepEqual(planWindow(previous), { start: '2025-10-01', end: '2026-09-30' });
});

test('share projections remove private fields without breaking the schedule', () => {
  const plan = normalizePlan(raw({
    holidays: [{
      id: 'h1', name: 'Christmas', kind: 'day', dayRule: 'fixed', month: 12, day: 25,
      assignment: 'alternate', alternateStart: 'a', split: 'whole',
    }],
    overrides: { '2026-12-24': { owner: 'b', note: 'Cabin trip' } },
  }), { today: TODAY });

  const anonymous = toShareablePlan(plan, { names: false, notes: false });
  assert.equal(anonymous.parents.a.name, '');
  assert.equal(anonymous.parents.b.name, '');
  assert.equal(anonymous.children, '');
  assert.equal(anonymous.planName, 'Shared parenting plan');
  assert.equal(anonymous.handoff.place, '');
  assert.equal(anonymous.overrides['2026-12-24'].note, '');
  assert.equal(anonymous.overrides['2026-12-24'].owner, 'b');
  assert.equal(anonymous.holidays.length, 1);
  assert.equal(anonymous.pattern.cycle.length, 14);

  const named = toShareablePlan(plan, { names: true, notes: true });
  assert.equal(named.parents.a.name, 'Sam');
  assert.equal(named.children, 'Ava');
  assert.equal(named.overrides['2026-12-24'].note, 'Cabin trip');
});
