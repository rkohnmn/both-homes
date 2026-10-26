# Contributing

Thanks for considering a contribution. Both Homes is deliberately small, dependency-free and static. Please keep it that way unless there is a clear, documented reason.

## Local workflow

```bash
npm start          # static server on http://localhost:4173
npm test           # Node's built-in test runner
npm run check      # missing assets / root-absolute URLs / duplicate ids
```

No install step is required. Node 20+ is needed for tests and checks; Python 3 is used by `npm start`.

## What to change

- **Core schedule logic** lives in `js/core/`. Keep it pure where possible and add tests in `tests/`.
- **UI rendering** lives in `js/ui/`; application wiring is `js/app.js`.
- **Styles** use the design tokens in `css/tokens.css`. Reuse tokens rather than adding one-off colours.
- **Docs** belong in `docs/`; the pattern guide is a public page, not internal documentation.

## Rules

1. Use relative URLs (`./assets/...`), never root-absolute ones. The app must work at `https://user.github.io/repo/`.
2. Do not add analytics, trackers, remote fonts, remote images, or a required external API.
3. Treat imported plans, share links and `localStorage` as untrusted input; route them through `normalizePlan` or an equivalent validator.
4. Keep legal and privacy claims accurate. Both Homes is a planning tool, not legal advice or a court record.
5. Add or update tests for date, rotation, holiday, ICS or share behaviour.
6. Run `npm test` and `npm run check` before opening a pull request.
7. Do not commit `.package/`, `_site/`, screenshots of real families, plan exports, credentials or generated caches.
8. New public pages need a unique `<title>`, a description, a relative self-canonical, Open Graph and Twitter tags, and JSON-LD. Add the page to `PAGES` in `scripts/seo.mjs` so it reaches the sitemap; `npm run check` fails when a tag is missing.

## Reporting

Use the repository issue tracker. For privacy or security concerns, describe the impact without including a real plan, names, or the contents of a private share link.
