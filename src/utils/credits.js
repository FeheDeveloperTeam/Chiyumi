const fs = require("node:fs");
const path = require("node:path");

const DATA_DIR = path.join(__dirname, "..", "..", "data");
const DATA_FILE = path.join(DATA_DIR, "credits.json");
const STARTING_BALANCE = 100;

function loadAll() {
  if (!fs.existsSync(DATA_FILE)) return {};
  return JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
}

function saveAll(balances) {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(balances, null, 2));
}

function getBalance(userId) {
  const balances = loadAll();

  if (!(userId in balances)) {
    balances[userId] = STARTING_BALANCE;
    saveAll(balances);
  }

  return balances[userId];
}

function addBalance(userId, delta) {
  const balances = loadAll();

  if (!(userId in balances)) {
    balances[userId] = STARTING_BALANCE;
  }

  balances[userId] += delta;
  saveAll(balances);

  return balances[userId];
}

module.exports = { getBalance, addBalance, STARTING_BALANCE };
