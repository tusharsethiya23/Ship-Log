// Handles connecting to (and disconnecting from) MongoDB using Mongoose.
// Both the web server and the worker process call connectDB() at startup,
// because both need to read/write the same database.

import mongoose from 'mongoose';
import { env } from './env.js';
import { logger } from './logger.js';

export async function connectDB() {
  // Mongoose keeps ONE shared connection for the whole app. These listeners
  // just log what happens to it, so you can see drops and reconnects.
  mongoose.connection.on('connected', () => logger.info('MongoDB connected'));
  mongoose.connection.on('disconnected', () => logger.warn('MongoDB disconnected'));
  mongoose.connection.on('error', (err) => logger.error('MongoDB error', err));

  // serverSelectionTimeoutMS: give up after 5 seconds if the database can't
  // be reached, instead of hanging for ~30s (the default) with no feedback.
  // We deliberately never log env.MONGO_URI: it contains your DB password.
  await mongoose.connect(env.MONGO_URI, { serverSelectionTimeoutMS: 5000 });
}

// Used for a clean shutdown (Ctrl+C, deploys, tests) so no operation is
// cut off halfway.
export async function disconnectDB() {
  await mongoose.connection.close();
}