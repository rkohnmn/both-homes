import test from 'node:test';
import assert from 'node:assert/strict';

import { buildShareUrl, decodeToken, encodeToken, planFromHash } from '../js/core/share.js';
import { createDefaultPlan, normalizePlan } from '../js/core/state.js';

const BASE = 'https://someone.github.io/both-homes/';

function makePlan() {
  const base = createDefaultPlan('2026-10-26');
  return normalizePlan({
    ...base,
    planName: 'Notre plan',
    parents: { a: { name: 'Zoë' }, b: { name: 'Bjørn' } },
    children: 'Élodie & Noah ☕',
    handoff: { time: '17:30', place: 'Café' },
    overrides: { '2026-11-26': { owner: 'a', note: 'Thanksgiving chez Zoë' } },
  }, { today: '2026-10-26' });
}

test('tokens round-trip Unicode text', () => {
  const token = encodeToken({ text: 'Zoë & Bjørn — café ☕' });
  assert.match(token, /^[A-Za-z0-9_-]+$/);
  assert.deepEqual(decodeToken(token), { text: 'Zoë & Bjørn — café ☕' });
});

test('share URLs carry the full plan and restore it', () => {
  const plan = makePlan();
  const url = buildShareUrl(plan, { names: true, notes: true }, BASE);
  assert.ok(url.startsWith(BASE));
  const parsed = new URL(url);
  assert.ok(parsed.hash.startsWith('#p='));
  const restored = planFromHash(parsed.hash, { today: '2026-10-26' });
  assert.equal(restored.parents.a.name, 'Zoë');
  assert.equal(restored.children, 'Élodie & Noah ☕');
  assert.equal(restored.handoff.time, '17:30');
  assert.equal(restored.overrides['2026-11-26'].note, 'Thanksgiving chez Zoë');
});

test('share options strip names and notes by default', () => {
  const url = buildShareUrl(makePlan(), {}, BASE);
  const restored = planFromHash(new URL(url).hash, { today: '2026-10-26' });
  assert.equal(restored.parents.a.name, '');
  assert.equal(restored.children, '');
  assert.equal(restored.handoff.place, '');
  assert.equal(restored.overrides['2026-11-26'].note, '');
  assert.equal(restored.pattern.cycle.length, 14);
});

test('empty and malformed hashes are handled', () => {
  assert.equal(planFromHash(''), null);
  assert.equal(planFromHash('#'), null);
  assert.equal(planFromHash('#other=1'), null);
  assert.throws(() => planFromHash('#p=not!valid'), /incomplete/);
  assert.throws(() => planFromHash('#p=abcdefgh'), /could not be read/);
});

test('a newer plan version is rejected', () => {
  const token = encodeToken({ version: 99, planName: 'Future' });
  assert.throws(() => planFromHash(`#p=${token}`), /newer version/);
});

test('share links work from a repository subpath', () => {
  const url = buildShareUrl(makePlan(), { names: true, notes: false }, 'https://example.com/my-repo/index.html');
  assert.ok(url.startsWith('https://example.com/my-repo/index.html#p='));
});
