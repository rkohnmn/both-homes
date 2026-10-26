# Quality assurance record

**Date of the qualification run:** 26 October 2026
**Environment:** Linux container, Node v24.21.0, headless Chromium via Playwright 1.55, static files served by `python3 -m http.server`.
**Product version tested:** 1.0.0

This file records what was actually executed, what it returned, and what was **not**
tested. Nothing below is a projection or an estimate. Where a check could not run in
this environment, it is listed as a limitation rather than a pass.

## 1. Automated logic tests

Command: `npm test` (`node --test tests/*.test.js`)

Result: **62 tests, 62 pass, 0 fail** (duration ≈190 ms).

Coverage by file:

| File | Area |
| --- | --- |
| `tests/dates.test.js` | civil-date arithmetic, month grids, leap years, ISO validation |
| `tests/patterns.test.js` | all eight presets, cycle labels, custom cycles, swap/resize |
| `tests/holidays.test.js` | nth-weekday occurrences, recurring ranges, alternate years, splits, validation |
| `tests/schedule.test.js` | resolution precedence, contiguous block grouping, summaries, overrides, plan window |
| `tests/ics.test.js` | text escaping, 75-octet line folding, UTC stamps, per-parent event sets |
| `tests/share.test.js` | base64url encoding, URL hash round-trip, rejected payloads |
| `tests/state.test.js` | normalization, defaults, storage versions, share projections |
| `tests/format.test.js` | locale normalization including POSIX-style tags |

These tests exercise the schedule engine directly (pure modules, no DOM).

## 2. Static deployment checks

Command: `npm run check` (`node scripts/check-assets.mjs`)

Result: `Checked 100 local references across 3 pages, CSS and ES modules.` and
`Checked canonical, social-card, robots and JSON-LD metadata on 2 indexable pages.`
No missing assets, root-absolute URLs or duplicate ids, and no SEO warnings.

The script reads `index.html`, `guide.html`, `404.html`, every CSS `url(...)`
reference, and every relative ES-module import, then asserts that:

- each referenced file exists on disk;
- no asset URL is root-absolute (which would break a `/repository/` subpath);
- no HTML file declares a duplicate `id`;
- the required brand assets and CSS/JS entry points are present.

## 3. Search metadata and structured data

The deploy path was built locally exactly as the workflow builds it, with a base URL,
and then checked both statically and in Chromium.

Static result: `scripts/seo.mjs` resolved the relative canonical, `og:url`, `og:image`
and `twitter:image` to absolute URLs on both pages, rewrote URLs inside the JSON-LD, and
wrote `sitemap.xml` (2 URLs) and `robots.txt` with an absolute `Sitemap:` line. Both
JSON-LD blocks re-parse cleanly after rewriting.

Browser result: **7 of 7 checks passed** against the built site served under
`/both-homes/`:

1. title (≤70 chars) and description (≤180 chars) present and sized for a result snippet;
2. `rel="canonical"` resolves to the exact page URL;
3. `og:image` is absolute and returns HTTP 200, and matches `twitter:image`;
4. JSON-LD parses to `WebSite` + `WebApplication` on the calendar;
5. `robots` allows indexing with `max-image-preview:large`;
6. the guide has its own canonical and parses to `Article` + `BreadcrumbList`;
7. no console errors were introduced by the metadata changes.

The application's own 8 subpath checks were re-run against the same built output and
still passed, so the metadata work did not disturb the calendar, guide, storage, export
or font loading.

Not verified: how Google, Bing or any social scraper actually renders the result. No
Search Console or Bing Webmaster account was connected, nothing was submitted for
indexing, and no ranking, impression or rich-result outcome is claimed.

## 4. Browser workflow verification

Tool: Playwright + Chromium (headless), driven by a scripted end-to-end pass.
Desktop viewport 1280×1000 and a phone viewport; every step asserted, not eyeballed.

Result: **18 of 18 steps passed, no browser problems reported.**

