/**
 * Optional starter rules. These are ordinary rules once added: editable,
 * reorderable and deletable. Dates are deliberately conservative; school
 * calendars vary by district, so stretch rules are unchecked by default.
 */

export const HOLIDAY_REGIONS = [
  {
    id: 'us',
    label: 'United States',
    items: [
      {
        key: 'us-thanksgiving',
        name: 'Thanksgiving',
        description: 'Fourth Thursday of November, through Sunday',
        selected: true,
        rule: {
          kind: 'day', dayRule: 'nth', month: 11, weekday: 4, nth: 4, spanDays: 4,
          assignment: 'alternate', alternateStart: 'a', split: 'whole',
        },
      },
      {
        key: 'us-winter',
        name: 'Winter break',
        description: 'December 23 – January 1, split in half',
        selected: true,
        rule: {
          kind: 'range', fromMonth: 12, fromDay: 23, toMonth: 1, toDay: 1,
          split: 'halves', assignment: 'alternate', alternateStart: 'a',
        },
      },
      {
        key: 'us-july4',
        name: 'Independence Day',
        description: 'July 4, alternating years',
        selected: true,
        rule: {
          kind: 'day', dayRule: 'fixed', month: 7, day: 4, spanDays: 1,
          assignment: 'alternate', alternateStart: 'a', split: 'whole',
        },
      },
      {
        key: 'us-mothers',
        name: "Mother's Day",
        description: 'Second Sunday of May, always with Parent A (editable)',
        selected: true,
        rule: {
          kind: 'day', dayRule: 'nth', month: 5, weekday: 0, nth: 2, spanDays: 1,
          assignment: 'a', alternateStart: 'a', split: 'whole',
        },
      },
      {
        key: 'us-fathers',
        name: "Father's Day",
        description: 'Third Sunday of June, always with Parent B (editable)',
        selected: true,
        rule: {
          kind: 'day', dayRule: 'nth', month: 6, weekday: 0, nth: 3, spanDays: 1,
          assignment: 'b', alternateStart: 'a', split: 'whole',
        },
      },
      {
        key: 'us-summer',
        name: 'Summer break',
        description: 'June 15 – August 15, alternating weeks',
        selected: false,
        rule: {
          kind: 'range', fromMonth: 6, fromDay: 15, toMonth: 8, toDay: 15,
          split: 'weeks', assignment: 'alternate', alternateStart: 'a',
        },
      },
    ],
  },
  {
    id: 'uk',
    label: 'United Kingdom',
    items: [
      {
        key: 'uk-christmas',
        name: 'Christmas Day',
        description: 'December 25, alternating years',
        selected: true,
        rule: {
          kind: 'day', dayRule: 'fixed', month: 12, day: 25, spanDays: 1,
          assignment: 'alternate', alternateStart: 'a', split: 'whole',
        },
      },
      {
        key: 'uk-boxing',
        name: 'Boxing Day',
        description: 'December 26, alternating years',
        selected: true,
        rule: {
          kind: 'day', dayRule: 'fixed', month: 12, day: 26, spanDays: 1,
          assignment: 'alternate', alternateStart: 'b', split: 'whole',
        },
      },
      {
        key: 'uk-august',
        name: 'August bank holiday',
        description: 'Last Monday of August, alternating years',
        selected: true,
        rule: {
          kind: 'day', dayRule: 'nth', month: 8, weekday: 1, nth: -1, spanDays: 1,
          assignment: 'alternate', alternateStart: 'a', split: 'whole',
        },
      },
      {
        key: 'uk-fathers',
        name: "Father's Day",
        description: 'Third Sunday of June, always with Parent B (editable)',
        selected: true,
        rule: {
          kind: 'day', dayRule: 'nth', month: 6, weekday: 0, nth: 3, spanDays: 1,
          assignment: 'b', alternateStart: 'a', split: 'whole',
        },
      },
      {
        key: 'uk-summer',
        name: 'Summer holiday',
        description: 'July 20 – September 1, alternating weeks',
        selected: false,
        rule: {
          kind: 'range', fromMonth: 7, fromDay: 20, toMonth: 9, toDay: 1,
          split: 'weeks', assignment: 'alternate', alternateStart: 'a',
        },
      },
    ],
  },
  {
    id: 'ca',
    label: 'Canada',
    items: [
      {
        key: 'ca-day',
        name: 'Canada Day',
        description: 'July 1, alternating years',
        selected: true,
        rule: {
          kind: 'day', dayRule: 'fixed', month: 7, day: 1, spanDays: 1,
          assignment: 'alternate', alternateStart: 'a', split: 'whole',
        },
      },
      {
        key: 'ca-thanksgiving',
        name: 'Thanksgiving',
        description: 'Second Monday of October, through Wednesday',
        selected: true,
        rule: {
          kind: 'day', dayRule: 'nth', month: 10, weekday: 1, nth: 2, spanDays: 3,
          assignment: 'alternate', alternateStart: 'a', split: 'whole',
        },
      },
      {
        key: 'ca-winter',
        name: 'Winter break',
        description: 'December 24 – January 1, split in half',
        selected: true,
        rule: {
          kind: 'range', fromMonth: 12, fromDay: 24, toMonth: 1, toDay: 1,
          split: 'halves', assignment: 'alternate', alternateStart: 'a',
        },
      },
      {
        key: 'ca-mothers',
        name: "Mother's Day",
        description: 'Second Sunday of May, always with Parent A (editable)',
        selected: true,
        rule: {
          kind: 'day', dayRule: 'nth', month: 5, weekday: 0, nth: 2, spanDays: 1,
          assignment: 'a', alternateStart: 'a', split: 'whole',
        },
      },
      {
        key: 'ca-fathers',
        name: "Father's Day",
        description: 'Third Sunday of June, always with Parent B (editable)',
        selected: true,
        rule: {
          kind: 'day', dayRule: 'nth', month: 6, weekday: 0, nth: 3, spanDays: 1,
          assignment: 'b', alternateStart: 'a', split: 'whole',
        },
      },
    ],
  },
  {
    id: 'au',
    label: 'Australia',
    items: [
      {
        key: 'au-day',
        name: 'Australia Day',
        description: 'January 26, alternating years',
        selected: true,
        rule: {
          kind: 'day', dayRule: 'fixed', month: 1, day: 26, spanDays: 1,
          assignment: 'alternate', alternateStart: 'a', split: 'whole',
        },
      },
      {
        key: 'au-christmas',
        name: 'Christmas Day',
        description: 'December 25, alternating years',
        selected: true,
        rule: {
          kind: 'day', dayRule: 'fixed', month: 12, day: 25, spanDays: 1,
          assignment: 'alternate', alternateStart: 'a', split: 'whole',
        },
      },
      {
        key: 'au-boxing',
        name: 'Boxing Day',
        description: 'December 26, alternating years',
        selected: true,
        rule: {
          kind: 'day', dayRule: 'fixed', month: 12, day: 26, spanDays: 1,
          assignment: 'alternate', alternateStart: 'b', split: 'whole',
        },
      },
      {
        key: 'au-mothers',
        name: "Mother's Day",
        description: 'Second Sunday of May, always with Parent A (editable)',
        selected: true,
        rule: {
          kind: 'day', dayRule: 'nth', month: 5, weekday: 0, nth: 2, spanDays: 1,
          assignment: 'a', alternateStart: 'a', split: 'whole',
        },
      },
      {
        key: 'au-fathers',
        name: "Father's Day",
        description: 'First Sunday of September, always with Parent B (editable)',
        selected: true,
        rule: {
          kind: 'day', dayRule: 'nth', month: 9, weekday: 0, nth: 1, spanDays: 1,
          assignment: 'b', alternateStart: 'a', split: 'whole',
        },
      },
      {
        key: 'au-summer',
        name: 'Summer holidays',
        description: 'December 20 – January 28, alternating weeks',
        selected: false,
        rule: {
          kind: 'range', fromMonth: 12, fromDay: 20, toMonth: 1, toDay: 28,
          split: 'weeks', assignment: 'alternate', alternateStart: 'a',
        },
      },
    ],
  },
];

export function regionById(id) {
  return HOLIDAY_REGIONS.find((region) => region.id === id) || HOLIDAY_REGIONS[0];
}
