/** Both Homes — application shell, state and interactions. */

import { eachDay, isISODate, startOfWeek } from './core/dates.js';
import { buildSchedule, summarize } from './core/schedule.js';
import {
  createDefaultPlan,
  normalizePlan,
  planWindow,
} from './core/state.js';
import { loadStoredPlan, savePlan, clearStoredPlan } from './core/storage.js';
import { planFromHash } from './core/share.js';
import { CUSTOM_ID, cycleFromPreset, presetById, resizeCycle } from './core/patterns.js';
import { makeId } from './core/holidays.js';
import { buildPlanCalendar } from './core/ics.js';
import { regionById } from './data/holiday-presets.js';
import {
  detectWeekStart,
  formatDateMedium,
  formatMonthYear,
  formatRange,
  formatTimestamp,
  safeLocale,
} from './core/format.js';
import { $, $$, todayISO } from './ui/dom.js';
import { initToasts, toast } from './ui/toast.js';
import {
  initCalendarKeyboard,
  monthFromDate,
  renderCalendar,
  shiftMonth,
} from './ui/calendar.js';
import {
  ownerName,
  patternSwap,
  renderHolidayList,
  renderLegend,
  renderOverrideList,
  renderPatternPreview,
  renderPills,
  renderPlanForm,
  renderQuickstart,
  renderSummary,
} from './ui/panels.js';
import {
  closeAllDialogs,
  initDialogs,
  openDayDialog,
  openExportDialog,
  openHolidayDialog,
  openPresetDialog,
  openResetDialog,
  openShareDialog,
} from './ui/dialogs.js';
import { downloadFile, planFilename, readTextFile } from './ui/files.js';
import { buildPrint } from './ui/print.js';

const THEME_KEY = 'bothhomes.theme';
const locale = safeLocale(navigator.language);
const today = todayISO();

const refs = {};
let plan;
let viewMonth;
let focusedDate;
let cache = { days: [], window: null, summary: null };
let undoStack = [];
let saveTimer = null;
let storage = null;
let startupError = '';
let loadedFromHash = false;
let theme = 'auto';

function cacheRefs() {
  const ids = [
    'save-state', 'theme-toggle', 'quickstart-patterns',
    'calendar-heading', 'pattern-pill', 'split-pill', 'legend', 'cal-weekdays', 'cal-body',
    'cal-prev', 'cal-next', 'cal-today', 'cal-window',
    'summary-window', 'split-bar', 'split-rows', 'summary-stats', 'window-prev', 'window-next',
    'plan-name', 'parent-a', 'parent-b', 'children', 'pattern-select', 'cycle-preview',
    'pattern-help', 'customize-cycle', 'cycle-editor', 'cycle-length', 'cycle-chips', 'cycle-done',
    'start-date', 'week-start', 'use-monday', 'swap-parents', 'handoff-time', 'handoff-place',
    'save-json', 'save-backup', 'import-json-open', 'import-json',
    'holiday-list', 'holiday-empty', 'add-presets', 'add-holiday',
    'override-list', 'override-empty', 'add-days',
    'reset-plan', 'clear-data', 'print-root',
  ];
  for (const id of ids) {
    const camel = id.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
    refs[camel] = document.getElementById(id);
  }
}

