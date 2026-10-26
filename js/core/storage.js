/** Thin, failure-tolerant wrapper around localStorage. */

import { normalizePlan } from './state.js';

const KEY = 'bothhomes.plan.v1';

export function loadStoredPlan(storage, { today } = {}) {
  if (!storage) return { plan: null, error: null };
  let raw;
  try {
    raw = storage.getItem(KEY);
  } catch {
    return { plan: null, error: 'This browser is blocking local storage, so changes will not be saved.' };
  }
  if (!raw) return { plan: null, error: null };
  try {
    return { plan: normalizePlan(JSON.parse(raw), { today }), error: null };
  } catch {
    return { plan: null, error: 'Your saved plan could not be read. You can start a new one below.' };
  }
}

export function savePlan(storage, plan) {
  if (!storage) return { ok: false, error: 'Local storage is unavailable.' };
  try {
    storage.setItem(KEY, JSON.stringify(plan));
    return { ok: true, error: null };
  } catch {
    return { ok: false, error: 'Could not save to this browser. Export your plan to keep a copy.' };
  }
}

export function clearStoredPlan(storage) {
  try {
    storage?.removeItem(KEY);
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

export { KEY as STORAGE_KEY };
