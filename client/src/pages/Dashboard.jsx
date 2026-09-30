// The logged-in page at /dashboard. For now: who you are, plus buttons to
// check your commits, claim a rest day, and log out. The settings form
// (timezone, repos) comes in the next step.

import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { claimRestDay, getMe, logout, syncNow } from '../api/me.js';
import { btn, btnSecondary, card, notice, page } from '../utils/ui.js';

export default function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    getMe()
      .then((data) => setUser(data.user))
      // Not logged in (or the session expired): go back to the home page.
      .catch(() => navigate('/'));
  }, [navigate]);

  // Runs an action, then shows its result (or its error) as a message.
  async function run(action, describe) {
    setMessage('Working...');
    try {
      setMessage(describe(await action()));
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

      <section className={card}>
        <div className="flex flex-wrap gap-2.5">
          <button
            className={btn}
            onClick={() =>
              run(syncNow, (r) =>
                r.sync.skipped ? `Skipped: ${r.sync.skipped}` : `Found ${r.sync.commitCount} commit(s) today. Status: ${r.sync.status}`
              )
            }
          >
            Check my commits now
          </button>
          <button className={btn} onClick={() => run(claimRestDay, (r) => `Rest day claimed for ${r.restDay.date}`)}>
            Take today as my rest day
          </button>
          <Link className={btnSecondary} to={`/u/${user.username}`}>
            View my public page
          </Link>
          <button className={btnSecondary} onClick={handleLogout}>
            Log out
          </button>
        </div>
        {message && <p className={`mt-4 ${notice}`}>{message}</p>}
      </section>
    </main>
  );
}