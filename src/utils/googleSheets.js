const fs = require("node:fs");
const path = require("node:path");
const { JWT } = require("google-auth-library");

const DATA_DIR = path.join(__dirname, "..", "..", "data");
const SHEETS_API_BASE = "https://sheets.googleapis.com/v4/spreadsheets";

const SHEET_FILES = {
  코인: "credits.json",
  출석: "claims.json",
  레벨: "levels.json",
  키우기: "pets.json",
  음성시간: "voiceTime.json",
  서버설정: "guildConfig.json",
  이용제한: "restrictions.json",
  약관동의: "consent.json",
};

// 시트별 컬럼명 설정
const SHEET_COLUMN_CONFIG = {
  코인:        { idCol: "유저ID", valCol: "잔액(코인)" },
  출석:        { idCol: "유저ID", valCol: "마지막 출석일" },
  레벨:        { idCol: "서버ID", userCol: "유저ID", valCol: "총 XP" },
  음성시간:    { idCol: "서버ID", userCol: "유저ID", valCol: "음성시간(ms)" },
  서버설정:    { idCol: "서버ID" },
  주식포트폴리오: { idCol: "유저ID" },
  키우기: {
    idCol: "유저ID",
    colRename: {
      name: "이름", hunger: "배고픔", cleanliness: "청결도",
      affection: "친밀도", lastFed: "마지막 밥", lastWashed: "마지막 목욕",
      lastPlayed: "마지막 놀기", adoptedAt: "입양일",
    },
  },
  이용제한: {
    idCol: "유저ID",
    colRename: { reason: "사유", restrictedBy: "제한 관리자", restrictedAt: "제한 일시" },
  },
  약관동의: {
    idCol: "유저ID",
    colRename: { agreedAt: "동의 일시" },
  },
};

const STOCK_HISTORY_COLS = 6;

const GUILD_USER_MAP_FILES = new Set(["levels.json", "voiceTime.json"]);

