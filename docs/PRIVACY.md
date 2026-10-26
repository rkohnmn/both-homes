# Privacy and data handling

**Last updated:** 26 October 2026

Both Homes is a static planning tool. There is no application server, account system, analytics service, advertising network, or database owned by the project.

## What is stored in the browser

| Key | Contents | Purpose |
| --- | --- | --- |
| `bothhomes.plan.v1` | The complete plan: plan name, parent names, children, rotation, start date, handoff time/place, holidays and overrides | Restores the calendar on the same browser/device |
| `bothhomes.theme` | `light` or `dark` | Keeps the chosen appearance across the app and guide |

`localStorage` is origin-scoped. A plan created at `https://user.github.io/repo/` is not available at a different origin. It is readable by scripts running on the same origin and by anyone with access to that browser profile.

The app does **not** use cookies, IndexedDB, service workers, fingerprinting, or analytics. It does not send plan data to a server. The self-hosted font and all assets load from the same static site.

## Share links

A share link encodes a **snapshot** of the plan as base64url JSON in the URL hash:

```text
https://host/path/#p=<encoded plan>
```

The fragment after `#` is not sent in the HTTP request to the host. It is, however, visible to:

- anyone who receives the link;
- browser history and clipboard managers;
- any extension or software with access to the page;
- screenshots or chat logs containing the URL.

It is **encoding, not encryption**. Anyone who has the link can decode it.

By default the share projection removes:

- parent names;
- children’s names;
- the plan name (replaced with “Shared parenting plan”);
- override notes;
- the handoff place.

It retains the schedule structure, dates, rotation, handoff time, holiday rules and **holiday rule names** (for example, “Thanksgiving” or “Grandma’s birthday”). Holiday names are needed for the receiving calendar to make sense, but they can be personal. The share dialog says so. Review the included details before posting a link in a public group.

The user can explicitly include names and notes. Doing so puts that information in the link. The recipient can open a working copy of the plan.

## Export files

`.ics` and JSON exports are generated in the browser with the File/Blob APIs. They are downloaded to the user’s device; nothing is uploaded.

- `.ics` files can contain parent names, children’s names, handoff place, holiday labels and notes. They are ordinary calendar files; treat them as private.
- JSON backups contain the complete, unredacted plan.
- Printed pages contain whatever is visible in the print layout, including names and notes.

## Hosting and server logs

The site is intended for GitHub Pages. GitHub, like any hosting provider, receives ordinary HTTP requests for the HTML, CSS, JavaScript, images and font. Those requests may appear in host-level access logs according to GitHub’s policies. The application itself does not add tracking or send plan data in requests.

If you fork the project and host it elsewhere, that host’s logging and privacy policy apply instead.

## Children’s data

The app can store children’s names, holidays, notes and schedules. That is sensitive family information. Recommendations:

- use the share link’s default redaction;
- avoid posting links with names in public communities;
- prefer an exported file or printout for a mediator or school when a link is unnecessary;
- do not use the app as the sole record of a court-ordered schedule;
- do not put highly sensitive information (addresses, ID numbers, medical details) in a note; notes are free text and may be exported or shared.

## Clearing data

- **Reset plan** in the app starts a fresh plan but leaves the theme and any share links/exports you already made.
- **Clear this browser’s data** in the footer removes the stored plan and theme after a confirmation.
- Clearing site data in the browser’s settings has the same effect for this origin.
- Exported files and links that were already created are not affected by clearing the app.

Export a JSON backup before clearing or changing devices.

## No sale or sharing

The project has no user accounts, contact list, payment system or analytics, and does not sell or share personal data. There is no mailing list.

## Limitations

- The app cannot protect data from a compromised browser, a malicious extension, a shared device, or someone who obtains an unlocked phone.
- The app does not encrypt local storage.
- A share link cannot be revoked or expired; once sent, assume it can be read.
- Browser “private” modes may discard storage when the window closes.
- The app does not verify the identity of anyone opening a share link.

## Contact

For a privacy concern, open an issue in the repository without including a real plan, names, or the contents of a private link. For a security-sensitive report, describe the class of issue and impact first so a private channel can be arranged.
