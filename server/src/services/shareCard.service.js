// Draws the streak card image (PNG) and the title/description that go with it.
// Used in two places:
//   - the web server, for the link preview image (/share/:username/card.png)
//   - the worker, to attach a card to each Bluesky post

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCanvas, GlobalFonts } from '@napi-rs/canvas';
import { logger } from '../config/logger.js';
import { addDays, getWeekStart } from '../utils/time.js';
import { buildProfile, findPublicUser, getDaysSince } from './profile.service.js';

const WEEKS = 18; // how many weeks the mini heatmap shows
const W = 1200; // card size: the standard link-preview shape
const H = 630;

// --- Fonts ---------------------------------------------------------------
// The font files live in server/assets/fonts. This finds that folder no
// matter where the program is started from.
const FONT_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../assets/fonts');

// Registers one font file under a name we can use when drawing.
// Returns false (and warns) if the file is missing.
function loadFont(file, family) {
  const full = path.join(FONT_DIR, file);
  if (!fs.existsSync(full)) {
    logger.warn(`Font file missing: ${file}. Share cards will use a fallback font.`);
    return false;
  }
  GlobalFonts.registerFromPath(full, family);
  return true;
}

// Regular and bold are registered as two separate names, which avoids any
// guessing about which weight to pick.
const REGULAR = loadFont('font-regular.ttf', 'ShipRegular') ? 'ShipRegular' : 'sans-serif';
const BOLD = loadFont('font-bold.ttf', 'ShipBold') ? 'ShipBold' : 'sans-serif';

// --- Colors (the same palette as the website) -----------------------------
const COLORS = {
  bg: '#0a0a0a',
  panel: '#171717',
  border: '#262626',
  text: '#f5f5f5',
  muted: '#a3a3a3',
  green: '#16a34a',
  blue: '#3b82f6',
  red: '#dc2626',
  empty: '#262626',
};
const STATUS_COLORS = { active: COLORS.green, rest: COLORS.blue, missed: COLORS.red };

// --- Text used by the share page and by Bluesky cards ----------------------
export function describeStreak(username, streak) {
  return {
    title: streak.current > 0 ? `@${username} is on a ${streak.current}-day streak 🔥` : `@${username} on Ship Log`,
    description: `${streak.longest} longest · ${streak.totalActive} active days. Shipping code, in public.`,
  };
}

// --- Small drawing helpers ------------------------------------------------

// Traces a rectangle with rounded corners (fill or stroke it afterwards).
function roundedRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// Picks the biggest font size (from `start` down to `min`) at which the text
// still fits in `maxWidth`, and leaves the canvas set to that size.
function fitFont(ctx, text, family, maxWidth, start, min) {
  let size = start;
  while (size > min) {
    ctx.font = `${size}px ${family}`;
    if (ctx.measureText(text).width <= maxWidth) return;
    size -= 4;
  }
  ctx.font = `${min}px ${family}`;
}

// The Monday where the mini heatmap begins.
function firstWeekStart(today) {
  return addDays(getWeekStart(today), -7 * (WEEKS - 1));
}

// --- The drawing ----------------------------------------------------------
function drawCard(profile, days) {
  const { streak, today, user } = profile;

  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  // Background and the rounded panel on top of it.
  ctx.fillStyle = COLORS.bg;
  ctx.fillRect(0, 0, W, H);
  roundedRect(ctx, 40, 40, W - 80, H - 80, 28);
  ctx.fillStyle = COLORS.panel;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = COLORS.border;
  ctx.stroke();

  // Left side: brand, username, streak number, label, stats.
  ctx.fillStyle = COLORS.green;
  ctx.font = `30px ${BOLD}`;
  ctx.fillText('SHIP LOG', 90, 120);

  const name = `@${user.username}`;
  ctx.fillStyle = COLORS.text;
  fitFont(ctx, name, BOLD, 440, 44, 24); // long usernames shrink to fit
  ctx.fillText(name, 90, 185);

  const number = String(streak.current);
  fitFont(ctx, number, BOLD, 440, 220, 100);
  ctx.fillText(number, 90, 400);

  ctx.fillStyle = COLORS.muted;
  ctx.font = `38px ${REGULAR}`;
  ctx.fillText('day streak', 90, 455);

  const stats = `longest ${streak.longest}  ·  ${streak.totalActive} active days`;
  fitFont(ctx, stats, REGULAR, 460, 28, 18);
  ctx.fillText(stats, 90, 525);

  // Right side: the mini heatmap, 18 weeks wide and 7 days tall.
  const CELL = 24;
  const GAP = 6;
  const GX = 600;
  const GY = 250;

  ctx.fillStyle = COLORS.muted;
  ctx.font = `26px ${REGULAR}`;
  ctx.fillText(`Last ${WEEKS} weeks`, GX, GY - 30);

  const statusByDate = new Map(days.map((d) => [d.date, d.status]));
  const start = firstWeekStart(today);

  for (let week = 0; week < WEEKS; week++) {
    for (let day = 0; day < 7; day++) {
      const date = addDays(start, week * 7 + day);
      const x = GX + week * (CELL + GAP);
      const y = GY + day * (CELL + GAP);

      roundedRect(ctx, x, y, CELL, CELL, 5);

      // Future days: just an outline.
      if (date > today) {
        ctx.lineWidth = 2;
        ctx.strokeStyle = COLORS.border;
        ctx.stroke();
        continue;
      }

      ctx.fillStyle = STATUS_COLORS[statusByDate.get(date)] ?? COLORS.empty;
      ctx.fill();

      // Today gets a white outline.
      if (date === today) {
        ctx.lineWidth = 3;
        ctx.strokeStyle = COLORS.text;
        ctx.stroke();
      }
    }
  }

  // Legend under the heatmap.
  const legendY = GY + 7 * (CELL + GAP) + 30;
  let legendX = GX;
  ctx.font = `22px ${REGULAR}`;
  for (const [label, color] of [
    ['active', COLORS.green],
    ['rest', COLORS.blue],
    ['missed', COLORS.red],
  ]) {
    roundedRect(ctx, legendX, legendY - 16, 18, 18, 4);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.fillStyle = COLORS.muted;
    ctx.fillText(label, legendX + 28, legendY);
    legendX += 140;
  }

  return canvas.toBuffer('image/png');
}

// --- Public functions -----------------------------------------------------

// Drawing is not free, and link-preview bots can ask often. So finished cards
// are kept in memory for 5 minutes (at most 200 users, oldest dropped first).
const CACHE_TTL_MS = 5 * 60 * 1000;
const CACHE_MAX = 200;
const cache = new Map();

// Returns { png, title, description } for a public user (as returned by
// findPublicUser).
export async function getShareCard(user) {
  const hit = cache.get(user.username);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.card;

  const profile = await buildProfile(user);
  const days = await getDaysSince(user, firstWeekStart(profile.today));

  const card = {
    png: drawCard(profile, days),
    ...describeStreak(user.username, profile.streak),
  };

  if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value);
  cache.set(user.username, { at: Date.now(), card });
  return card;
}

// Same, starting from just a username. Returns null if there is no such user.
export async function getShareCardByUsername(username) {
  const user = await findPublicUser(username);
  return user ? getShareCard(user) : null;
}