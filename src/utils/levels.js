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

function getUserXp(userId) {
  const data = loadAll();
  return data[userId]?.xp ?? 0;
}

function getAllXp() {
  const data = loadAll();
  return Object.fromEntries(
    Object.entries(data).map(([id, value]) => [id, value.xp ?? 0]),
  );
}

function canGainXp(userId) {
  const last = lastGainedAt.get(userId) ?? 0;
  return Date.now() - last >= XP_COOLDOWN_MS;
}

function randomBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function addXp(userId, amount) {
  const data = loadAll();
  const current = data[userId]?.xp ?? 0;
  data[userId] = { xp: current + amount };
  saveAll(data);
  return data[userId].xp;
}

function grantActivityReward(userId) {
  if (!canGainXp(userId)) return null;

  lastGainedAt.set(userId, Date.now());

  const xpGained = randomBetween(XP_MIN, XP_MAX);
  const coinsGained = randomBetween(COIN_MIN, COIN_MAX);
  const totalXp = addXp(userId, xpGained);

  return { xpGained, coinsGained, totalXp };
}

function getRank(userId) {
  const data = loadAll();
  const entries = Object.entries(data)
    .map(([id, value]) => ({ id, xp: value.xp ?? 0 }))
    .sort((a, b) => b.xp - a.xp);

  const position = entries.findIndex((entry) => entry.id === userId) + 1;
  return { position: position || entries.length + 1, total: entries.length };
}

module.exports = {
  getUserXp,
  getAllXp,
  grantActivityReward,
  levelFromXp,
  getRank,
};
