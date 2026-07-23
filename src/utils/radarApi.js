// 기상청 apihub 합성 레이더 이미지 (KMA_API_KEY 사용)
// 실패 시 RainViewer + cors.eu.org 프록시로 fallback

const { createCanvas, loadImage, GlobalFonts } = require("@napi-rs/canvas");
const { boldBase64, regularBase64 } = require("../assets/fontData");

GlobalFonts.register(Buffer.from(boldBase64,    "base64"), "Plex Bold");
GlobalFonts.register(Buffer.from(regularBase64, "base64"), "Plex Regular");

const ZOOM   = 6;
const TILE_W = [53, 54, 55];
const TILE_H = [23, 24, 25];
const TS     = 512;
const IMG_W  = TS * TILE_W.length;
const IMG_H  = TS * TILE_H.length;
const OUT_W  = 900;
const OUT_H  = 900;

const PROXY = "https://cors.eu.org/";

function kstStr(offsetMin = 0) {
  const d   = new Date(Date.now() - offsetMin * 60 * 1000 + 9 * 60 * 60 * 1000);
  const pad = (n) => String(n).padStart(2, "0");
  const m   = Math.floor(d.getUTCMinutes() / 10) * 10;
  return {
    str:   `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}${pad(d.getUTCHours())}${pad(m)}`,
    label: `${d.getUTCMonth() + 1}/${d.getUTCDate()} ${pad(d.getUTCHours())}:${pad(m)} KST`,
  };
}

// ── 1안: 기상청 apihub 단일 이미지 ────────────────────────────
async function fetchKmaRadar() {
  const apiKey = process.env.KMA_API_KEY;
  if (!apiKey) return null;

  for (const offsetMin of [0, 10, 20, 30]) {
    const { str, label } = kstStr(offsetMin);
    const url = `https://apihub.kma.go.kr/api/typ01/url/rdr_cmp_img.php` +
                `?tm=${str}&cmp=WRC&obs=ECHO&color=C4&ef=Y&qpf=N&authKey=${apiKey}`;

    console.log(`[레이더] KMA apihub 시도 (offset ${offsetMin}min) tm=${str}`);
    try {
      const ctrl = new AbortController();
      const t    = setTimeout(() => ctrl.abort(), 10000);
      const res  = await fetch(url, { signal: ctrl.signal, headers: { "User-Agent": "ChiyumiBot/1.0" } });
      clearTimeout(t);

      const ct  = res.headers.get("content-type") ?? "";
      const buf = Buffer.from(await res.arrayBuffer());
      console.log(`[레이더] KMA apihub 응답 ${res.status} ct=${ct} size=${buf.length}`);

      if (res.ok && buf.length > 5000 && (ct.includes("image") || ct.includes("octet"))) {
        return { type: "kma", buf, label };
      }
    } catch (e) {
      console.log(`[레이더] KMA apihub 실패 (offset ${offsetMin}min):`, e?.message);
    }
  }
  return null;
}

// ── 2안: RainViewer 타일 합성 (cors.eu.org 프록시) ───────────
async function safeTile(url, label) {
  try {
    const ctrl = new AbortController();
    const t    = setTimeout(() => ctrl.abort(), 12000);
    const res  = await fetch(url, {
      signal:  ctrl.signal,
      headers: { "User-Agent": "ChiyumiBot/1.0", "x-requested-with": "ChiyumiBot" },
    });
    clearTimeout(t);
    if (!res.ok) { console.log(`[레이더] 타일 ${label} HTTP ${res.status}`); return null; }
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 200) { console.log(`[레이더] 타일 ${label} 너무 작음`); return null; }
    return loadImage(buf);
  } catch (e) {
    console.log(`[레이더] 타일 ${label} 실패:`, e?.message);
    return null;
  }
}

function kstLabel(unixSec) {
  const d   = new Date(unixSec * 1000 + 9 * 60 * 60 * 1000);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getUTCMonth() + 1}/${d.getUTCDate()} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())} KST`;
}

async function fetchRainViewerTiles() {
  const META_URL = "https://api.rainviewer.com/public/weather-maps.json";
  let radarBaseUrl = null, radarTime = null;

  for (const url of [META_URL, PROXY + META_URL]) {
    try {
      const ctrl = new AbortController();
      const t    = setTimeout(() => ctrl.abort(), 8000);
      const meta = await fetch(url, {
        signal: ctrl.signal,
        headers: { "User-Agent": "ChiyumiBot/1.0", "x-requested-with": "ChiyumiBot" },
      }).then((r) => r.json());
      clearTimeout(t);

      const frame = (meta?.radar?.past ?? []).at(-1);
      console.log(`[레이더] RainViewer 메타 (${url.includes("cors") ? "프록시" : "직접"}):`, JSON.stringify(frame));
      if (frame?.path) { radarBaseUrl = `${meta.host}${frame.path}`; radarTime = frame.time; break; }
    } catch (e) {
      console.log(`[레이더] RainViewer 메타 실패:`, e?.message);
    }
  }
  if (!radarBaseUrl) return null;

  const coords = [];
  for (const y of TILE_H) for (const x of TILE_W) coords.push([x, y]);

  const [baseTiles, radarTiles] = await Promise.all([
    Promise.all(coords.map(([x, y]) =>
      safeTile(`https://basemaps.cartocdn.com/dark_all/${ZOOM}/${x}/${y}.png`, `base(${x},${y})`)
    )),
    Promise.all(coords.map(([x, y]) =>
      safeTile(`${PROXY}${radarBaseUrl}/512/${ZOOM}/${x}/${y}/6/1_1.png`, `radar(${x},${y})`)
    )),
  ]);

  const radarLoaded = radarTiles.filter(Boolean).length;
  console.log(`[레이더] base=${baseTiles.filter(Boolean).length}/9, radar=${radarLoaded}/9`);

  return { type: "rainviewer", baseTiles, radarTiles, coords, radarTime, radarLoaded };
}

