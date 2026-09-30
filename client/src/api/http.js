// One small helper that every API call goes through, so error handling
// lives in one place.

// An error that remembers the HTTP status (404, 401, ...) so pages can react
// differently to "not found" and "not logged in".
export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// path:    the API address, e.g. '/api/me'
// options: { method: 'POST', body: { ... } }  (both optional)
export async function http(path, { method = 'GET', body } = {}) {
  const res = await fetch(path, {
    method,
    // Only send a JSON header and body when there is a body.
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    credentials: 'include', // always send the login cookie
  });

  // Our server always answers with JSON, but be safe if it doesn't
  // (for example if the server is down and the proxy returns an HTML error).
  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  if (!res.ok) {
    throw new ApiError(res.status, data?.error?.message ?? `Request failed (${res.status})`);
  }
  return data;
}