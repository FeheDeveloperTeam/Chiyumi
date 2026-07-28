const RATE_LIMIT_WINDOW_MS = 5000;

const SPAM_LEVELS = {
  1: { name: "느슨",      repeatThreshold: 6, rateLimit: 8, desc: "같은 메시지 6회 반복 또는 5초 내 8개 이상" },
  2: { name: "보통",      repeatThreshold: 5, rateLimit: 7, desc: "같은 메시지 5회 반복 또는 5초 내 7개 이상" },
  3: { name: "기본",      repeatThreshold: 3, rateLimit: 5, desc: "같은 메시지 3회 반복 또는 5초 내 5개 이상" },
  4: { name: "엄격",      repeatThreshold: 3, rateLimit: 4, desc: "같은 메시지 3회 반복 또는 5초 내 4개 이상" },
  5: { name: "매우 엄격", repeatThreshold: 2, rateLimit: 3, desc: "같은 메시지 2회 반복 또는 5초 내 3개 이상" },
};

const recentMessages = new Map(); // key: `${guildId}_${userId}`

function isSpam(userId, guildId, content, level = 3) {
  const { repeatThreshold, rateLimit } = SPAM_LEVELS[level] ?? SPAM_LEVELS[3];
  const now = Date.now();
  const key = `${guildId}_${userId}`;
  const entry = recentMessages.get(key) ?? { content: null, count: 0, timestamps: [] };

  entry.timestamps = entry.timestamps.filter((ts) => now - ts < RATE_LIMIT_WINDOW_MS);
  entry.timestamps.push(now);

  const normalized = content.trim().toLowerCase();
  if (normalized && normalized === entry.content) {
    entry.count += 1;
  } else {
    entry.content = normalized;
    entry.count = 1;
  }

  recentMessages.set(key, entry);
  return entry.count >= repeatThreshold || entry.timestamps.length >= rateLimit;
}

module.exports = { isSpam, SPAM_LEVELS };
