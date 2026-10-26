/** RFC 5545 calendar generation for parenting-time blocks. */

import { addDays, diffDays, parts } from './dates.js';
import { blockDetails, groupBlocks } from './schedule.js';

const CRLF = '\r\n';
const PROD_ID = '-//Both Homes//Parenting Calendar 1.0//EN';

export function formatICSDate(iso) {
  return iso.replaceAll('-', '');
}

export function formatICSTime(time) {
  return time.replace(':', '') + '00';
}

export function formatICSDateTime(iso, time) {
  return `${formatICSDate(iso)}T${formatICSTime(time)}`;
}

export function utcStamp(date = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  return (
    `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}` +
    `T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`
  );
}

/** Escape a TEXT value per RFC 5545 §3.3.11. */
export function escapeICSText(value) {
  return String(value ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/\r\n|\n|\r/g, '\\n')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,');
}

/**
 * Fold a content line to 75 octets without splitting a multi-byte character.
 * Continuation lines start with one space, leaving 74 octets for content.
 */
export function foldLine(line) {
  const encoder = new TextEncoder();
  let out = '';
  let chunk = '';
  let bytes = 0;
  let limit = 75;
  for (const char of String(line)) {
    const size = encoder.encode(char).length;
    if (bytes + size > limit) {
      out += chunk + CRLF + ' ';
      chunk = '';
      bytes = 0;
      limit = 74;
    }
    chunk += char;
    bytes += size;
  }
  return out + chunk;
}

export function addMinutes(time, minutes) {
  const [h, m] = time.split(':').map(Number);
  const total = h * 60 + m + minutes;
  const dayOffset = Math.floor(total / 1440);
  const remainder = ((total % 1440) + 1440) % 1440;
  return {
    time: `${String(Math.floor(remainder / 60)).padStart(2, '0')}:${String(remainder % 60).padStart(2, '0')}`,
    dayOffset,
  };
}

/**
 * Build a complete VCALENDAR document.
 * events: { uid, start: {date,time}, end: {date,time}, summary, description, location }
 */
export function buildCalendar({ name, events, now = new Date() }) {
  const stamp = utcStamp(now);
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:${PROD_ID}`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeICSText(name)}`,
    'X-WR-TIMEZONE:local',
  ];

  for (const event of events) {
    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${event.uid}`);
    lines.push(`DTSTAMP:${stamp}`);
    lines.push(`DTSTART:${formatICSDateTime(event.start.date, event.start.time)}`);
    lines.push(`DTEND:${formatICSDateTime(event.end.date, event.end.time)}`);
    lines.push(`SUMMARY:${escapeICSText(event.summary)}`);
    if (event.description) lines.push(`DESCRIPTION:${escapeICSText(event.description)}`);
    if (event.location) lines.push(`LOCATION:${escapeICSText(event.location)}`);
    lines.push('CLASS:PRIVATE');
    lines.push('TRANSP:OPAQUE');
    lines.push('END:VEVENT');
  }

  lines.push('END:VCALENDAR');
  return lines.map(foldLine).join(CRLF) + CRLF;
}

function childrenPhrase(plan) {
  return plan.children ? `with ${plan.children}` : 'parenting time';
}

function eventSummary(plan, parentName, forParent) {
  if (forParent === 'both') {
    return `${parentName}: ${childrenPhrase(plan)}`;
  }
  return plan.children ? `With ${plan.children}` : 'Parenting time';
}

/**
 * Build the .ics text for one parent (or both).
 * Times are floating wall-clock times so each calendar app applies its own
 * timezone; that is the least surprising behaviour for local handoffs.
 */
export function buildPlanCalendar({
  plan,
  days,
  forParent = 'both',
  includeHandoffs = false,
  now = new Date(),
}) {
  const parentName = (owner) => plan.parents[owner]?.name?.trim() || `Parent ${owner.toUpperCase()}`;
  const handoffTime = plan.handoff.time || '18:00';
  const events = [];
  const blocks = groupBlocks(days).filter((block) => forParent === 'both' || block.owner === forParent);
  const startRange = days[0]?.date;
  const endRange = days[days.length - 1]?.date;

  for (const block of blocks) {
    const details = blockDetails(block);
    const description = [
      plan.children
        ? `Parenting time with ${plan.children}.`
        : 'Parenting time per your plan.',
      details.holidays.length ? `Holiday: ${details.holidays.join(', ')}.` : '',
      `Handoff: ${handoffTime}${plan.handoff.place ? ` at ${plan.handoff.place}` : ''}.`,
      details.notes.length ? `Note: ${details.notes.join(' · ')}` : '',
      plan.planName ? `Plan: ${plan.planName}.` : '',
      'Generated with Both Homes — a planning tool, not legal advice.',
    ]
      .filter(Boolean)
      .join('\n');

    events.push({
      uid: `both-homes-${block.owner}-${block.start}-${block.end}@both-homes.local`,
      start: { date: block.start, time: handoffTime },
      end: { date: addDays(block.end, 1), time: handoffTime },
      summary: eventSummary(plan, parentName(block.owner), forParent),
      description,
      location: plan.handoff.place || '',
    });
  }

  if (includeHandoffs && days.length > 1) {
    for (let i = 1; i < days.length; i += 1) {
      if (days[i].owner === days[i - 1].owner) continue;
      const receiver = days[i].owner;
      const receiverName = parentName(receiver);
      const giverName = parentName(days[i - 1].owner);
      const startDate = days[i].date;
      events.push({
        uid: `both-homes-handoff-${startDate}@both-homes.local`,
        start: { date: startDate, time: handoffTime },
        end: { date: startDate, time: addMinutes(handoffTime, 20).time },
        summary: forParent === 'both' ? `Handoff — ${receiverName}'s time` : 'Handoff',
        description: [
          `Exchange from ${giverName} to ${receiverName}.`,
          plan.children ? `Children: ${plan.children}.` : '',
          plan.handoff.place ? `Place: ${plan.handoff.place}.` : '',
          'Generated with Both Homes — a planning tool, not legal advice.',
        ]
          .filter(Boolean)
          .join('\n'),
        location: plan.handoff.place || '',
      });
    }
  }

  const calendarName = forParent === 'both'
    ? `${plan.planName || 'Parenting plan'} — both homes`
    : `${plan.planName || 'Parenting plan'} — ${parentName(forParent)}`;

  const ics = buildCalendar({ name: calendarName, events, now });
  return {
    ics,
    events: events.length,
    calendarName,
    filename: filenameFor(plan, forParent, startRange, endRange),
  };
}

function slugify(value) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

export function filenameFor(plan, forParent, start, end) {
  const p = (iso) => (iso && parts(iso) ? `${parts(iso).year}-${String(parts(iso).month).padStart(2, '0')}` : 'calendar');
  const who = forParent === 'both' ? 'both-homes' : slugify(plan.parents[forParent]?.name) || `parent-${forParent}`;
  const span = start && end && diffDays(start, end) >= 0
    ? `${p(start)}_${p(end)}`
    : p(start);
  return `${slugify(plan.planName) || 'parenting-plan'}-${who}-${span}.ics`;
}
