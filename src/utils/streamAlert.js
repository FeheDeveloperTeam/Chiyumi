const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const DATA_FILE = path.join(__dirname, "../../data/streamAlerts.json");
const SEEN_IDS_MAX = 30; // 저장할 최대 영상 ID 수
const FETCH_TIMEOUT_MS = 15_000;
const BROWSER_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept-Language": "ko-KR,ko;q=0.9,en;q=0.8",
};

// 응답이 오지 않는 요청이 한 바퀴 전체(그리고 겹침 방지 잠금)를 영원히 붙잡지 않게 모든 요청에 시간 제한을 둔다.
function fetchWithTimeout(url, options = {}) {
  return fetch(url, { ...options, signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
}

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
  // 지금 RSS에 보이는 ID는 맨 뒤로 옮겨, 오래된 것부터 잘라낼 때 아직 피드에 있는 영상이 빠지지 않게 한다
  // (빠지면 다음 확인 때 새 영상으로 보고 다시 알린다).
  for (const id of newIds) {
    existing.delete(id);
    existing.add(id);
  }
  const next = [...existing].slice(-SEEN_IDS_MAX);
  // 바뀐 게 없으면 파일을 다시 쓰지 않는다(사이트 관리 화면도 이 파일을 SFTP로 쓰므로 쓰기를 줄인다).
  if (!alert.lastVideoId && JSON.stringify(next) === JSON.stringify(alert.seenVideoIds)) return;
  alert.seenVideoIds = next;
  delete alert.lastVideoId; // 구버전 필드 제거
  save(data);
}

async function resolveYouTubeChannelId(handle) {
  if (!handle.startsWith("@")) return handle;
  try {
    const res = await fetchWithTimeout(`https://www.youtube.com/${handle}`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept-Language": "ko-KR,ko;q=0.9,en;q=0.8",
      },
    });
    if (!res.ok) return null; // 핸들이 바뀌었거나 없는 채널(404)
    const html = await res.text();
    // 채널 자신의 ID를 먼저 본다. "channelId"는 추천 채널 등 다른 채널 ID가 먼저 나올 수 있다.
    const m =
      html.match(/<link rel="canonical" href="https:\/\/www\.youtube\.com\/channel\/(UC[\w-]{22})"/) ||
      html.match(/"externalId":"(UC[\w-]{22})"/) ||
      html.match(/"channelId":"(UC[\w-]{22})"/);
    return m ? m[1] : null;
  } catch {
    return null;
  }
}

