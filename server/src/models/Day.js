// One document in the "days" collection = one calendar day for one user.
// This collection is the SOURCE OF TRUTH. The streak numbers are always
// calculated from these documents, so they can never drift out of sync.

import mongoose from 'mongoose';

const daySchema = new mongoose.Schema(
  {
    // Which user this day belongs to. `ref: 'User'` tells Mongoose it points
    // at a document in the users collection (like a foreign key).
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    // The calendar date as text: "2026-09-29", in the USER'S timezone.
    // We use a string, not a Date, on purpose: a Date is a single moment in
    // time, so "Sept 29" would shift to a different day depending on the
    // viewer's timezone. A plain string always means the same day.
    date: {
      type: String,
      required: true,
      match: [/^\d{4}-\d{2}-\d{2}$/, 'date must look like YYYY-MM-DD'],
    },

    // What happened that day:
    //   active = at least one commit
    //   rest   = the user's weekly rest day (streak kept, count not added)
    //   missed = nothing happened
    status: {
      type: String,
      enum: ['active', 'rest', 'missed'],
      required: true,
    },

    // How many commits we found. Only the number is public by default.
    commitCount: { type: Number, default: 0, min: 0 },

    // Repo names are shown publicly ONLY if the user opts in (later feature).
    repoNames: { type: [String], default: [] },

    // Optional one-line note for the day (P1 feature), like a tweet-length log.
    note: { type: String, default: '', maxlength: 280 },

    // Set when the day-close job locks the day. A day without this value is
    // still "open" (today), so its status may still change.
    finalizedAt: { type: Date, default: null },
    // Added in Step 10: filled in when the day is closed.
    // The streak length right after this day (used for "Day 23" posts).
    streakAfter: { type: Number, default: 0, min: 0 },
    // If this day broke a streak, how long the lost streak was (else 0).
    brokenStreakLength: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

// A "compound unique index": the combination of userId + date must be unique.
// This guarantees one user can never have two documents for the same day,
// even if a job accidentally runs twice. It also makes lookups such as
// "all days for this user" fast.
daySchema.index({ userId: 1, date: 1 }, { unique: true });

export const Day = mongoose.model('Day', daySchema);