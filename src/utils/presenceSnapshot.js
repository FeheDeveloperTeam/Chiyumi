const fs = require("node:fs");
const path = require("node:path");

const DATA_DIR = path.join(__dirname, "..", "..", "data");
const DATA_FILE = path.join(DATA_DIR, "presence.json");

const SNAPSHOT_INTERVAL_MS = 2 * 60 * 1000; // 현재 값 갱신 주기
const HISTORY_SAMPLE_INTERVAL_MS = 30 * 60 * 1000; // 추이 그래프용 샘플 간격
const HISTORY_MAX_POINTS = 48; // 30분 간격 48개 = 최근 24시간

function loadAll() {
  if (!fs.existsSync(DATA_FILE)) return {};
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
  } catch {
    return {};
  }
}

function saveAll(data) {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// 사람 멤버 중 오프라인이 아닌 사람 수만 센다. GuildPresences 인텐트가 있어야
// member.presence가 채워진다 — 인텐트 없이 켜져 있던 기존 배포에서는 항상 0으로
// 잡히니, 이 파일이 새로 생겼는데 값이 계속 0이면 인텐트/재배포를 먼저 확인.
function countOnlineHumans(guild) {
  let count = 0;
  for (const member of guild.members.cache.values()) {
    if (member.user.bot) continue;
    if (member.presence && member.presence.status !== "offline") count += 1;
  }
  return count;
}

function snapshotAllGuilds(client) {
  const now = Date.now();
  const nowIso = new Date(now).toISOString();
  const all = loadAll();

  for (const guild of client.guilds.cache.values()) {
    const onlineHumans = countOnlineHumans(guild);
    const prev = all[guild.id] ?? {};
    const history = Array.isArray(prev.history) ? prev.history : [];
    const lastPoint = history[history.length - 1];
    const shouldSample =
      !lastPoint || now - new Date(lastPoint.t).getTime() >= HISTORY_SAMPLE_INTERVAL_MS;

    all[guild.id] = {
      onlineHumans,
      updatedAt: nowIso,
      history: shouldSample
        ? [...history, { t: nowIso, count: onlineHumans }].slice(-HISTORY_MAX_POINTS)
        : history,
    };
  }

  saveAll(all);
}

function startPresenceSnapshotLoop(client) {
  snapshotAllGuilds(client);
  setInterval(() => snapshotAllGuilds(client), SNAPSHOT_INTERVAL_MS);
}

module.exports = { startPresenceSnapshotLoop };
