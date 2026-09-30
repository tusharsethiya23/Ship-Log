// An error for problems while posting. The `permanent` flag tells the poster
// job whether trying again could ever help:
//   permanent: true  -> wrong password, deleted webhook. Stop retrying.
//   permanent: false -> network hiccup, rate limit, service down. Retry later.

export class PostError extends Error {
  constructor(message, { permanent = false } = {}) {
    super(message);
    this.permanent = permanent;
  }
}