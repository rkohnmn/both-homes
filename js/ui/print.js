/** A print-only 12-month overview. Screen readers ignore it; the live app is the source of truth. */

import { addMonths, monthGrid, parts } from '../core/dates.js';
import { formatDateMedium, formatMonthYear, formatPercent, formatRange, formatTime, weekdayLabels } from '../core/format.js';
import { occurrencesInRange } from '../core/holidays.js';
import { groupOverrides } from '../core/schedule.js';
import { cycleLabel, cyclePercentA } from '../core/patterns.js';
import { clear, el } from './dom.js';
import { ownerName } from './calendar.js';

function markSvg() {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 32 32');
  svg.setAttribute('class', 'print-mark');
  svg.setAttribute('aria-hidden', 'true');
  const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  rect.setAttribute('width', '32');
  rect.setAttribute('height', '32');
  rect.setAttribute('rx', '9');
  rect.setAttribute('fill', '#1c6b58');
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', 'M5.5 14.4 11 9.6l5.4 4.8M15.7 14.4 21 9.6l5.5 4.8M5.5 14.4V25h21V14.4M16 14.4V25');
  path.setAttribute('fill', 'none');
  path.setAttribute('stroke', '#fffdf8');
  path.setAttribute('stroke-width', '1.7');
  path.setAttribute('stroke-linecap', 'round');
  path.setAttribute('stroke-linejoin', 'round');
  svg.append(rect, path);
  return svg;
}

function monthTable(monthStart, plan, dayMap, ownerLabels, locale) {
  const p = parts(monthStart);
  const grid = monthGrid(p.year, p.month, plan.weekStart);
  const labels = weekdayLabels(plan.weekStart, locale, 'short');
  const table = el('table', { class: 'print-table' });
  const thead = el('thead');
  const headRow = el('tr');
  labels.forEach((label) => headRow.append(el('th', { scope: 'col', text: label })));
  thead.append(headRow);
  const tbody = el('tbody');

  for (let week = 0; week < 6; week += 1) {
    const weekDates = grid.slice(week * 7, week * 7 + 7);
    if (weekDates.every((date) => parts(date).month !== p.month)) continue;
    const row = el('tr');
    for (let day = 0; day < 7; day += 1) {
      const date = grid[week * 7 + day];
      const dateParts = parts(date);
      if (dateParts.month !== p.month) {
        row.append(el('td', { class: 'p-empty' }));
        continue;
      }
      const dayInfo = dayMap.get(date);
      const classes = [`p-${dayInfo.owner}`, dayInfo.holiday ? 'p-holiday' : ''].filter(Boolean).join(' ');
      row.append(el('td', { class: classes },
        el('span', { class: 'p-num', text: String(dateParts.day) }),
        el('span', { class: 'p-owner', text: ownerLabels[dayInfo.owner] }),
        dayInfo.holiday ? el('span', { class: 'p-star', text: '*' }) : null,
      ));
    }
    tbody.append(row);
  }

  table.append(thead, tbody);
  return el('section', { class: 'print-month' },
    el('h2', { text: formatMonthYear(monthStart, locale) }),
    table,
  );
}

function summaryBlock(plan, summary, window, locale) {
  const a = summary.byParent.a;
  const b = summary.byParent.b;
  const aName = ownerName(plan, 'a');
  const bName = ownerName(plan, 'b');
  const rotation = cycleLabel(plan.pattern.cycle, plan.pattern.id);
  const split = Math.round(cyclePercentA(plan.pattern.cycle));
  const handoff = `${formatTime(plan.handoff.time, locale)}${plan.handoff.place ? ` · ${plan.handoff.place}` : ''}`;

  const grid = el('div', { class: 'print-summary-grid' },
    el('div', {}, el('span', { text: 'Parents' }), el('strong', { text: `${aName} & ${bName}` })),
    el('div', {}, el('span', { text: 'Rotation' }), el('strong', { text: `${rotation} · ${split}/${100 - split}` })),
    el('div', {}, el('span', { text: 'Handoffs' }), el('strong', { text: handoff })),
    el('div', {}, el('span', { text: 'Children' }), el('strong', { text: plan.children || '—' })),
  );

  const bar = el('div', { class: 'print-split' },
    el('span', { class: 'print-split-a', style: `width:${a.percent}%` }),
    el('span', { class: 'print-split-b', style: `width:${b.percent}%` }),
  );

  const legend = el('div', { class: 'print-legend' },
    el('span', {}, el('i', { class: 'print-swatch p-a' }), `${aName}: ${a.nights} overnights (${formatPercent(a.percent, locale)})`),
    el('span', {}, el('i', { class: 'print-swatch p-b' }), `${bName}: ${b.nights} overnights (${formatPercent(b.percent, locale)})`),
    el('span', { text: '* holiday or break · the name in each cell marks the parent' }),
  );

  return el('section', { class: 'print-summary' },
    el('div', { class: 'print-window', text: formatRange(window.start, window.end, locale) }),
    grid,
    bar,
    legend,
  );
}