function safeStorage() {
  try {
    const test = '__both_homes_test__';
    window.localStorage.setItem(test, '1');
    window.localStorage.removeItem(test);
    return window.localStorage;
  } catch {
    return null;
  }
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function pushUndo() {
  undoStack.push(clone(plan));
  if (undoStack.length > 20) undoStack.shift();
}

function undoLast() {
  const previous = undoStack.pop();
  if (!previous) {
    toast('Nothing to undo.');
    return;
  }
  plan = normalizePlan(previous, { today });
  if (!isInWindow(viewMonth)) viewMonth = planWindow(plan).start.slice(0, 7);
  renderAll({ form: true });
  scheduleSave();
  toast('Undone.');
}

function isInWindow(month) {
  const win = planWindow(plan);
  return month >= win.start.slice(0, 7) && month <= win.end.slice(0, 7);
}

function setSaveState(kind, text) {
  const node = refs.saveState;
  if (!node) return;
  node.classList.toggle('is-error', kind === 'error');
  const use = node.querySelector('use');
  if (use) use.setAttribute('href', kind === 'error' ? '#i-alert' : kind === 'saving' ? '#i-refresh' : '#i-check');
  const label = node.lastElementChild;
  if (label) label.textContent = text;
  node.title = kind === 'saved'
    ? `Saved in this browser at ${formatTimestamp(new Date(), locale)}`
    : text;
}

function scheduleSave() {
  if (!storage) {
    setSaveState('error', 'Not saved');
    return;
  }
  setSaveState('saving', 'Saving…');
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    const result = savePlan(storage, plan);
    if (result.ok) {
      setSaveState('saved', 'Saved locally');
    } else {
      setSaveState('error', 'Not saved');
      toast(result.error || 'Could not save this plan.');
    }
  }, 260);
}

function renderCalendarView() {
  const result = renderCalendar({
    tbody: refs.calBody,
    weekdaysRow: refs.calWeekdays,
    titleEl: refs.calendarHeading,
    plan,
    viewMonth,
    locale,
    focusedDate,
    onOpen: (date) => {
      focusedDate = date;
      openDayDialog({ date });
    },
  });
  focusedDate = result.focusDate;
}

function renderOutputs() {
  const planYear = planWindow(plan);
  const days = buildSchedule(plan, planYear.start, planYear.end);
  const summary = summarize(days);
  cache = { days, window: planYear, summary };

  renderCalendarView();
  renderLegend(refs.legend, plan);
  renderSummary(
    {
      windowEl: refs.summaryWindow,
      splitBar: refs.splitBar,
      splitRows: refs.splitRows,
      statsEl: refs.summaryStats,
    },
    { plan, summary, window: planYear, locale },
  );
  renderPills(refs.patternPill, refs.splitPill, plan);
  renderHolidayList(refs.holidayList, refs.holidayEmpty, plan, onHolidayAction);
  renderOverrideList(refs.overrideList, refs.overrideEmpty, plan, onOverrideAction, locale);
  updateQuickstartActive();

  refs.calWindow.textContent = `Plan year · ${formatMonthYear(planYear.start, locale)} – ${formatMonthYear(planYear.end, locale)}`;
}

function renderAll({ form = false } = {}) {
  renderOutputs();
  if (form) renderPlanForm(refs, plan, locale);
}

function updateQuickstartActive() {
  const current = plan.pattern.cycle.join('');
  for (const chip of $$('.qs-chip', refs.quickstartPatterns)) {
    const preset = presetById(chip.dataset.pattern);
    const active = preset ? preset.cycle.join('') === current : false;
    chip.classList.toggle('is-active', active);
    chip.setAttribute('aria-pressed', active ? 'true' : 'false');
  }
}

function focusDay(date) {
  if (!isISODate(date)) return;
  const month = date.slice(0, 7);
  if (month !== viewMonth) {
    viewMonth = month;
    renderCalendarView();
  }
  focusedDate = date;
  for (const button of $$('.cal-day', refs.calBody)) {
    button.tabIndex = button.dataset.date === date ? 0 : -1;
  }
  refs.calBody.querySelector(`.cal-day[data-date="${date}"]`)?.focus();
}

function setMonth(month) {
  viewMonth = month;
  renderCalendarView();
}

/* ---------- Plan mutations ---------- */

function applyPreset(id) {
  const cycle = cycleFromPreset(id);
  const preset = presetById(id);
  if (!cycle || !preset) return;
  pushUndo();
  plan.pattern = { id: preset.id, cycle };
  plan = normalizePlan(plan, { today });
  renderAll({ form: true });
  scheduleSave();
  toast(`${preset.label} applied.`, { actionLabel: 'Undo', onAction: undoLast });
}

