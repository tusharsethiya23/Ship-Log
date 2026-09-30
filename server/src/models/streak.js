// One document in the "streaks" collection = the streak summary for ONE user.
//
// IMPORTANT: this is only a CACHE. The real data lives in the "days"
// collection. We store these numbers so the public profile page can load
// instantly, without recounting hundreds of days on every visit.
// If this document ever looks wrong, we can delete it and rebuild it from
// the days (that is what scripts/rebuild-streaks.js will do later).

import mongoose from 'mongoose';

const streakSchema = new mongoose.Schema(
  {
    // Which user this summary belongs to. `unique: true` means each user can
    // have at most ONE streak document (a one-to-one relationship).
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },

    // Consecutive days the user is on right now. Cannot go below 0.
    current: { type: Number, default: 0, min: 0 },

    // The best streak the user has ever reached.
    longest: { type: Number, default: 0, min: 0 },

    // All active days ever (they do not need to be consecutive).
    totalActive: { type: Number, default: 0, min: 0 },

    // The most recent day with commits, as "YYYY-MM-DD".
    // null means the user has never had an active day yet.
    lastActiveDate: {
      type: String,
      default: null,
      match: [/^\d{4}-\d{2}-\d{2}$/, 'lastActiveDate must look like YYYY-MM-DD'],
    },

    // Rest-day bookkeeping. Each user gets one rest day per week.
    // weekStart is the Monday of the current week ("YYYY-MM-DD"), and
    // restUsedThisWeek says whether this week's rest day is already spent.
    // When a new week starts, the day-close job resets both.
    weekStart: {
      type: String,
      default: null,
      match: [/^\d{4}-\d{2}-\d{2}$/, 'weekStart must look like YYYY-MM-DD'],
    },
    restUsedThisWeek: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const Streak = mongoose.model('Streak', streakSchema);