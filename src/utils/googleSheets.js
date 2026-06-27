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

function objectToRows(data) {
  const entries = Object.entries(data);
  if (entries.length === 0) return [["id"]];

  const [, sample] = entries[0];

  if (typeof sample === "object" && sample !== null) {
    const keySet = new Set();
    for (const [, value] of entries) {
      for (const key of Object.keys(value)) keySet.add(key);
    }
    const keys = [...keySet];
    const header = ["id", ...keys];
    const rows = entries.map(([id, value]) => [
      id,
      ...keys.map((key) => stringifyCell(value[key])),
    ]);
    return [header, ...rows];
  }

  const header = ["id", "value"];
  const rows = entries.map(([id, value]) => [id, stringifyCell(value)]);
  return [header, ...rows];
}

function guildUserMapToRows(data) {
  const header = ["서버ID", "유저ID", "값"];
  const rows = [];

  for (const [guildId, users] of Object.entries(data)) {
    for (const [userId, value] of Object.entries(users)) {
      const flatValue = value && typeof value === "object" ? value.xp : value;
      rows.push([guildId, userId, stringifyCell(flatValue)]);
    }
  }

  return [header, ...rows];
}

function buildGuildListRows(client) {
  const header = ["서버ID", "서버이름"];
  if (!client) return [header];

  const rows = [...client.guilds.cache.values()].map((guild) => [guild.id, guild.name]);
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

async function sheetsRequest(authClient, url, options = {}) {
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

  const titles = [...Object.keys(SHEET_FILES), "서버목록"];
  await ensureSheetsExist(authClient, spreadsheetId, titles);

  for (const [title, fileName] of Object.entries(SHEET_FILES)) {
    const data = readJsonFile(fileName);
    const rows = GUILD_USER_MAP_FILES.has(fileName)
      ? guildUserMapToRows(data)
      : objectToRows(data);
    await writeSheet(authClient, spreadsheetId, title, rows);
  }

  await writeSheet(authClient, spreadsheetId, "서버목록", buildGuildListRows(client));
}

module.exports = { syncDataToSheets };
