// 유료 서비스: 서버별 봇 프로필 커스텀(이름·프로필 사진·배너·소개글).
// 데이터는 연동된 구글 시트(GOOGLE_SHEET_ID)에 두고, fehe.dev(fdt-homepage api/_lib/premiumSheets.js)와 같은 탭·컬럼을 쓴다.
// 탭 이름이나 컬럼 순서를 바꿀 때는 두 저장소를 함께 고친다.
//
//  「유료이용권」 서버ID | 서버이름 | 상품 | 시작일 | 만료일 | 메모
//      운영자가 시트에 직접 적는다(결제 수단이 붙기 전까지). 상품이 비었거나 「봇프로필」이면 이 기능 이용권.
//      만료일 당일(KST)까지 쓸 수 있고, 같은 서버에 행이 여러 개면 가장 늦은 만료일을 쓴다.
//  「봇프로필」 서버ID | 서버이름 | 별명 | 소개글 | 프로필 사진 | 배너 | 상태 | 마지막 변경자ID | 마지막 변경 일시
//      fehe.dev 설정 화면이 적용할 때 적는다. 상태가 「적용중」인데 이용권이 끝났으면
//      checkExpiredProfiles가 봇 프로필을 기본으로 되돌리고 상태를 「만료로 해제」로 바꾼다.
// 봇의 15분 주기 시트 백업(googleSheets.js)은 자기 탭만 덮어쓰므로 이 두 탭은 건드리지 않는다.
const { JWT } = require("google-auth-library");
const { Routes } = require("discord.js");

const SUBSCRIPTION_TAB = "유료이용권";
const PROFILE_TAB = "봇프로필";
const PRODUCT_NAME = "봇프로필";
const SHEETS_API_BASE = "https://sheets.googleapis.com/v4/spreadsheets";
const SETTINGS_URL = (guildId) => `https://www.fehe.dev/DiscordBot/Chiyumi/servers/${guildId}/profile`;

let authClient = null;
function getAuthClient() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
  if (!email || !key || !process.env.GOOGLE_SHEET_ID) return null;
  if (!authClient) {
    authClient = new JWT({ email, key: key.replace(/\\n/g, "\n"), scopes: ["https://www.googleapis.com/auth/spreadsheets"] });
  }
  return authClient;
}

async function sheetsRequest(path, options = {}) {
  const client = getAuthClient();
  if (!client) throw new Error("구글 시트 환경변수가 없습니다");
  const { token } = await client.getAccessToken();
  const res = await fetch(`${SHEETS_API_BASE}/${process.env.GOOGLE_SHEET_ID}${path}`, {
    ...options,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...options.headers },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Sheets API ${res.status}: ${text.slice(0, 300)}`);
  }
  return res.json();
}

const rangeOf = (title, a1) => encodeURIComponent(`'${title}'!${a1}`);

// 탭이 아직 없으면(설정 화면을 한 번도 안 열었으면) 빈 목록으로 본다. 탭은 fehe.dev 쪽이 처음 열 때 만든다.
async function readTab(title) {
  try {
    const data = await sheetsRequest(`/values/${rangeOf(title, "A1:Z5000")}`);
    return (data.values || []).slice(1);
  } catch (err) {
    if (String(err.message).includes("Unable to parse range")) return [];
    throw err;
  }
}

function parseSheetDate(value) {
  const m = String(value || "").match(/(\d{4})\D+(\d{1,2})\D+(\d{1,2})/);
  return m ? `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}` : null;
}

const todayKst = () => new Date(Date.now() + 9 * 3600_000).toISOString().slice(0, 10);
const nowKstText = () => new Date(Date.now() + 9 * 3600_000).toISOString().replace("T", " ").slice(0, 19);
const daysBetween = (a, b) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);

function subscriptionsFromRows(rows) {
  const today = todayKst();
  const best = new Map();
  for (const row of rows) {
    const guildId = String(row[0] || "").trim();
    const product = String(row[2] || "").trim();
    if (!guildId || (product && product !== PRODUCT_NAME)) continue;
    const endDate = parseSheetDate(row[4]);
    if (!endDate) continue;
    const startDate = parseSheetDate(row[3]);
    if (startDate && startDate > today) continue;
    const prev = best.get(guildId);
    if (!prev || endDate > prev.endDate) best.set(guildId, { startDate, endDate });
  }
  const result = new Map();
  for (const [guildId, sub] of best) {
    const daysLeft = daysBetween(today, sub.endDate);
    result.set(guildId, { ...sub, daysLeft, active: daysLeft >= 0 });
  }
  return result;
}

async function getSubscription(guildId) {
  const subs = subscriptionsFromRows(await readTab(SUBSCRIPTION_TAB));
  return subs.get(guildId) ?? { active: false, endDate: null, daysLeft: null };
}

// 이용권이 끝난 서버의 커스텀 프로필을 기본으로 되돌린다. ready.js가 주기적으로 부른다.
async function checkExpiredProfiles(client) {
  if (!getAuthClient()) return;
  const [subRows, profileRows] = await Promise.all([readTab(SUBSCRIPTION_TAB), readTab(PROFILE_TAB)]);
  if (profileRows.length === 0) return;
  const subs = subscriptionsFromRows(subRows);

  for (let i = 0; i < profileRows.length; i++) {
    const row = profileRows[i];
    const guildId = String(row[0] || "").trim();
    if (!guildId || row[6] !== "적용중" || subs.get(guildId)?.active) continue;

    let status = "만료로 해제";
    if (client.guilds.cache.has(guildId)) {
      try {
        await client.rest.patch(Routes.guildMember(guildId, "@me"), {
          body: { nick: null, avatar: null, banner: null, bio: null },
        });
      } catch (err) {
        console.error(`[봇프로필] ${guildId} 만료 해제 실패:`, err.message);
        continue; // 다음 확인 때 다시 시도
      }
    } else {
      status = "만료로 해제(봇 없음)";
    }

    const rowNumber = i + 2;
    const values = [[guildId, row[1] || "", "", "", "", "", status, "bot", nowKstText()]];
    await sheetsRequest(`/values/${rangeOf(PROFILE_TAB, `A${rowNumber}:I${rowNumber}`)}?valueInputOption=RAW`, {
      method: "PUT",
      body: JSON.stringify({ values }),
    }).catch((err) => console.error(`[봇프로필] ${guildId} 시트 기록 실패:`, err.message));
    console.log(`[봇프로필] ${guildId} 이용권 만료 → 기본 프로필로 되돌림`);
  }
}

module.exports = { getSubscription, checkExpiredProfiles, SETTINGS_URL, isPremiumConfigured: () => Boolean(getAuthClient()) };
