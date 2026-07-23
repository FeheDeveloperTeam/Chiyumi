// RainViewer 레이더 + CartoDB 지도 타일 합성
// RainViewer 타일은 cors.eu.org 프록시 경유 (tilecache.rainviewer.com 서버 직접 접근 불가)

const { createCanvas, loadImage, GlobalFonts } = require("@napi-rs/canvas");
const { boldBase64, regularBase64 } = require("../assets/fontData");

GlobalFonts.register(Buffer.from(boldBase64,    "base64"), "Plex Bold");
GlobalFonts.register(Buffer.from(regularBase64, "base64"), "Plex Regular");

const ZOOM   = 6;
const TILE_W = [53, 54, 55]; // 서→동 (~118°E~135°E)
const TILE_H = [23, 24, 25]; // 북→남 (~40°N~28°N)
const TS     = 512;
const IMG_W  = TS * TILE_W.length; // 1536
const IMG_H  = TS * TILE_H.length; // 1536
const OUT_W  = 900;
const OUT_H  = 900;

// RainViewer 타일은 프록시 경유 (직접 접근 차단됨)
const PROXIES = [
  "https://cors.eu.org/",
  "https://proxy.cors.sh/",
];

function proxyUrl(directUrl) {
  return PROXIES[0] + directUrl;
}

async function safeTile(url, label) {
  try {
    const ctrl = new AbortController();
    const t    = setTimeout(() => ctrl.abort(), 12000);
    const res  = await fetch(url, {
      signal:  ctrl.signal,
      headers: {
        "User-Agent": "ChiyumiBot/1.0",
        "x-requested-with": "ChiyumiBot",
      },
    });
    clearTimeout(t);
    if (!res.ok) {
      console.log(`[레이더] 타일 ${label} HTTP ${res.status}`);
      return null;
    }
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 200) {
      console.log(`[레이더] 타일 ${label} 너무 작음 (${buf.length}bytes)`);
      return null;
    }
    return loadImage(buf);
  } catch (e) {
    console.log(`[레이더] 타일 ${label} 실패: ${e?.message}`);
    return null;
  }
}

function kstLabel(unixSec) {
  const d   = new Date(unixSec * 1000 + 9 * 60 * 60 * 1000);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getUTCMonth() + 1}/${d.getUTCDate()} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())} KST`;
}

async function buildRadarImage() {
  // 1. RainViewer 메타데이터 — 직접 시도 후 프록시 fallback
  let radarBaseUrl = null;
  let radarTime    = null;

  const META_URL = "https://api.rainviewer.com/public/weather-maps.json";
  const metaUrls = [META_URL, proxyUrl(META_URL)];

  for (const url of metaUrls) {
    try {
      const ctrl = new AbortController();
      const t    = setTimeout(() => ctrl.abort(), 8000);
      const meta = await fetch(url, {
        signal:  ctrl.signal,
        headers: { "User-Agent": "ChiyumiBot/1.0", "x-requested-with": "ChiyumiBot" },
      }).then((r) => r.json());
      clearTimeout(t);

      const host  = meta?.host ?? "https://tilecache.rainviewer.com";
      const past  = meta?.radar?.past ?? [];
      const frame = past[past.length - 1];
      console.log("[레이더] 메타 소스:", url.includes("cors") ? "프록시" : "직접", "| frame:", JSON.stringify(frame));

      if (frame?.path) {
        radarBaseUrl = `${host}${frame.path}`;
        radarTime    = frame.time;
        break;
      }
    } catch (e) {
      console.log("[레이더] 메타 조회 실패:", e?.message, "| url:", url.includes("cors") ? "프록시" : "직접");
    }
  }

  // 2. 타일 좌표 목록
  const coords = [];
  for (const y of TILE_H) for (const x of TILE_W) coords.push([x, y]);

  // 3. CartoDB 베이스맵 (직접) + RainViewer 레이더 (프록시) 병렬 다운로드
  const [baseTiles, radarTiles] = await Promise.all([
    Promise.all(
      coords.map(([x, y]) =>
        safeTile(
          `https://basemaps.cartocdn.com/dark_all/${ZOOM}/${x}/${y}.png`,
          `base(${x},${y})`
        )
      )
    ),
    radarBaseUrl
      ? Promise.all(
          coords.map(([x, y]) =>
            safeTile(
              proxyUrl(`${radarBaseUrl}/512/${ZOOM}/${x}/${y}/6/1_1.png`),
              `radar(${x},${y})`
            )
          )
        )
      : Promise.resolve(coords.map(() => null)),
  ]);

  const radarLoaded = radarTiles.filter(Boolean).length;
  console.log(`[레이더] base=${baseTiles.filter(Boolean).length}/9, radar=${radarLoaded}/9`);

  // 4. 캔버스 합성
  const canvas = createCanvas(IMG_W, IMG_H);
  const ctx    = canvas.getContext("2d");

  ctx.fillStyle = "#111827";
  ctx.fillRect(0, 0, IMG_W, IMG_H);

  coords.forEach(([x, y], i) => {
    const xi = TILE_W.indexOf(x);
    const yi = TILE_H.indexOf(y);
    const dx = xi * TS, dy = yi * TS;

    if (baseTiles[i])  ctx.drawImage(baseTiles[i], dx, dy, TS, TS);

    if (radarTiles[i]) {
      ctx.globalAlpha = 0.85;
      ctx.drawImage(radarTiles[i], dx, dy, TS, TS);
      ctx.globalAlpha = 1.0;
    }
  });

  // 레이더 데이터 없을 때
  if (!radarLoaded) {
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fillRect(IMG_W / 2 - 280, IMG_H / 2 - 36, 560, 72);
    ctx.fillStyle = "#ffdd57";
    ctx.font      = "bold 32px 'Plex Bold'";
    ctx.textAlign = "center";
    ctx.fillText("레이더 데이터 없음", IMG_W / 2, IMG_H / 2 + 12);
    ctx.textAlign = "left";
  }

  // 5. 하단 정보 바
  const timeStr = radarTime ? kstLabel(radarTime) : "시간 불명";

  ctx.fillStyle = "rgba(0,0,0,0.75)";
  ctx.fillRect(0, IMG_H - 46, IMG_W, 46);

  ctx.fillStyle = "#e1aa74";
  ctx.font      = "bold 28px 'Plex Bold'";
  ctx.textAlign = "left";
  ctx.fillText("🌧 강수 레이더", 20, IMG_H - 12);

  ctx.fillStyle = "#cccccc";
  ctx.font      = "22px 'Plex Regular'";
  ctx.textAlign = "center";
  ctx.fillText(timeStr, IMG_W / 2, IMG_H - 12);

  ctx.fillStyle = "#666666";
  ctx.font      = "18px 'Plex Regular'";
  ctx.textAlign = "right";
  ctx.fillText("© CARTO · RainViewer", IMG_W - 20, IMG_H - 12);

  // 6. 900×900 리사이즈
  const out  = createCanvas(OUT_W, OUT_H);
  const octx = out.getContext("2d");
  octx.drawImage(canvas, 0, 0, IMG_W, IMG_H, 0, 0, OUT_W, OUT_H);
  return out.encode("png");
}

module.exports = { buildRadarImage };
