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

async function resolveYouTubeChannelId(handle) {
  if (!handle.startsWith("@")) return handle;
  try {
    const res = await fetch(`https://www.youtube.com/${handle}`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept-Language": "ko-KR,ko;q=0.9,en;q=0.8",
      },
    });
    const html = await res.text();
    const m =
      html.match(/"channelId":"(UC[^"]{22})"/) ||
      html.match(/"externalId":"(UC[^"]{22})"/);
    return m ? m[1] : null;
  } catch {
    return null;
  }
}

async function checkYouTubeUpload(channelId) {
  try {
    const res = await fetch(
      `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`,
      { headers: { "User-Agent": "Mozilla/5.0" } },
    );
    if (!res.ok) return null;
    const xml = await res.text();
    const entryMatch = xml.match(/<entry>([\s\S]*?)<\/entry>/);
    if (!entryMatch) return null;
    const entry = entryMatch[1];
    const videoIdMatch = entry.match(/<yt:videoId>([^<]+)<\/yt:videoId>/);
    const titleMatch = entry.match(/<title>([^<]+)<\/title>/);
    if (!videoIdMatch) return null;
    return {
      videoId: videoIdMatch[1],
      title: (titleMatch?.[1] ?? "새 영상")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">"),
    };
  } catch {
    return null;
  }
}

function setLastVideoId(guildId, alertId, videoId) {
  const data = load();
  const alert = data[guildId]?.find((a) => a.id === alertId);
  if (!alert) return;
  alert.lastVideoId = videoId;
  save(data);
}

function buildUploadNotificationContent(alert, videoInfo) {
  const parts = [];
  if (alert.mention !== "none") parts.push(`@${alert.mention}`);
  const text = (alert.customText || "{name}님의 새 영상이 올라왔습니다! 📹").replace(
    /{name}/g,
    alert.channelName,
  );
  parts.push(text);
  parts.push(`**${videoInfo.title}**`);
  parts.push(`https://www.youtube.com/watch?v=${videoInfo.videoId}`);
  return parts.join("\n");
}

function extractChannelId(platform, link) {
  try {
    switch (platform) {
      case "youtube":
      case "youtube_upload": {
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
        if (alert.platform === "youtube_upload") {
          const latest = await checkYouTubeUpload(alert.channelId);
          if (!latest) continue;
          if (alert.lastVideoId == null) {
            setLastVideoId(guildId, alert.id, latest.videoId);
          } else if (latest.videoId !== alert.lastVideoId) {
            const guild = client.guilds.cache.get(guildId);
            const channel = guild?.channels.cache.get(alert.notifChannelId);
            if (channel?.isTextBased()) {
              await channel.send(buildUploadNotificationContent(alert, latest));
            }
            setLastVideoId(guildId, alert.id, latest.videoId);
          }
        } else {
          const live = await checkIsLive(alert);
          if (live && !alert.isLive) {
            const guild = client.guilds.cache.get(guildId);
            const channel = guild?.channels.cache.get(alert.notifChannelId);
            if (channel?.isTextBased()) {
              await channel.send(buildNotificationContent(alert));
            }
          }
          if (live !== alert.isLive) setLiveStatus(guildId, alert.id, live);
        }
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
  buildUploadNotificationContent,
  checkAllStreams,
  resolveYouTubeChannelId,
  pendingSetups,
};
