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

function startSession(userId) {
  activeSessions.set(userId, Date.now());
}

function endSession(userId) {
  const startedAt = activeSessions.get(userId);
  if (!startedAt) return;

  activeSessions.delete(userId);

  const elapsed = Date.now() - startedAt;
  const data = loadAll();
  data[userId] = (data[userId] ?? 0) + elapsed;
  saveAll(data);
}

function getVoiceTimeMs(userId) {
  const data = loadAll();
  return data[userId] ?? 0;
}

function getAllVoiceTimes() {
  return loadAll();
}

module.exports = { startSession, endSession, getVoiceTimeMs, getAllVoiceTimes };
