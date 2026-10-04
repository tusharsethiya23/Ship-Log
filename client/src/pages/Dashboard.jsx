// The logged-in page at /dashboard: your streak, quick actions, the README
// badge, and settings.

import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { cancelRestDay, claimRestDay, getMe, logout, syncNow } from '../api/me.js';
import { getProfile } from '../api/profile.js';
import BadgeCard from '../components/dashboard/BadgeCard.jsx';
import IntegrationsForm from '../components/dashboard/IntegrationsForm.jsx';
import SettingsForm from '../components/dashboard/SettingsForm.jsx';
import StreakCard from '../components/profile/StreakCard.jsx';
import { btn, btnSecondary, card, notice, page } from '../utils/ui.js';
import DeleteAccountCard from '../components/dashboard/DeleteAccountCard.jsx';

export default function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null); // the same data your public page shows
  const [message, setMessage] = useState('');

  // Loads (or reloads) the streak data. A failure here is not worth breaking
  // the whole page for, so the streak card simply stays as it was.
  const refreshProfile = useCallback(async (username) => {
    try {
      setProfile(await getProfile(username));
    } catch {
      // keep showing the previous data
    }
  }, []);

  useEffect(() => {
    getMe()
      .then((data) => {
        setUser(data.user);
        refreshProfile(data.user.username);
      })
      // Not logged in (or the session expired): go back to the home page.
      .catch(() => navigate('/'));
  }, [navigate, refreshProfile]);

  // Runs an action, shows its result (or its error), then refreshes the streak.
  async function run(action, describe) {
    setMessage('Working...');
    try {
      setMessage(describe(await action()));
      await refreshProfile(user.username);
    } catch (err) {
      setMessage(err.message);
    }
  }

  async function handleLogout() {
    await logout();
    navigate('/');
  }

  if (!user) {
    return (
      <main className={page}>
        <p className={notice}>Loading...</p>
      </main>
    );
  }

  // 'none' = nothing yet today, 'rest' = rest day claimed, 'active' = committed.
  const todayStatus = profile?.todayStatus ?? 'none';

  return (
    <main className={page}>
      <header className="flex items-center gap-4">
        {user.avatarUrl && <img src={user.avatarUrl} alt="" className="size-16 rounded-full" />}
        <div>
          <h1 className="text-2xl font-bold">Hi, @{user.username}</h1>
          <p className="text-neutral-400">
            Today is {user.today} ({user.timezone})
          </p>
        </div>
      </header>

      {profile && <StreakCard profile={profile} />}

      <section className={card}>
        <div className="flex flex-wrap gap-2.5">
          <button
            className={btn}
            onClick={() =>
              run(syncNow, (r) =>
                r.sync.skipped
                  ? `Skipped: ${r.sync.skipped}`
                  : `Found ${r.sync.commitCount} contribution(s) today` +
                  (r.sync.privateCount ? ` (${r.sync.privateCount} private)` : '') +
                  `. Status: ${r.sync.status}` +
                  (r.sync.unreachable.length ? `. Could not read: ${r.sync.unreachable.join(', ')}` : '')
              )
            }
          >
            Check my commits now
          </button>

          {/* The rest day button changes with today's state. */}
          {todayStatus === 'none' && (
            <button className={btn} onClick={() => run(claimRestDay, (r) => `Rest day claimed for ${r.restDay.date}`)}>
              Take today as my rest day
            </button>
          )}
          {todayStatus === 'rest' && (
            <button className={btnSecondary} onClick={() => run(cancelRestDay, (r) => `Rest day cancelled for ${r.date}`)}>
              Cancel today's rest day
            </button>
          )}

          <Link className={btnSecondary} to={`/u/${user.username}`}>
            View my public page
          </Link>
          <button className={btnSecondary} onClick={handleLogout}>
            Log out
          </button>
        </div>

        {todayStatus === 'active' && (
          <p className="mt-3 text-sm text-neutral-400">You've committed today, so you don't need a rest day.</p>
        )}
        {message && <p className={`mt-4 ${notice}`}>{message}</p>}
      </section>

      <BadgeCard username={user.username} />

      {/* When settings are saved, update the header and reload the streak,
          because a new timezone can change which day "today" is. */}
      <SettingsForm
        user={user}
        onSaved={(updated) => {
          setUser(updated);
          refreshProfile(updated.username);
        }}
      />
      <IntegrationsForm />
      <DeleteAccountCard username={user.username} onDeleted={() => navigate('/')} />
    </main>
  );
}