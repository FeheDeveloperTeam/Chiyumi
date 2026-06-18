const fs = require("node:fs");
const path = require("node:path");

const DATA_DIR = path.join(__dirname, "..", "..", "data");
const DATA_FILE = path.join(DATA_DIR, "credits.json");
const CLAIMS_FILE = path.join(DATA_DIR, "claims.json");
const STARTING_BALANCE = 100;
const DAILY_CLAIM_AMOUNT = 50;
const DAILY_CLAIM_INTERVAL_MS = 24 * 60 * 60 * 1000;

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

function loadClaims() {
  if (!fs.existsSync(CLAIMS_FILE)) return {};
  return JSON.parse(fs.readFileSync(CLAIMS_FILE, "utf-8"));
}

function saveClaims(claims) {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(CLAIMS_FILE, JSON.stringify(claims, null, 2));
}

function claimDaily(userId) {
  const claims = loadClaims();
  const lastClaim = claims[userId] ?? 0;
  const now = Date.now();
  const remaining = DAILY_CLAIM_INTERVAL_MS - (now - lastClaim);

  if (remaining > 0) {
    return { success: false, remainingMs: remaining };
  }

  claims[userId] = now;
  saveClaims(claims);

  const balance = addBalance(userId, DAILY_CLAIM_AMOUNT);

  return { success: true, amount: DAILY_CLAIM_AMOUNT, balance };
}

module.exports = {
  getBalance,
  addBalance,
  claimDaily,
  STARTING_BALANCE,
  DAILY_CLAIM_AMOUNT,
};
