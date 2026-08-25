const { createClient } = require('@libsql/client');

function env(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not configured`);
  return value;
}

const db = createClient({
  url: env('TURSO_DATABASE_URL'),
  authToken: env('TURSO_AUTH_TOKEN')
});

async function withTimeout(promise, ms = 8000) {
  let timer;
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error('Turso database connection timed out')), ms);
      })
    ]);
  } finally {
    clearTimeout(timer);
  }
}

async function init() {
  await withTimeout(db.execute(`CREATE TABLE IF NOT EXISTS requests(id TEXT PRIMARY KEY,status TEXT NOT NULL,reason TEXT,expires_at INTEGER,created_at INTEGER NOT NULL)`));
  await withTimeout(db.execute(`CREATE TABLE IF NOT EXISTS payments(id TEXT PRIMARY KEY,amount TEXT NOT NULL DEFAULT '50',status TEXT NOT NULL,reason TEXT,screenshot TEXT,created_at INTEGER NOT NULL,expires_at INTEGER)`));
}

async function execute(query) {
  return withTimeout(db.execute(query));
}

module.exports = { db: { execute }, init };
