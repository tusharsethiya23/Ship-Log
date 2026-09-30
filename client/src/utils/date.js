// Date helpers for drawing the heatmap. Dates are "YYYY-MM-DD" text, and the
// math uses UTC so daylight saving can never shift a day.

function parse(str) {
  const [year, month, day] = str.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function format(date) {
  return date.toISOString().slice(0, 10);
}

export function addDays(str, amount) {
  const date = parse(str);
  date.setUTCDate(date.getUTCDate() + amount);
  return format(date);
}

// 0 = Monday ... 6 = Sunday.
function weekdayFromMonday(str) {
  return (parse(str).getUTCDay() + 6) % 7;
}

// Builds the heatmap layout for one year: a list of weeks, each week a list
// of 7 cells (Monday first).
//   { date: '2026-09-29', inYear: true }
// The grid starts on the Monday on or before Jan 1 and ends on the Sunday on
// or after Dec 31. The extra cells outside the year get inYear: false and are
// hidden by the page.
export function buildYearGrid(year) {
  const jan1 = `${year}-01-01`;
  const dec31 = `${year}-12-31`;
  const start = addDays(jan1, -weekdayFromMonday(jan1));
  const end = addDays(dec31, 6 - weekdayFromMonday(dec31));

  const weeks = [];
  let cursor = start;
  while (cursor <= end) {
    const week = [];
    for (let i = 0; i < 7; i++) {
      const date = addDays(cursor, i);
      week.push({ date, inYear: date.startsWith(`${year}-`) });
    }
    weeks.push(week);
    cursor = addDays(cursor, 7);
  }
  return weeks;
}