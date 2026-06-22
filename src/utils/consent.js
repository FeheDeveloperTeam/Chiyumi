const fs = require("node:fs");
const path = require("node:path");

const DATA_DIR = path.join(__dirname, "..", "..", "data");
const DATA_FILE = path.join(DATA_DIR, "consent.json");

function loadAll() {
  if (!fs.existsSync(DATA_FILE)) return {};
  return JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
}

function saveAll(data) {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function hasAgreed(userId) {
  const data = loadAll();
  return Boolean(data[userId]);
}

function agree(userId) {
  const data = loadAll();
  data[userId] = { agreedAt: new Date().toISOString() };
  saveAll(data);
}

module.exports = { hasAgreed, agree };
