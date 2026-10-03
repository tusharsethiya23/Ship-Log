// The "danger zone" at the bottom of the dashboard. Deleting is a two-step
// process: click the first button, then type your username to confirm.

import { useState } from 'react';
import { deleteAccount, getMe } from '../../api/me.js';
import { btnDanger, btnSecondary, card, input, label } from '../../utils/ui.js';

// username:  the logged-in user's name (what they must type to confirm)
// onDeleted: called after the account is gone (the dashboard sends them home)
export default function DeleteAccountCard({ username, onDeleted }) {
    const [open, setOpen] = useState(false);
    const [typed, setTyped] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');

    async function handleDelete() {
        setBusy(true);
        setError('');
        try {
            const result = await deleteAccount(typed);
            // GitHub couldn't be reached, so tell them how to finish the job by hand.
            if (!result.githubRevoked) {
                window.alert(
                    'Your account was deleted. We could not remove Ship Log from your GitHub authorized apps automatically. ' +
                    'You can do it yourself under GitHub, Settings, Applications, Authorized OAuth Apps.'
                );
            }
            onDeleted();
        } catch (err) {
            // The server may have finished the deletion even though its answer never
            // reached us (for example a 502 while the app restarts). If we are no
            // longer logged in, the account is gone.
            try {
                await getMe();
            } catch (checkError) {
                if (checkError.status === 401) {
                    onDeleted();
                    return;
                }
            }
            setError(err.message);
            setBusy(false);
        }
    }

    return (
        <section className={`${card} flex flex-col gap-3 border-red-900`}>
            <div>
                <h2 className="text-xl font-semibold text-red-400">Delete account</h2>
                <p className="text-sm text-neutral-400">
                    This permanently erases your streak, every recorded day, your post history, and your saved Discord and
                    Bluesky connections. Your public page, badge, and share links stop working at once, and Ship Log's access
                    to your GitHub is removed. It cannot be undone. Posts already published on Discord or Bluesky stay there.
                </p>
            </div>

            {!open ? (
                <button className={`${btnSecondary} self-start`} onClick={() => setOpen(true)}>
                    Delete my account...
                </button>
            ) : (
                <div className="flex flex-col gap-3">
                    <div>
                        <label className={label} htmlFor="confirm-username">
                            Type <strong>{username}</strong> to confirm
                        </label>
                        <input
                            id="confirm-username"
                            className={input}
                            value={typed}
                            onChange={(e) => setTyped(e.target.value)}
                            autoComplete="off"
                        />
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            className={btnDanger}
                            onClick={handleDelete}
                            disabled={busy || typed.trim().toLowerCase() !== username}
                        >
                            {busy ? 'Deleting...' : 'Permanently delete everything'}
                        </button>
                        <button
                            className={btnSecondary}
                            onClick={() => {
                                setOpen(false);
                                setTyped('');
                                setError('');
                            }}
                            disabled={busy}
                        >
                            Cancel
                        </button>
                    </div>
                    {error && <p className="text-sm text-red-500">{error}</p>}
                </div>
            )}
        </section>
    );
}