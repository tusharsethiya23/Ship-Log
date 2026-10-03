// Shows the streak badge and the code to paste into a GitHub README.

import { useState } from 'react';
import { btnSmall, card } from '../../utils/ui.js';

export default function BadgeCard({ username }) {
  const [copied, setCopied] = useState(false);

  // The address of this website, so the code always matches where it runs.
  const site = window.location.origin;
  const badgeUrl = `${site}/badge/${username}/streak.svg`;
  // Markdown: a clickable image that links to your public page.
  const markdown = `[![Ship Log streak](${badgeUrl})](${site}/u/${username})`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(markdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Some browsers block copying. The text is selectable below instead.
      setCopied(false);
    }
  }

  return (
    <section className={`${card} flex flex-col gap-3`}>
      <div>
        <h2 className="text-xl font-semibold">README badge</h2>
        <p className="text-sm text-neutral-400">
          Paste this into any GitHub README (your profile README is a good place) to show your live streak.
        </p>
      </div>

      <img src={`/badge/${username}/streak.svg`} alt="Your streak badge" className="h-5 self-start" />

      <code className="block select-all break-all rounded-lg border border-neutral-800 bg-neutral-950 p-3 text-xs text-neutral-300">
        {markdown}
      </code>

      <div className="flex items-center gap-3">
        <button className={btnSmall} onClick={copy}>
          Copy code
        </button>
        {copied && <span className="text-sm text-green-500">Copied ✅</span>}
      </div>
    </section>
  );
}