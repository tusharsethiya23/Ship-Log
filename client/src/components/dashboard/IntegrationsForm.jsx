// Connect Discord and Bluesky so the daily streak gets posted automatically.
// The server never sends the webhook or password back, so once connected
// the form only shows "Connected" and a Disconnect button.

import { useEffect, useState } from 'react';
import { getIntegrations, saveIntegrations, testIntegrations } from '../../api/integrations.js';
import { btn, btnSecondary, btnSmall, card, input, label } from '../../utils/ui.js';

export default function IntegrationsForm() {
  const [info, setInfo] = useState(null); // { discordConnected, blueskyConnected, blueskyHandle }
  const [webhook, setWebhook] = useState('');
  const [handle, setHandle] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [results, setResults] = useState([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getIntegrations()
      .then((data) => {
        setInfo(data);
        setHandle(data.blueskyHandle);
      })
      .catch((err) => setError(err.message));
  }, []);

  // Sends changes to the server and shows the outcome. Returns true on success.
  async function save(changes, doneMessage) {
    setBusy(true);
    setError('');
    setMessage('');
    setResults([]);
    try {
      setInfo(await saveIntegrations(changes));
      setMessage(doneMessage);
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function connectDiscord() {
    if (await save({ discordWebhook: webhook }, 'Discord connected ✅')) setWebhook('');
  }

  async function disconnectDiscord() {
    await save({ discordWebhook: '' }, 'Discord disconnected');
  }

  async function connectBluesky() {
    if (await save({ blueskyHandle: handle, blueskyAppPassword: password }, 'Bluesky connected ✅')) {
      setPassword(''); // never keep the password in the page after saving
    }
  }

  async function disconnectBluesky() {
    if (await save({ blueskyHandle: '' }, 'Bluesky disconnected')) setHandle('');
  }

  async function runTest() {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      setResults((await testIntegrations()).results);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (!info) return <section className={card}>{error || 'Loading...'}</section>;

  const anyConnected = info.discordConnected || info.blueskyConnected;

  return (
    <section className={`${card} flex flex-col gap-6`}>
      <div>
        <h2 className="text-xl font-semibold">Auto-posting</h2>
        <p className="text-sm text-neutral-400">
          At the end of each day your streak is posted here. A missed day posts a "streak broken" message too.
        </p>
      </div>

      {/* Discord */}
      <div>
        <label className={label} htmlFor="webhook">
          Discord {info.discordConnected && <span className="text-green-500">· connected ✅</span>}
        </label>
        {info.discordConnected ? (
          <button className={btnSmall} onClick={disconnectDiscord} disabled={busy}>
            Disconnect Discord
          </button>
        ) : (
          <>
            <div className="flex gap-2">
              <input
                id="webhook"
                className={input}
                placeholder="https://discord.com/api/webhooks/..."
                value={webhook}
                onChange={(e) => setWebhook(e.target.value)}
                autoComplete="off"
              />
              <button className={btnSmall} onClick={connectDiscord} disabled={busy || !webhook}>
                Connect
              </button>
            </div>
            <p className="mt-1 text-xs text-neutral-400">
              In Discord: channel settings, Integrations, Webhooks, New Webhook, Copy Webhook URL.
            </p>
          </>
        )}
      </div>

      {/* Bluesky */}
      <div>
        <label className={label} htmlFor="handle">
          Bluesky {info.blueskyConnected && <span className="text-green-500">· connected ✅</span>}
        </label>
        {info.blueskyConnected ? (
          <div className="flex items-center gap-3">
            <span className="text-sm">@{info.blueskyHandle}</span>
            <button className={btnSmall} onClick={disconnectBluesky} disabled={busy}>
              Disconnect Bluesky
            </button>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                id="handle"
                className={input}
                placeholder="yourname.bsky.social"
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
                autoComplete="off"
              />
              <input
                className={input}
                type="password"
                placeholder="abcd-efgh-ijkl-mnop"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="off"
              />
              <button className={btnSmall} onClick={connectBluesky} disabled={busy || !handle || !password}>
                Connect
              </button>
            </div>
            <p className="mt-1 text-xs text-neutral-400">
              Use an app password, never your real password: Bluesky settings, Privacy and security, App passwords.
            </p>
          </>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button className={anyConnected ? btn : btnSecondary} onClick={runTest} disabled={busy || !anyConnected}>
          Test my connections
        </button>
        {message && <span className="text-sm text-green-500">{message}</span>}
        {error && <span className="text-sm text-red-500">{error}</span>}
      </div>

      {results.length > 0 && (
        <ul className="flex flex-col gap-1 text-sm">
          {results.map((r) => (
            <li key={r.platform} className={r.ok ? 'text-green-500' : 'text-red-500'}>
              {r.platform}: {r.message}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}