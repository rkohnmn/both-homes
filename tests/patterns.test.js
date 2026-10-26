import test from 'node:test';
import assert from 'node:assert/strict';

import {
  CUSTOM_ID,
  PRESETS,
  cycleFromPreset,
  cycleLabel,
  cyclePercentA,
  describeCycle,
  nightsPerCycle,
  presetById,
  resizeCycle,
  runLengths,
  swapCycle,
  validateCycle,
} from '../js/core/patterns.js';

test('every preset has a valid cycle and a known split', () => {
  for (const preset of PRESETS) {
    assert.ok(validateCycle(preset.cycle), `${preset.id} cycle is valid`);
    assert.equal(preset.cycle.length, preset.cycle.length);
    assert.match(preset.split, /^\d+\/\d+$/);
  }
});

test('2-2-3 is a 14-day 50/50 cycle', () => {
  const cycle = cycleFromPreset('223');
  assert.equal(cycle.length, 14);
  assert.deepEqual(nightsPerCycle(cycle), { a: 7, b: 7, total: 14 });
  assert.equal(cyclePercentA(cycle), 50);
  assert.deepEqual(runLengths(cycle).map((r) => r.length), [2, 2, 3, 2, 2, 3]);
  assert.equal(describeCycle(cycle), '14-day cycle · 50/50 split');
});

test('alternating weeks is 7/7', () => {
  const cycle = cycleFromPreset('alt-weeks');
  assert.equal(cycle.join(''), 'aaaaaaabbbbbbb');
  assert.deepEqual(nightsPerCycle(cycle), { a: 7, b: 7, total: 14 });
});

test('weekday/weekend preset is a 57/43 weekly cycle', () => {
  const cycle = cycleFromPreset('weekdays');
  assert.equal(cycle.length, 7);
  assert.equal(cycle.join(''), 'aaaabbb');
  assert.equal(Math.round(cyclePercentA(cycle)), 57);
  assert.equal(describeCycle(cycle), '7-day cycle · 57/43 split');
});

test('presets can be found and labelled', () => {
  assert.equal(presetById('3443').label, '3-4-4-3');
  assert.equal(presetById('nope'), null);
  assert.equal(cycleLabel(cycleFromPreset('223'), '223'), '2-2-3');
  assert.equal(cycleLabel(['a', 'b'], CUSTOM_ID), '2-day custom');
  assert.equal(cycleLabel(cycleFromPreset('223'), 'custom'), '2-2-3', 'matching cycle gets a readable name');
});

test('swapping flips every day without changing the shape', () => {
  const cycle = cycleFromPreset('223');
  const swapped = swapCycle(cycle);
  assert.equal(swapped.join(''), 'bbaabbbaabbaaa');
  assert.deepEqual(nightsPerCycle(swapped), { a: 7, b: 7, total: 14 });
  assert.deepEqual(runLengths(swapped).map((r) => r.length), [2, 2, 3, 2, 2, 3]);
});

test('custom cycle resizing preserves existing days and continues the last run', () => {
  assert.deepEqual(resizeCycle(['a', 'a', 'b'], 5), ['a', 'a', 'b', 'b', 'b']);
  assert.deepEqual(resizeCycle(['a', 'a', 'b', 'b'], 2), ['a', 'a']);
  assert.deepEqual(resizeCycle(['b', 'a'], 2), ['b', 'a']);
  assert.deepEqual(resizeCycle(['a', 'a'], 0), ['a', 'a'], 'clamped to minimum two days');
});

test('cycle validation rejects bad input', () => {
  assert.equal(validateCycle(['a', 'b']), true);
  assert.equal(validateCycle(['a']), false);
  assert.equal(validateCycle(['a', 'c']), false);
  assert.equal(validateCycle(new Array(29).fill('a')), false);
  assert.equal(validateCycle(null), false);
});
