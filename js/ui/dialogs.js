/** Modal workflows. Each open() reads the latest plan from the app. */

import { addDays, diffDays, isISODate, spanDays } from '../core/dates.js';
import { WEEKDAY_NAMES, MONTH_NAMES, makeId, validateRule } from '../core/holidays.js';
import { buildShareUrl } from '../core/share.js';
import { groupOverrides, resolveDay } from '../core/schedule.js';
import { formatDateLong } from '../core/format.js';
import { HOLIDAY_REGIONS, regionById } from '../data/holiday-presets.js';
import { $, $$, clear, el, formatBytes } from './dom.js';
import { renderExportRows, ownerName } from './panels.js';
import { toast } from './toast.js';

let api = null;
const refs = {};
let activeDay = '';
let editingHoliday = null;

function closeDialog(dialog) {
  if (dialog?.open) dialog.close();
}

function openDialog(dialog) {
  for (const other of $$('dialog[open]')) {
    if (other !== dialog) other.close();
  }
  if (!dialog.open) dialog.showModal();
}

function cache() {
  const ids = [
    'day-dialog', 'day-form', 'day-dialog-title', 'day-dialog-eyebrow', 'day-status',
    'day-start', 'day-end', 'day-note', 'day-error', 'day-clear', 'day-a-name', 'day-b-name',
    'holiday-dialog', 'holiday-form', 'holiday-dialog-title', 'holiday-name', 'holiday-kind',
    'holiday-day-rule', 'holiday-month', 'holiday-month-nth', 'holiday-day', 'holiday-nth',
    'holiday-weekday', 'holiday-span', 'range-from-month', 'range-from-day', 'range-to-month',
    'range-to-day', 'dates-start', 'dates-end', 'holiday-assignment', 'holiday-alternate-start',
    'holiday-split', 'holiday-error', 'holiday-delete', 'split-field', 'alternate-field',
    'preset-dialog', 'preset-form', 'preset-region', 'preset-list', 'preset-error',
    'export-dialog', 'export-handoffs', 'export-list', 'share-dialog', 'share-url',
    'share-names', 'share-notes', 'share-copy', 'share-meta', 'share-download', 'share-import',
    'reset-dialog', 'reset-confirm',
  ];
  for (const id of ids) {
    const camel = id.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
    refs[camel] = document.getElementById(id);
  }
}

function fillSelects() {
  for (const select of [refs.holidayMonth, refs.holidayMonthNth, refs.rangeFromMonth, refs.rangeToMonth]) {
    clear(select);
    MONTH_NAMES.forEach((name, index) => {
      select.append(el('option', { value: String(index + 1), text: name }));
    });
  }
  clear(refs.holidayWeekday);
  WEEKDAY_NAMES.forEach((name, index) => {
    refs.holidayWeekday.append(el('option', { value: String(index), text: name }));
  });
  clear(refs.presetRegion);
  for (const region of HOLIDAY_REGIONS) {
    refs.presetRegion.append(el('option', { value: region.id, text: region.label }));
  }
}

function updateHolidayVisibility() {
  const kind = refs.holidayKind.value;
  for (const group of $$('.field-group[data-kind]', refs.holidayForm)) {
    group.hidden = group.dataset.kind !== kind;
  }
  for (const row of $$('[data-day-rule]', refs.holidayForm)) {
    row.hidden = row.dataset.dayRule !== refs.holidayDayRule.value;
  }
  refs.splitField.hidden = kind === 'day';
  refs.alternateField.hidden = refs.holidayAssignment.value !== 'alternate';
}

function currentGroup(date, plan) {
  return groupOverrides(plan.overrides).find((group) => date >= group.start && date <= group.end) || null;
}

export function openDayDialog({ date, mode = 'day', group = null }) {
  const plan = api.getPlan();
  const locale = api.locale;
  const found = group || currentGroup(date, plan);
  const resolved = resolveDay(plan, date);
  activeDay = date;

  const who = ownerName(plan, resolved.owner);
  let status = `${who} has this night`;
  if (resolved.source === 'override') {
    status += ` — changed from the rotation (originally ${ownerName(plan, resolved.baseOwner)}).`;
    if (resolved.holiday) status += ` The “${resolved.holiday}” rule also covers it.`;
  } else if (resolved.source === 'holiday') {
    status += ` — from the “${resolved.holiday}” holiday rule.`;
  } else {
    status += ' — from the base rotation.';
  }
  if (found && found.nights > 1) status += ` This change covers ${found.nights} nights.`;
  refs.dayStatus.textContent = status;

  refs.dayDialogTitle.textContent = formatDateLong(date, locale);
  refs.dayDialogEyebrow.textContent = mode === 'add' ? 'Add an exception' : 'Night of';
  refs.dayAName.textContent = ownerName(plan, 'a');
  refs.dayBName.textContent = ownerName(plan, 'b');
  refs.dayStart.value = found?.start || date;
  refs.dayEnd.value = found && found.end > found.start ? found.end : '';
  refs.dayNote.value = found?.note || '';
  refs.dayError.hidden = true;

  const selected = found?.owner || 'auto';
  for (const radio of $$('input[name="day-owner"]', refs.dayForm)) {
    radio.checked = radio.value === selected;
  }
  refs.dayClear.hidden = !found;
  openDialog(refs.dayDialog);
}