| Step | What it verified |
| --- | --- |
| Calendar renders with a default plan | first-paint value with no setup |
| Names and plan title update the interface | live binding of parent names into calendar, print and exports |
| Common holidays can be added and counted | preset dialog → rule → totals |
| A range swap and note are saved | day dialog → override → list |
| Pattern switching updates calendar and split | preset change recalculation |
| Custom cycle editing works | 2–28 night editor and its preview |
| Holiday rule editor saves a custom rule | nth-weekday/custom rule round-trip |
| ICS export downloads a valid calendar for each parent | real file download, parsed back |
| Share link carries an editable copy without names | hash round-trip with redaction defaults |
| Theme toggle changes and persists | theme preference in storage |
| Backup, reset and restore round-trip | JSON export → wipe → import equality |
| Print layout builds twelve months | print DOM completeness and legend |
| Keyboard navigation and dialog access | focus movement and `Esc` handling |
| No unnamed visible buttons or horizontal overflow | accessibility/a11y sanity at desktop width |
| Mobile layout has no horizontal overflow | 390 px width |
| Mobile day dialog fits the viewport | dialogs usable on a phone |

Console errors and failed network requests were captured during the run: **none**.
The page makes no requests beyond its own assets.

## 5. Repository-subpath verification

The app was copied into a parent directory as `both-homes/` and served from the parent,
so every URL looked like `http://127.0.0.1:4174/both-homes/...` — the same shape as
`https://<user>.github.io/<repository>/`.

Result: **8 of 8 checks passed.**

- calendar renders day cells from the subpath;
- summary shows the overnight split (`#summary-stats`, `#split-pill`);
- the guide link is relative and resolves to `/both-homes/guide.html`;
- the guide renders and its back-link returns to the app;
- a parent name persists to `localStorage` under the subpath;
- the `.ics` download works and the filename ends in `.ics`;
- the self-hosted web font reaches `loaded` status;
- no console errors and no failed requests (no 404s).

## 6. Responsive and visual checks

Screenshots were captured from the running application at desktop and phone widths and
inspected during design review: `docs/screenshots/app-desktop.png`,
`app-calendar.png`, `app-summary.png`, `app-mobile.png`, `app-mobile-calendar.png`,
`guide-desktop.png`, `guide-mobile.png`, `print.png`.

Two real defects were found this way and fixed before release:

1. Author CSS was overriding the `hidden` attribute, so conditional dialog fields and
   the "Remove change" control were visible when they should not have been.
2. Override rows did not show the night count, so a multi-night swap looked like a
   single night.

The print layout was verified by rendering the print stylesheet to PDF and inspecting
the geometry (three Letter pages, no clipped columns, key dates on the last page)
rather than trusting a print-media screenshot at screen width.

## 7. Performance observations

Measured informally, not with a benchmarking tool:

- No build step, no framework, no bundler; the whole site is ~20 files of plain
  HTML/CSS/ES modules plus one self-hosted `woff2`.
- The application makes no network requests after its own assets load.
- All three automated suites complete in well under a second, except the browser run
  (seconds, dominated by browser start-up).

No Lighthouse score, timing trace, memory profile or bundle-size budget has been
recorded, and none is claimed.

## 8. Not verified (limitations)

These checks were **not** performed. They are open items, not failures:

- **Firefox and Safari.** Only Chromium was available in the build environment. The
  code targets ES modules, `<dialog>` and `:has()` (with a fallback), so other engines
  are expected to work, but this is unproven here.
- **Screen readers.** No VoiceOver/NVDA pass. Keyboard, labelling, focus and dialog
  semantics were checked manually and with automation, but that is not a substitute.
- **Automated accessibility audit.** No axe/Lighthouse accessibility run was recorded.
- **Real calendar-app import.** The `.ics` output was parsed and asserted locally; it
  was not imported into Google Calendar, Apple Calendar or Outlook.
- **iOS/Android device testing.** Layout was checked at phone viewport sizes in
  Chromium, not on physical devices.
- **Authentication/multi-user flows.** Not applicable: the app has no accounts, no
  backend and no server-side state.
- **The published GitHub Pages site.** No repository was pushed and no Pages
  deployment was executed from this environment. The subpath test above is the
  closest available proxy; the workflow itself has not run on GitHub's runners.
- **Sustained load / large plans.** The validation caps (80 holiday rules, 750
  overrides, 24-year window offset) are enforced by code and unit tests, but the UI
  was not stress-tested at those ceilings in the browser.
