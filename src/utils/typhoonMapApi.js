// 태풍 위치도 — CartoDB 지도 타일 위에 태풍 위치·이동 방향 합성
// (강수 레이더가 아닌 위치 추적 지도)

const { createCanvas, loadImage, GlobalFonts } = require("@napi-rs/canvas");
const { boldBase64, regularBase64 } = require("../assets/fontData");

GlobalFonts.register(Buffer.from(boldBase64,    "base64"), "Plex Bold");
GlobalFonts.register(Buffer.from(regularBase64, "base64"), "Plex Regular");

// zoom 5: 한반도·일본·중국 동부·서태평양 커버
// x 26-28 = 112.5°E ~ 146.25°E / y 11-13 = ~46°N ~ ~22°N
const ZOOM  = 5;
const TX    = [26, 27, 28];
const TY    = [11, 12, 13];
const TS    = 512;
const N     = 2 ** ZOOM; // 32
const IMG_W = TS * TX.length; // 1536
const IMG_H = TS * TY.length; // 1536
const OUT_W = 900;
const OUT_H = 900;

// Web Mercator: lat/lon → 캔버스 픽셀 (타일 그리드 기준)
function llToPx(lat, lon) {
  const xf    = (lon + 180) / 360 * N;
  const latR  = lat * Math.PI / 180;
  const yf    = (1 - Math.log(Math.tan(latR) + 1 / Math.cos(latR)) / Math.PI) / 2 * N;
  return { x: (xf - TX[0]) * TS, y: (yf - TY[0]) * TS };
}

async function safeTile(url) {
  try {
    const ctrl = new AbortController();
    const t    = setTimeout(() => ctrl.abort(), 8000);
    const res  = await fetch(url, {
      signal:  ctrl.signal,
      headers: { "User-Agent": "ChiyumiBot/1.0" },
    });
    clearTimeout(t);
    if (!res.ok) return null;
    return loadImage(Buffer.from(await res.arrayBuffer()));
  } catch { return null; }
}

function intensityColor(windKt) {
  if (windKt >= 100) return "#ff2222";
  if (windKt >= 64)  return "#ff8800";
  if (windKt >= 34)  return "#ffdd00";
  return "#44aaff";
}

function drawArrow(ctx, x1, y1, x2, y2, color) {
  const dx  = x2 - x1, dy = y2 - y1;
  const len = Math.hypot(dx, dy);
  if (len < 8) return;
  const ux  = dx / len, uy = dy / len;
  const hl  = 20, hw = 12;

  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth   = 4;
  ctx.shadowColor = color;
  ctx.shadowBlur  = 10;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2 - ux * hl, y2 - uy * hl);
  ctx.stroke();

  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - ux * hl - uy * hw, y2 - uy * hl + ux * hw);
  ctx.lineTo(x2 - ux * hl + uy * hw, y2 - uy * hl - ux * hw);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

// 지도에 표시할 참조 도시
const CITIES = [
  { name: "서울", lat: 37.5, lon: 126.9, color: "#e1aa74" },
  { name: "도쿄", lat: 35.7, lon: 139.7, color: "#aaaaee" },
  { name: "상하이", lat: 31.2, lon: 121.5, color: "#aaaaee" },
  { name: "마닐라", lat: 14.6, lon: 121.0, color: "#aaaaee" },
];

const LEGEND = [
  { color: "#ff2222", label: "매우 강한 태풍 이상" },
  { color: "#ff8800", label: "강한 태풍 (64kt+)" },
  { color: "#ffdd00", label: "태풍 (34kt+)" },
  { color: "#44aaff", label: "열대폭풍 / 저압부" },
];

