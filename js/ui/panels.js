/** Rendered panels: legend, summary, setup form, rules and export rows. */

import {
  PRESETS,
  CUSTOM_ID,
  cycleLabel,
  cyclePercentA,
  describeCycle,
  presetById,
  swapCycle,
} from '../core/patterns.js';
import { describeRule } from '../core/holidays.js';
import { groupOverrides } from '../core/schedule.js';
import { buildPlanCalendar } from '../core/ics.js';
import {
  formatMonthYear,
  formatNumber,
  formatPercent,
  formatRange,
  formatTime,
} from '../core/format.js';
import { clear, el, focusIfIdle, icon } from './dom.js';
import { monograms, ownerName } from './calendar.js';

export { ownerName, monograms };

export function renderQuickstart(container, plan, onSelect) {
  const current = plan.pattern.cycle.join('');
  clear(container);
  const picks = ['223', 'alt-weeks', '3443', 'weekdays']
    .map((id) => presetById(id))
    .filter(Boolean);
  for (const preset of picks) {
    const active = preset.cycle.join('') === current;
    const button = el('button', {
      class: `qs-chip${active ? ' is-active' : ''}`,
      type: 'button',
      'aria-pressed': active ? 'true' : 'false',
      title: preset.description,
    },
    el('span', { text: preset.label }),
    el('small', { text: preset.split }),
    icon('check', 'qs-check'));
    button.addEventListener('click', () => onSelect(preset.id));
    container.append(button);
  }
}

export function renderLegend(container, plan) {
  const marks = monograms(plan);
  clear(container);
  container.append(
    el('span', { class: 'legend-item' },
      el('span', { class: 'legend-swatch', 'aria-hidden': 'true' }),
      el('span', { text: `${ownerName(plan, 'a')} (${marks.a})` }),
    ),
    el('span', { class: 'legend-item' },
      el('span', { class: 'legend-swatch b', 'aria-hidden': 'true' }),
      el('span', { text: `${ownerName(plan, 'b')} (${marks.b})` }),
    ),
    el('span', { class: 'legend-item' }, icon('star'), el('span', { text: 'Holiday rule' })),
    el('span', { class: 'legend-item' },
      el('span', { class: 'legend-note', 'aria-hidden': 'true' }),
      el('span', { text: 'One-off change' }),
    ),
  );
}

export function renderSummary(refs, { plan, summary, window, locale }) {
  refs.windowEl.textContent = `${formatMonthYear(window.start, locale)} – ${formatMonthYear(window.end, locale)}`;
  clear(refs.splitBar);

  const a = summary.byParent.a;
  const b = summary.byParent.b;
  const aName = ownerName(plan, 'a');
  const bName = ownerName(plan, 'b');
  refs.splitBar.setAttribute(
    'aria-label',
    `${aName}: ${a.nights} nights, ${formatPercent(a.percent, locale)}. ${bName}: ${b.nights} nights, ${formatPercent(b.percent, locale)}.`,
  );
  refs.splitBar.append(
    el('span', { class: 'seg seg-a', style: `width:${a.percent}%` }),
    el('span', { class: 'seg seg-b', style: `width:${b.percent}%` }),
  );

  clear(refs.splitRows);
  for (const [owner, stats] of [['a', a], ['b', b]]) {
    refs.splitRows.append(el('div', { class: 'splitrow' },
      el('span', { class: 'splitrow-name' },
        el('i', { class: `dot dot-${owner}`, 'aria-hidden': 'true' }),
        el('span', { text: ownerName(plan, owner) }),
      ),
      el('span', { class: 'splitrow-value' },
        el('strong', { text: formatNumber(stats.nights, locale) }),
        ` nights · ${formatPercent(stats.percent, locale)}`,
      ),
    ));
  }

  clear(refs.statsEl);
  const longest = Math.max(a.longest, b.longest);
  const stats = [
    [formatNumber(summary.transitions, locale), 'Handoffs'],
    [formatNumber(longest, locale), 'Longest stay'],
    [formatNumber(summary.holidayDays, locale), 'Holiday nights'],
  ];
  for (const [value, label] of stats) {
    refs.statsEl.append(el('div', { class: 'stat' },
      el('strong', { text: value }),
      el('span', { text: label }),
    ));
  }
}

