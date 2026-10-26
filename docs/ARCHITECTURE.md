# Architecture

## 1. Goals and constraints

Both Homes must:

- run as static files on GitHub Pages, including under a repository subpath;
- work without a server, account, database, API key or build step;
- keep plan data in the browser;
- produce a correct 12-month schedule from a rotation plus exceptions;
- export `.ics`, print and shareable links from the same resolved data;
- remain small enough to understand and maintain without a framework.

Non-goals: real-time collaboration, messaging, document storage, court records, expense tracking, native apps, or an hours-based legal timeshare calculation.

## 2. Runtime model

```text
Browser
  index.html
    css/tokens.css -> base.css -> app.css
    js/app.js (ES module entry)
      core/dates.js
      core/patterns.js
      core/holidays.js
      core/schedule.js
      core/state.js
      core/storage.js
      core/share.js
      core/ics.js
      core/format.js
      ui/*.js
      data/holiday-presets.js
  guide.html
    css/tokens.css -> base.css -> guide.css
    js/guide.js
```

`index.html` and `guide.html` are separate entry points; the guide does not load the application code. `app.js` is the only module with mutable application state and DOM event wiring. Core modules are pure functions over plain objects and strings. UI modules receive a plan and callbacks; they do not read or write `localStorage`.

No bundler is used. Native ES modules are supported by every target browser. The files are served as-is by GitHub Pages. `npm` is only a convenience for tests, the static check and the local server.

## 3. Data model

A plan is a versioned JSON object:

```json
{
  "version": 1,
  "planName": "Our parenting plan",
  "parents": { "a": { "name": "" }, "b": { "name": "" } },
  "children": "",
  "pattern": { "id": "223", "cycle": ["a", "a", "b", "b", "a", "a", "a", "b", "b", "a", "a", "a", "b", "b"] },
  "startDate": "2026-10-26",
  "weekStart": "sun",
  "handoff": { "time": "18:00", "place": "" },
  "windowOffset": 0,
  "holidays": [],
  "overrides": {}
}
```

- `pattern.cycle` has one owner per night (`a` or `b`) and repeats from `startDate`.
- `windowOffset` moves the 12-month summary/print/export window in whole years, independently of the month being viewed.
- `holidays` is an ordered list. The first matching rule wins, so the list order is meaningful and the UI exposes up/down controls.
- `overrides` is a date-keyed map. It is the highest-priority exception layer.
- `version` is checked before normalization. A newer schema is rejected with a readable error rather than silently downgraded.

`normalizePlan` in `js/core/state.js` is the single trust boundary for `localStorage`, imported files and share links. It clamps string lengths and numeric ranges, validates ISO dates and times, drops malformed holiday rules, replaces duplicate ids, caps the holiday/override counts and falls back safely. UI rendering never inserts untrusted strings with `innerHTML`; the `el()` helper sets `textContent` and attributes explicitly.

## 4. Schedule resolution

`buildSchedule(plan, start, end)` produces one `day` per civil date:

```text
day = {
  date, owner, baseOwner, source: "pattern" | "holiday" | "override",
  holiday, holidayPart, note
}
```

Resolution order in `resolveDay`:

1. **Override** for the exact date.
2. **Holiday rule**: `resolveHoliday` walks the ordered rules and returns the first match. It considers occurrence years around the date so a winter break that crosses New Year still resolves.
3. **Base rotation**: `(date - startDate) mod cycle.length` (using day numbers, not timezone-sensitive `Date` arithmetic).

Everything downstream uses this resolved list: the calendar cells, summary, block grouping, `.ics` and print. That is the main consistency guarantee.

Civil-date helpers in `dates.js` use UTC day numbers for arithmetic and never construct local midnight dates for schedule math, avoiding daylight-saving skips. Display formatting uses `Intl` with a normalized locale.

### Weekend and handoff definitions

- A **weekend night** is Friday or Saturday night. This is the app’s own planning definition; a family may use a different one.
- A **handoff** is a change in the resolved owner between consecutive nights.
- A **holiday night** is any night whose resolved source is a holiday rule, including a rule that happens to assign the same parent as the base rotation.

The summary is an overnight estimate, not an hours calculation. See `js/core/schedule.js`.

