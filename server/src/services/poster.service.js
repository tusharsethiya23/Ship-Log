// The posting pipeline, in two stages:
//   1. queuePosts:       for recently closed days, create a "pending" Post
//                        record per connected platform
//   2. sendPendingPosts: publish pending posts, with retries
//
// Splitting it means a crash never loses a post: it stays "pending" in the
// database and the next run picks it up.
//
// Assumes ONE worker process runs at a time. If two ran together, a post could
// occasionally go out twice.

import { User } from '../models/User.js';
import { Day } from '../models/Day.js';
import { Post } from '../models/Post.js';
import { logger } from '../config/logger.js';
import { alertAdmin } from './alert.service.js';
import { getShareCardByUsername } from './shareCard.service.js';
import { buildPostText } from './posting/templates.js';
import { PostError } from './posting/postError.js';
import { SECRET_FIELDS, connectedPlatforms, profileUrl, sendPost } from './posting/index.js';

// Only days closed in the last 36 hours get posted. This stops someone who
// connects Discord today from getting an avalanche of old posts.
const LOOKBACK_MS = 36 * 60 * 60 * 1000;
const MAX_ATTEMPTS = 24;

// What we load about a user for posting: the name, the public Bluesky handle,
// and the encrypted secrets.
const USER_FIELDS = `username integrations.bluesky.handle ${SECRET_FIELDS}`;

// Builds the Bluesky preview card. If anything goes wrong we return null, so
// the post still goes out, just without the card.
async function tryBuildCard(username) {
  try {
    return await getShareCardByUsername(username);
  } catch (err) {
    logger.warn('Could not build share card', err);
    return null;
  }
}

// Stage 1. Returns how many new posts were queued.
export async function queuePosts(now = new Date()) {
  // Only users with at least one platform set up.
  const users = await User.find({
    $or: [
      { 'integrations.discordWebhookEncrypted': { $nin: ['', null] } },
      { 'integrations.bluesky.appPasswordEncrypted': { $nin: ['', null] } },
    ],
  })
    .select(USER_FIELDS)
    .lean();

  const since = new Date(now.getTime() - LOOKBACK_MS);
  let queued = 0;

  for (const user of users) {
    const platforms = connectedPlatforms(user);
    if (platforms.length === 0) continue;

    // Days worth a post: active days, rest days, and missed days that
    // actually ended a streak (missing a day with no streak isn't news).
    const days = await Day.find({
      userId: user._id,
      finalizedAt: { $gte: since },
      $or: [{ status: 'active' }, { status: 'rest' }, { status: 'missed', brokenStreakLength: { $gt: 0 } }],
    }).lean();

    for (const day of days) {
      const type = day.status === 'missed' ? 'broken' : 'daily';
      const text = buildPostText({
        type,
        status: day.status,
        streakAfter: day.streakAfter,
        commitCount: day.commitCount,
        brokenStreakLength: day.brokenStreakLength,
        url: profileUrl(user.username),
      });

      for (const platform of platforms) {
        try {
          // "Create it only if it doesn't exist." $setOnInsert leaves existing
          // records untouched, so a post that was already sent stays sent.
          const result = await Post.updateOne(
            { userId: user._id, type, platform, date: day.date },
            { $setOnInsert: { text, status: 'pending', attempts: 0 } },
            { upsert: true }
          );
          if (result.upsertedCount) queued += 1;
        } catch (err) {
          // 11000 = the unique index caught a duplicate. That's fine.
          if (err.code !== 11000) throw err;
        }
      }
    }
  }
  return queued;
}

// Stage 2. Returns how many posts were sent, failed for good, or will retry.
export async function sendPendingPosts() {
  const pending = await Post.find({ status: 'pending', attempts: { $lt: MAX_ATTEMPTS } })
    .sort({ createdAt: 1 }) // oldest first
    .limit(50);

  const userCache = new Map(); // load each user once per run
  let sent = 0;
  let failed = 0;
  let retrying = 0;

  for (const post of pending) {
    const key = String(post.userId);
    if (!userCache.has(key)) {
      userCache.set(key, await User.findById(post.userId).select(USER_FIELDS).lean());
    }
    const user = userCache.get(key);

    post.attempts += 1;
    try {
      // The user may have disconnected the platform since the post was queued.
      if (!user || !connectedPlatforms(user).includes(post.platform)) {
        throw new PostError(`${post.platform} is no longer connected`, { permanent: true });
      }

      // Only Bluesky shows preview cards, so only build one for it.
      const card = post.platform === 'bluesky' ? await tryBuildCard(user.username) : null;
      await sendPost(post.platform, user, post.text, { card });

      post.status = 'sent';
      post.sentAt = new Date();
      post.error = '';
      sent += 1;
    } catch (err) {
      post.error = String(err.message).slice(0, 300);

      if (err.permanent || post.attempts >= MAX_ATTEMPTS) {
        post.status = 'failed';
        failed += 1;
        logger.error(`Post failed for good (${post.platform}, ${post.date})`, { error: post.error });
        await alertAdmin('post-failed', `A ${post.platform} post for ${post.date} failed for good: ${post.error}`);
      } else {
        // Stays "pending". The next run (5 minutes later) tries again.
        retrying += 1;
        logger.warn(`Post will retry (${post.platform}, ${post.date})`, { error: post.error });
      }
    }
    await post.save();
  }

  return { sent, failed, retrying };
}