export function renderPills(patternPill, splitPill, plan) {
  const label = cycleLabel(plan.pattern.cycle, plan.pattern.id);
  const pct = Math.round(cyclePercentA(plan.pattern.cycle));
  const preset = presetById(plan.pattern.id);
  patternPill.textContent = label;
  splitPill.textContent = `${pct}/${100 - pct} nights`;
  patternPill.title = preset ? preset.description : describeCycle(plan.pattern.cycle);
}

export function populatePatternSelect(select) {
  clear(select);
  for (const preset of PRESETS) {
    select.append(el('option', { value: preset.id, text: `${preset.label} — ${preset.split}` }));
  }
  select.append(el('option', { value: CUSTOM_ID, text: 'Custom day-by-day' }));
}

export function renderPatternPreview(container, plan) {
  const marks = monograms(plan);
  clear(container);
  plan.pattern.cycle.forEach((owner, index) => {
    container.append(el('span', {
      class: `owner-${owner}`,
      title: `Day ${index + 1}: ${ownerName(plan, owner)} (${marks[owner]})`,
    }));
  });
}

export function renderPlanForm(refs, plan, locale) {
  focusIfIdle(refs.planName, plan.planName);
  focusIfIdle(refs.parentA, plan.parents.a.name);
  focusIfIdle(refs.parentB, plan.parents.b.name);
  focusIfIdle(refs.children, plan.children);
  focusIfIdle(refs.handoffPlace, plan.handoff.place);
  if (document.activeElement !== refs.startDate) refs.startDate.value = plan.startDate;
  if (document.activeElement !== refs.handoffTime) refs.handoffTime.value = plan.handoff.time;
  refs.weekStart.value = plan.weekStart;
  if (refs.patternSelect.options.length === 0) populatePatternSelect(refs.patternSelect);
  refs.patternSelect.value = plan.pattern.id;
  refs.cycleLength.value = String(plan.pattern.cycle.length);

  renderPatternPreview(refs.cyclePreview, plan);
  const preset = presetById(plan.pattern.id);
  refs.patternHelp.textContent = preset
    ? `${preset.description} ${describeCycle(plan.pattern.cycle)}.`
    : `${describeCycle(plan.pattern.cycle)}. Each day repeats in order from the pattern start date.`;
  refs.cycleEditor.hidden = plan.pattern.id !== CUSTOM_ID;
  refs.customizeCycle.setAttribute('aria-expanded', plan.pattern.id === CUSTOM_ID ? 'true' : 'false');
  renderCycleEditor(refs.cycleChips, plan);
}

export function renderCycleEditor(container, plan) {
  clear(container);
  const marks = monograms(plan);
  plan.pattern.cycle.forEach((owner, index) => {
    container.append(el('button', {
      type: 'button',
      class: 'cycle-chip',
      dataset: { owner, index: String(index) },
      'aria-label': `Day ${index + 1}: ${ownerName(plan, owner)}. Activate to switch parent.`,
      title: `Day ${index + 1}: ${ownerName(plan, owner)}`,
      text: marks[owner],
    }));
  });
}

export function renderHolidayList(listEl, emptyEl, plan, onAction) {
  const names = { a: ownerName(plan, 'a'), b: ownerName(plan, 'b') };
  clear(listEl);
  emptyEl.hidden = plan.holidays.length > 0;

  plan.holidays.forEach((rule, index) => {
    const actions = el('div', { class: 'rule-actions' });
    const make = (action, label, iconName, disabled = false, danger = false) => {
      const button = el('button', {
        type: 'button',
        class: `icon-btn ${danger ? 'is-danger' : ''}`,
        'aria-label': label,
        title: label,
        disabled,
      }, icon(iconName));
      button.addEventListener('click', () => onAction(action, rule.id));
      actions.append(button);
    };
    make('holiday-up', `Move ${rule.name} up`, 'arrow-up', index === 0);
    make('holiday-down', `Move ${rule.name} down`, 'arrow-down', index === plan.holidays.length - 1);
    make('holiday-edit', `Edit ${rule.name}`, 'pencil');
    make('holiday-delete', `Delete ${rule.name}`, 'trash', false, true);

    listEl.append(el('li', { class: 'rule' },
      el('div', { class: 'rule-main' },
        el('span', { class: 'rule-name' }, icon('star'), el('span', { text: rule.name })),
        el('span', { class: 'rule-meta', text: describeRule(rule, names) }),
      ),
      actions,
    ));
  });
}

