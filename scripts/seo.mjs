#!/usr/bin/env node
/**
 * Post-build SEO step for GitHub Pages.
 *
 * The source HTML uses relative canonical and Open Graph URLs so the site is
 * correct on any host, including a /repository/ subpath. Social scrapers and
 * sitemaps, however, require absolute URLs, and the deployed origin is only
 * known at deploy time. This script resolves every relative URL against the
 * real page URL, then writes sitemap.xml and robots.txt.
 *
 * Usage: node scripts/seo.mjs --dir _site --base https://user.github.io/repo
 *
 * No dependencies, so CI and a fresh clone can run it.
 */

import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const arg = (name, fallback) => {
  const at = args.indexOf(`--${name}`);
  return at >= 0 && args[at + 1] ? args[at + 1] : fallback;
};

const dir = path.resolve(arg('dir', '_site'));
const rawBase = arg('base', '');

if (!rawBase) {
  console.error('seo: --base is required, e.g. --base https://user.github.io/both-homes');
  process.exit(1);
}

let base;
try {
  base = new URL(rawBase.endsWith('/') ? rawBase : `${rawBase}/`);
} catch {
  console.error(`seo: --base is not a valid absolute URL: ${rawBase}`);
  process.exit(1);
}
if (!/^https?:$/.test(base.protocol)) {
  console.error('seo: --base must use http or https');
  process.exit(1);
}

if (!fs.existsSync(dir)) {
  console.error(`seo: build directory not found: ${dir}`);
  process.exit(1);
}

/** Every page that should be indexed, and its weight in the sitemap. */
const PAGES = [
  { file: 'index.html', priority: '1.0' },
  { file: 'guide.html', priority: '0.9' },
];

const isRelative = (value) => value === '' || value === './' || value.startsWith('./') || value.startsWith('../') || (value.startsWith('/') && !value.startsWith('//'));

/** Read back the URLs that must be absolute, for post-rewrite verification. */
function absoluteValues(html) {
  const found = [];
  const patterns = [
    ['canonical', /<link\b[^>]*\brel="canonical"[^>]*\bhref="([^"]*)"/i],
    ['og:url', /<meta\b[^>]*\bproperty="og:url"[^>]*\bcontent="([^"]*)"/i],
    ['og:image', /<meta\b[^>]*\bproperty="og:image"[^>]*\bcontent="([^"]*)"/i],
    ['twitter:image', /<meta\b[^>]*\bname="twitter:image"[^>]*\bcontent="([^"]*)"/i],
  ];
  for (const [label, pattern] of patterns) {
    const match = html.match(pattern);
    if (match) found.push([label, match[1]]);
  }
  return found;
}
const absolutize = (value, pageUrl) => (isRelative(value) ? new URL(value, pageUrl).href : value);

/** Rewrite a single attribute value, leaving already-absolute values alone. */
function rewriteAttr(html, pattern, pageUrl) {
  return html.replace(pattern, (match, start, value, end) => `${start}${absolutize(value, pageUrl)}${end}`);
}

/** Walk a parsed JSON-LD document and resolve relative URL strings. */
function absolutizeJson(value, pageUrl) {
  if (typeof value === 'string') return absolutize(value, pageUrl);
  if (Array.isArray(value)) return value.map((item) => absolutizeJson(item, pageUrl));
  if (value && typeof value === 'object') {
    for (const key of Object.keys(value)) value[key] = absolutizeJson(value[key], pageUrl);
  }
  return value;
}

let changed = 0;

for (const page of PAGES) {
  const file = path.join(dir, page.file);
  if (!fs.existsSync(file)) {
    console.error(`seo: missing page ${page.file}`);
    process.exit(1);
  }
  const pageUrl = new URL(page.file === 'index.html' ? './' : page.file, base).href;
  let html = fs.readFileSync(file, 'utf8');
  const before = html;

  html = rewriteAttr(html, /(<link\b[^>]*\brel="canonical"[^>]*\bhref=")([^"]*)(")/i, pageUrl);
  html = rewriteAttr(html, /(<meta\b[^>]*\bproperty="og:url"[^>]*\bcontent=")([^"]*)(")/i, pageUrl);
  html = rewriteAttr(html, /(<meta\b[^>]*\bproperty="og:image"[^>]*\bcontent=")([^"]*)(")/i, pageUrl);
  html = rewriteAttr(html, /(<meta\b[^>]*\bname="twitter:image"[^>]*\bcontent=")([^"]*)(")/i, pageUrl);

  html = html.replace(/(<script\b[^>]*type="application\/ld\+json"[^>]*>)([\s\S]*?)(<\/script>)/gi, (match, open, body, close) => {
    let parsed;
    try {
      parsed = JSON.parse(body);
    } catch (error) {
      console.error(`seo: ${page.file} has invalid JSON-LD: ${error.message}`);
      process.exitCode = 1;
      return match;
    }
    return `${open}\n  ${JSON.stringify(absolutizeJson(parsed, pageUrl), null, 2).split('\n').join('\n  ')}\n  ${close}`;
  });

  if (html !== before) {
    fs.writeFileSync(file, html);
    changed += 1;
  }

  /* Verify the result instead of trusting the rewrite. A stale _site directory
     that was built for a different origin would otherwise keep the old URL. */
  for (const [label, value] of absoluteValues(html)) {
    let parsed;
    try {
      parsed = new URL(value);
    } catch {
      console.warn(`seo: warning: ${page.file} ${label} is not an absolute URL: ${value}`);
      continue;
    }
    if (parsed.origin !== base.origin) {
      console.warn(
        `seo: warning: ${page.file} ${label} points at ${parsed.origin}, not ${base.origin}. ` +
        'Assemble _site from source before running this step.',
      );
    }
  }

  console.log(`seo: ${page.file} -> ${pageUrl}`);
}

const origin = base.href.replace(/\/$/, '');
const sitemap = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ...PAGES.map((page) => {
    const loc = new URL(page.file === 'index.html' ? './' : page.file, base).href;
    return `  <url>\n    <loc>${loc}</loc>\n    <changefreq>monthly</changefreq>\n    <priority>${page.priority}</priority>\n  </url>`;
  }),
  '</urlset>',
  '',
].join('\n');

const robots = ['User-agent: *', 'Allow: /', '', `Sitemap: ${origin}/sitemap.xml`, ''].join('\n');

fs.writeFileSync(path.join(dir, 'sitemap.xml'), sitemap);
fs.writeFileSync(path.join(dir, 'robots.txt'), robots);

console.log(`seo: wrote sitemap.xml (${PAGES.length} pages) and robots.txt`);
console.log(`seo: ${changed} page(s) rewritten with absolute URLs`);
