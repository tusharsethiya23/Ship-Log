// Draws the little "ship log | 23 day streak" badge as an SVG image, the kind
// of badge you see at the top of GitHub READMEs. Pure functions (no database,
// no network), so they are easy to test.

// SVG is XML, so characters like < and & must be written as codes, or text
// containing them could break the image.
export function escapeXml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// SVG can't measure text, so we estimate: at 11px, Verdana averages about
// 6.6 pixels per character. Good enough to size the two halves of the badge.
function textWidth(text) {
  return Math.ceil(String(text).length * 6.6);
}

// label: left half (dark grey), value: right half (colored).
export function renderBadge({ label, value, color }) {
  const labelWidth = textWidth(label) + 14; // 7px padding on each side
  const valueWidth = textWidth(value) + 14;
  const width = labelWidth + valueWidth;

  const safeLabel = escapeXml(label);
  const safeValue = escapeXml(value);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="20" role="img" aria-label="${safeLabel}: ${safeValue}">
  <title>${safeLabel}: ${safeValue}</title>
  <linearGradient id="shade" x2="0" y2="100%">
    <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
    <stop offset="1" stop-opacity=".1"/>
  </linearGradient>
  <clipPath id="round"><rect width="${width}" height="20" rx="3" fill="#fff"/></clipPath>
  <g clip-path="url(#round)">
    <rect width="${labelWidth}" height="20" fill="#555"/>
    <rect x="${labelWidth}" width="${valueWidth}" height="20" fill="${color}"/>
    <rect width="${width}" height="20" fill="url(#shade)"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" font-size="11">
    <text x="${labelWidth / 2}" y="14">${safeLabel}</text>
    <text x="${labelWidth + valueWidth / 2}" y="14">${safeValue}</text>
  </g>
</svg>`;
}

// Decides the text and color of the right half from a profile
// (the object returned by buildProfile).
export function describeBadge(profile) {
  const { current } = profile.streak;

  const value = current === 0 ? 'no streak yet' : `${current} day${current === 1 ? '' : 's'}`;

  let color = '#6b7280'; // grey: no streak
  if (current > 0) color = '#16a34a'; // green: running streak
  if (profile.todayStatus === 'rest') color = '#3b82f6'; // blue: resting today
  if (profile.atRisk) color = '#d97706'; // orange: nothing yet today, streak at risk

  return { value, color };
}