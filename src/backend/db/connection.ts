import mongoose, { type Mongoose } from "mongoose";

/**
 * Cached Mongoose connection for serverless (Vercel) + Next.js dev hot-reload.
 *
 * Each Lambda invocation re-imports modules, and `next dev` recompiles them on
 * every save. Without caching, we'd open a new connection per request and
 * exhaust the Atlas connection pool. Stashing the connection on `globalThis`
 * survives both cases.
 */

interface MongooseCache {
  conn: Mongoose | null;
  promise: Promise<Mongoose> | null;
}

declare global {
  var __mongooseCache: MongooseCache | undefined;
}

const cache: MongooseCache =
  globalThis.__mongooseCache ?? { conn: null, promise: null };

if (!globalThis.__mongooseCache) {
  globalThis.__mongooseCache = cache;
}

/**
 * Returns a connected Mongoose instance, reusing the cached connection
 * when possible. Throws a helpful error if `MONGODB_URI` is missing.
 */
export async function connectDB(): Promise<Mongoose> {
  if (cache.conn) return cache.conn;

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error(
      "MONGODB_URI is not set. Add it to .env.local (see .env.example).",
    );
  }

  if (!cache.promise) {
    cache.promise = mongoose.connect(uri, {
      bufferCommands: false,
      // Mongoose handles pooling; keep the default unless we hit limits.
    });
  }

  try {
    cache.conn = await cache.promise;
  } catch (err) {
    cache.promise = null;
    throw err;
  }

  return cache.conn;
}

/**
 * Closes the cached connection. Tests and one-off scripts should call this
 * to allow the process to exit cleanly. Production code should not.
 */
export async function disconnectDB(): Promise<void> {
  if (cache.conn) {
    await cache.conn.disconnect();
    cache.conn = null;
    cache.promise = null;
  }
}
