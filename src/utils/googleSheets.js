const fs = require("node:fs");
const path = require("node:path");
const { google } = require("googleapis");

const DATA_DIR = path.join(__dirname, "..", "..", "data");

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

function getAuth() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;

  if (!email || !key) return null;

  return new google.auth.JWT({
    email,
    key: key.replace(/\\n/g, "\n"),
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
}

async function ensureSheetsExist(sheets, spreadsheetId, titles) {
  const { data } = await sheets.spreadsheets.get({ spreadsheetId });
  const existingTitles = new Set(data.sheets.map((sheet) => sheet.properties.title));
  const missing = titles.filter((title) => !existingTitles.has(title));

  if (missing.length === 0) return;

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: missing.map((title) => ({ addSheet: { properties: { title } } })),
    },
  });
}

async function syncDataToSheets() {
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  const auth = getAuth();

  if (!spreadsheetId || !auth) return;

  const sheets = google.sheets({ version: "v4", auth });
  const titles = Object.keys(SHEET_FILES);

  await ensureSheetsExist(sheets, spreadsheetId, titles);

  for (const [title, fileName] of Object.entries(SHEET_FILES)) {
    const rows = objectToRows(readJsonFile(fileName));

    await sheets.spreadsheets.values.clear({
      spreadsheetId,
      range: `'${title}'!A1:Z10000`,
    });

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `'${title}'!A1`,
      valueInputOption: "RAW",
      requestBody: { values: rows },
    });
  }
}

module.exports = { syncDataToSheets };