function saveDay({ start, end, owner, note }) {
  const dates = eachDay(start, end);
  if (!dates.length) {
    toast('That date range is too long. Choose 180 nights or fewer.');
    return;
  }
  const hadChange = dates.some((date) => plan.overrides[date]);
  if (owner === 'auto' && !hadChange) {
    toast('Nothing to remove in that range.');
    focusDay(start);
    return;
  }
  pushUndo();
  if (owner === 'auto') {
    for (const date of dates) delete plan.overrides[date];
  } else {
    for (const date of dates) plan.overrides[date] = { owner, note: note || '' };
  }
  plan = normalizePlan(plan, { today });
  renderAll({ form: false });
  scheduleSave();
  const message = owner === 'auto'
    ? 'Change removed.'
    : `${formatRange(start, end, locale)} saved for ${ownerName(plan, owner)}.`;
  toast(message, { actionLabel: 'Undo', onAction: undoLast });
  focusDay(start);
}

function clearDays({ start, end }) {
  const dates = eachDay(start, end);
  if (!dates.some((date) => plan.overrides[date])) {
    toast('No saved change in that range.');
    return;
  }
  pushUndo();
  for (const date of dates) delete plan.overrides[date];
  plan = normalizePlan(plan, { today });
  renderAll({ form: false });
  scheduleSave();
  toast('Change removed.', { actionLabel: 'Undo', onAction: undoLast });
  focusDay(start);
}

function saveHoliday(rule, existingId) {
  pushUndo();
  if (existingId) {
    const index = plan.holidays.findIndex((item) => item.id === existingId);
    if (index >= 0) plan.holidays[index] = rule;
    else plan.holidays.push(rule);
  } else {
    plan.holidays.push(rule);
  }
  plan = normalizePlan(plan, { today });
  renderAll({ form: false });
  scheduleSave();
  toast(`${rule.name} saved.`, { actionLabel: 'Undo', onAction: undoLast });
  refs.addHoliday.focus();
}

function deleteHoliday(id) {
  const rule = plan.holidays.find((item) => item.id === id);
  if (!rule) return;
  pushUndo();
  plan.holidays = plan.holidays.filter((item) => item.id !== id);
  plan = normalizePlan(plan, { today });
  renderAll({ form: false });
  scheduleSave();
  toast(`${rule.name} deleted.`, { actionLabel: 'Undo', onAction: undoLast });
  refs.addHoliday.focus();
}

function moveHoliday(id, direction) {
  const index = plan.holidays.findIndex((item) => item.id === id);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= plan.holidays.length) return;
  pushUndo();
  const [rule] = plan.holidays.splice(index, 1);
  plan.holidays.splice(target, 0, rule);
  plan = normalizePlan(plan, { today });
  renderAll({ form: false });
  scheduleSave();
  toast(`${rule.name} moved ${direction < 0 ? 'up' : 'down'}.`, { actionLabel: 'Undo', onAction: undoLast });
  const row = refs.holidayList.children[target];
  row?.querySelector('button')?.focus();
}

function addPresets(regionId, keys) {
  const region = regionById(regionId);
  const items = region.items.filter((item) => keys.includes(item.key));
  const additions = items
    .filter((item) => !plan.holidays.some((rule) => rule.name.toLowerCase() === item.name.toLowerCase()))
    .map((item) => ({ id: makeId('h'), name: item.name, ...clone(item.rule) }));
  if (!additions.length) {
    toast('Those holidays are already in this plan.');
    return;
  }
  pushUndo();
  plan.holidays.push(...additions);
  plan = normalizePlan(plan, { today });
  renderAll({ form: false });
  scheduleSave();
  toast(`${additions.length} holiday rule${additions.length === 1 ? '' : 's'} added.`, {
    actionLabel: 'Undo',
    onAction: undoLast,
  });
  refs.addPresets.focus();
}

function onHolidayAction(action, id) {
  const rule = plan.holidays.find((item) => item.id === id);
  if (!rule) return;
  if (action === 'holiday-edit') openHolidayDialog(rule);
  else if (action === 'holiday-delete') deleteHoliday(id);
  else if (action === 'holiday-up') moveHoliday(id, -1);
  else if (action === 'holiday-down') moveHoliday(id, 1);
}

function onOverrideAction(action, group) {
  if (action === 'override-edit') {
    focusedDate = group.start;
    openDayDialog({ date: group.start, group });
  } else if (action === 'override-delete') {
    clearDays({ start: group.start, end: group.end });
  }
}

