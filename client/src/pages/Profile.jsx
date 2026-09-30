// The public page at /u/:username. Anyone can open it, no login needed.

import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getCalendar, getProfile } from '../api/profile.js';
import StreakCard from '../components/profile/StreakCard.jsx';
import Heatmap from '../components/profile/Heatmap.jsx';
import { btnSmall, card, link, notice, page } from '../utils/ui.js';

// Text color for each kind of day in the "Recent days" list.
const TAG_STYLES = {
  active: 'text-green-500',
  rest: 'text-blue-400',
  missed: 'text-red-500',
};

export default function Profile() {
  const { username } = useParams(); // the ":username" part of the address

  const [profile, setProfile] = useState(null);
  const [error, setError] = useState('');
  const [year, setYear] = useState(null);
  const [calendarDays, setCalendarDays] = useState([]);

  // Load the profile whenever the username in the address changes.
  useEffect(() => {
    let ignore = false; // stops an old, slow response from overwriting a newer one
    setProfile(null);
    setError('');
    setYear(null);

    getProfile(username)
      .then((data) => {
        if (ignore) return;
        setProfile(data);
        setYear(Number(data.today.slice(0, 4))); // start on the current year
      })
      .catch((err) => {
        if (!ignore) setError(err.status === 404 ? 'User not found' : err.message);
      });

    return () => {
      ignore = true;
    };
  }, [username]);

  // Load the heatmap data whenever the year changes.
  useEffect(() => {
    if (year === null) return;
    let ignore = false;

    getCalendar(username, year)
      .then((data) => {
        if (!ignore) setCalendarDays(data.days);
      })
      .catch(() => {
        if (!ignore) setCalendarDays([]);
      });

    return () => {
      ignore = true;
    };
  }, [username, year]);

  if (error) {
    return (
      <main className={page}>
        <p className={notice}>{error}</p>
        <Link className={link} to="/">
          Back to home
        </Link>
      </main>
    );
  }

  if (!profile || year === null) {
    return (
      <main className={page}>
        <p className={notice}>Loading...</p>
      </main>
    );
  }

  const currentYear = Number(profile.today.slice(0, 4));
  const firstYear = Number(profile.user.memberSince.slice(0, 4));

  return (
    <main className={page}>
      <header className="flex items-center gap-4">
        {profile.user.avatarUrl && <img src={profile.user.avatarUrl} alt="" className="size-16 rounded-full" />}
        <div>
          <h1 className="text-2xl font-bold">@{profile.user.username}</h1>
          <p className="text-neutral-400">Ships code every day</p>
        </div>
      </header>

      <StreakCard profile={profile} />

      <section className={card}>
        <div className="mb-4 flex items-center justify-between">
          <button className={btnSmall} onClick={() => setYear(year - 1)} disabled={year <= firstYear}>
            ‹
          </button>
          <h2 className="text-xl font-semibold">{year}</h2>
          <button className={btnSmall} onClick={() => setYear(year + 1)} disabled={year >= currentYear}>
            ›
          </button>
        </div>
        <Heatmap year={year} days={calendarDays} today={profile.today} />
      </section>

      <section className={card}>
        <h2 className="text-xl font-semibold">Recent days</h2>
        {profile.recentDays.length === 0 ? (
          <p className="mt-3 text-neutral-400">No days recorded yet.</p>
        ) : (
          <ul className="mt-3">
            {profile.recentDays.map((day) => (
              // Three columns: date, status, commit count.
              <li key={day.date} className="grid grid-cols-[120px_90px_1fr] border-b border-neutral-800 py-2">
                <span>{day.date}</span>
                <span className={`text-sm font-semibold ${TAG_STYLES[day.status] ?? ''}`}>{day.status}</span>
                <span className="text-neutral-400">{day.commitCount ? `${day.commitCount} commits` : ''}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}