export function renderOverrideList(listEl, emptyEl, plan, onAction, locale) {
  const groups = groupOverrides(plan.overrides);
  clear(listEl);
  emptyEl.hidden = groups.length > 0;

  for (const group of groups) {
    const actions = el('div', { class: 'rule-actions' });
    const edit = el('button', {
      type: 'button',
      class: 'icon-btn',
      'aria-label': `Edit change starting ${group.start}`,
      title: 'Edit change',
    }, icon('pencil'));
    edit.addEventListener('click', () => onAction('override-edit', group));
    const remove = el('button', {
      type: 'button',
      class: 'icon-btn is-danger',
      'aria-label': `Remove change starting ${group.start}`,
      title: 'Remove change',
    }, icon('trash'));
    remove.addEventListener('click', () => onAction('override-delete', group));
    actions.append(edit, remove);

    listEl.append(el('li', { class: 'rule' },
      el('div', { class: 'rule-main' },
        el('span', { class: 'rule-name' },
          el('i', { class: `dot dot-${group.owner}`, 'aria-hidden': 'true' }),
          el('span', { text: ownerName(plan, group.owner) }),
        ),
        el('span', {
          class: 'rule-meta',
          text: `${formatRange(group.start, group.end, locale)} · ${group.nights} night${group.nights === 1 ? '' : 's'}${group.note ? ` · ${group.note}` : ''}`,
        }),
      ),
      actions,
    ));
  }
}

export function renderExportRows(container, { plan, days, includeHandoffs, onDownload, locale }) {
  clear(container);
  const marks = monograms(plan);
  const options = ['a', 'b', 'both'];
  for (const owner of options) {
    const isBoth = owner === 'both';
    const name = isBoth ? 'Both parents, one file' : ownerName(plan, owner);
    let count = 0;
    try {
      count = buildPlanCalendar({ plan, days, forParent: owner, includeHandoffs }).events;
    } catch {
      count = 0;
    }
    const button = el('button', {
      type: 'button',
      class: `export-row${isBoth ? ' is-both' : ''}`,
      disabled: count === 0,
    });
    if (isBoth) {
      button.append(
        el('span', { class: 'dot dot-a', 'aria-hidden': 'true' }),
        el('span', { class: 'dot dot-b', 'aria-hidden': 'true', style: 'margin-left:-6px' }),
      );
    } else {
      button.append(el('i', { class: `dot dot-${owner}`, 'aria-hidden': 'true' }));
    }
    button.append(
      el('span', { class: 'export-row-name' },
        el('strong', { text: name }),
        el('small', {
          text: `${formatNumber(count, locale)} event${count === 1 ? '' : 's'}${isBoth ? ' · for a shared calendar' : ` · ${marks[owner]} only`}`,
        }),
      ),
      icon('download'),
    );
    button.addEventListener('click', () => onDownload(owner));
    container.append(button);
  }
}

export function renderHandoffNote(node, plan, locale) {
  if (!node) return;
  const time = formatTime(plan.handoff.time, locale);
  node.textContent = plan.handoff.place
    ? `Handoffs at ${time} · ${plan.handoff.place}`
    : `Handoffs at ${time}`;
}

export function patternSwap(plan) {
  return {
    ...plan,
    pattern: {
      id: CUSTOM_ID,
      cycle: swapCycle(plan.pattern.cycle),
    },
  };
}
