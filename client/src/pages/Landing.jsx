// The home page: explains the idea and has the login button.

import { useSearchParams } from 'react-router-dom';
import { btn, notice } from '../utils/ui.js';

export default function Landing() {
  // The server redirects here with ?login=denied if the user cancelled on GitHub.
  const [params] = useSearchParams();

  return (
    <main className="mx-auto flex max-w-[860px] flex-col items-start gap-5 px-5 pt-24">
      <h1 className="text-5xl font-extrabold">Ship Log</h1>
      <p className="max-w-[520px] text-xl text-neutral-400">
        Your coding streak, public and automatic. Miss a day and everyone can see it.
      </p>

      {params.get('login') === 'denied' && <p className={notice}>Login was cancelled. Try again when you're ready.</p>}

      {/* A normal link (not the router's Link) on purpose: the browser has to
          leave the React app and go through the server to GitHub. */}
      <a className={btn} href="/auth/github">
        Log in with GitHub
      </a>
    </main>
  );
}