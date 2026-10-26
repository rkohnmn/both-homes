# Market research and product rationale

**Research date:** 26 October 2026  
**Product:** Both Homes — a free, local-first co-parenting calendar builder for static hosting.  
**Status:** research snapshot, not a continuously updated market report. Prices and product features change.

## 1. Question

Can a small, static web application solve a real, recurring problem for separated or divorced parents better than the alternatives they currently use — without a server, an account, analytics, or a subscription?

The product had to be useful in the first minute, work from a GitHub Pages subpath, and remain useful with no backend. That ruled out anything whose core value depends on messaging, document storage, court records, real-time sync, or a native mobile app.

## 2. Method

1. Searched for recurring complaints and workflows around co-parenting schedules, custody calendars, shift rotations and printable planners.
2. Read the pricing, feature and help pages of the two most visible paid co-parenting platforms.
3. Read a custody-schedule reference page that discusses the practical trade-offs of common rotations.
4. Compared those findings with what a static browser application can actually deliver.
5. Treated community discussion as **anecdotal** and product/pricing pages as **verified on the access date**.

No user surveys, conversion data, search-volume estimates or market-size figures were collected. None are claimed.

## 3. What was verified

### 3.1 Paid platforms charge annually, per parent

**OurFamilyWizard** (accessed 26 October 2026) lists one-year subscriptions from **$110** (basic) to **$299.88** (Max) per parent, with Essentials at $149.99 and Premium at $216. Its FAQ states that each co-parent needs their own subscription, though one parent can pay for the other. The platform is positioned around communication, documentation, expenses, calls and records — not only a calendar. It also advertises fee waivers and military discounts.

**Custody X Change** (accessed 26 October 2026) says plans start at **$6/month billed annually** and positions itself as an all-in-one custody management tool: schedules, written parenting plans, timeshare calculations, journaling, expenses and messaging. Its free articles and schedule examples are a useful content layer around the paid product.

These are legitimate products serving needs a static calendar cannot: messaging, records, expense tracking, court-oriented documents and professional access. Both Homes does not claim to replace them.

### 3.2 Weekend fairness is a real design problem, not a marketing invention

Custody X Change's 3-4-4-3 page (accessed 26 October 2026) explicitly lists **“One parent may have the child every weekend”** as a con, and describes a variation that changes the exchange day so both parents get weekend time. That is a concrete, checkable planning problem.

Both Homes therefore:

- shows weekend nights in the totals;
- warns in the guide that several 50/50 rotations can favour one parent on weekends;
- does not claim that 3-4-4-3 or 4-3-3-4 automatically alternate weekends;
- lets users change the start day, split holidays, or create a custom cycle.

### 3.3 Free content exists, but the free *workflow* is fragmented

Searches returned free articles, printable templates, single-pattern togglers and free schedule examples. Examples read during research include Custody X Change's free schedule articles and the Hadamard family calendar page. This is a qualitative observation, not a census: I did not audit every free tool.

The gap Both Homes targets is not “no information exists.” It is the absence of a **free, editable, 12-month schedule with holiday overrides, fairness math, print, `.ics` and a shareable link in one local-first page**. A parent can read a 3-4-4-3 article and still have to rebuild the schedule by hand in a spreadsheet or generic calendar.

### 3.4 Community sentiment is suggestive, not representative

A Reddit search surfaced threads asking which co-parenting app “everyone” uses and complaining about complexity, cost, ads or features they do not need. One example from the search results (r/Divorce, accessed 26 October 2026):

<https://www.reddit.com/r/Divorce/comments/1qdr9fj/what_coparenting_app_does_everyone_use_looking/>

This is **anecdotal**. It was not coded, sampled or weighted. It supports the hypothesis that some parents want a simpler utility; it does not prove market size or willingness to pay.

## 4. Competitive landscape

| Alternative | Strength | Limitation for this use case | Price checked 26 Oct 2026 |
| --- | --- | --- | --- |
| OurFamilyWizard | Mature communication, documentation, expenses, records, professional access | Broader and heavier than a calendar; requires accounts; each parent needs a subscription | $110–$299.88 per parent/year |
| Custody X Change | Full plan, calendar, calculations, journal, expenses | Paid account; broader than a quick free calendar; not a no-account static tool | from $6/month billed annually |
| Google/Apple/Outlook calendars | Free, familiar, sync everywhere | No rotation engine, holiday precedence, overnight fairness math, or printable key-date summary | free |
| Spreadsheets | Flexible, private, free | Manual; easy to break; no `.ics`, share link or responsive calendar | free |
| Free articles and templates | Free, often well written | Static; the parent still builds and maintains the schedule elsewhere | free |
| Free single-pattern togglers | Immediate visual answer | Usually one pattern, limited holidays/exports/printing; varies widely | free |

The useful positioning is therefore narrow and honest:

> **Both Homes is the free planning layer.** It turns a rotation and its exceptions into a real year of dates, then gets out of the way.

It is not a messaging platform, a court-record product, a legal document generator or a timeshare calculation that would stand up in litigation.

## 5. Why this product, not another

Candidates considered:

