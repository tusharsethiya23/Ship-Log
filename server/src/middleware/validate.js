// Turns a zod schema into a middleware:
//   router.patch('/', validate(updateMeSchema), updateMe)
// If req.body doesn't match, it stops with a 400 that lists the problems.
// If it matches, req.body is replaced with the cleaned data (trimmed strings,
// unknown fields removed) so controllers can trust it.

import { HttpError } from '../utils/httpError.js';

export function validate(schema) {
  return (req, res, next) => {
    // `?? {}` covers requests that arrive with no body at all.
    const result = schema.safeParse(req.body ?? {});

    if (!result.success) {
      const message = result.error.issues
        .map((issue) => `${issue.path.join('.') || 'body'}: ${issue.message}`)
        .join('; ');
      throw new HttpError(400, message);
    }

    req.body = result.data;
    next();
  };
}