## 5. Holiday engine

Rules support:

| Kind | Fields | Behaviour |
| --- | --- | --- |
| `day` | month, day (fixed) or month/weekday/nth, spanDays | One occurrence per year, optionally spanning several nights |
| `range` | fromMonth/fromDay, toMonth/toDay | A recurring stretch; crossing New Year is supported |
| `dates` | start, end | One specific date or range |

Assignment: `alternate` (odd/even start year), always `a`, or always `b`. For ranges, `split` can be `whole`, `halves`, or `weeks` (alternating seven-night blocks). For a one-day rule, the split is effectively whole.

`dayRuleRange` and `rangeRuleRange` generate occurrences; `matchRule` tests a date against an occurrence, including the previous year’s occurrence for ranges that cross the year boundary. Validation rejects impossible fixed dates (for example, 29 February outside a leap year) and missing/inverted specific date ranges.

The starter presets in `js/data/holiday-presets.js` are ordinary rules after insertion. They are deliberately conservative; school calendars are local and cannot be inferred.

## 6. Summary

`summarize(days)` returns:

- total nights and the window start/end;
- per-parent nights, percentage, weekend nights, holiday nights, longest contiguous stay;
- transitions/handoffs;
- changed days (where the resolved owner differs from the base rotation).

The summary window is `planWindow(plan)`: 12 whole months beginning at the month of `startDate`, shifted by `windowOffset * 12` months. The month grid can be browsed independently; the summary explicitly labels its window.

## 7. ICS generation

`buildPlanCalendar` groups contiguous days by owner, then emits one all-day-like event per block using the handoff time:

- start: block start at the handoff time;
- end: day after the block end at the handoff time;
- summary, holiday names, notes, handoff place and plan name in the description;
- floating local date-times (`DTSTART;TZID` is not used), so each importing calendar applies its own timezone;
- optional separate 20-minute handoff events.

`buildCalendar` implements RFC 5545 essentials: CRLF line endings, escaping for commas/semicolons/newlines, UTF-8 line folding at 75 octets, `UID`, `DTSTAMP`, `PRODID`, and `CALSCALE:GREGORIAN`. Times are wall-clock; the README and export dialog explain the trade-off.

Re-importing a changed file can create duplicate events. The app warns about this; removing the old calendar first is the reliable workflow. It does not claim two-way sync.

## 8. Share links and storage

- `buildShareUrl` projects the plan through `toShareablePlan` (names/children/notes/place omitted by default), encodes JSON as base64url, and places it in the URL **hash** as `#p=...`.
- The hash is not sent in the HTTP request. Anyone with the URL can decode the plan; this is a deliberate no-upload trade-off, not encryption.
- A token is length-capped at 200,000 characters before decoding.
- `planFromHash` validates the decoded object through `normalizePlan`; invalid or newer plans produce a readable startup error.
- `localStorage` holds `bothhomes.plan.v1` (versioned JSON) and `bothhomes.theme`. Storage failures (private mode, quota) are caught; the app continues with an in-memory plan and shows that saving is unavailable.

There is no encryption at rest. Browser storage is readable by anyone with access to the browser profile and by code running on the same origin.

## 9. UI and accessibility

- Native `<dialog>` elements provide focus trapping and Escape handling; a shared `openDialog`/`closeDialog` helper coordinates closing and focus restoration.
- The calendar is a table of real `<button>` elements. Arrow keys move by day/week, Home/End move to week boundaries, PageUp/PageDown move months, and focus is restored after re-render.
- The plan form uses real labels and fieldsets. Dynamic form sections are toggled with `hidden`; `base.css` includes `[hidden] { display: none !important; }` because author display rules previously overrode the attribute.
- Colour is not the only signal: monograms, holiday stars/labels, text legends, source badges and notes accompany the teal/clay palette.
- Toasts use `aria-live`; save-state updates are polite; errors use `role="alert"` where appropriate.
- The theme is applied as `data-theme` on `<html>`; the preference is shared by the guide via the same `localStorage` key.
- `prefers-reduced-motion` disables transitions/animations. The print layout is separate and does not depend on screen layout.

Known gap: no automated axe/accessibility audit and no real screen-reader pass was completed in this environment. See `docs/QA.md`.

