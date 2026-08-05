const fs = require("node:fs");
const path = require("node:path");

const DATA_DIR = path.join(__dirname, "..", "..", "data");
const DATA_FILE = path.join(DATA_DIR, "restrictions.json");

function readData() {
  if (!fs.existsSync(DATA_FILE)) return {};
  return JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
}

function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

async function isRestricted(userId) {
  return Boolean(await getRestriction(userId));
}

async function getRestriction(userId) {
  const data = readData();
  return data[userId] ?? null;
}

async function restrictUser(userId, reason, byId) {
  const data = readData();
  data[userId] = {
    reason: reason || "사유 없음",
    restrictedBy: byId,
    restrictedAt: new Date().toISOString(),
  };
  writeData(data);
}

async function unrestrictUser(userId) {
  const data = readData();
  if (!data[userId]) return false;
  delete data[userId];
  writeData(data);
  return true;
}

module.exports = {
  isRestricted,
  getRestriction,
  restrictUser,
  unrestrictUser,
};
