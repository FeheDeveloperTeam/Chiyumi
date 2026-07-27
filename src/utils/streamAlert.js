const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const DATA_FILE = path.join(__dirname, "../../data/streamAlerts.json");
const SEEN_IDS_MAX = 30; // 저장할 최대 영상 ID 수

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

// 본 영상 ID 목록에 추가 (lastVideoId 단일값 → 집합으로 마이그레이션 포함)
function addSeenVideoIds(guildId, alertId, newIds) {
  const data = load();
  const alert = data[guildId]?.find((a) => a.id === alertId);
  if (!alert) return;
  const existing = alert.seenVideoIds
    ? new Set(alert.seenVideoIds)
    : alert.lastVideoId
    ? new Set([alert.lastVideoId])
    : new Set();
  for (const id of newIds) existing.add(id);
  alert.seenVideoIds = [...existing].slice(-SEEN_IDS_MAX);
  delete alert.lastVideoId; // 구버전 필드 제거
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

// RSS 피드에서 모든 영상 entry 반환
async function checkYouTubeUpload(channelId) {
  try {
    const res = await fetch(
      `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`,
      { headers: { "User-Agent": "Mozilla/5.0" } },
    );
    if (!res.ok) return [];
    const xml = await res.text();
    const entries = [];
    const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
    let match;
    while ((match = entryRegex.exec(xml)) !== null) {
      const entry = match[1];
      const videoIdMatch = entry.match(/<yt:videoId>([^<]+)<\/yt:videoId>/);
      const titleMatch = entry.match(/<title>([^<]+)<\/title>/);
      if (!videoIdMatch) continue;
      entries.push({
        videoId: videoIdMatch[1],
        title: (titleMatch?.[1] ?? "새 영상")
          .replace(/&amp;/g, "&")
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">")
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'"),
      });
    }
    return entries;
  } catch {
    return [];
  }
}

// 영상 페이지를 확인해 라이브/예약/아카이브 여부 판별 (업로드 알림에서 제외할 대상)
// - liveBroadcastContent:"live"     → 방송 중
// - liveBroadcastContent:"upcoming" → 예약된 방송
// - isLiveBroadcast:true (JSON-LD)  → 종료된 라이브 아카이브
async function isVideoLiveRelated(videoId) {
  try {
    const res = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept-Language": "ko-KR,ko;q=0.9",
      },
    });
    const html = await res.text();
    return (
      html.includes('"liveBroadcastContent":"live"') ||
      html.includes('"liveBroadcastContent":"upcoming"') ||
      html.includes('"isLiveBroadcast":true') // 아카이브된 라이브 스트림
    );
  } catch {
    return false;
  }
}

function updateAlert(guildId, alertId, updates) {
  const data = load();
  const alert = data[guildId]?.find((a) => a.id === alertId);
  if (!alert) return false;
  Object.assign(alert, updates);
  save(data);
  return true;
}

function buildUploadNotificationContent(alert, videoInfo) {
  const videoUrl = `https://www.youtube.com/watch?v=${videoInfo.videoId}`;
  const parts = [];
  if (alert.mention !== "none") parts.push(`@${alert.mention}`);
  const text = (alert.customText || "{name}님의 새 영상이 올라왔습니다! 📹")
    .replace(/{name}/g, alert.channelName)
    .replace(/{title}/g, videoInfo.title)
    .replace(/{url}/g, videoUrl);
  parts.push(text);
  if (!alert.customText?.includes("{url}")) {
    parts.push(`**${videoInfo.title}**`);
    parts.push(videoUrl);
  }
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
    // "hlsManifestUrl": 실제 방송 중일 때만 존재
    // "isLive":true: ytInitialData에 방송 중일 때만 존재
    // "isLiveBroadcast"는 예약된 방송(방송 전)에도 나타나므로 사용하지 않음
    return html.includes('"hlsManifestUrl"') || html.includes('"isLive":true');
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

function buildLiveUrl(alert) {
  if (alert.platform === "youtube") {
    return alert.channelId.startsWith("@")
      ? `https://www.youtube.com/${alert.channelId}/live`
      : `https://www.youtube.com/channel/${alert.channelId}/live`;
  }
  return alert.channelLink;
}

function buildNotificationContent(alert) {
  const liveUrl = buildLiveUrl(alert);
  const parts = [];
  if (alert.mention !== "none") parts.push(`@${alert.mention}`);
  const text = (alert.customText || "{name}님이 방송을 시작했습니다! 🎉")
    .replace(/{name}/g, alert.channelName)
    .replace(/{url}/g, liveUrl);
  parts.push(text);
  if (!alert.customText?.includes("{url}")) {
    parts.push(liveUrl);
  }
  return parts.join("\n");
}

async function checkAllStreams(client) {
  const data = load();
  for (const [guildId, alerts] of Object.entries(data)) {
    for (const alert of alerts) {
      try {
        if (alert.platform === "youtube_upload") {
          const entries = await checkYouTubeUpload(alert.channelId);
          if (!entries.length) continue;

          // seenVideoIds가 없으면 → 신규 등록이거나 구버전(lastVideoId)에서 마이그레이션
          // 두 경우 모두 현재 RSS 전체를 시드만 하고 알림 미발송 (뭉탱이 알림 방지)
          if (!alert.seenVideoIds) {
            addSeenVideoIds(guildId, alert.id, entries.map((e) => e.videoId));
            continue;
          }

          const seenIds = new Set(alert.seenVideoIds);

          // 처음 보는 영상만 추출
          const newEntries = entries.filter((e) => !seenIds.has(e.videoId));

          // 모든 현재 entry ID를 seenIds에 추가 (라이브 포함 — 아카이브 후 중복 알림 방지)
          addSeenVideoIds(guildId, alert.id, entries.map((e) => e.videoId));

          for (const entry of newEntries) {
            // 라이브 중·예약·아카이브된 라이브는 건너뜀 (쇼츠·롱폼만 알림)
            const isLiveRelated = await isVideoLiveRelated(entry.videoId);
            if (isLiveRelated) continue;

            const guild = client.guilds.cache.get(guildId);
            const channel = guild?.channels.cache.get(alert.notifChannelId);
            if (channel?.isTextBased()) {
              await channel.send(buildUploadNotificationContent(alert, entry));
            }
          }
        } else {
          // 라이브 방송 알림: offline→live 전환 시 1회만 발송
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
const pendingEdits = new Map();

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
  updateAlert,
  pendingSetups,
  pendingEdits,
};