export function openHolidayDialog(rule = null) {
  const now = new Date();
  const month = now.getMonth() + 1;
  editingHoliday = rule;

  refs.holidayDialogTitle.textContent = rule ? 'Edit holiday rule' : 'Add a holiday or break';
  refs.holidayName.value = rule?.name || '';
  refs.holidayKind.value = rule?.kind || 'day';
  refs.holidayDayRule.value = rule?.dayRule || 'fixed';
  refs.holidayMonth.value = String(rule?.month || month);
  refs.holidayMonthNth.value = String(rule?.month || month);
  refs.holidayDay.value = String(rule?.day || 1);
  refs.holidayNth.value = String(rule?.nth ?? 1);
  refs.holidayWeekday.value = String(rule?.weekday ?? 1);
  refs.holidaySpan.value = String(rule?.spanDays || 1);
  refs.rangeFromMonth.value = String(rule?.fromMonth || 6);
  refs.rangeFromDay.value = String(rule?.fromDay || 15);
  refs.rangeToMonth.value = String(rule?.toMonth || 8);
  refs.rangeToDay.value = String(rule?.toDay || 15);
  refs.datesStart.value = rule?.start || api.today;
  refs.datesEnd.value = rule?.end || addDays(api.today, 7);
  refs.holidayAssignment.value = rule?.assignment || 'alternate';
  refs.holidayAlternateStart.value = rule?.alternateStart || 'a';
  refs.holidaySplit.value = rule?.split && rule.split !== 'whole' ? rule.split : 'halves';
  refs.holidayDelete.hidden = !rule;
  refs.holidayError.hidden = true;
  updateHolidayVisibility();
  openDialog(refs.holidayDialog);
  refs.holidayName.focus();
}

function readHolidayForm() {
  const kind = refs.holidayKind.value;
  const dayRule = refs.holidayDayRule.value;
  const rule = {
    id: editingHoliday?.id || makeId('h'),
    name: refs.holidayName.value.trim(),
    kind,
    assignment: refs.holidayAssignment.value,
    alternateStart: refs.holidayAlternateStart.value,
    split: kind === 'day' ? 'whole' : refs.holidaySplit.value,
  };
  if (kind === 'day') {
    rule.dayRule = dayRule;
    rule.month = Number(dayRule === 'nth' ? refs.holidayMonthNth.value : refs.holidayMonth.value);
    rule.day = Number(refs.holidayDay.value);
    rule.weekday = Number(refs.holidayWeekday.value);
    rule.nth = Number(refs.holidayNth.value);
    rule.spanDays = Number(refs.holidaySpan.value);
  } else if (kind === 'range') {
    rule.fromMonth = Number(refs.rangeFromMonth.value);
    rule.fromDay = Number(refs.rangeFromDay.value);
    rule.toMonth = Number(refs.rangeToMonth.value);
    rule.toDay = Number(refs.rangeToDay.value);
  } else {
    rule.start = refs.datesStart.value;
    rule.end = refs.datesEnd.value;
  }
  return rule;
}

export function openPresetDialog() {
  renderPresetList();
  refs.presetError.hidden = true;
  openDialog(refs.presetDialog);
}

function renderPresetList() {
  const plan = api.getPlan();
  const region = regionById(refs.presetRegion.value);
  clear(refs.presetList);
  for (const item of region.items) {
    const already = plan.holidays.some((rule) => rule.name.toLowerCase() === item.name.toLowerCase());
    const checkbox = el('input', {
      type: 'checkbox',
      value: item.key,
      checked: item.selected && !already,
      disabled: already,
    });
    refs.presetList.append(el('label', { class: 'check preset-option' },
      checkbox,
      el('span', {},
        el('strong', { text: item.name }),
        el('small', { text: already ? 'Already in this plan' : item.description }),
      ),
    ));
  }
}

export function openExportDialog() {
  renderExport();
  openDialog(refs.exportDialog);
}

function renderExport() {
  const plan = api.getPlan();
  renderExportRows(refs.exportList, {
    plan,
    days: api.getDays(),
    includeHandoffs: refs.exportHandoffs.checked,
    locale: api.locale,
    onDownload: (owner) => api.onDownloadIcs(owner, refs.exportHandoffs.checked),
  });
}

export function openShareDialog() {
  refs.shareNames.checked = false;
  refs.shareNotes.checked = false;
  updateShare();
  openDialog(refs.shareDialog);
}

