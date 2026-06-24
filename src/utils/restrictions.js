const fs = require("node:fs");
const path = require("node:path");

const DATA_DIR = path.join(__dirname, "..", "..", "data");
const DATA_FILE = path.join(DATA_DIR, "restrictions.json");

function loadAll() {
  if (!fs.existsSync(DATA_FILE)) return {};
  return JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
}

function saveAll(restrictions) {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(restrictions, null, 2));
}

function isRestricted(userId) {
  const restrictions = loadAll();
  return Boolean(restrictions[userId]);
}

function getRestriction(userId) {
  const restrictions = loadAll();
  return restrictions[userId] ?? null;
}

function restrictUser(userId, reason, byId) {
  const restrictions = loadAll();
  restrictions[userId] = {
    reason: reason || "사유 없음",
    restrictedBy: byId,
    restrictedAt: new Date().toISOString(),
  };
  saveAll(restrictions);
}

function unrestrictUser(userId) {
  const restrictions = loadAll();
  const existed = Boolean(restrictions[userId]);
  delete restrictions[userId];
  saveAll(restrictions);
  return existed;
}

module.exports = {
  isRestricted,
  getRestriction,
  restrictUser,
  unrestrictUser,
};
