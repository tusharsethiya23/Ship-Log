// Deleting the logged-in user's account and everything stored about them.

import { User } from '../models/User.js';
import { Day } from '../models/Day.js';
import { Post } from '../models/Post.js';
import { Streak } from '../models/streak.js'; // the file name is lowercase on disk
import { logger } from '../config/logger.js';
import { decrypt } from '../utils/crypto.js';
import { HttpError } from '../utils/httpError.js';
import { COOKIE_NAME } from '../utils/token.js';
import { revokeGitHubAccess } from '../services/github.service.js';

// DELETE /api/me   body: { confirmUsername: "yourusername" }
export async function deleteAccount(req, res) {
  const userId = req.user._id;

  // The typed name must match, so this can't happen by accident.
  if (req.body.confirmUsername.toLowerCase() !== req.user.username) {
    throw new HttpError(400, 'The username you typed does not match your account.');
  }

  // 1. Take back our access to their GitHub account. The token is hidden from
  //    normal queries, so it is requested explicitly. If this fails we carry
  //    on and tell the user how to remove the app by hand.
  let githubRevoked = false;
  const withToken = await User.findById(userId).select('+githubTokenEncrypted');
  if (withToken?.githubTokenEncrypted) {
    try {
      githubRevoked = await revokeGitHubAccess(decrypt(withToken.githubTokenEncrypted));
    } catch (err) {
      logger.warn('Could not revoke GitHub access during account deletion', err);
    }
  }

  // 2. Delete everything stored about them. The records that point at the user
  //    go first and the user last, so if something fails halfway the account
  //    still exists and deleting again finishes the job.
  const removeUserData = () =>
    Promise.all([Post.deleteMany({ userId }), Day.deleteMany({ userId }), Streak.deleteMany({ userId })]);

  await removeUserData();
  await User.deleteOne({ _id: userId });
  // A second sweep, in case a background job wrote a record for this user
  // while the deletion was running.
  await removeUserData();

  // 3. Log them out.
  res.clearCookie(COOKIE_NAME);
  logger.info('Account deleted', { githubRevoked });
  res.json({ ok: true, githubRevoked });
}