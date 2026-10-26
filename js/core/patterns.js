/**
 * Rotation patterns. A cycle is simply an array of owners ('a' | 'b'), one
 * entry per day. The pattern repeats forever from the plan's start date.
 */

const define = (id, label, cycle, split, description, bestFor, tag = '') => ({
  id,
  label,
  cycle: [...cycle],
  split,
  description,
  bestFor,
  tag,
});

export const PRESETS = [
  define(
    '223',
    '2-2-3',
    'aabbaaabbaabbb',
    '50/50',
    'Two days with one parent, two with the other, then a three-day weekend. Repeats every two weeks; start on a Monday for alternating weekends.',
    'Young children and families who want frequent contact with both parents.',
    'Popular 50/50',
  ),
  define(
    'alt-weeks',
    'Alternating weeks',
    'aaaaaaabbbbbbb',
    '50/50',
    'Seven nights in each home, exchanging on the same weekday every week.',
    'School-age children who benefit from fewer transitions.',
  ),
  define(
    '3443',
    '3-4-4-3',
    'aaabbbbaaaabbb',
    '50/50',
    'Three nights, four nights, four nights, three nights. Fewer handoffs, but weekend time can favor one parent unless you split the exchange day.',
    'Families who want longer blocks without a full week away.',
  ),
  define(
    '4334',
    '4-3-3-4',
    'aaaabbbaaabbbb',
    '50/50',
    'Four nights, three nights, three nights, four nights. A steady rhythm with two handoffs a week; check who gets weekend time.',
    'School-age children who want a weekend in each home.',
  ),
  define(
    '2255',
    '2-2-5-5',
    'aabbaaaaabbbbb',
    '50/50',
    'Two nights, two nights, then five nights with each parent. Longer stretches; start on a Monday for alternating weekends.',
    'Families comfortable with several nights away at a time.',
  ),
  define(
    '5225',
    '5-2-2-5',
    'aaaaabbaabbbbb',
    '50/50',
    'Five nights, two nights, two nights, five nights. Gives each parent a long stretch and a short one.',
    'Parents who want a midweek visit during the other parent’s long block.',
  ),
  define(
    '3344',
    '3-3-4-4',
    'aaabbbaaaabbbb',
    '50/50',
    'Three nights, three nights, four nights, four nights. A steady two-week rhythm.',
    'Families who like predictable midweek handoffs.',
  ),
  define(
    'weekdays',
    'Weekdays / weekends',
    'aaaabbb',
    '57/43',
    'School nights Monday to Thursday; the weekend parent has Friday through Sunday. A common school-term arrangement.',
    'Families with a primary school-week home.',
  ),
];

export const CUSTOM_ID = 'custom';

export function presetById(id) {
  return PRESETS.find((p) => p.id === id) || null;
}

export function cycleFromPreset(id) {
  const preset = presetById(id);
  return preset ? [...preset.cycle] : null;
}

export function otherOwner(owner) {
  return owner === 'a' ? 'b' : 'a';
}

export function swapCycle(cycle) {
  return cycle.map(otherOwner);
}

export function validateCycle(cycle) {
  if (!Array.isArray(cycle) || cycle.length < 2 || cycle.length > 28) return false;
  return cycle.every((owner) => owner === 'a' || owner === 'b');
}

/** Human label: preset name when the cycle matches one, otherwise "N-day custom". */
export function cycleLabel(cycle, id = '') {
  if (id && id !== CUSTOM_ID) {
    const preset = presetById(id);
    if (preset) return preset.label;
  }
  const match = PRESETS.find(
    (p) => p.cycle.length === cycle.length && p.cycle.every((o, i) => o === cycle[i]),
  );
  return match ? match.label : `${cycle.length}-day custom`;
}

/** Runs, e.g. ['aa','bb','aaa'] -> '2-2-3'. */
export function runLengths(cycle) {
  const runs = [];
  for (const owner of cycle) {
    if (runs.length && runs[runs.length - 1].owner === owner) {
      runs[runs.length - 1].length += 1;
    } else {
      runs.push({ owner, length: 1 });
    }
  }
  return runs;
}

export function nightsPerCycle(cycle) {
  const a = cycle.filter((o) => o === 'a').length;
  return { a, b: cycle.length - a, total: cycle.length };
}

export function cyclePercentA(cycle) {
  return (cycle.filter((o) => o === 'a').length / cycle.length) * 100;
}

export function patternDescription(cycle) {
  const runs = runLengths(cycle);
  const nights = nightsPerCycle(cycle);
  const pctA = Math.round(cyclePercentA(cycle));
  return {
    length: cycle.length,
    runs,
    rhythm: runs.map((r) => r.length).join('-'),
    splitLabel: `${pctA}/${100 - pctA}`,
    nights,
  };
}

/** A short sentence describing a cycle, used under the pattern picker. */
export function describeCycle(cycle) {
  const info = patternDescription(cycle);
  return `${info.length}-day cycle · ${info.splitLabel} split`;
}

/**
 * Resize a custom cycle, preserving the days the user already set and filling
 * new days by continuing the last run.
 */
export function resizeCycle(cycle, length) {
  const size = Math.max(2, Math.min(28, Math.round(length) || 2));
  if (size === cycle.length) return [...cycle];
  if (size < cycle.length) return cycle.slice(0, size);
  const next = [...cycle];
  while (next.length < size) next.push(next[next.length - 1] || 'a');
  return next;
}
