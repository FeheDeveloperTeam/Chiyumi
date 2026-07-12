const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const DATA_FILE = path.join(__dirname, "../../data/streamAlerts.json");

function load() {
  if (!fs.existsSync(DATA_FILE)) return {};
  try { return JSON.parse(fs.readFileSync(DATA_FILE, "utf-8")); }
  catch { return {}; }
}

function save(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function getGuildAlerts(guildId) {
  return load()[guildId] ?? [];
}

function addAlert(guildId, alert) {
  const data = load();
  if (!data[guildId]) data[guildId] = [];
  data[guildId].push({ ...alert, id: crypto.randomUUID(), isLive: false });
  save(data);
}

function removeAlert(guildId, alertId) {
  const data = load();
  if (!data[guildId]) return false;
  const before = data[guildId].length;
  data[guildId] = data[guildId].filter((a) => a.id !== alertId);
  save(data);
  return data[guildId].length < before;
}

function setLiveStatus(guildId, alertId, isLive) {
  const data = load();
  const alert = data[guildId]?.find((a) => a.id === alertId);
  if (!alert) return;
  alert.isLive = isLive;
  save(data);
}

function extractChannelId(platform, link) {
  try {
    switch (platform) {
      case "youtube": {
        const m1 = link.match(/youtube\.com\/@([^/?&#\s]+)/);
        if (m1) return `@${m1[1]}`;
        const m2 = link.match(/youtube\.com\/channel\/([^/?&#\s]+)/);
        if (m2) return m2[1];
        break;
      }
      case "chzzk": {
        const m = link.match(/chzzk\.naver\.com\/([a-f0-9A-F]{32,})/);
        if (m) return m[1];
        break;
      }
      case "soop": {
        const m1 = link.match(/sooplive\.co\.kr\/([^/?&#\s]+)/);
        if (m1) return m1[1];
        const m2 = link.match(/afreecatv\.com\/([^/?&#\s]+)/);
        if (m2) return m2[1];
        break;
      }
    }
  } catch {}
  return null;
}

function isDuplicate(guildId, platform, channelId) {
  return getGuildAlerts(guildId).some(
    (a) => a.platform === platform && a.channelId === channelId,
  );
}

async function checkYouTubeLive(channelId) {
  try {
    const url = channelId.startsWith("@")
      ? `https://www.youtube.com/${channelId}/live`
      : `https://www.youtube.com/channel/${channelId}/live`;
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "ko-KR,ko;q=0.9,en;q=0.8",
      },
    });
    const html = await res.text();
    return html.includes('"isLiveBroadcast"') || html.includes('"hlsManifestUrl"');
  } catch {
    return false;
  }
}

async function checkChzzkLive(channelId) {
  try {
    const res = await fetch(
      `https://api.chzzk.naver.com/service/v1/channels/${channelId}/live-detail`,
      { headers: { "User-Agent": "Mozilla/5.0" } },
    );
    if (!res.ok) return false;
    const json = await res.json();
    return json.content?.status === "OPEN";
  } catch {
    return false;
  }
}

async function checkSoopLive(userId) {
  try {
    const res = await fetch(`https://chapi.sooplive.co.kr/api/${userId}/station`, {
      headers: { "User-Agent": "Mozilla/5.0", Referer: "https://www.sooplive.co.kr/" },
    });
    if (!res.ok) return false;
    const json = await res.json();
    return json.station?.user_status === 1;
  } catch {
    return false;
  }
}

async function checkIsLive(alert) {
  switch (alert.platform) {
    case "youtube": return checkYouTubeLive(alert.channelId);
    case "chzzk": return checkChzzkLive(alert.channelId);
    case "soop": return checkSoopLive(alert.channelId);
    default: return false;
  }
}

function buildNotificationContent(alert) {
  const parts = [];
  if (alert.mention !== "none") parts.push(`@${alert.mention}`);
  const text = (alert.customText || "{name}님이 방송을 시작했습니다! 🎉").replace(
    /{name}/g,
    alert.channelName,
  );
  parts.push(text);
  parts.push(`<${alert.channelLink}>`);
  return parts.join("\n");
}

async function checkAllStreams(client) {
  const data = load();
  for (const [guildId, alerts] of Object.entries(data)) {
    for (const alert of alerts) {
      try {
        const live = await checkIsLive(alert);
        if (live && !alert.isLive) {
          const guild = client.guilds.cache.get(guildId);
          const channel = guild?.channels.cache.get(alert.notifChannelId);
          if (channel?.isTextBased()) {
            await channel.send(buildNotificationContent(alert));
          }
        }
        if (live !== alert.isLive) setLiveStatus(guildId, alert.id, live);
      } catch {}
    }
  }
}

const pendingSetups = new Map();

module.exports = {
  getGuildAlerts,
  addAlert,
  removeAlert,
  extractChannelId,
  isDuplicate,
  checkIsLive,
  buildNotificationContent,
  checkAllStreams,
  pendingSetups,
};