// RSS 피드에서 모든 영상 entry 반환
async function checkYouTubeUpload(channelId) {
  try {
    const res = await fetchWithTimeout(
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

// 영상 페이지를 보고 업로드 알림을 보낼지 판단한다.
//  "skip"    — 라이브 방송(방송 중·예약·끝난 다시보기). 라이브 알림이 따로 있으므로 업로드 알림은 보내지 않는다.
//  "upcoming"— 아직 공개 전인 최초 공개(프리미어). 본 목록에 넣지 않고 공개될 때까지 다시 본다.
//  "wait"    — 페이지를 제대로 못 읽음. 본 목록에 넣지 않고 다음에 다시 본다(UPLOAD_WAIT_MAX번까지).
//  "notify"  — 일반 영상·쇼츠
// 2026-11 기준 유튜브는 예전에 보던 liveBroadcastContent / isLiveBroadcast 표시를 더는 주지 않고,
// videoDetails.isLiveContent(라이브면 true)와 isUpcoming(공개 전이면 true)으로만 구분된다.
async function classifyByWatchPage(videoId) {
  try {
    const res = await fetchWithTimeout(`https://www.youtube.com/watch?v=${videoId}`, { headers: BROWSER_HEADERS });
    if (!res.ok) return "wait";
    const html = await res.text();
    const liveContent = html.match(/"isLiveContent":(true|false)/)?.[1];
    if (liveContent === "true" || html.includes('"isLiveBroadcast":true')) return "skip";
    if (html.includes('"isUpcoming":true')) return "upcoming";
    if (liveContent === "false") return "notify";
    return "wait"; // 봇 확인·동의 화면 등 영상 정보가 없는 응답
  } catch {
    return "wait";
  }
}

// 채널 탭(라이브 /streams, 동영상 /videos, Shorts /shorts)에 있는 영상 ID 목록.
// 그 탭이 없는 채널은 YouTube가 홈 탭을 대신 보여 주므로, 요청한 탭이 실제로 선택됐을 때만 목록을 믿는다.
// 반환: Set(영상 ID) / 탭이 없으면 빈 Set / 읽기 실패면 null
async function getChannelTabIds(channelId, tab) {
  try {
    const res = await fetchWithTimeout(`https://www.youtube.com/channel/${channelId}/${tab}`, { headers: BROWSER_HEADERS });
    if (!res.ok) return null;
    const html = await res.text();
    if (!html.includes("ytInitialData")) return null;
    const selected = [...html.matchAll(/"tabRenderer":\{"endpoint":([\s\S]{0,1500}?)"selected":true/g)].some((m) =>
      new RegExp(`"url":"[^"]*/${tab}"`).test(m[1]),
    );
    if (!selected) return new Set();
    return new Set([...html.matchAll(/"videoId":"([\w-]{11})"/g)].map((m) => m[1]));
  } catch {
    return null;
  }
}

// 봇 서버(데이터센터 IP)에서는 YouTube가 영상 페이지 대신 봇 확인 페이지를 줘서 영상 정보를 못 읽는다(2026-11-22 확인).
// 그때는 채널 탭으로 구분한다: 라이브 탭에 있으면 라이브(다시보기 포함), 동영상·Shorts 탭에 있으면 일반 영상.
async function classifyByChannelTabs(videoId, channelId) {
  const streams = await getChannelTabIds(channelId, "streams");
  if (streams === null) return "wait";
  if (streams.has(videoId)) return "skip";
  for (const tab of ["videos", "shorts"]) {
    const ids = await getChannelTabIds(channelId, tab);
    if (ids?.has(videoId)) return "notify";
  }
  return "wait"; // 탭에 아직 안 나타남 — 다음 확인 때 다시 본다
}

async function classifyUploadVideo(videoId, channelId) {
  const kind = await classifyByWatchPage(videoId);
  if (kind !== "wait" || !channelId) return kind;
  return classifyByChannelTabs(videoId, channelId);
}
const UPLOAD_WAIT_MAX = 12; // "wait"이 이만큼(약 1시간) 이어지면 더 기다리지 않고 본 목록에 넣는다

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
  const hasTitle = alert.customText?.includes("{title}");
  const hasUrl = alert.customText?.includes("{url}");
  if (!hasTitle) parts.push(`**${videoInfo.title}**`);
  if (!hasUrl) parts.push(videoUrl);
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
    const res = await fetchWithTimeout(url, { headers: BROWSER_HEADERS });
    // 404는 핸들이 바뀌었거나 없는 채널이다. 꺼진 것으로 보지 않고 "모름"(null)으로 둔다.
    if (!res.ok) return null;
    const html = await res.text();
    // 방송 중이면 /live가 그 방송 페이지가 되고 "isLiveNow":true가 있다. 예약 방송은 isLiveNow:false, isUpcoming:true.
    const live =
      html.includes('"isLiveNow":true') ||
      html.includes('"hlsManifestUrl"') ||
      (html.includes('"isLive":true') && !html.includes('"isUpcoming":true'));
    if (live) return { live: true, title: await getLiveTitle(html) };
    // 채널 페이지(방송 없음)나 예약 방송 페이지가 제대로 왔을 때만 꺼짐으로 본다.
    return html.includes("ytInitialData") ? { live: false } : null;
  } catch {
    return null;
  }
}

// 치지직: v1 live-detail은 2026-11 기준 500을 돌려줘서 v2를 쓴다.
async function checkChzzkLive(channelId) {
  try {
    const res = await fetchWithTimeout(
      `https://api.chzzk.naver.com/service/v2/channels/${channelId}/live-detail`,
      { headers: { "User-Agent": "Mozilla/5.0" } },
    );
    if (!res.ok) return null;
    const json = await res.json();
    if (json.code !== 200) return null;
    return { live: json.content?.status === "OPEN", title: json.content?.liveTitle ?? "" };
  } catch {
    return null;
  }
}

// SOOP: 방송 중이면 응답에 broad(방송 정보)가 있고, 아니면 null이다. (예전에 보던 station.user_status는 없다)
async function checkSoopLive(userId) {
  try {
    const res = await fetchWithTimeout(`https://chapi.sooplive.co.kr/api/${userId}/station`, {
      headers: { "User-Agent": "Mozilla/5.0", Referer: "https://www.sooplive.co.kr/" },
    });
    if (!res.ok) return null;
    const json = await res.json();
    if (!json.station) return null; // {"code":9000} 없는 방송국 등
    return { live: Boolean(json.broad?.broad_no), title: json.broad?.broad_title ?? "" };
  } catch {
    return null;
  }
}

// 방송 제목: 페이지의 <meta name="title">에서 읽고, 없으면(봇 서버에서는 빠져 있다) 방송 영상 ID로 oEmbed에서 가져온다.
async function getLiveTitle(html) {
  const meta = decodeHtml(html.match(/<meta name="title" content="([^"]*)"/)?.[1] ?? "");
  if (meta) return meta;
  const videoId =
    html.match(/<link rel="canonical" href="https:\/\/www\.youtube\.com\/watch\?v=([\w-]{11})"/)?.[1] ??
    html.match(/"videoId":"([\w-]{11})"/)?.[1];
  if (!videoId) return "";
  try {
    const res = await fetchWithTimeout(
      `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(`https://www.youtube.com/watch?v=${videoId}`)}`,
      { headers: BROWSER_HEADERS },
    );
    if (!res.ok) return "";
    return (await res.json()).title ?? "";
  } catch {
    return "";
  }
}

function decodeHtml(text) {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}

// { live: true/false, title } / null(확인 실패 — 상태를 바꾸지 않음)
async function checkIsLive(alert) {
  switch (alert.platform) {
    case "youtube": return checkYouTubeLive(alert.channelId);
    case "chzzk": return checkChzzkLive(alert.channelId);
    case "soop": return checkSoopLive(alert.channelId);
    default: return null;
  }
}
// 방송이 잠깐 끊겼다 다시 켜질 때 "방송 시작" 알림이 또 가지 않게, 이만큼 연속으로 꺼져 있어야 끝난 것으로 본다(5분 간격 → 10분).
const OFFLINE_CONFIRM_CHECKS = 2;

function buildLiveUrl(alert) {
  if (alert.platform === "youtube") {
    return alert.channelId.startsWith("@")
      ? `https://www.youtube.com/${alert.channelId}/live`
      : `https://www.youtube.com/channel/${alert.channelId}/live`;
  }
  return alert.channelLink;
}

// 라이브 알림 문구: {name} 채널명, {title} 방송 제목, {url} 방송 링크.
// {url}을 안 쓰면 링크를 맨 뒤에 붙인다(디스코드가 링크 아래에 방송 제목이 담긴 카드를 자동으로 보여 준다).
// {title}은 쓴 사람만 문구 안에 넣는다(카드에 제목이 이미 나오므로 따로 붙이지 않는다).
function buildNotificationContent(alert, info = {}) {
  const liveUrl = buildLiveUrl(alert);
  const parts = [];
  if (alert.mention !== "none") parts.push(`@${alert.mention}`);
  const text = (alert.customText || "{name}님이 방송을 시작했습니다! 🎉")
    .replace(/{name}/g, alert.channelName)
    .replace(/{title}/g, info.title || "방송")
    .replace(/{url}/g, liveUrl);
  parts.push(text);
  if (!alert.customText?.includes("{url}")) {
    parts.push(liveUrl);
  }
  return parts.join("\n");
}

// 알림 전송. 디스코드 응답이 15초 안에 안 오면 discord.js가 같은 요청을 최대 3번 다시 보내는데,
// 그때 메시지가 이미 올라가 있으면 같은 알림이 15초 간격으로 4번까지 올라간다(2026-11-22 실제 발생).
// nonce + enforceNonce를 주면 디스코드가 몇 분 안에 같은 nonce로 온 요청을 새 메시지로 만들지 않는다.
// 같은 알림·같은 영상이면 nonce도 같게 만들어, 확인이 겹쳐 돌아도 한 번만 올라가게 한다.
function sendAlertOnce(channel, content, key) {
  const nonce = crypto.createHash("sha1").update(key).digest("base64url").slice(0, 25);
  return channel.send({ content, nonce, enforceNonce: true });
}

let checking = false;
let selfCheckDone = false;

// 봇이 켜질 때 한 번, 호스팅 서버에서 유튜브를 실제로 읽을 수 있는지 로그로 남긴다.
// (데이터센터 IP는 유튜브가 봇 확인 페이지를 줄 수 있는데, 그러면 영상 페이지가 "wait"만 나와 업로드 알림이 막힌다.)
async function runSelfCheck(data) {
  const alerts = Object.values(data).flat();
  const upload = alerts.find((a) => a.platform === "youtube_upload");
  const live = alerts.find((a) => a.platform === "youtube" && a.channelId.startsWith("UC"));
  const parts = [];
  if (upload) {
    const entries = await checkYouTubeUpload(upload.channelId);
    parts.push(`RSS ${entries.length}개`);
    if (entries[0]) {
      parts.push(`영상 페이지 ${await classifyByWatchPage(entries[0].videoId)}`);
      parts.push(`채널 탭 ${await classifyByChannelTabs(entries[0].videoId, upload.channelId)}`);
    }
  }
  if (live) parts.push(`라이브(등록 채널) ${JSON.stringify(await checkYouTubeLive(live.channelId))}`);
  // 늘 방송 중인 공개 채널(Lofi Girl)로 서버에서 "방송 중" 감지가 되는지도 본다.
  parts.push(`라이브(상시 방송 채널) ${JSON.stringify(await checkYouTubeLive("UCSJ4gkVC6NrvII8umztf0Ow"))}`);
  if (parts.length) console.log(`[방송알림] 시작 점검(유튜브 읽기): ${parts.join(", ")}`);
}
const warnedAlerts = new Set(); // 같은 경고를 5분마다 되풀이해 찍지 않게

async function checkAllStreams(client) {
  // 한 바퀴가 5분보다 오래 걸려도 다음 확인이 겹쳐 돌지 않게 한다(겹치면 둘 다 새 영상으로 보고 알린다).
  if (checking) return;
  checking = true;
  try {
    await checkAllStreamsOnce(client);
  } finally {
    checking = false;
  }
}

async function checkAllStreamsOnce(client) {
  const data = load();
  if (!selfCheckDone) {
    selfCheckDone = true;
    await runSelfCheck(data).catch((err) => console.error("[방송알림] 시작 점검 실패:", err?.message ?? err));
  }
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
          const waiting = { ...(alert.uploadWaits ?? {}) }; // 영상 ID → "wait" 이어진 횟수

          // 처음 보는 영상만 추출
          const newEntries = entries.filter((e) => !seenIds.has(e.videoId));
          const done = entries.filter((e) => seenIds.has(e.videoId)).map((e) => e.videoId);

          for (const entry of newEntries) {
            // 라이브 방송(다시보기 포함)은 건너뛰고, 공개 전 프리미어·읽기 실패는 다음 확인 때 다시 본다.
            const kind = await classifyUploadVideo(entry.videoId, alert.channelId);
            if (kind === "upcoming") continue;
            if (kind === "wait" && (waiting[entry.videoId] ?? 0) + 1 < UPLOAD_WAIT_MAX) {
              waiting[entry.videoId] = (waiting[entry.videoId] ?? 0) + 1;
              if (waiting[entry.videoId] === 1) console.warn(`[방송알림] ${alert.channelName} 새 영상 ${entry.videoId}: 영상 페이지를 읽지 못해 5분 뒤 다시 확인합니다.`);
              continue;
            }
            if (kind === "wait") console.warn(`[방송알림] ${alert.channelName} 새 영상 ${entry.videoId}: 1시간 동안 영상 페이지를 읽지 못해 알림을 보내지 않고 넘깁니다.`);
            delete waiting[entry.videoId];
            done.push(entry.videoId);
            // 본 목록에 먼저 넣고 보낸다(보내는 중 오류가 나도 같은 영상을 다시 알리지 않게).
            addSeenVideoIds(guildId, alert.id, [entry.videoId]);
            if (kind !== "notify") continue;

            const guild = client.guilds.cache.get(guildId);
            const channel = guild?.channels.cache.get(alert.notifChannelId);
            if (channel?.isTextBased()) {
              await sendAlertOnce(channel, buildUploadNotificationContent(alert, entry), `${alert.id}:upload:${entry.videoId}`);
            }
          }
          // 피드에서 사라진 대기 영상은 지운다.
          for (const id of Object.keys(waiting)) if (!entries.some((e) => e.videoId === id)) delete waiting[id];
          addSeenVideoIds(guildId, alert.id, done);
          if (JSON.stringify(waiting) !== JSON.stringify(alert.uploadWaits ?? {})) updateAlert(guildId, alert.id, { uploadWaits: waiting });
        } else {
          if (alert.platform === "youtube" && alert.channelId.startsWith("@")) {
            // 예전에 핸들(@...)로 저장된 라이브 알림은 핸들이 바뀌면 끊기므로, 바뀌지 않는 채널 ID(UC...)로 옮긴다.
            const resolved = await resolveYouTubeChannelId(alert.channelId);
            if (resolved) {
              updateAlert(guildId, alert.id, { channelId: resolved });
              alert.channelId = resolved;
            } else if (!warnedAlerts.has(alert.id)) {
              warnedAlerts.add(alert.id);
              console.warn(`[방송알림] ${guildId} ${alert.channelId}: 유튜브 핸들을 찾을 수 없습니다(바뀌었거나 삭제됨).`);
            }
          }
          // 라이브 방송 알림: 꺼짐→켜짐으로 바뀔 때 1회만 보낸다. 확인 실패(null)는 상태를 바꾸지 않는다.
          const result = await checkIsLive(alert);
          if (result === null) continue;
          const live = result.live;
          if (live) {
            if (!alert.isLive) {
              setLiveStatus(guildId, alert.id, true);
              const guild = client.guilds.cache.get(guildId);
              const channel = guild?.channels.cache.get(alert.notifChannelId);
              if (channel?.isTextBased()) {
                await sendAlertOnce(channel, buildNotificationContent(alert, result), `${alert.id}:live:${Date.now()}`);
              }
            }
            if (alert.offlineChecks) updateAlert(guildId, alert.id, { offlineChecks: 0 });
          } else if (alert.isLive) {
            const offlineChecks = (alert.offlineChecks ?? 0) + 1;
            updateAlert(guildId, alert.id, offlineChecks >= OFFLINE_CONFIRM_CHECKS ? { isLive: false, offlineChecks: 0 } : { offlineChecks });
          }
        }
      } catch (err) {
        console.error(`[방송알림] ${guildId} ${alert.platform} ${alert.channelId} 확인 실패:`, err?.message ?? err);
      }
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
