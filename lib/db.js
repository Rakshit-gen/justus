const mongoose = require('mongoose');

let cached = global._mongooseCache;
if (!cached) {
  cached = global._mongooseCache = { conn: null, promise: null };
}

async function connectDB() {
  if (cached.conn) return cached.conn;

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI is not set. Add it to .env.local');
  }

  if (!cached.promise) {
    mongoose.set('strictQuery', true);
    cached.promise = mongoose
      .connect(uri, { serverSelectionTimeoutMS: 10000 })
      .then((m) => {
        console.log('[db] connected');
        return m;
      });
  }
  cached.conn = await cached.promise;
  return cached.conn;
}

module.exports = { connectDB };
