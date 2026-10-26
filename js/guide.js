/** Pattern guide: small amount of behaviour, no framework. */

import { cycleFromPreset, runLengths } from './core/patterns.js';

const DAY_INITIALS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const OWNER_NAMES = { a: 'Parent A', b: 'Parent B' };
const THEME_KEY = 'bothhomes.theme';

/* ---------- Pattern strips ---------- */

function renderStrip(holder, cycle) {
  const fragment = document.createDocumentFragment();
  for (let index = 0; index < 14; index += 1) {
    const owner = cycle[index % cycle.length];
    const cell = document.createElement('span');
    cell.className = `pattern-cell cell-${owner}`;
    cell.textContent = DAY_INITIALS[index % 7];
    cell.title = `${DAY_NAMES[index % 7]} · ${OWNER_NAMES[owner]}`;
    fragment.append(cell);
  }
  holder.replaceChildren(fragment);

  const card = holder.closest('.pattern-card');
  if (!card) return;
  const runs = runLengths(cycle);
  const handoffs = Math.round((runs.length * 14) / cycle.length);
  const longest = Math.max(...runs.map((run) => run.length));
  const handoffFact = card.querySelector('[data-fact="handoffs"]');
  const longestFact = card.querySelector('[data-fact="longest"]');
  if (handoffFact) handoffFact.textContent = `${handoffs} per 2 weeks`;
  if (longestFact) longestFact.textContent = `${longest} nights`;
}

for (const holder of document.querySelectorAll('[data-strip]')) {
  const cycle = cycleFromPreset(holder.dataset.strip);
  if (cycle) renderStrip(holder, cycle);
}

/* ---------- Theme (shared preference with the calendar) ---------- */

const root = document.documentElement;
const toggle = document.getElementById('theme-toggle');
const media = window.matchMedia?.('(prefers-color-scheme: dark)');
let preference = 'auto';

try {
  const saved = localStorage.getItem(THEME_KEY);
  if (saved === 'light' || saved === 'dark') preference = saved;
} catch {
  // Storage can be unavailable in private or locked-down browsing.
}

function systemTheme() {
  return media?.matches ? 'dark' : 'light';
}

function resolvedTheme() {
  return root.dataset.theme === 'dark' || root.dataset.theme === 'light'
    ? root.dataset.theme
    : systemTheme();
}

function applyTheme(theme) {
  root.dataset.theme = theme;
  root.style.colorScheme = theme;
  if (!toggle) return;
  const dark = theme === 'dark';
  toggle.setAttribute('aria-label', dark ? 'Switch to light theme' : 'Switch to dark theme');
  toggle.title = dark ? 'Switch to light theme' : 'Switch to dark theme';
  toggle.querySelector('use')?.setAttribute('href', dark ? '#i-sun' : '#i-moon');
}

applyTheme(preference === 'auto' ? systemTheme() : preference);

toggle?.addEventListener('click', () => {
  const next = resolvedTheme() === 'dark' ? 'light' : 'dark';
  preference = next;
  applyTheme(next);
  try {
    localStorage.setItem(THEME_KEY, next);
  } catch {
    // The visual change still applies for this page view.
  }
});

media?.addEventListener?.('change', () => {
  if (preference === 'auto') applyTheme(systemTheme());
});
