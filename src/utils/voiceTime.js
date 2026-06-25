const fs = require("node:fs");
const path = require("node:path");

const DATA_DIR = path.join(__dirname, "..", "..", "data");
const DATA_FILE = path.join(DATA_DIR, "voiceTime.json");

const activeSessions = new Map();

function loadAll() {
  if (!fs.existsSync(DATA_FILE)) return {};
  return JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
}

function saveAll(data) {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function startSession(guildId, userId) {
  activeSessions.set(`${guildId}:${userId}`, Date.now());
}

function endSession(guildId, userId) {
  const key = `${guildId}:${userId}`;
  const startedAt = activeSessions.get(key);
  if (!startedAt) return;

  activeSessions.delete(key);

  const elapsed = Date.now() - startedAt;
  const data = loadAll();
  const guildData = data[guildId] ?? {};
  guildData[userId] = (guildData[userId] ?? 0) + elapsed;
  data[guildId] = guildData;
  saveAll(data);
}

function getVoiceTimeMs(guildId, userId) {
  const data = loadAll();
  return data[guildId]?.[userId] ?? 0;
}

function getAllVoiceTimes(guildId) {
  const data = loadAll();
  return data[guildId] ?? {};
}

module.exports = { startSession, endSession, getVoiceTimeMs, getAllVoiceTimes };
