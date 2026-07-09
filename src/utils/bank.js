const fs = require("node:fs");
const path = require("node:path");

const DATA_DIR = path.join(__dirname, "..", "..", "data");
const BANK_FILE = path.join(DATA_DIR, "bank.json");

const SAVINGS_INTEREST_RATE = 0.01; // 예금 하루 1%
const LOAN_INTEREST_RATE = 0.05;    // 대출 하루 5%
const MAX_LOAN = 50_000;
const MIN_LOAN = 100;
const KST_TIMEZONE = "Asia/Seoul";

function getKstDateString(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: KST_TIMEZONE }).format(date);
}

function loadBank() {
  if (!fs.existsSync(BANK_FILE)) return {};
  return JSON.parse(fs.readFileSync(BANK_FILE, "utf-8"));
}

function saveBank(data) {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(BANK_FILE, JSON.stringify(data, null, 2));
}

function ensureAccount(bank, userId) {
  if (!bank[userId]) {
    bank[userId] = { savings: 0, loan: null, lastInterestAt: getKstDateString() };
  }
  return bank[userId];
}

function getAccount(userId) {
  const bank = loadBank();
  const acc = ensureAccount(bank, userId);
  saveBank(bank);
  return acc;
}

function getAllAccounts() {
  return loadBank();
}

function deposit(userId, amount) {
  const bank = loadBank();
  const acc = ensureAccount(bank, userId);
  acc.savings += amount;
  saveBank(bank);
  return acc.savings;
}

function withdraw(userId, amount) {
  const bank = loadBank();
  const acc = ensureAccount(bank, userId);
  if (acc.savings < amount) return { success: false };
  acc.savings -= amount;
  saveBank(bank);
  return { success: true, newBalance: acc.savings };
}

function getTotalOwed(loan) {
  if (!loan) return 0;
  return Math.ceil(loan.principal + loan.accruedInterest);
}

function takeLoan(userId, amount) {
  const bank = loadBank();
  const acc = ensureAccount(bank, userId);
  if (acc.loan) return { success: false, reason: "existing_loan" };
  if (amount < MIN_LOAN || amount > MAX_LOAN) return { success: false, reason: "amount_range" };

  acc.loan = { principal: amount, accruedInterest: 0, takenAt: getKstDateString() };
  saveBank(bank);
  return { success: true };
}

function repayLoan(userId) {
  const bank = loadBank();
  const acc = ensureAccount(bank, userId);
  if (!acc.loan) return { success: false, reason: "no_loan" };
  const owed = getTotalOwed(acc.loan);
  acc.loan = null;
  saveBank(bank);
  return { success: true, owed };
}

function applyDailyInterest() {
  const bank = loadBank();
  const today = getKstDateString();
  let changed = false;

  for (const acc of Object.values(bank)) {
    if (acc.lastInterestAt === today) continue;

    if (acc.savings > 0) {
      acc.savings += Math.floor(acc.savings * SAVINGS_INTEREST_RATE);
    }

    if (acc.loan) {
      const base = acc.loan.principal + acc.loan.accruedInterest;
      acc.loan.accruedInterest += Math.ceil(base * LOAN_INTEREST_RATE);
    }

    acc.lastInterestAt = today;
    changed = true;
  }

  if (changed) saveBank(bank);
}

module.exports = {
  SAVINGS_INTEREST_RATE,
  LOAN_INTEREST_RATE,
  MAX_LOAN,
  MIN_LOAN,
  getAccount,
  getAllAccounts,
  deposit,
  withdraw,
  getTotalOwed,
  takeLoan,
  repayLoan,
  applyDailyInterest,
};
