# Changelog

All notable changes to Both Homes are documented here. The project follows a
simple versioning scheme: `MAJOR` for plan-format or hosting-breaking changes,
`MINOR` for new scheduling/export capabilities, and `PATCH` for fixes.

## [1.0.0] — 2026-10-26

Initial public release.

### Added

- Eight rotation presets (2-2-3, alternating weeks, 3-4-4-3, 4-3-3-4, 2-2-5-5,
  5-2-2-5, 3-3-4-4, weekdays/weekends), plus a custom 2–28-day cycle editor.
- A 12-whole-month planning window with month navigation, per-day swaps,
  notes, range changes, undo, reset and local autosave.
- Holiday and school-break rules: fixed dates, nth weekdays, recurring
  ranges, specific dates, alternate years, split-in-half/split-by-week and
  rule priority. Starter sets for the US, UK, Canada and Australia.
- Overnight totals, fairness percentages, weekend nights, longest stay,
  handoffs, holiday nights and changed days.
- Per-parent `.ics` export with optional handoff reminders and floating local
  times; a print layout covering all months plus key dates and exceptions.
- URL-hash share links (base64-encoded plan; names and notes excluded by
  default), JSON backup/restore and a downloadable plan file.
- Local-first storage with schema validation and version checks.
- Responsive light/dark interface, keyboard calendar navigation, accessible
  dialogs, reduced-motion support and self-hosted typography.
- A separate pattern guide comparing rotations, weekend effects, overnights
  and holiday rules, with links that open the builder on a chosen pattern.
- Search and social metadata on both indexable pages: self-canonical links,
  Open Graph and Twitter cards with a 1200×630 image, `robots` directives and
  JSON-LD (`WebSite` + `WebApplication`, `Article` + `BreadcrumbList`).
- A deploy-time SEO step that resolves the relative canonical and card URLs
  against the real Pages origin and generates `sitemap.xml` and `robots.txt`,
  so forks and subpath deployments need no hard-coded domain.
- Dependency-free Node tests, a static asset and metadata check, GitHub Actions
  CI (including a build of the SEO output) and a GitHub Pages deployment workflow.

### Fixed during qualification

- An early block-grouping bug merged non-contiguous days; grouping is now
  contiguous and covered by tests.
- `hidden` elements were being overridden by author CSS; reset rules now keep
  dialogs and conditional fields hidden correctly.
- Print labels now show readable parent names instead of ambiguous monograms.
- Locale handling now normalizes POSIX-style browser tags such as
  `en-US@posix` instead of letting `Intl` throw during boot.
- 3-4-4-3 and 4-3-3-4 descriptions no longer imply that weekends alternate;
  the guide documents the real weekend trade-off.

### Known limitations

- This is a planning tool, not legal advice, a court record, or an
  hours-based timeshare calculation.
- Local storage is per browser/device; there is no account or sync.
- Share links are snapshots and can be read by anyone who has them.
- Easter and some regional/school holidays are not generated automatically.
- Browser QA covered Chromium; Safari and Firefox were not available in the
  build environment. See `docs/QA.md`.

## Unreleased

- Easter/computus support and additional regional holiday packs.
- Optional hour-based timeshare estimates.
- Multi-year view and a school-year planning mode.
- A reproducible Playwright browser suite in the repository.