// ── 캔버스 합성 ───────────────────────────────────────────────
async function buildRadarImage() {
  const canvas = createCanvas(IMG_W, IMG_H);
  const ctx    = canvas.getContext("2d");
  ctx.fillStyle = "#111827";
  ctx.fillRect(0, 0, IMG_W, IMG_H);

  let hasData   = false;
  let timeLabel = "시간 불명";
  let source    = "기상청 (KMA)";

  // 1안: KMA apihub 단일 이미지
  const kma = await fetchKmaRadar();
  if (kma) {
    try {
      const img = await loadImage(kma.buf);
      ctx.drawImage(img, 0, 0, IMG_W, IMG_H);
      timeLabel = kma.label;
      hasData   = true;
      source    = "기상청 (KMA)";
      console.log("[레이더] KMA 이미지 사용");
    } catch (e) {
      console.log("[레이더] KMA 이미지 로드 실패:", e?.message);
    }
  }

  // 2안: RainViewer 타일 합성 (KMA 실패 시)
  if (!hasData) {
    const rv = await fetchRainViewerTiles();
    if (rv) {
      rv.coords.forEach(([x, y], i) => {
        const xi = TILE_W.indexOf(x), yi = TILE_H.indexOf(y);
        const dx = xi * TS, dy = yi * TS;
        if (rv.baseTiles[i])  ctx.drawImage(rv.baseTiles[i], dx, dy, TS, TS);
        if (rv.radarTiles[i]) {
          ctx.globalAlpha = 0.85;
          ctx.drawImage(rv.radarTiles[i], dx, dy, TS, TS);
          ctx.globalAlpha = 1.0;
        }
      });
      if (rv.radarLoaded > 0) {
        hasData   = true;
        timeLabel = rv.radarTime ? kstLabel(rv.radarTime) : "시간 불명";
        source    = "CARTO · RainViewer";
        console.log("[레이더] RainViewer 타일 사용");
      }
    }
  }

  if (!hasData) {
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fillRect(IMG_W / 2 - 280, IMG_H / 2 - 36, 560, 72);
    ctx.fillStyle = "#ffdd57";
    ctx.font      = "bold 32px 'Plex Bold'";
    ctx.textAlign = "center";
    ctx.fillText("레이더 데이터 없음", IMG_W / 2, IMG_H / 2 + 12);
    ctx.textAlign = "left";
  }

  // 강수량 범례
  if (hasData) {
    const LEGEND = [
      { color: "#64c8ff", label: "매우 약한 비  ~1mm/h" },
      { color: "#00c800", label: "약한 비  ~5mm/h" },
      { color: "#f0f000", label: "보통 비  ~10mm/h" },
      { color: "#ff9600", label: "강한 비  ~30mm/h" },
      { color: "#ff0000", label: "매우 강한 비  ~50mm/h" },
      { color: "#c800c8", label: "폭우  80mm/h+" },
    ];
    const LX = 20;
    const LY = IMG_H - 46 - LEGEND.length * 38 - 44;

    ctx.fillStyle = "rgba(0,0,0,0.72)";
    ctx.fillRect(LX - 10, LY - 36, 270, LEGEND.length * 38 + 48);

    ctx.fillStyle = "#aaaaaa";
    ctx.font      = "bold 22px 'Plex Bold'";
    ctx.textAlign = "left";
    ctx.fillText("강수 강도", LX, LY - 10);

    LEGEND.forEach(({ color, label }, i) => {
      const y = LY + i * 38 + 26;
      ctx.fillStyle = color;
      ctx.fillRect(LX, y - 16, 20, 20);
      ctx.fillStyle = "#dddddd";
      ctx.font      = "19px 'Plex Regular'";
      ctx.fillText(label, LX + 28, y);
    });
  }

  // 하단 정보 바
  ctx.fillStyle = "rgba(0,0,0,0.75)";
  ctx.fillRect(0, IMG_H - 46, IMG_W, 46);
  ctx.fillStyle = "#e1aa74";
  ctx.font      = "bold 28px 'Plex Bold'";
  ctx.textAlign = "left";
  ctx.fillText("🌧 강수 레이더", 20, IMG_H - 12);
  ctx.fillStyle = "#cccccc";
  ctx.font      = "22px 'Plex Regular'";
  ctx.textAlign = "center";
  ctx.fillText(timeLabel, IMG_W / 2, IMG_H - 12);
  ctx.fillStyle = "#666666";
  ctx.font      = "18px 'Plex Regular'";
  ctx.textAlign = "right";
  ctx.fillText(`© ${source}`, IMG_W - 20, IMG_H - 12);

  const out  = createCanvas(OUT_W, OUT_H);
  const octx = out.getContext("2d");
  octx.drawImage(canvas, 0, 0, IMG_W, IMG_H, 0, 0, OUT_W, OUT_H);
  return out.encode("png");
}

module.exports = { buildRadarImage };
