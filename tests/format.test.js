import test from 'node:test';
import assert from 'node:assert/strict';

import {
  detectWeekStart,
  formatMonthYear,
  formatNumber,
  safeLocale,
} from '../js/core/format.js';

test('POSIX-style browser locales are normalized for Intl', () => {
  assert.equal(safeLocale('en-US@posix'), 'en-US');
  assert.equal(safeLocale('de_DE'), 'de-DE');
  assert.equal(safeLocale(''), 'en-US');
  assert.equal(safeLocale('not a locale!'), 'en-US');
});

test('formatting never throws on a malformed locale', () => {
  assert.equal(formatMonthYear('2026-10-01', 'en-US@posix'), 'October 2026');
  assert.equal(formatNumber(1234, 'en-US@posix'), '1,234');
});

test('week-start detection ignores POSIX modifiers and underscores', () => {
  assert.equal(detectWeekStart('en-GB@posix'), 'mon');
  assert.equal(detectWeekStart('en_US'), 'sun');
  assert.equal(detectWeekStart('de_DE@euro'), 'mon');
});