1. **Shift-work rotation planner.** Large obvious audience, but searches surfaced several polished free generators and calendar converters. The differentiation would have been weak, and the calendar math overlaps this project.
2. **Co-parenting custody calendar.** Selected: higher-stakes planning, paid incumbents, privacy-sensitive data, holiday complexity, and a workflow that fits a static app. A meaningful free option is credible.
3. **Photo culling / AI utility.** Rejected: the valuable part usually needs paid AI APIs or a backend, which conflicts with the no-server, no-key constraint.
4. **Home inventory.** Rejected: users expect a mobile app, photos, sync and long-term storage; a static page would be a demo rather than the product.

The co-parenting idea also has a natural content surface: a pattern guide can answer the question a parent searches *before* they need the tool, and then hand them a prefilled calendar. That is a more credible distribution loop than a generic utility with no search intent.

## 6. Demand evidence vs. hypotheses

### Evidence

- Paid incumbents charge recurring annual fees to individual parents.
- One incumbent explicitly documents a weekend-fairness problem in a common rotation.
- Free educational material and templates are widespread, which indicates an active information-seeking audience.
- Community threads describe app fatigue and a desire for simpler tools (anecdotal).

### Hypotheses to validate after launch

- Some parents will choose a free, no-account tool over a paid platform for planning, even if they use a paid platform for communication or records.
- Shareable links and printable calendars matter more than accounts or cloud sync for the first use.
- Mediators, coaches and co-parenting educators may recommend a free neutral tool to clients.
- Search traffic around “2-2-3 schedule”, “3-4-4-3 schedule” and “custody calendar template” can convert to the builder when the guide hands over a prefilled pattern.
- Families will tolerate a 12-month planning window if they can move to the next year easily.

None of these hypotheses has been tested with analytics, interviews or a paid launch. They are product bets.

## 7. Differentiation

1. **Free and complete for the core job.** No trial, account, ad or upsell.
2. **Local-first.** Plans stay in `localStorage`; share links encode the plan in the URL; there is no application server.
3. **A real schedule engine, not a static template.** Holidays override the rotation, one-off changes override both, and totals are recomputed across 12 whole months.
4. **Honest guidance.** The guide compares weekend effects and says when a 50/50 pattern is not 50/50. It does not pretend a rotation is fair because its name contains equal numbers.
5. **Portable outputs.** Per-parent `.ics`, a print layout with key dates, JSON backups and a link a mediator can open.
6. **Static-hostable.** No Node server, database, API key or build step is required to run the published site.

## 8. Distribution plan

A fuller launch checklist is in [LAUNCH.md](LAUNCH.md).

- **Search-led guide:** the pattern guide targets the pre-tool question and links into the builder with `?pattern=...`.
- **Communities:** answer questions in co-parenting and divorce communities with the free guide, not a drive-by link. Disclose that it is a new open-source tool; do not astroturf or fabricate testimonials.
- **Professionals:** offer mediators and co-parenting coaches a free, no-account link they can send to clients; the print and `.ics` outputs are the practical handoff.
- **Open source:** publish the repository, screenshots and limitations. GitHub is both credibility and a distribution channel.
- **Seasonality:** New Year, back-to-school and post-holiday periods are plausible peaks. Treat this as a hypothesis; do not claim traffic numbers.

## 9. Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| Users treat the output as legal advice | Prominent disclaimer in the app, print footer, README and guide; no court-ready claims |
| A share link exposes private details | Names, children, notes and handoff place are excluded by default; the dialog explains that holiday labels remain; anyone with the link can read it |
| Data loss when browser storage is cleared | Autosave feedback, JSON backup, “Save a copy”, reset confirmation, documentation |
| Holiday rules are wrong for a district/country | Rules are editable; starter sets are conservative; date-specific rules and a disclaimer |
| Incumbent adds a free calendar | Compete on local-first privacy, speed, no account and the guide — not on feature count |
| Maintenance of an unmaintained niche | Small dependency-free codebase, tests and a clear architecture; no external APIs to rot |
| Weekend/overnight math is misread | The guide explains overnights vs. hours and calls the totals a planning estimate |

## 10. Sources

All sources accessed **26 October 2026**. Prices are shown for comparison only and may change.

1. OurFamilyWizard, *Plans and Pricing* — <https://www.ourfamilywizard.com/plans-and-pricing>
2. Custody X Change, product and pricing overview — <https://www.custodyxchange.com/>
3. Custody X Change, *3-4-4-3 Custody and Visitation Schedule Examples, Pros & Cons* — <https://www.custodyxchange.com/topics/schedules/50-50/3-4-4-3.php>
4. OurFamilyWizard, *3-4-4-3 Custody Schedules: Benefits, Challenges and Expert Tips* (published 18 January 2023; updated 27 February 2025) — <https://www.ourfamilywizard.com/blog/3-4-4-3-custody-schedules>
5. Reddit r/Divorce thread on co-parenting apps (anecdotal) — <https://www.reddit.com/r/Divorce/comments/1qdr9fj/what_coparenting_app_does_everyone_use_looking/>
6. Hadamard family calendar (example of a free single-page calendar) — <https://www.hadamard.ca/family/calendar>

The absence of a source for a numerical claim means no numerical claim is made.