function readJsonFile(fileName) {
  const filePath = path.join(DATA_DIR, fileName);
  if (!fs.existsSync(filePath)) return {};
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

function stringifyCell(value) {
  if (value === undefined || value === null) return "";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function objectToRows(data, config = {}) {
  const { idCol = "ID", valCol = "값", colRename = {} } = config;
  const entries = Object.entries(data);
  if (entries.length === 0) return [[idCol]];

  const [, sample] = entries[0];

  if (typeof sample === "object" && sample !== null) {
    const keySet = new Set();
    for (const [, value] of entries) {
      for (const key of Object.keys(value)) keySet.add(key);
    }
    const keys = [...keySet];
    const header = [idCol, ...keys.map((k) => colRename[k] ?? k)];
    const rows = entries.map(([id, value]) => [
      id,
      ...keys.map((key) => stringifyCell(value[key])),
    ]);
    return [header, ...rows];
  }

  const header = [idCol, valCol];
  const rows = entries.map(([id, value]) => [id, stringifyCell(value)]);
  return [header, ...rows];
}

function guildUserMapToRows(data, config = {}) {
  const { idCol = "서버ID", userCol = "유저ID", valCol = "값" } = config;
  const header = [idCol, userCol, valCol];
  const rows = [];

  for (const [guildId, users] of Object.entries(data)) {
    for (const [userId, value] of Object.entries(users)) {
      const flatValue = value && typeof value === "object" ? value.xp : value;
      rows.push([guildId, userId, stringifyCell(flatValue)]);
    }
  }

  return [header, ...rows];
}

function stockPricesToRows(data) {
  const { prices = {}, lastUpdated = "", history = {} } = data;
  const pastHeaders = Array.from({ length: STOCK_HISTORY_COLS }, (_, i) => `D-${i + 1}`);
  const header = ["종목코드", "현재가", ...pastHeaders, "업데이트"];

  const rows = Object.entries(prices).map(([id, price]) => {
    const hist = history[id] ?? [];
    const past = hist.slice(0, -1).reverse().slice(0, STOCK_HISTORY_COLS);
    const padded = [...past, ...Array(STOCK_HISTORY_COLS - past.length).fill("")];
    return [id, price, ...padded, lastUpdated];
  });

  return [header, ...rows];
}

function buildGuildListRows(client) {
  const header = ["서버ID", "서버이름", "인원수"];
  if (!client) return [header];

  const rows = [...client.guilds.cache.values()].map((guild) => [guild.id, guild.name, guild.memberCount]);
  return [header, ...rows];
}

function getAuthClient() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;

  if (!email || !key) return null;

  return new JWT({
    email,
    key: key.replace(/\\n/g, "\n"),
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
}

async function sheetsRequest(authClient, url, options = {}, retries = 3) {
  const { token } = await authClient.getAccessToken();

  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    if ((response.status === 500 || response.status === 503) && retries > 0) {
      const delay = (4 - retries) * 2000;
      await new Promise((r) => setTimeout(r, delay));
      return sheetsRequest(authClient, url, options, retries - 1);
    }
    throw new Error(`Sheets API ${response.status}: ${text}`);
  }

  return response.json();
}

async function ensureSheetsExist(authClient, spreadsheetId, titles) {
  const data = await sheetsRequest(authClient, `${SHEETS_API_BASE}/${spreadsheetId}`);
  const existingTitles = new Set(data.sheets.map((sheet) => sheet.properties.title));
  const missing = titles.filter((title) => !existingTitles.has(title));

  if (missing.length === 0) return;

  await sheetsRequest(authClient, `${SHEETS_API_BASE}/${spreadsheetId}:batchUpdate`, {
    method: "POST",
    body: JSON.stringify({
      requests: missing.map((title) => ({ addSheet: { properties: { title } } })),
    }),
  });
}

async function writeSheet(authClient, spreadsheetId, title, rows) {
  const range = encodeURIComponent(`'${title}'!A1:Z10000`);

  await sheetsRequest(authClient, `${SHEETS_API_BASE}/${spreadsheetId}/values/${range}:clear`, {
    method: "POST",
    body: JSON.stringify({}),
  });

  const updateRange = encodeURIComponent(`'${title}'!A1`);
  await sheetsRequest(
    authClient,
    `${SHEETS_API_BASE}/${spreadsheetId}/values/${updateRange}?valueInputOption=RAW`,
    {
      method: "PUT",
      body: JSON.stringify({ values: rows }),
    },
  );
}

async function syncDataToSheets(client) {
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  const authClient = getAuthClient();

  if (!spreadsheetId || !authClient) return;

  const titles = [...Object.keys(SHEET_FILES), "주식시세", "주식포트폴리오", "서버목록"];
  await ensureSheetsExist(authClient, spreadsheetId, titles);

  for (const [title, fileName] of Object.entries(SHEET_FILES)) {
    const data = readJsonFile(fileName);
    const config = SHEET_COLUMN_CONFIG[title] ?? {};
    const rows = GUILD_USER_MAP_FILES.has(fileName)
      ? guildUserMapToRows(data, config)
      : objectToRows(data, config);
    try {
      await writeSheet(authClient, spreadsheetId, title, rows);
    } catch (err) {
      console.error(`[Sheets] '${title}' 시트 쓰기 실패:`, err.message);
    }
  }

  for (const [title, rows] of [
    ["주식시세", stockPricesToRows(readJsonFile("stocks.json"))],
    ["주식포트폴리오", objectToRows(readJsonFile("stockPortfolios.json"), SHEET_COLUMN_CONFIG["주식포트폴리오"] ?? {})],
    ["서버목록", buildGuildListRows(client)],
  ]) {
    try {
      await writeSheet(authClient, spreadsheetId, title, rows);
    } catch (err) {
      console.error(`[Sheets] '${title}' 시트 쓰기 실패:`, err.message);
    }
  }
}

module.exports = { syncDataToSheets };