function swapParents() {
  pushUndo();
  plan = patternSwap(plan);
  plan = normalizePlan(plan, { today });
  renderAll({ form: true });
  scheduleSave();
  toast('Parents swapped across the rotation.', { actionLabel: 'Undo', onAction: undoLast });
}

function useMonday() {
  const monday = startOfWeek(plan.startDate, 'mon');
  if (monday === plan.startDate) {
    toast('The pattern already starts on a Monday.');
    return;
  }
  plan.startDate = monday;
  plan.windowOffset = 0;
  viewMonth = monday.slice(0, 7);
  focusedDate = monday;
  plan = normalizePlan(plan, { today });
  renderAll({ form: true });
  scheduleSave();
  toast(`Pattern now starts ${formatDateMedium(monday, locale)}.`);
}

function resetPlan() {
  pushUndo();
  plan = createDefaultPlan(today, plan.weekStart);
  const planYear = planWindow(plan);
  viewMonth = planYear.start.slice(0, 7);
  focusedDate = plan.startDate;
  renderAll({ form: true });
  scheduleSave();
  toast('Plan reset.', { actionLabel: 'Undo', onAction: undoLast });
  refs.resetPlan.focus();
}

/* ---------- Downloads and print ---------- */

function downloadJson() {
  downloadFile(planFilename(today), JSON.stringify(plan, null, 2), 'application/json');
  toast('Plan file saved.');
}

function downloadIcs(owner, includeHandoffs) {
  if (!cache.days.length) return;
  const result = buildPlanCalendar({
    plan,
    days: cache.days,
    forParent: owner,
    includeHandoffs,
  });
  downloadFile(result.filename, result.ics, 'text/calendar');
  toast(`Calendar downloaded · ${result.events} event${result.events === 1 ? '' : 's'}.`);
}

function printPlan() {
  closeAllDialogs();
  buildPrint({
    root: refs.printRoot,
    plan,
    days: cache.days,
    window: cache.window,
    summary: cache.summary,
    locale,
  });
  setTimeout(() => window.print(), 80);
}

async function importFile(file) {
  try {
    const text = await readTextFile(file);
    const parsed = JSON.parse(text);
    const next = normalizePlan(parsed, { today });
    pushUndo();
    plan = next;
    const planYear = planWindow(plan);
    viewMonth = planYear.start.slice(0, 7);
    focusedDate = plan.startDate;
    renderAll({ form: true });
    scheduleSave();
    closeAllDialogs();
    toast('Plan restored from file.', { actionLabel: 'Undo', onAction: undoLast });
  } catch (error) {
    toast(error?.message || 'That plan file could not be read.');
  }
}

/* ---------- Theme ---------- */