## 10. Print

`js/ui/print.js` builds a hidden print root from the same resolved days:

- masthead, plan name, parents/children, rotation, handoff and a summary bar;
- 12 month tables, four per page at Letter size;
- a key-dates table for holiday occurrences and grouped one-off changes;
- a footer with generation date, handoff-time note and legal disclaimer.

`print.css` is loaded with `media="print"`, hides the application shell, and uses a two-column month grid. The screen never shows the print root (`.print-root` is hidden in screen CSS). `window.print()` is the only print trigger; “Save as PDF” is the browser’s job, not a custom PDF library.

## 11. Static subpath and deployment

- All page-relative references start with `./`.
- No canonical hostname is hard-coded; share links derive from `location`.
- `.nojekyll` prevents Jekyll processing.
- The Pages workflow copies only public runtime files to `_site`: HTML, `assets/`, `css/`, `js/`, `.nojekyll`. Tests, docs and workflows are not deployed.
- `scripts/check-assets.mjs` catches missing references, root-absolute URLs, duplicate ids, broken relative module imports and missing SEO metadata.
- `404.html` is self-contained and adjusts its home link for `*.github.io` project sites.

### Search metadata without a hard-coded domain

A fork must not inherit someone else's canonical URL, and a social scraper will not resolve a relative one. The source pages therefore keep **relative** canonical and Open Graph URLs (`./`, `./guide.html`, `./assets/og-card.png`), which are correct on any host and in any subdirectory — a relative canonical resolves to the page itself, so it can never point at the wrong site.

After `actions/configure-pages` reports the deployment URL, `scripts/seo.mjs` resolves those values against it (including strings inside the JSON-LD blocks, which are parsed rather than pattern-matched) and writes `sitemap.xml` and `robots.txt`. The origin is a build input, not a constant, so the same commit works on a fork, a custom domain, or a project subpath. `ci.yml` runs the same script against a placeholder base and asserts the rewritten output, so a broken canonical fails CI before a deploy.

## 12. Testing

`tests/` uses `node:test` and `node:assert/strict`; no test framework or install. The suite covers dates, patterns, holidays, schedule, ICS, state normalization, share links and locale handling. Browser qualification was run separately with Playwright/Chromium; the repository intentionally does not add Playwright as a dependency because that would turn a zero-install static project into a browser-test toolchain. The performed checks and their gaps are recorded in `docs/QA.md`.

## 13. Decisions and trade-offs

| Decision | Why | Cost |
| --- | --- | --- |
| Vanilla JS, no framework | One screen, no server state, zero build, easy GitHub Pages hosting | Manual DOM wiring; no component ecosystem |
| Base64url JSON share links, not compression | Transparent, dependency-free, works with any static host | Links are longer than a compressed token |
| Hash fragment, not query string | Plan data is not sent to the host in the request | Still readable by anyone with the link; not encryption |
| `localStorage`, not IndexedDB | The plan is a single small record; synchronous and simple | No cross-device sync; subject to site-data clearing |
| Overnights, not hours | Defensible planning metric that can be computed from the schedule | Not a legal timeshare calculation |
| Floating local ICS times | Least surprising for local handoffs; no timezone database dependency | Each importer applies its own zone; no UTC guarantee |
| 12-month window | Legible print, bounded computation, simple totals | Not a multi-year timeline |
| Ordered holiday rules | Predictable “first rule wins” behavior users can see | Requires explicit ordering for overlaps |
| Self-hosted font, no analytics | Privacy/offline claim is real; no external requests | Font file is part of the repo; no usage data |
| 3-page print at legible cell size | Readable month grids with names and holidays | Some blank space below the months |

## 14. Extension points

- Add a preset in `patterns.js` and a card/table row in the guide if it is genuinely common.
- Add holiday presets in `data/holiday-presets.js`; keep them editable and conservative.
- Add a new export format by consuming `buildSchedule` output, not by re-resolving dates.
- Add a new holiday rule kind carefully: update `normalizeHoliday`, `validateRule`, `matchRule`, the dialog form and tests together.
- Bump `STORAGE_VERSION` and add a migration if the plan shape changes; never silently drop a user’s holidays.
