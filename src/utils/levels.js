const fs = require("node:fs");
const path = require("node:path");

const DATA_DIR = path.join(__dirname, "..", "..", "data");
const DATA_FILE = path.join(DATA_DIR, "levels.json");

const XP_COOLDOWN_MS = 60 * 1000;
const XP_MIN = 15;
const XP_MAX = 25;
const COIN_MIN = 5;
const COIN_MAX = 10;

const lastGainedAt = new Map();

function loadAll() {
  if (!fs.existsSync(DATA_FILE)) return {};
  return JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
}

function saveAll(data) {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function xpForLevel(level) {
  return 5 * level * level + 50 * level + 100;
}

function levelFromXp(xp) {
  let level = 0;
  let remaining = xp;

  while (remaining >= xpForLevel(level)) {
    remaining -= xpForLevel(level);
    level += 1;
  }

  return { level, currentLevelXp: remaining, neededXp: xpForLevel(level) };
}

function getUserXp(guildId, userId) {
  const data = loadAll();
  return data[guildId]?.[userId]?.xp ?? 0;
}

function getAllXp(guildId) {
  const data = loadAll();
  return Object.fromEntries(
    Object.entries(data[guildId] ?? {}).map(([id, value]) => [id, value.xp ?? 0]),
  );
}

function canGainXp(guildId, userId) {
  const key = `${guildId}:${userId}`;
  const last = lastGainedAt.get(key) ?? 0;
  return Date.now() - last >= XP_COOLDOWN_MS;
}

function randomBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function addXp(guildId, userId, amount) {
  const data = loadAll();
  const guildData = data[guildId] ?? {};
  const current = guildData[userId]?.xp ?? 0;
  guildData[userId] = { xp: current + amount };
  data[guildId] = guildData;
  saveAll(data);
  return guildData[userId].xp;
}

function grantActivityReward(guildId, userId) {
  if (!canGainXp(guildId, userId)) return null;

  lastGainedAt.set(`${guildId}:${userId}`, Date.now());

  const xpGained = randomBetween(XP_MIN, XP_MAX);
  const coinsGained = randomBetween(COIN_MIN, COIN_MAX);
  const totalXp = addXp(guildId, userId, xpGained);

  return { xpGained, coinsGained, totalXp };
}

function getRank(guildId, userId) {
  const data = loadAll();
  const entries = Object.entries(data[guildId] ?? {})
    .map(([id, value]) => ({ id, xp: value.xp ?? 0 }))
    .sort((a, b) => b.xp - a.xp);

  const position = entries.findIndex((entry) => entry.id === userId) + 1;
  return { position: position || entries.length + 1, total: entries.length };
}

module.exports = {
  getUserXp,
  getAllXp,
  addXp,
  grantActivityReward,
  levelFromXp,
  getRank,
};
