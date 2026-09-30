// The big streak number and the three stats under it.

import { card } from '../../utils/ui.js';

// Turns today's status into a one-line message.
function statusMessage({ todayStatus, atRisk, streak }) {
  if (todayStatus === 'active') return 'Done for today ✅';
  if (todayStatus === 'rest') return 'Resting today 😴';
  if (atRisk) return 'Nothing yet today, streak at risk ⚠️';
  return streak.current === 0 ? 'Ready to start a streak' : 'Nothing yet today';
}

// One stat: a bold value with a small label under it.
function Stat({ value, label }) {
  return (
    <div className="flex flex-col">
      <strong className="text-2xl">{value}</strong>
      <span className="text-sm text-neutral-400">{label}</span>
    </div>
  );
}

export default function StreakCard({ profile }) {
  const { streak } = profile;

  return (
    <section className={`${card} text-center`}>
      <div className="text-7xl font-extrabold leading-none">{streak.current}</div>
      <div className="text-lg text-neutral-400">day streak 🔥</div>

      {/* The status line turns orange when the streak is at risk. */}
      <div className={`mb-5 mt-3 ${profile.atRisk ? 'text-amber-400' : ''}`}>{statusMessage(profile)}</div>

      <div className="flex justify-center gap-10">
        <Stat value={streak.longest} label="longest" />
        <Stat value={streak.totalActive} label="active days" />
        <Stat value={streak.restUsedThisWeek ? 'used' : 'free'} label="rest day" />
      </div>
    </section>
  );
}