function updateShare() {
  const plan = api.getPlan();
  const names = refs.shareNames.checked;
  const notes = refs.shareNotes.checked;
  let url = '';
  try {
    url = buildShareUrl(plan, { names, notes }, api.getShareBaseUrl());
  } catch {
    url = api.getShareBaseUrl();
  }
  refs.shareUrl.value = url;
  const size = new Blob([url]).size;
  const included = names
    ? notes
      ? 'Includes names, notes and the handoff place.'
      : 'Includes parent and children names.'
    : notes
      ? 'Includes notes and the handoff place, but no names.'
      : 'Leaves out names, notes and the handoff place.';
  const long = url.length > 12_000 ? ' This link is long; send the plan file instead if a chat app truncates it.' : '';
  refs.shareMeta.textContent = `${formatBytes(size)} · ${included}${long}`;
}

export function openResetDialog() {
  openDialog(refs.resetDialog);
}

export function closeAllDialogs() {
  for (const dialog of $$('dialog[open]')) dialog.close();
}

export function initDialogs(config) {
  api = config;
  cache();
  fillSelects();

  for (const button of $$('dialog [data-close]')) {
    button.addEventListener('click', () => closeDialog(button.closest('dialog')));
  }
  for (const dialog of $$('dialog')) {
    dialog.addEventListener('click', (event) => {
      if (event.target === dialog) dialog.close();
    });
  }

  refs.dayForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const start = refs.dayStart.value;
    const end = refs.dayEnd.value || start;
    const note = refs.dayNote.value.trim().slice(0, 160);
    const owner = $('input[name="day-owner"]:checked', refs.dayForm)?.value || 'auto';
    if (!isISODate(start)) {
      refs.dayError.hidden = false;
      refs.dayError.textContent = 'Choose a valid first night.';
      return;
    }
    if (!isISODate(end) || diffDays(start, end) < 0) {
      refs.dayError.hidden = false;
      refs.dayError.textContent = 'The end date must be on or after the first night.';
      return;
    }
    if (spanDays(start, end) > 180) {
      refs.dayError.hidden = false;
      refs.dayError.textContent = 'Choose a range of 180 nights or fewer.';
      return;
    }
    if (owner === 'auto' && note) {
      refs.dayError.hidden = false;
      refs.dayError.textContent = 'Choose which parent has these nights to save a note.';
      return;
    }
    closeDialog(refs.dayDialog);
    api.onDaySave({ start, end, owner, note });
  });

  refs.dayClear.addEventListener('click', () => {
    const start = isISODate(refs.dayStart.value) ? refs.dayStart.value : activeDay;
    const end = isISODate(refs.dayEnd.value) && refs.dayEnd.value >= start ? refs.dayEnd.value : start;
    closeDialog(refs.dayDialog);
    api.onDayClear({ start, end });
  });

  refs.holidayKind.addEventListener('change', updateHolidayVisibility);
  refs.holidayDayRule.addEventListener('change', () => {
    if (refs.holidayDayRule.value === 'nth') {
      refs.holidayMonthNth.value = refs.holidayMonth.value;
    } else {
      refs.holidayMonth.value = refs.holidayMonthNth.value;
    }
    updateHolidayVisibility();
  });
  refs.holidayAssignment.addEventListener('change', updateHolidayVisibility);

  refs.holidayForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const rule = readHolidayForm();
    const check = validateRule(rule);
    if (!check.ok) {
      refs.holidayError.hidden = false;
      refs.holidayError.textContent = check.errors.join(' ');
      return;
    }
    closeDialog(refs.holidayDialog);
    api.onHolidaySave(rule, editingHoliday?.id || null);
  });

  refs.holidayDelete.addEventListener('click', () => {
    if (!editingHoliday) return;
    closeDialog(refs.holidayDialog);
    api.onHolidayDelete(editingHoliday.id);
  });

  refs.presetRegion.addEventListener('change', renderPresetList);
  refs.presetForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const picked = $$('#preset-list input[type="checkbox"]:checked').map((input) => input.value);
    if (!picked.length) {
      refs.presetError.hidden = false;
      refs.presetError.textContent = 'Choose at least one date to add.';
      return;
    }
    closeDialog(refs.presetDialog);
    api.onAddPresets(refs.presetRegion.value, picked);
  });

  refs.exportHandoffs.addEventListener('change', renderExport);

  refs.shareNames.addEventListener('change', updateShare);
  refs.shareNotes.addEventListener('change', updateShare);
  refs.shareCopy.addEventListener('click', async () => {
    const value = refs.shareUrl.value;
    try {
      await navigator.clipboard.writeText(value);
      toast('Share link copied.');
    } catch {
      refs.shareUrl.focus();
      refs.shareUrl.select();
      try {
        document.execCommand('copy');
        toast('Share link copied.');
      } catch {
        toast('Could not copy automatically. Select the link and copy it.');
      }
    }
  });
  refs.shareDownload.addEventListener('click', () => api.onDownloadJson());
  refs.shareImport.addEventListener('click', () => api.onRequestImport());

  refs.resetConfirm.addEventListener('click', () => {
    closeDialog(refs.resetDialog);
    api.onReset();
  });
}