function keyDates(plan, days, window, locale) {
  const rows = [];
  const dayMap = new Map(days.map((day) => [day.date, day]));
  const names = { a: ownerName(plan, 'a'), b: ownerName(plan, 'b') };

  for (const rule of plan.holidays) {
    for (const occurrence of occurrencesInRange(rule, window.start, window.end)) {
      const start = occurrence.start < window.start ? window.start : occurrence.start;
      const end = occurrence.end > window.end ? window.end : occurrence.end;
      const owners = new Set();
      let cursor = start;
      let guard = 0;
      while (cursor <= end && guard < 400) {
        const day = dayMap.get(cursor);
        if (day) owners.add(day.owner);
        const d = new Date(`${cursor}T00:00:00Z`);
        d.setUTCDate(d.getUTCDate() + 1);
        cursor = d.toISOString().slice(0, 10);
        guard += 1;
      }
      const ownerText = owners.size === 1
        ? names[[...owners][0]]
        : `${names.a} / ${names.b}`;
      rows.push({
        start,
        end,
        title: rule.name,
        owner: ownerText,
        note: rule.split !== 'whole' && rule.kind !== 'day' ? 'Split' : '',
      });
    }
  }

  for (const group of groupOverrides(plan.overrides)) {
    if (group.end < window.start || group.start > window.end) continue;
    rows.push({
      start: group.start < window.start ? window.start : group.start,
      end: group.end > window.end ? window.end : group.end,
      title: 'One-off change',
      owner: names[group.owner],
      note: group.note,
    });
  }

  rows.sort((x, y) => (x.start < y.start ? -1 : x.start > y.start ? 1 : 0));

  const table = el('table', { class: 'print-key-table' });
  table.append(el('thead', {}, el('tr', {},
    el('th', { scope: 'col', text: 'Dates' }),
    el('th', { scope: 'col', text: 'Day' }),
    el('th', { scope: 'col', text: 'With' }),
    el('th', { scope: 'col', text: 'Note' }),
  )));
  const tbody = el('tbody');
  for (const row of rows.slice(0, 40)) {
    tbody.append(el('tr', {},
      el('td', { text: formatRange(row.start, row.end, locale) }),
      el('td', { text: row.title }),
      el('td', { text: row.owner }),
      el('td', { text: row.note }),
    ));
  }
  if (!rows.length) {
    tbody.append(el('tr', {}, el('td', { colspan: '4', text: 'No holiday or one-off rules in this window.' })));
  }
  table.append(tbody);

  return el('section', { class: 'print-key' },
    el('h2', { text: 'Key dates & exceptions' }),
    table,
    el('p', { class: 'print-note', text: 'The calendar above is the full plan. Dates outside this window are not shown.' }),
  );
}

export function buildPrint({ root, plan, days, window, summary, locale }) {
  clear(root);
  const dayMap = new Map(days.map((day) => [day.date, day]));
  const labels = {
    a: (plan.parents.a.name.trim().split(/\s+/)[0] || 'Parent A').slice(0, 10),
    b: (plan.parents.b.name.trim().split(/\s+/)[0] || 'Parent B').slice(0, 10),
  };
  const today = new Date();
  const generated = formatDateMedium(
    `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`,
    locale,
  );

  const masthead = el('header', { class: 'print-masthead' },
    el('div', { class: 'print-brand' }, markSvg(), el('span', { text: 'Both Homes' })),
    el('div', { class: 'print-title' },
      el('h1', { text: plan.planName || 'Our parenting plan' }),
      el('p', { text: `Parenting calendar · ${formatMonthYear(window.start, locale)} – ${formatMonthYear(window.end, locale)}` }),
    ),
  );

  const months = el('div', { class: 'print-months' });
  for (let i = 0; i < 12; i += 1) {
    months.append(monthTable(addMonths(window.start, i), plan, dayMap, labels, locale));
  }

  const footer = el('footer', { class: 'print-foot' },
    el('p', { text: `Generated ${generated} with Both Homes. A planning tool, not legal advice — follow your court order or parenting agreement.` }),
    el('p', { text: 'Handoff times are local wall-clock times. Printed calendars are a snapshot; update after any schedule changes.' }),
  );

  root.append(masthead, summaryBlock(plan, summary, window, locale), months, keyDates(plan, days, window, locale), footer);
}
