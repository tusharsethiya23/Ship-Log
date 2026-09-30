// The settings form: timezone, day cutoff hour, and which repos to track.
// Everything is edited locally first and only sent to the server when the
// user clicks Save.

import { useMemo, useState } from 'react';
import { updateMe } from '../../api/me.js';
import { btn, btnSmall, card, input, label } from '../../utils/ui.js';

// Same rule the server uses: "owner/name".
const REPO_PATTERN = /^[\w.-]+\/[\w.-]+$/;
const MAX_REPOS = 10;

// Lets people paste a full link like https://github.com/owner/repo.git
// and still end up with just "owner/repo".
function normalizeRepo(text) {
  return text
    .trim()
    .replace(/^https?:\/\/github\.com\//i, '')
    .replace(/\.git$/i, '')
    .replace(/\/$/, '');
}

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
  const [newRepo, setNewRepo] = useState('');
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [saving, setSaving] = useState(false);

  // Only rebuilt when the saved timezone changes, not on every keystroke.
  const timezones = useMemo(() => buildTimezoneList(user.timezone), [user.timezone]);

  // Adds the typed repo to the list (not saved until the user clicks Save).
  function addRepo() {
    const fullName = normalizeRepo(newRepo);
    setStatus('');
    if (!fullName) return;

    if (!REPO_PATTERN.test(fullName)) {
      setError('Repo must look like owner/repo, for example octocat/hello-world');
      return;
    }
    if (repos.some((r) => r.fullName.toLowerCase() === fullName.toLowerCase())) {
      setError('That repo is already in the list');
      return;
    }
    if (repos.length >= MAX_REPOS) {
      setError(`You can track up to ${MAX_REPOS} repos`);
      return;
    }

    setRepos([...repos, { fullName, isPrivate: false }]);
    setNewRepo('');
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

        <div className="flex gap-2">
          <input
            id="repo"
            className={input}
            placeholder="owner/repo"
            value={newRepo}
            onChange={(e) => setNewRepo(e.target.value)}
            // Enter adds the repo instead of submitting (saving) the whole form.
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addRepo();
              }
            }}
          />
          <button type="button" className={btnSmall} onClick={addRepo}>
            Add
          </button>
        </div>
        <p className="mt-1 text-xs text-neutral-400">
          Public repos only for now. Private repos can't be read yet, so they will show as unreachable.
        </p>
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