async function buildTyphoonMapImage(typhoons) {
  // 1. 지도 타일 병렬 다운로드
  const coords = [];
  for (const y of TY) for (const x of TX) coords.push([x, y]);

  const tiles = await Promise.all(
    coords.map(([x, y]) =>
      safeTile(`https://basemaps.cartocdn.com/dark_all/${ZOOM}/${x}/${y}.png`)
    )
  );

  // 2. 메인 캔버스
  const canvas = createCanvas(IMG_W, IMG_H);
  const ctx    = canvas.getContext("2d");

  ctx.fillStyle = "#111827";
  ctx.fillRect(0, 0, IMG_W, IMG_H);

  coords.forEach(([x, y], i) => {
    if (!tiles[i]) return;
    const xi = TX.indexOf(x);
    const yi = TY.indexOf(y);
    ctx.drawImage(tiles[i], xi * TS, yi * TS, TS, TS);
  });

  // 3. 참조 도시 마커
  for (const city of CITIES) {
    const p = llToPx(city.lat, city.lon);
    if (p.x < -20 || p.x > IMG_W + 20 || p.y < -20 || p.y > IMG_H + 20) continue;

    ctx.save();
    ctx.fillStyle   = city.color;
    ctx.shadowColor = city.color;
    ctx.shadowBlur  = 8;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.fillStyle = city.color;
    ctx.font      = "bold 22px 'Plex Bold'";
    ctx.fillText(city.name, p.x + 10, p.y + 7);
  }

  // 4. 태풍 마커 + 이동 화살표
  for (const t of typhoons) {
    const cur = llToPx(t.lat, t.lon);
    const col = intensityColor(t.windKt);
    const R   = 26;

    // 24시간 후 예상 위치 화살표 (4 × 6시간 간격)
    const STEPS = 4;
    const futLat = t.lat + (t.latTrend ?? 0) * STEPS;
    const futLon = t.lon + (t.lonTrend ?? 0) * STEPS;
    const fut    = llToPx(futLat, futLon);
    drawArrow(ctx, cur.x, cur.y, fut.x, fut.y, col);

    // 태풍 원 (글로우 효과)
    ctx.save();
    ctx.strokeStyle = col;
    ctx.lineWidth   = 5;
    ctx.shadowColor = col;
    ctx.shadowBlur  = 24;
    ctx.beginPath();
    ctx.arc(cur.x, cur.y, R, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // 내부 반투명 채우기
    ctx.fillStyle = col + "33";
    ctx.beginPath();
    ctx.arc(cur.x, cur.y, R, 0, Math.PI * 2);
    ctx.fill();

    // 이름 + 강도 레이블
    const label = t.name ?? "무명";
    ctx.fillStyle = "#ffffff";
    ctx.font      = "bold 26px 'Plex Bold'";
    ctx.fillText(label, cur.x + R + 8, cur.y);
    ctx.fillStyle = col;
    ctx.font      = "20px 'Plex Regular'";
    ctx.fillText(t.intensity, cur.x + R + 8, cur.y + 24);
  }

  // 5. 태풍 없을 때 안내
  if (!typhoons.length) {
    ctx.fillStyle = "rgba(0,0,0,0.65)";
    const bw = 520, bh = 72;
    ctx.fillRect(IMG_W / 2 - bw / 2, IMG_H / 2 - bh / 2, bw, bh);
    ctx.fillStyle = "#57f287";
    ctx.font      = "bold 36px 'Plex Bold'";
    ctx.textAlign = "center";
    ctx.fillText("활동 중인 태풍 없음 😸", IMG_W / 2, IMG_H / 2 + 14);
    ctx.textAlign = "left";
  }

  // 6. 범례
  const LX = 20, LY = IMG_H - 24 - LEGEND.length * 40 - 38;
  ctx.fillStyle = "rgba(0,0,0,0.7)";
  ctx.fillRect(LX - 10, LY - 36, 270, LEGEND.length * 40 + 48);
  ctx.fillStyle = "#aaaaaa";
  ctx.font      = "bold 22px 'Plex Bold'";
  ctx.fillText("태풍 강도", LX, LY - 10);
  LEGEND.forEach(({ color, label }, i) => {
    const y = LY + i * 40 + 28;
    ctx.save();
    ctx.fillStyle   = color;
    ctx.shadowColor = color;
    ctx.shadowBlur  = 8;
    ctx.beginPath();
    ctx.arc(LX + 10, y - 8, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = "#dddddd";
    ctx.font      = "20px 'Plex Regular'";
    ctx.fillText(label, LX + 28, y);
  });

  // 7. 하단 정보 바
  const now    = new Date(Date.now() + 9 * 60 * 60 * 1000);
  const pad    = (n) => String(n).padStart(2, "0");
  const timeStr = `${now.getUTCMonth() + 1}/${now.getUTCDate()} ${pad(now.getUTCHours())}:${pad(now.getUTCMinutes())} KST`;

  ctx.fillStyle = "rgba(0,0,0,0.75)";
  ctx.fillRect(0, IMG_H - 46, IMG_W, 46);
  ctx.fillStyle = "#e1aa74";
  ctx.font      = "bold 28px 'Plex Bold'";
  ctx.textAlign = "left";
  ctx.fillText("🌀 태풍 위치도", 20, IMG_H - 12);
  ctx.fillStyle = "#cccccc";
  ctx.font      = "22px 'Plex Regular'";
  ctx.textAlign = "center";
  ctx.fillText(timeStr, IMG_W / 2, IMG_H - 12);
  ctx.fillStyle = "#666666";
  ctx.font      = "18px 'Plex Regular'";
  ctx.textAlign = "right";
  ctx.fillText("© CARTO · IBTrACS (NOAA)", IMG_W - 20, IMG_H - 12);

  // 8. 900×900 리사이즈
  const out  = createCanvas(OUT_W, OUT_H);
  const octx = out.getContext("2d");
  octx.drawImage(canvas, 0, 0, IMG_W, IMG_H, 0, 0, OUT_W, OUT_H);
  return out.encode("png");
}

module.exports = { buildTyphoonMapImage };
