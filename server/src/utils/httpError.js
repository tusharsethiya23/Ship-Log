// A custom error that carries an HTTP status code.
// Anywhere in the app we can write:  throw new HttpError(404, 'User not found')
// and the error handler (File 2) turns it into a proper JSON response.
// Without this, every error would look like a generic 500 "server broke".

export class HttpError extends Error {
  constructor(status, message) {
    super(message); // sets error.message
    this.status = status; // e.g. 400, 401, 404
  }
}