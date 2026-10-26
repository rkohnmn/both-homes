/** Month calendar rendering, roving focus and day-cell accessibility. */

import {
  addDays,
  addMonths,
  isISODate,
  monthGrid,
  parts,
  startOfMonth,
  startOfWeek,
  endOfMonth,
} from '../core/dates.js';
import { weekdayLabels, formatMonthYear, formatDateLong } from '../core/format.js';
import { buildSchedule } from '../core/schedule.js';
import { clear, el, icon } from './dom.js';

export function monograms(plan) {
  const a = plan.parents.a.name.trim() || 'Parent A';
  const b = plan.parents.b.name.trim() || 'Parent B';
  if (!plan.parents.a.name.trim() && !plan.parents.b.name.trim()) {
    // Neutral defaults read as A/B rather than two identical "P" chips.
    return { a: 'A', b: 'B' };
  }
  let first = a.charAt(0).toUpperCase();
  let second = b.charAt(0).toUpperCase();
  if (first === second) {
    first = a.slice(0, 2).toUpperCase();
    second = b.slice(0, 2).toUpperCase();
    if (first === second) {
      first = 'A';
      second = 'B';
    }
  }
  return { a: first, b: second };
}

export function ownerName(plan, owner) {
  return plan.parents[owner].name.trim() || `Parent ${owner.toUpperCase()}`;
}

function dayLabel(plan, day, locale) {
  const name = ownerName(plan, day.owner);
  const pieces = [formatDateLong(day.date, locale), `${name} has this night.`];
  if (day.source === 'holiday') pieces.push(`Holiday rule: ${day.holiday}.`);
  else if (day.source === 'override') pieces.push('Changed from the rotation.');
  else pieces.push('From the rotation.');
  if (day.note) pieces.push(`Note: ${day.note}`);
  return pieces.join(' ');
}

export function renderCalendar({
  tbody,
  weekdaysRow,
  titleEl,
  plan,
  viewMonth,
  locale,
  focusedDate,
  onOpen,
}) {
  const [year, month] = viewMonth.split('-').map(Number);
  const grid = monthGrid(year, month, plan.weekStart);
  const scheduled = buildSchedule(plan, grid[0], grid[grid.length - 1]);
  const byDate = new Map(scheduled.map((day) => [day.date, day]));
  const marks = monograms(plan);
  const today = new Date();
  const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const fallbackFocus = grid.find((date) => parts(date).month === month) || grid[0];
  const focusDate = isISODate(focusedDate) && grid.includes(focusedDate) ? focusedDate : fallbackFocus;

  titleEl.textContent = formatMonthYear(startOfMonth(`${viewMonth}-01`), locale);

  clear(weekdaysRow);
  const labels = weekdayLabels(plan.weekStart, locale);
  labels.forEach((label, index) => {
    const weekday = (index + (plan.weekStart === 'mon' ? 1 : 0)) % 7;
    weekdaysRow.append(el('th', {
      scope: 'col',
      class: weekday === 0 || weekday === 6 ? 'is-weekend' : '',
      text: label,
    }));
  });

  clear(tbody);
  for (let week = 0; week < 6; week += 1) {
    // Skip a trailing week that belongs entirely to the next month.
    if (week === 5 && grid.slice(35, 42).every((date) => parts(date).month !== month)) break;
    const row = el('tr');
    for (let dayIndex = 0; dayIndex < 7; dayIndex += 1) {
      const date = grid[week * 7 + dayIndex];
      const day = byDate.get(date);
      const outside = parts(date).month !== month;
      const isToday = date === todayIso;
      const classes = [
        'cal-day',
        `owner-${day.owner}`,
        outside ? 'is-outside' : '',
        isToday ? 'is-today' : '',
        day.source === 'override' ? 'is-changed' : '',
      ].filter(Boolean).join(' ');

      const top = el('span', { class: 'cal-top' },
        el('span', { class: 'cal-daynum', text: String(parts(date).day) }),
        day.holiday
          ? el('span', { class: 'cal-flag' }, icon('star'), el('span', { class: 'cal-holiday', text: day.holiday }))
          : null,
      );

      const bottom = el('span', { class: 'cal-bottom' },
        el('span', { class: 'cal-monogram', 'aria-hidden': 'true', text: marks[day.owner] }),
        day.note ? el('span', { class: 'cal-note-dot', title: day.note }) : null,
      );

      const button = el('button', {
        type: 'button',
        class: classes,
        dataset: { date },
        'aria-label': dayLabel(plan, day, locale),
        'aria-haspopup': 'dialog',
        tabindex: date === focusDate ? '0' : '-1',
        title: day.note || `${ownerName(plan, day.owner)}${day.holiday ? ` · ${day.holiday}` : ''}`,
      }, top, bottom);

      button.addEventListener('click', () => onOpen(date));
      row.append(el('td', {}, button));
    }
    tbody.append(row);
  }

  return { grid, focusDate };
}

/**
 * Arrow-key navigation over the rendered month. Attached once; reads the
 * current plan lazily so re-renders do not need new listeners.
 */
export function initCalendarKeyboard(tbody, { getPlan, onFocus }) {
  tbody.addEventListener('keydown', (event) => {
    const button = event.target.closest('.cal-day');
    if (!button) return;
    const current = button.dataset.date;
    const plan = getPlan();
    let next = null;

    switch (event.key) {
      case 'ArrowLeft': next = addDays(current, -1); break;
      case 'ArrowRight': next = addDays(current, 1); break;
      case 'ArrowUp': next = addDays(current, -7); break;
      case 'ArrowDown': next = addDays(current, 7); break;
      case 'Home': next = startOfWeek(current, plan.weekStart); break;
      case 'End': next = addDays(startOfWeek(current, plan.weekStart), 6); break;
      default: return;
    }

    event.preventDefault();
    onFocus(next);
    const target = tbody.querySelector(`.cal-day[data-date="${next}"]`);
    if (target) {
      target.focus();
    } else {
      // Moved into a neighbouring month; ask the app to change the view.
      tbody.dispatchEvent(new CustomEvent('calendar:month', {
        bubbles: true,
        detail: { date: next },
      }));
    }
  });
}

export function monthFromDate(date) {
  return date.slice(0, 7);
}

export function shiftMonth(viewMonth, amount) {
  return monthFromDate(addMonths(`${viewMonth}-01`, amount));
}

export function monthBounds(viewMonth) {
  const start = startOfMonth(`${viewMonth}-01`);
  return { start, end: endOfMonth(start) };
}
