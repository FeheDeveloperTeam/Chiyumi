const fs = require("node:fs");
const path = require("node:path");

const DATA_DIR = path.join(__dirname, "..", "..", "data");
const STOCKS_FILE = path.join(DATA_DIR, "stocks.json");
const PORTFOLIOS_FILE = path.join(DATA_DIR, "stockPortfolios.json");

const HISTORY_DAYS = 7;
const MIN_PRICE = 100;
const KST_TIMEZONE = "Asia/Seoul";

const STOCK_DEFS = [
  { id: "CHY", name: "치유미전자", sector: "전자/IT",   volatility: 0.15, initialPrice: 1000 },
  { id: "NYK", name: "냥코무역",   sector: "무역/물류", volatility: 0.08, initialPrice: 800  },
  { id: "YAO", name: "야옹캐피탈", sector: "금융",      volatility: 0.12, initialPrice: 1500 },
  { id: "CTN", name: "솜사탕공업", sector: "제조업",    volatility: 0.20, initialPrice: 500  },
  { id: "STR", name: "별빛항공",   sector: "항공",      volatility: 0.18, initialPrice: 1200 },
  { id: "HNY", name: "꿀벌에너지", sector: "에너지",    volatility: 0.06, initialPrice: 700  },
];

function getKstDateString(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: KST_TIMEZONE }).format(date);
}

function loadStocks() {
  if (!fs.existsSync(STOCKS_FILE)) {
    const initial = {
      prices: Object.fromEntries(STOCK_DEFS.map((s) => [s.id, s.initialPrice])),
      lastUpdated: getKstDateString(),
      history: Object.fromEntries(STOCK_DEFS.map((s) => [s.id, [s.initialPrice]])),
    };
    saveStocks(initial);
    return initial;
  }
  return JSON.parse(fs.readFileSync(STOCKS_FILE, "utf-8"));
}

function saveStocks(data) {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(STOCKS_FILE, JSON.stringify(data, null, 2));
}

function loadPortfolios() {
  if (!fs.existsSync(PORTFOLIOS_FILE)) return {};
  return JSON.parse(fs.readFileSync(PORTFOLIOS_FILE, "utf-8"));
}

function savePortfolios(data) {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(PORTFOLIOS_FILE, JSON.stringify(data, null, 2));
}

function getAllStockDefs() {
  return STOCK_DEFS;
}

function getStockDef(stockId) {
  return STOCK_DEFS.find((s) => s.id === stockId.toUpperCase());
}

function getCurrentPrices() {
  return loadStocks().prices;
}

function getStockHistory(stockId) {
  return loadStocks().history[stockId] ?? [];
}

function updateDailyPrices() {
  const data = loadStocks();
  const today = getKstDateString();
  if (data.lastUpdated === today) return false;

  for (const def of STOCK_DEFS) {
    const current = data.prices[def.id] ?? def.initialPrice;
    const change = (Math.random() * 2 - 1) * def.volatility;
    const newPrice = Math.max(MIN_PRICE, Math.round(current * (1 + change)));
    data.prices[def.id] = newPrice;

    const history = data.history[def.id] ?? [];
    history.push(newPrice);
    if (history.length > HISTORY_DAYS) history.shift();
    data.history[def.id] = history;
  }

  data.lastUpdated = today;
  saveStocks(data);
  return true;
}

function getPortfolio(userId) {
  const portfolios = loadPortfolios();
  return portfolios[userId] ?? {};
}

function getAllPortfolios() {
  return loadPortfolios();
}

function buyStock(userId, stockId, quantity) {
  const prices = getCurrentPrices();
  const price = prices[stockId];
  if (!price) return { success: false, reason: "종목 없음" };
  if (quantity < 1) return { success: false, reason: "수량 오류" };

  const totalCost = price * quantity;
  const portfolios = loadPortfolios();
  if (!portfolios[userId]) portfolios[userId] = {};
  portfolios[userId][stockId] = (portfolios[userId][stockId] ?? 0) + quantity;
  savePortfolios(portfolios);

  return { success: true, price, totalCost };
}

function sellStock(userId, stockId, quantity) {
  const prices = getCurrentPrices();
  const price = prices[stockId];
  if (!price) return { success: false, reason: "종목 없음" };
  if (quantity < 1) return { success: false, reason: "수량 오류" };

  const portfolios = loadPortfolios();
  const held = portfolios[userId]?.[stockId] ?? 0;
  if (held < quantity) return { success: false, reason: "보유량 부족" };

  const totalGain = price * quantity;
  portfolios[userId][stockId] = held - quantity;
  if (portfolios[userId][stockId] === 0) delete portfolios[userId][stockId];
  savePortfolios(portfolios);

  return { success: true, price, totalGain };
}

function getPortfolioValue(userId) {
  const portfolio = getPortfolio(userId);
  const prices = getCurrentPrices();
  let total = 0;
  for (const [stockId, qty] of Object.entries(portfolio)) {
    total += (prices[stockId] ?? 0) * qty;
  }
  return total;
}

function clearPortfolio(userId) {
  const portfolios = loadPortfolios();
  delete portfolios[userId];
  savePortfolios(portfolios);
}

module.exports = {
  STOCK_DEFS,
  getAllStockDefs,
  getStockDef,
  getCurrentPrices,
  getStockHistory,
  updateDailyPrices,
  getPortfolio,
  getAllPortfolios,
  getPortfolioValue,
  clearPortfolio,
  buyStock,
  sellStock,
};
