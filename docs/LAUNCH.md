# Launch and distribution plan

**Product:** Both Homes — the free planning layer for co-parenting schedules.
**Canonical URL:** your GitHub Pages URL, e.g. `https://<user>.github.io/both-homes/`
**Positioning (one line):** Turn a 2-2-3, 3-4-4-3 or alternating-weeks rotation into a
real year of dates — holidays, swaps, overnight totals, print, `.ics` — free, no account.

This is a plan, not a record of results. No traffic, ranking, sign-up or conversion
numbers exist yet, and none are claimed.

## 1. What the product is good at, in launch language

- **Free and complete for the core job.** No trial, no account, no ads.
- **Local-first.** The plan never leaves the browser unless the user shares a link.
- **A real engine.** Holiday rules override the rotation; one-off swaps override both;
  totals recompute across twelve whole months.
- **Honest math.** Overnights are not hours, and the guide says when a "50/50" rotation
  does not give equal weekends.
- **Portable output.** Per-parent `.ics`, a printable year with key dates, JSON backups,
  and a share link a mediator can open.

## 2. Publish

1. Create a public GitHub repository (`both-homes`), push the repository contents.
2. **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. Push to `main`. The workflow runs the tests, the asset check, and deploys.
4. Verify the live URL works **under the repository subpath**, including the guide page
   and one `.ics` download, on a real phone.
5. Add the repository description, topics (`coparenting`, `custody-schedule`,
   `parenting-plan`, `calendar`, `ics`, `static-site`) and the social preview image
   (`assets/og-card.png`).

## 3. Discovery: the guide is the front door

The pattern guide (`guide.html`) is the distribution asset. It answers the question a
parent searches *before* they need a tool — "what is a 3-4-4-3 schedule and is it fair?"
— and then hands them a prefilled builder via `?pattern=...`.

Search-led angles to write for, in the words people actually use:

- "2-2-3 custody schedule explained" / "2-2-3-3 vs 2-2-3"
- "3-4-4-3 schedule pros and cons" / "does 3-4-4-3 alternate weekends?"
- "alternating weeks custody calendar"
- "custody calendar template printable" / "parenting time calendar PDF"
- "how to put a custody schedule in Google Calendar"
- "how many overnights do I have" / "parenting time percentage"

Rules for this content: state the trade-off honestly, do not fabricate statistics, do
not present the tool as legal advice, and do not generate dozens of thin keyword pages —
extend the existing guide with genuinely useful sections instead.

## 4. Communities (answer first, link second)

Where the audience already asks these questions:

- Parenting/divorce and co-parenting subreddits — reply to schedule questions with the
  actual reasoning, and link the guide only when it answers the question.
- Co-parenting and step-parenting Facebook groups — same rule; check each group's
  self-promotion policy first.
- Quora/Stack-style Q&A and parenting forums.
- "New to divorce/co-parenting" resource threads at seasonal peaks.

Disclose that it is a new free open-source tool you built. Never astroturf, never
invent testimonials, never post the same link across many threads at once.

## 5. Professionals

Mediators, co-parenting coaches, therapists and family lawyers routinely need a neutral,
inexpensive way to hand two parents the same calendar. The practical pitch:

> A free, no-account link you can send both parents. It prints as a year for the fridge,
> and each parent can import their own nights into their calendar.

Offer the print output and the `.ics` files as the concrete handoff. Do not claim
court-readiness or substitution for a written agreement.

## 6. Open source as a channel

- A substantive README with real screenshots (already included).
- Clear limitations section — credibility with practitioners.
- Issues and discussions enabled as the feedback channel; the roadmap in the README is
  the backlog.
- Release notes in `CHANGELOG.md` for each version.

## 7. Timing

Plausible peaks, stated as hypotheses rather than facts: early January (new year, new
schedules, new court orders), late August/early September (back to school), and
November–December (holiday scheduling disputes). Prepare holiday-splitting content
before those windows.

## 8. Optional monetisation, if ever

Deliberately not promised in the product. Any paid tier would have to sit *beside* a
still-useful free core, and cross-device sync or encrypted backup would require a
backend — which is out of scope for a static GitHub Pages deployment. A cheaper, still
server-free option would be optional sponsorship or "buy me a coffee" links placed on
the guide, never blocking the tool.

## 9. Launch checklist

- [ ] Repository published, Pages live, subpath verified on a phone.
- [ ] Social preview image set; page titles and descriptions checked in a link unfurl.
- [ ] Real screenshots in the README (not mockups).
- [ ] Limitations and privacy behaviour documented and linked.
- [ ] Guide sections published for at least the three highest-intent queries.
- [ ] One genuine community answer posted, with disclosure.
- [ ] Feedback path visible (issues/discussions).
- [ ] `npm test` and `npm run check` green on `main`.

## 10. What not to do

- Do not claim legal validity, court acceptance, or an "official" status.
- Do not publish invented user counts, ratings, testimonials or benchmark scores.
- Do not add analytics or tracking pixels to a product whose selling point is privacy.
- Do not bulk-generate thin pattern pages for search engines.
- Do not promise sync, accounts or mobile apps that the static build does not have.
