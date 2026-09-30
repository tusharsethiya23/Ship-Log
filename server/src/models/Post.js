// One document in the "posts" collection = one automatic post we tried to
// publish (for example "Day 23" on Bluesky for one user).
//
// This collection has two jobs:
//   1. AUDIT LOG: you can see what was posted, when, and why anything failed.
//   2. DUPLICATE PROTECTION: it stops us from posting the same thing twice
//      if a job crashes and runs again.

import mongoose from 'mongoose';

const postSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    // What kind of post this is:
    //   daily  = normal end-of-day streak post
    //   broken = "the streak was reset" post
    //   weekly = weekly summary (a later feature)
    type: {
      type: String,
      enum: ['daily', 'broken', 'weekly'],
      required: true,
    },

    // Where it is posted. Adding X or Mastodon later just means adding a
    // value to this list.
    platform: {
      type: String,
      enum: ['bluesky', 'discord'],
      required: true,
    },

    // The day this post is about, "YYYY-MM-DD" in the user's timezone.
    date: {
      type: String,
      required: true,
      match: [/^\d{4}-\d{2}-\d{2}$/, 'date must look like YYYY-MM-DD'],
    },

    // The exact text we posted (or tried to post). Handy for debugging.
    text: { type: String, default: '', maxlength: 1000 },

    // Where the post is in its life:
    //   pending -> created, not published yet
    //   sent    -> published successfully
    //   failed  -> gave up after retries (see `error`)
    status: {
      type: String,
      enum: ['pending', 'sent', 'failed'],
      default: 'pending',
    },

    // How many times we have tried to publish. Used for retry limits.
    attempts: { type: Number, default: 0, min: 0 },

    // The last error message if something went wrong.
    error: { type: String, default: '' },

    // When it was successfully published. null until then.
    sentAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// Only ONE post is allowed per user + type + platform + date.
// If the poster job runs twice by accident, the second insert fails with a
// duplicate-key error, and we simply skip it. No double posts.
postSchema.index(
  { userId: 1, type: 1, platform: 1, date: 1 },
  { unique: true }
);

export const Post = mongoose.model('Post', postSchema);