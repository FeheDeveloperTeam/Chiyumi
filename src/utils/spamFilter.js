const REPEAT_THRESHOLD = 3;
const RATE_LIMIT_COUNT = 5;
const RATE_LIMIT_WINDOW_MS = 5000;

const recentMessages = new Map();

function isSpam(userId, content) {
  const now = Date.now();
  const entry = recentMessages.get(userId) ?? { content: null, count: 0, timestamps: [] };

  entry.timestamps = entry.timestamps.filter((timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS);
  entry.timestamps.push(now);

  const normalized = content.trim().toLowerCase();

  if (normalized && normalized === entry.content) {
    entry.count += 1;
  } else {
    entry.content = normalized;
    entry.count = 1;
  }

  recentMessages.set(userId, entry);

  return entry.count >= REPEAT_THRESHOLD || entry.timestamps.length >= RATE_LIMIT_COUNT;
}

module.exports = { isSpam };
