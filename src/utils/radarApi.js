// RainViewer(레이더) + CartoDB(지도) 타일 합성
// 한반도 + 주변 해역 (zoom 6, 3×3 타일)

const { createCanvas, loadImage } = require("@napi-rs/canvas");

// zoom 6에서 한반도·일본·중국 동부를 포함하는 타일 범위
// lon 118°E~135°E / lat 40°N~28°N 커버
const ZOOM    = 6;
const TILE_W  = [53, 54, 55]; // 서→동
const TILE_H  = [23, 24, 25]; // 북→남
const TS      = 512;           // 타일 픽셀 사이즈

const COLS = TILE_W.length;
const ROWS = TILE_H.length;
const IMG_W = TS * COLS; // 1536
const IMG_H = TS * ROWS; // 1536
const OUT_W = 900;
const OUT_H = 900;

async function safeTile(url) {
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(url, {
      signal:  controller.signal,
      headers: { "User-Agent": "ChiyumiBot/1.0 (Discord weather bot)" },
    });
    clearTimeout(t);
    if (!res.ok) return null;
    return loadImage(Buffer.from(await res.arrayBuffer()));
  } catch {
    return null;
  }
}

function getNowKST() {
  const kst = new Date(Date.now() + 9 * 60 * 60 * 1000);
  const pad = (n) => String(n).padStart(2, "0");
  return `${kst.getUTCMonth() + 1}/${kst.getUTCDate()} ${pad(kst.getUTCHours())}:${pad(kst.getUTCMinutes())} KST`;
}

async function buildRadarImage() {
  // 1. RainViewer 최신 레이더 타임스탬프 조회
  let radarTime;
  try {
    const meta  = await fetch("https://api.rainviewer.com/public/weather-maps.json").then((r) => r.json());
    const past  = meta?.radar?.past ?? [];
    radarTime   = past[past.length - 1]?.time ?? null;
  } catch {
    radarTime = null;
  }

  // 2. 타일 좌표 목록
  const coords = [];
  for (const y of TILE_H) for (const x of TILE_W) coords.push([x, y]);

  // 3. CartoDB 기본지도 + RainViewer 레이더 병렬 다운로드
  const [baseTiles, radarTiles] = await Promise.all([
    Promise.all(
      coords.map(([x, y]) =>
        safeTile(`https://basemaps.cartocdn.com/dark_all/${ZOOM}/${x}/${y}.png`)
      )
    ),
    radarTime
      ? Promise.all(
          coords.map(([x, y]) =>
            safeTile(
              `https://tilecache.rainviewer.com/v2/radar/${radarTime}/512/${ZOOM}/${x}/${y}/2/1_1.png`
            )
          )
        )
      : Promise.resolve(coords.map(() => null)),
  ]);

  // 4. 캔버스 합성 (1536×1536)
  const canvas = createCanvas(IMG_W, IMG_H);
  const ctx    = canvas.getContext("2d");

  // 기본 배경 (지도 타일 로드 실패 시 대비)
  ctx.fillStyle = "#1a1e2e";
  ctx.fillRect(0, 0, IMG_W, IMG_H);

  coords.forEach(([x, y], i) => {
    const xi = TILE_W.indexOf(x);
    const yi = TILE_H.indexOf(y);
    const dx = xi * TS;
    const dy = yi * TS;

    if (baseTiles[i]) ctx.drawImage(baseTiles[i], dx, dy, TS, TS);

    if (radarTiles[i]) {
      ctx.globalAlpha = 0.75;
      ctx.drawImage(radarTiles[i], dx, dy, TS, TS);
      ctx.globalAlpha = 1.0;
    }
  });

  // 5. 그리드 선 (타일 경계 확인용 — 생략 가능)
  // ctx.strokeStyle = "rgba(255,255,255,0.05)"; ...

  // 6. 하단 정보 바
  const barH = 44;
  ctx.fillStyle = "rgba(0, 0, 0, 0.72)";
  ctx.fillRect(0, IMG_H - barH, IMG_W, barH);

  ctx.fillStyle = "#e1aa74";
  ctx.font = "bold 28px sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("🌧 레이더", 24, IMG_H - 12);

  ctx.fillStyle = "#cccccc";
  ctx.font = "22px sans-serif";
  ctx.textAlign = "center";
  const label = radarTime
    ? `${new Date(radarTime * 1000).toLocaleString("ko-KR", { timeZone: "Asia/Seoul", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })} KST`
    : getNowKST() + " (기준시 불명)";
  ctx.fillText(label, IMG_W / 2, IMG_H - 12);

  ctx.fillStyle = "#888888";
  ctx.font = "18px sans-serif";
  ctx.textAlign = "right";
  ctx.fillText("© CARTO · RainViewer", IMG_W - 20, IMG_H - 12);

  // 7. OUT_W × OUT_H 로 리사이즈
  const out    = createCanvas(OUT_W, OUT_H);
  const octx   = out.getContext("2d");
  octx.drawImage(canvas, 0, 0, IMG_W, IMG_H, 0, 0, OUT_W, OUT_H);

  return out.encode("png");
}

module.exports = { buildRadarImage };
