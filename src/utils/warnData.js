const fs = require("node:fs");
const path = require("node:path");

const DATA_DIR = path.join(__dirname, "..", "..", "data");
const FILE = path.join(DATA_DIR, "warnings.json");

function load() {
  if (!fs.existsSync(FILE)) return {};
  return JSON.parse(fs.readFileSync(FILE, "utf-8"));
}

function save(data) {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(data, null, 2));
}

const key = (guildId, userId) => `${guildId}:${userId}`;

function getUserWarnings(guildId, userId) {
  return load()[key(guildId, userId)] ?? { count: 0, history: [] };
}

function addWarning(guildId, userId, reason, moderatorId) {
  const all = load();
  const k = key(guildId, userId);
  const entry = all[k] ?? { count: 0, history: [] };
  entry.count += 1;
  entry.history.push({
    id: entry.count,
    reason,
    moderatorId,
    timestamp: Math.floor(Date.now() / 1000),
  });
  all[k] = entry;
  save(all);
  return entry;
}

function removeWarning(guildId, userId, amount = 1) {
  const all = load();
  const k = key(guildId, userId);
  const entry = all[k] ?? { count: 0, history: [] };
  const removed = Math.min(amount, entry.count);
  entry.count -= removed;
  entry.history = entry.history.slice(0, Math.max(0, entry.history.length - removed));
  all[k] = entry;
  save(all);
  return entry;
}

function resetWarnings(guildId, userId) {
  const all = load();
  all[key(guildId, userId)] = { count: 0, history: [] };
  save(all);
}

module.exports = { getUserWarnings, addWarning, removeWarning, resetWarnings };
