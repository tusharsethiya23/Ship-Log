// The calendar heatmap: one small square per day of the year.
//   green = active, blue = rest, red = missed,
//   dark grey = nothing recorded, outlined = still in the future.

import { buildYearGrid } from '../../utils/date.js';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Every square shares this size and shape (size-3 = 12px).
const CELL = 'size-3 rounded-[3px]';

// The color of a square, chosen by what kind of day it is.
const CELL_STYLES = {
  active: 'bg-green-600',
  rest: 'bg-blue-500',
  missed: 'bg-red-600',
  empty: 'bg-neutral-800',
  future: 'border border-neutral-800',
  hidden: 'invisible', // cells outside the year: keep the space, hide the square
};

// year:  the year to draw (a number)
// days:  records from the API: [{ date, status, commitCount }]
// today: the user's current date, to tell past from future
export default function Heatmap({ year, days, today }) {
  // Turn the list into a lookup table so each square can find its record fast.
  const byDate = new Map(days.map((d) => [d.date, d]));
  const weeks = buildYearGrid(year);

  return (
    // On small screens the heatmap scrolls sideways instead of breaking the page.
    <div className="overflow-x-auto pb-2">
      {/* w-max makes this box exactly as wide as the heatmap, so the month
          names and the squares line up. */}
      <div className="w-max">
        {/* Month names: one slot per week, filled only in the week that holds the 1st.
            The number of columns depends on the year, so it's set with style. */}
        <div
          className="mb-1 grid h-[18px] gap-[3px] text-[11px] text-neutral-400"
          style={{ gridTemplateColumns: `repeat(${weeks.length}, 12px)` }}
        >
          {weeks.map((week, i) => {
            const first = week.find((c) => c.inYear && c.date.endsWith('-01'));
            return (
              <span key={i} className="whitespace-nowrap">
                {first ? MONTHS[Number(first.date.slice(5, 7)) - 1] : ''}
              </span>
            );
          })}
        </div>

        {/* The squares: 7 rows (Monday to Sunday), filled column by column. */}
        <div className="grid auto-cols-[12px] grid-flow-col grid-rows-[repeat(7,12px)] gap-[3px]">
          {weeks.flatMap((week) =>
            week.map((cell) => {
              const record = byDate.get(cell.date);

              let kind = 'empty';
              if (!cell.inYear) kind = 'hidden';
              else if (record) kind = record.status;
              else if (cell.date > today) kind = 'future';

              // Today gets a white ring so it's easy to find.
              const todayRing = cell.date === today ? 'relative z-10 ring-2 ring-neutral-100' : '';
              const tip = record
                ? `${cell.date}: ${record.status}${record.commitCount ? `, ${record.commitCount} commits` : ''}`
                : cell.date;

              return (
                <div
                  key={cell.date}
                  className={`${CELL} ${CELL_STYLES[kind]} ${todayRing}`}
                  title={cell.inYear ? tip : undefined}
                />
              );
            })
          )}
        </div>

        <div className="mt-3 flex items-center gap-2 text-xs text-neutral-400">
          <span className={`${CELL} ${CELL_STYLES.active}`} /> active
          <span className={`${CELL} ${CELL_STYLES.rest}`} /> rest
          <span className={`${CELL} ${CELL_STYLES.missed}`} /> missed
        </div>
      </div>
    </div>
  );
}