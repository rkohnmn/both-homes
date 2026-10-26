#!/usr/bin/env node
/**
 * Static repository checks. No dependencies, so CI and a fresh clone can run it.
 * Catches the mistakes that break a GitHub Pages subpath deployment:
 * missing local files, root-absolute asset URLs, and duplicate HTML ids.
 */

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const HTML_FILES = ['index.html', 'guide.html', '404.html'];
const REQUIRED = [
  'index.html',
  'guide.html',
  '404.html',
  '.nojekyll',
  'assets/favicon.svg',
  'assets/apple-touch-icon.png',
  'assets/og-card.png',
  'assets/fonts/fraunces-latin.woff2',
  'css/tokens.css',
  'css/base.css',
  'css/app.css',
  'css/guide.css',
  'css/print.css',
  'js/app.js',
  'js/guide.js',
];

const errors = [];
const warnings = [];
let checkedRefs = 0;

const exists = (rel) => fs.existsSync(path.join(ROOT, rel));
const isExternal = (ref) => /^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(ref);
const cleanRef = (ref) => ref.split('#')[0].split('?')[0];

for (const rel of REQUIRED) {
  if (!exists(rel)) errors.push(`missing required file: ${rel}`);
}

/* HTML: local references, root-absolute paths, duplicate ids, basic metadata. */
for (const file of HTML_FILES) {
  if (!exists(file)) continue;
  const html = fs.readFileSync(path.join(ROOT, file), 'utf8');
  const dir = path.dirname(file);

  for (const match of html.matchAll(/\b(?:href|src)="([^"]+)"/g)) {
    const ref = match[1];
    if (isExternal(ref)) continue;
    if (ref.startsWith('/')) {
      errors.push(`${file}: root-absolute URL breaks repository subpaths: ${ref}`);
      continue;
    }
    const target = cleanRef(ref);
    if (!target) continue;
    checkedRefs += 1;
    if (!exists(path.normalize(path.join(dir, target)))) {
      errors.push(`${file}: missing local asset ${ref}`);
    }
  }

  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
  const seen = new Set();
  for (const id of ids) {
    if (seen.has(id)) errors.push(`${file}: duplicate id "${id}"`);
    seen.add(id);
  }

  for (const required of ['<title>', 'name="description"', 'name="viewport"']) {
    if (!html.includes(required)) warnings.push(`${file}: missing ${required}`);
  }
}

/* CSS: url(...) references resolve relative to the stylesheet. */
for (const file of fs.readdirSync(path.join(ROOT, 'css'))) {
  if (!file.endsWith('.css')) continue;
  const rel = path.join('css', file);
  const css = fs.readFileSync(path.join(ROOT, rel), 'utf8');
  for (const match of css.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/g)) {
    const ref = match[1].trim();
    if (isExternal(ref)) continue;
    checkedRefs += 1;
    if (!exists(path.join('css', ref))) {
      errors.push(`${rel}: missing CSS asset ${ref}`);
    }
  }
}

/* ES modules: every relative import must resolve to a real file. */
function checkModule(rel) {
  if (!exists(rel) || !rel.endsWith('.js')) return;
  const source = fs.readFileSync(path.join(ROOT, rel), 'utf8');
  for (const match of source.matchAll(/(?:import|export)\s+(?:[^'"]*?\s+from\s+)?['"]([^'"]+)['"]/g)) {
    const ref = match[1];
    if (!ref.startsWith('.')) continue;
    checkedRefs += 1;
    const target = path.normalize(path.join(path.dirname(rel), ref));
    if (!exists(target)) errors.push(`${rel}: missing module ${ref}`);
  }
}

for (const dir of ['js', 'js/core', 'js/ui', 'js/data']) {
  for (const file of fs.readdirSync(path.join(ROOT, dir))) {
    if (file.endsWith('.js')) checkModule(path.join(dir, file));
  }
}
checkModule('js/guide.js');

/* SEO: canonical, social cards and structured data on the indexable pages. */
const INDEXABLE = ['index.html', 'guide.html'];
const SEO_META = [
  ['property="og:title"', 'og:title'],
  ['property="og:description"', 'og:description'],
  ['property="og:url"', 'og:url'],
  ['property="og:image"', 'og:image'],
  ['property="og:image:alt"', 'og:image:alt'],
  ['name="twitter:card"', 'twitter:card'],
  ['name="twitter:image"', 'twitter:image'],
  ['name="twitter:image:alt"', 'twitter:image:alt'],
  ['name="robots"', 'robots'],
];

for (const file of INDEXABLE) {
  if (!exists(file)) continue;
  const html = fs.readFileSync(path.join(ROOT, file), 'utf8');

  const canonical = html.match(/<link\b[^>]*\brel="canonical"[^>]*\bhref="([^"]*)"/i);
  if (!canonical) {
    errors.push(`${file}: missing <link rel="canonical">`);
  } else {
    const value = canonical[1];
    if (value.startsWith('/')) errors.push(`${file}: canonical must be relative for subpath hosting: ${value}`);
    const target = cleanRef(value) || '.';
    if (!exists(path.normalize(path.join(path.dirname(file), target, 'index.html')))) {
      if (!exists(path.normalize(path.join(path.dirname(file), target)))) {
        errors.push(`${file}: canonical points at a missing file: ${value}`);
      }
    }
    if (value.includes('index.html')) warnings.push(`${file}: canonical should use the directory form, not index.html`);
  }

  for (const [marker, label] of SEO_META) {
    if (!html.includes(`<meta ${marker}`)) errors.push(`${file}: missing ${label} meta tag`);
  }

  const card = html.match(/<meta\b[^>]*name="twitter:card"[^>]*content="([^"]*)"/i);
  if (card && card[1] !== 'summary_large_image') warnings.push(`${file}: twitter:card is ${card[1]}`);

  const title = html.match(/<title>([^<]*)<\/title>/i)?.[1] ?? '';
  const desc = html.match(/<meta\b[^>]*name="description"[^>]*content="([^"]*)"/i)?.[1] ?? '';
  if (title.length < 15 || title.length > 70) warnings.push(`${file}: title is ${title.length} chars (aim for 15-70)`);
  if (desc.length < 70 || desc.length > 180) warnings.push(`${file}: description is ${desc.length} chars (aim for 70-180)`);

  const blocks = [...html.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)];
  if (!blocks.length) errors.push(`${file}: missing JSON-LD structured data`);
  for (const block of blocks) {
    try {
      JSON.parse(block[1]);
    } catch (error) {
      errors.push(`${file}: invalid JSON-LD (${error.message})`);
    }
  }
}

console.log(`Checked ${checkedRefs} local references across ${HTML_FILES.length} pages, CSS and ES modules.`);
console.log(`Checked canonical, social-card, robots and JSON-LD metadata on ${INDEXABLE.length} indexable pages.`);
for (const warning of warnings) console.warn(`warning: ${warning}`);
if (errors.length) {
  for (const error of errors) console.error(`error: ${error}`);
  process.exitCode = 1;
} else {
  console.log('No missing assets, root-absolute URLs or duplicate ids found.');
}
