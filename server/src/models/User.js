// One document in the "users" collection = one person using Ship Log.
// It is created when someone logs in with GitHub for the first time.

import mongoose from 'mongoose';

// Checks that a timezone name like "Asia/Kolkata" is real.
// Intl.DateTimeFormat throws a RangeError for unknown timezones, so we use
// that as a free validator (no extra package needed).
function isValidTimezone(tz) {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

// A small nested structure for each repo the user wants us to track.
// `_id: false` stops Mongoose from adding a useless id to every repo item.
const repoSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true }, // e.g. "asus/my-project"
    isPrivate: { type: Boolean, default: false },
    trackedSince: { type: Date, default: Date.now }, // ignore commits before this
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    // GitHub's own numeric id for the account. This is the identity we trust.
    // Usernames can change on GitHub, ids never do. Stored as a string so it
    // always compares cleanly with whatever the OAuth response gives us.
    githubId: { type: String, required: true, unique: true },

    // Used in the public URL: /u/<username>. Lowercased and trimmed
    // automatically, so "TestUser" and "testuser" are the same profile.
    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    avatarUrl: { type: String, default: '' },

    // IANA timezone name. All "what counts as today" logic depends on this.
    timezone: {
      type: String,
      default: 'UTC',
      validate: {
        validator: isValidTimezone,
        message: 'Invalid timezone name',
      },
    },

    // Hour (0-23) when the user's "day" ends. 0 = midnight. Night owls can
    // set 3 so that commits at 1 a.m. still count for the previous day.
    dayCutoffHour: { type: Number, default: 0, min: 0, max: 23 },

    // Repos the user picked. An empty list means nothing is tracked yet.
    repos: { type: [repoSchema], default: [] },

    // Opt-in: also count the private activity GitHub reports on the user's
    // profile. It only works if the user has turned on "Include private
    // contributions on my profile" in their GitHub settings.
    countPrivateActivity: { type: Boolean, default: false },

    // Where to post the streak. These values are SECRETS, so they are stored
    // encrypted (we write the encryption helper in a later step) and hidden
    // from normal queries with `select: false`.
    integrations: {
      bluesky: {
        handle: { type: String, default: '' }, // public, not secret
        appPasswordEncrypted: { type: String, default: '', select: false },
      },
      discordWebhookEncrypted: { type: String, default: '', select: false },
    },

    // GitHub access token, needed to read commits (especially private repos).
    // Encrypted and hidden, same as above.
    githubTokenEncrypted: { type: String, default: '', select: false },
  },
  {
    // Automatically adds and maintains createdAt and updatedAt fields.
    timestamps: true,
  }
);

// mongoose.model('User', ...) creates the model, and MongoDB stores it in a
// collection named "users" (lowercased and pluralized automatically).
export const User = mongoose.model('User', userSchema);