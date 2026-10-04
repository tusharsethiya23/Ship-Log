// The settings form: timezone, day cutoff hour, which repos to track (picked
// from a list loaded from GitHub), and the private activity option.
// Everything is edited locally first and only sent to the server when the
// user clicks Save.

import { useEffect, useMemo, useState } from 'react';
import { getGithubRepos, updateMe } from '../../api/me.js';
import { btn, btnSmall, card, input, label } from '../../utils/ui.js';

const MAX_REPOS = 10;

// Builds the list for the timezone dropdown. We always include UTC, the
// user's saved timezone, and the one their browser reports, because some
// browsers list timezones under older names and would otherwise not show
// the current value.
function buildTimezoneList(saved) {
  const browser = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const supported = typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('timeZone') : [];
  return [...new Set(['UTC', saved, browser, ...supported])].sort();
}

// user:    the current user from GET /api/me
// onSaved: called with the updated user after a successful save, so the
//          dashboard can refresh what it shows (like today's date)
export default function SettingsForm({ user, onSaved }) {
  const [timezone, setTimezone] = useState(user.timezone);
  const [cutoff, setCutoff] = useState(user.dayCutoffHour);
  const [repos, setRepos] = useState(user.repos.map((r) => ({ fullName: r.fullName, isPrivate: r.isPrivate })));
  const [countPrivate, setCountPrivate] = useState(user.countPrivateActivity ?? false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [saving, setSaving] = useState(false);

  // The repos GitHub says this user can pick from. null = still loading.
  const [available, setAvailable] = useState(null);
  const [reposError, setReposError] = useState('');
  const [reloadKey, setReloadKey] = useState(0); // changing it loads the list again
  const [selected, setSelected] = useState(''); // the dropdown's current choice

  // Only rebuilt when the saved timezone changes, not on every keystroke.
  const timezones = useMemo(() => buildTimezoneList(user.timezone), [user.timezone]);

  // Load the repo list from GitHub when the form opens, and again whenever
  // "Try again" is clicked.
  useEffect(() => {
    let ignore = false; // stops an old, slow answer from overwriting a newer one
    setAvailable(null);
    setReposError('');

    getGithubRepos()
      .then((data) => {
        if (!ignore) setAvailable(data.repos);
      })
      .catch((err) => {
        if (!ignore) setReposError(err.message);
      });

    return () => {
      ignore = true;
    };
  }, [reloadKey]);

  // The dropdown only offers repos that aren't already being tracked.
  const options = useMemo(() => {
    if (!available) return [];
    const taken = new Set(repos.map((r) => r.fullName.toLowerCase()));
    return available.filter((name) => !taken.has(name.toLowerCase()));
  }, [available, repos]);

  // Adds the chosen repo to the list (not saved until the user clicks Save).
  function addRepo() {
    setStatus('');
    if (!selected) return;
    if (repos.length >= MAX_REPOS) {
      setError(`You can track up to ${MAX_REPOS} repos`);
      return;
    }
    setRepos([...repos, { fullName: selected, isPrivate: false }]);
    setSelected('');
    setError('');
  }

  function removeRepo(fullName) {
    setRepos(repos.filter((r) => r.fullName !== fullName));
    setStatus('');
  }

  async function handleSubmit(event) {
    event.preventDefault(); // stop the browser from reloading the page
    setSaving(true);
    setError('');
    setStatus('');

    try {
      const data = await updateMe({
        timezone,
        dayCutoffHour: Number(cutoff),
        repos,
        countPrivateActivity: countPrivate,
      });
      onSaved(data.user);
      setStatus('Saved ✅');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className={`${card} flex flex-col gap-5`}>
      <h2 className="text-xl font-semibold">Settings</h2>

      <div>
        <label className={label} htmlFor="timezone">
          Your timezone
        </label>
        <select id="timezone" className={input} value={timezone} onChange={(e) => setTimezone(e.target.value)}>
          {timezones.map((tz) => (
            <option key={tz} value={tz}>
              {tz}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-neutral-400">Your streak days start and end by this clock.</p>
      </div>

      <div>
        <label className={label} htmlFor="cutoff">
          When does your day end?
        </label>
        <select id="cutoff" className={input} value={cutoff} onChange={(e) => setCutoff(e.target.value)}>
          {Array.from({ length: 24 }, (_, hour) => (
            <option key={hour} value={hour}>
              {hour === 0 ? 'Midnight (default)' : `${String(hour).padStart(2, '0')}:00`}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-neutral-400">A commit made before this hour still counts for the previous day.</p>
      </div>

      <div>
        <label className={label} htmlFor="repo">
          Repos to track
        </label>

        {/* The repos already chosen. */}
        {repos.length === 0 ? (
          <p className="mb-2 text-sm text-neutral-400">No repos yet. Add at least one to start counting commits.</p>
        ) : (
          <ul className="mb-2 flex flex-col gap-1.5">
            {repos.map((repo) => (
              <li
                key={repo.fullName}
                className="flex items-center justify-between rounded-lg border border-neutral-800 px-3 py-2 text-sm"
              >
                <span>{repo.fullName}</span>
                <button type="button" className={btnSmall} onClick={() => removeRepo(repo.fullName)}>
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}

        {/* Loading, error, or the dropdown of repos to choose from. */}
        {available === null && !reposError && (
          <p className="text-sm text-neutral-400">Loading your repos from GitHub...</p>
        )}

        {reposError && (
          <div className="flex items-center gap-3 text-sm text-red-500">
            <span>{reposError}</span>
            <button type="button" className={btnSmall} onClick={() => setReloadKey((k) => k + 1)}>
              Try again
            </button>
          </div>
        )}

        {available !== null &&
          (options.length === 0 ? (
            <p className="text-sm text-neutral-400">
              {available.length === 0
                ? 'GitHub returned no public repos for your account.'
                : 'All your public repos are already tracked.'}
            </p>
          ) : (
            <div className="flex gap-2">
              <select id="repo" className={input} value={selected} onChange={(e) => setSelected(e.target.value)}>
                <option value="">Choose a repo...</option>
                {options.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
              <button type="button" className={btnSmall} onClick={addRepo} disabled={!selected}>
                Add
              </button>
            </div>
          ))}

        <p className="mt-1 text-xs text-neutral-400">
          Lists your public repos (most recently pushed first). Private repos can't be read, so use the private
          activity option below for those.
        </p>
      </div>

      <div>
        <label className="flex cursor-pointer items-start gap-3 text-sm">
          <input
            type="checkbox"
            className="mt-1 size-4 accent-green-600"
            checked={countPrivate}
            onChange={(e) => setCountPrivate(e.target.checked)}
          />
          <span>
            Also count my private activity
            <span className="mt-1 block text-xs text-neutral-400">
              Uses the private contribution count GitHub shows on your profile. Turn on "Private contributions" in
              GitHub's contribution settings (above the graph on your profile page) or it will always read zero.
              Only a number is read, never repo names, messages, or code. It also counts private issues, pull
              requests, and reviews.
            </span>
          </span>
        </label>
      </div>

      <div className="flex items-center gap-3">
        <button type="submit" className={btn} disabled={saving}>
          {saving ? 'Saving...' : 'Save settings'}
        </button>
        {status && <span className="text-sm text-green-500">{status}</span>}
        {error && <span className="text-sm text-red-500">{error}</span>}
      </div>
    </form>
  );
}