function resolvedTheme() {
  if (theme === 'light' || theme === 'dark') return theme;
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme() {
  const resolved = resolvedTheme();
  document.documentElement.dataset.theme = resolved;
  document.documentElement.style.colorScheme = resolved;
  const button = refs.themeToggle;
  if (!button) return;
  const dark = resolved === 'dark';
  button.setAttribute('aria-label', dark ? 'Switch to light theme' : 'Switch to dark theme');
  button.title = dark ? 'Switch to light theme' : 'Switch to dark theme';
  button.querySelector('use')?.setAttribute('href', dark ? '#i-sun' : '#i-moon');
}

function toggleTheme() {
  theme = resolvedTheme() === 'dark' ? 'light' : 'dark';
  try {
    storage?.setItem(THEME_KEY, theme);
  } catch {
    // A private-mode storage failure should not stop the visual change.
  }
  applyTheme();
}

/* ---------- Boot ---------- */

function initState() {
  storage = safeStorage();
  const stored = loadStoredPlan(storage, { today });
  if (stored.error) startupError = stored.error;

  let candidate = stored.plan;
  try {
    const fromLink = planFromHash(window.location.hash, { today });
    if (fromLink) {
      candidate = fromLink;
      loadedFromHash = true;
    }
  } catch (error) {
    startupError = error.message || 'That share link could not be read.';
  }

  if (!candidate) {
    candidate = createDefaultPlan(today, detectWeekStart(locale));
    const params = new URLSearchParams(window.location.search);
    const requested = params.get('pattern');
    if (requested && presetById(requested)) {
      candidate.pattern = { id: requested, cycle: cycleFromPreset(requested) };
      cleanUrl({ query: true });
      setTimeout(() => toast(`${presetById(requested).label} loaded from the guide.`), 700);
    }
  }

  plan = normalizePlan(candidate, { today });
  const planYear = planWindow(plan);
  const thisMonth = today.slice(0, 7);
  const inWindow = thisMonth >= planYear.start.slice(0, 7) && thisMonth <= planYear.end.slice(0, 7);
  viewMonth = inWindow ? thisMonth : planYear.start.slice(0, 7);
  focusedDate = inWindow ? today : planYear.start;

  try {
    theme = storage?.getItem(THEME_KEY) || 'auto';
  } catch {
    theme = 'auto';
  }
  if (!['auto', 'light', 'dark'].includes(theme)) theme = 'auto';
}

function cleanUrl({ query = false } = {}) {
  try {
    const url = query ? window.location.pathname : `${window.location.pathname}${window.location.search}`;
    window.history.replaceState(null, '', url);
  } catch {
    // History is unavailable in some embedded contexts; the app still works.
  }
}

function bindEvents() {
  refs.themeToggle.addEventListener('click', toggleTheme);

  refs.calPrev.addEventListener('click', () => setMonth(shiftMonth(viewMonth, -1)));
  refs.calNext.addEventListener('click', () => setMonth(shiftMonth(viewMonth, 1)));
  refs.calToday.addEventListener('click', () => {
    viewMonth = today.slice(0, 7);
    focusedDate = today;
    renderCalendarView();
    focusDay(today);
  });

  refs.windowPrev.addEventListener('click', () => {
    plan.windowOffset = Math.max(-24, plan.windowOffset - 1);
    const planYear = planWindow(plan);
    viewMonth = planYear.start.slice(0, 7);
    focusedDate = planYear.start;
    renderAll({ form: false });
    scheduleSave();
  });
  refs.windowNext.addEventListener('click', () => {
    plan.windowOffset = Math.min(24, plan.windowOffset + 1);
    const planYear = planWindow(plan);
    viewMonth = planYear.start.slice(0, 7);
    focusedDate = planYear.start;
    renderAll({ form: false });
    scheduleSave();
  });

  refs.quickstartPatterns.addEventListener('click', (event) => {
    const chip = event.target.closest('.qs-chip');
    if (chip?.dataset.pattern) applyPreset(chip.dataset.pattern);
  });

  refs.calBody.addEventListener('calendar:month', (event) => {
    const date = event.detail.date;
    viewMonth = monthFromDate(date);
    focusedDate = date;
    renderCalendarView();
    refs.calBody.querySelector(`.cal-day[data-date="${date}"]`)?.focus();
  });
  initCalendarKeyboard(refs.calBody, {
    getPlan: () => plan,
    onFocus: (date) => {
      focusedDate = date;
      for (const button of $$('.cal-day', refs.calBody)) {
        button.tabIndex = button.dataset.date === date ? 0 : -1;
      }
    },
  });

  refs.planName.addEventListener('input', () => {
    plan.planName = refs.planName.value.slice(0, 60);
    scheduleSave();
  });
  refs.planName.addEventListener('blur', () => {
    plan.planName = refs.planName.value.trim() || 'Our parenting plan';
    refs.planName.value = plan.planName;
    scheduleSave();
  });

  for (const [input, owner] of [[refs.parentA, 'a'], [refs.parentB, 'b']]) {
    input.addEventListener('input', () => {
      plan.parents[owner].name = input.value.slice(0, 48);
      renderOutputs();
      scheduleSave();
    });
    input.addEventListener('blur', () => {
      plan.parents[owner].name = input.value.trim();
      input.value = plan.parents[owner].name;
      renderOutputs();
      scheduleSave();
    });
  }

  refs.children.addEventListener('input', () => {
    plan.children = refs.children.value.slice(0, 80);
    scheduleSave();
  });
  refs.children.addEventListener('blur', () => {
    plan.children = refs.children.value.trim();
    refs.children.value = plan.children;
    scheduleSave();
  });

  refs.patternSelect.addEventListener('change', () => {
    const id = refs.patternSelect.value;
    if (id === CUSTOM_ID) {
      plan.pattern.id = CUSTOM_ID;
      plan = normalizePlan(plan, { today });
      renderAll({ form: true });
      scheduleSave();
      refs.cycleLength.focus();
      return;
    }
    applyPreset(id);
  });

  refs.cycleChips.addEventListener('click', (event) => {
    const chip = event.target.closest('.cycle-chip');
    if (!chip) return;
    const index = Number(chip.dataset.index);
    plan.pattern.cycle[index] = plan.pattern.cycle[index] === 'a' ? 'b' : 'a';
    plan.pattern.id = CUSTOM_ID;
    plan = normalizePlan(plan, { today });
    renderAll({ form: true });
    scheduleSave();
    refs.cycleChips.querySelector(`[data-index="${index}"]`)?.focus();
  });

  refs.cycleLength.addEventListener('change', () => {
    const length = Number(refs.cycleLength.value);
    if (!Number.isFinite(length) || length < 2 || length > 28) {
      refs.cycleLength.value = String(plan.pattern.cycle.length);
      toast('Cycle length must be between 2 and 28 days.');
      return;
    }
    plan.pattern.cycle = resizeCycle(plan.pattern.cycle, length);
    plan.pattern.id = CUSTOM_ID;
    plan = normalizePlan(plan, { today });
    renderAll({ form: true });
    scheduleSave();
  });

  refs.customizeCycle.addEventListener('click', () => {
    if (refs.cycleEditor.hidden) {
      if (plan.pattern.id !== CUSTOM_ID) {
        plan.pattern.id = CUSTOM_ID;
        plan = normalizePlan(plan, { today });
        renderAll({ form: true });
        scheduleSave();
      } else {
        renderPlanForm(refs, plan, locale);
      }
      refs.cycleEditor.hidden = false;
      refs.customizeCycle.setAttribute('aria-expanded', 'true');
      refs.cycleChips.querySelector('button')?.focus();
    } else {
      refs.cycleEditor.hidden = true;
      refs.customizeCycle.setAttribute('aria-expanded', 'false');
      refs.customizeCycle.focus();
    }
  });

  refs.cycleDone.addEventListener('click', () => {
    refs.cycleEditor.hidden = true;
    refs.customizeCycle.setAttribute('aria-expanded', 'false');
    refs.customizeCycle.focus();
  });

  refs.startDate.addEventListener('change', () => {
    if (!isISODate(refs.startDate.value)) {
      refs.startDate.value = plan.startDate;
      toast('Choose a valid start date.');
      return;
    }
    plan.startDate = refs.startDate.value;
    plan.windowOffset = 0;
    plan = normalizePlan(plan, { today });
    viewMonth = plan.startDate.slice(0, 7);
    focusedDate = plan.startDate;
    renderAll({ form: true });
    scheduleSave();
  });

  refs.weekStart.addEventListener('change', () => {
    plan.weekStart = refs.weekStart.value === 'mon' ? 'mon' : 'sun';
    renderAll({ form: false });
    scheduleSave();
  });

  refs.useMonday.addEventListener('click', useMonday);
  refs.swapParents.addEventListener('click', swapParents);

  refs.handoffTime.addEventListener('change', () => {
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(refs.handoffTime.value)) {
      refs.handoffTime.value = plan.handoff.time;
      toast('Choose a valid handoff time.');
      return;
    }
    plan.handoff.time = refs.handoffTime.value;
    scheduleSave();
  });

  refs.handoffPlace.addEventListener('input', () => {
    plan.handoff.place = refs.handoffPlace.value.slice(0, 80);
    scheduleSave();
  });
  refs.handoffPlace.addEventListener('blur', () => {
    plan.handoff.place = refs.handoffPlace.value.trim();
    refs.handoffPlace.value = plan.handoff.place;
    scheduleSave();
  });

  refs.addHoliday.addEventListener('click', () => openHolidayDialog(null));
  refs.addPresets.addEventListener('click', openPresetDialog);
  refs.addDays.addEventListener('click', () => {
    const date = today.slice(0, 7) === viewMonth ? today : `${viewMonth}-01`;
    openDayDialog({ date, mode: 'add' });
  });

  refs.resetPlan.addEventListener('click', openResetDialog);
  refs.saveJson.addEventListener('click', downloadJson);
  refs.saveBackup.addEventListener('click', downloadJson);
  refs.importJsonOpen.addEventListener('click', () => refs.importJson.click());

  refs.importJson.addEventListener('change', () => {
    const [file] = refs.importJson.files || [];
    refs.importJson.value = '';
    if (file) importFile(file);
  });

  refs.clearData.addEventListener('click', () => {
    const ok = window.confirm(
      'Clear the plan and theme saved in this browser? Export a backup first if you need it. Files and share links you already made are not affected.',
    );
    if (!ok) return;
    clearStoredPlan(storage);
    try {
      storage?.removeItem(THEME_KEY);
    } catch {
      // Ignore storage failures; clearing the plan is the important part.
    }
    undoStack = [];
    theme = 'auto';
    applyTheme();
    plan = createDefaultPlan(today, detectWeekStart(locale));
    viewMonth = plan.startDate.slice(0, 7);
    focusedDate = plan.startDate;
    cleanUrl({ query: true });
    renderAll({ form: true });
    scheduleSave();
    toast('This browser’s plan data was cleared.');
  });

  document.addEventListener('click', (event) => {
    const opener = event.target.closest('[data-open]');
    if (opener) {
      const handlers = {
        'export-dialog': openExportDialog,
        'share-dialog': openShareDialog,
      };
      const handler = handlers[opener.dataset.open];
      if (handler) {
        event.preventDefault();
        handler();
      }
      return;
    }
    const printButton = event.target.closest('[data-action="print"]');
    if (printButton) {
      event.preventDefault();
      printPlan();
    }
  });

  window.matchMedia?.('(prefers-color-scheme: dark)').addEventListener?.('change', () => {
    if (theme === 'auto') applyTheme();
  });

  window.addEventListener('hashchange', () => {
    if (!window.location.hash) return;
    try {
      const shared = planFromHash(window.location.hash, { today });
      if (!shared) return;
      pushUndo();
      plan = shared;
      const planYear = planWindow(plan);
      viewMonth = planYear.start.slice(0, 7);
      focusedDate = plan.startDate;
      renderAll({ form: true });
      scheduleSave();
      cleanUrl();
      toast('Shared plan loaded.', { actionLabel: 'Undo', onAction: undoLast });
    } catch (error) {
      toast(error.message || 'That share link could not be read.');
    }
  });
}

function init() {
  cacheRefs();
  initToasts($('#toasts'));
  initState();
  applyTheme();

  renderQuickstart(refs.quickstartPatterns, plan, applyPreset);
  renderAll({ form: true });

  initDialogs({
    locale,
    today,
    getPlan: () => plan,
    getDays: () => cache.days,
    getShareBaseUrl: () => `${window.location.origin}${window.location.pathname}`,
    onDaySave: saveDay,
    onDayClear: clearDays,
    onHolidaySave: saveHoliday,
    onHolidayDelete: deleteHoliday,
    onAddPresets: addPresets,
    onDownloadIcs: downloadIcs,
    onDownloadJson: downloadJson,
    onRequestImport: () => refs.importJson.click(),
    onReset: resetPlan,
  });

  bindEvents();

  const initialSave = savePlan(storage, plan);
  if (initialSave.ok) setSaveState('saved', 'Saved locally');
  else setSaveState('error', 'Not saved');

  if (loadedFromHash) {
    cleanUrl();
    toast('Shared plan opened and saved on this device.');
  }
  if (startupError) toast(startupError, { duration: 7000 });
  if (!storage) {
    toast('This browser is blocking local storage. Your plan works, but export it before closing the tab.', { duration: 9000 });
  }

}

init();
