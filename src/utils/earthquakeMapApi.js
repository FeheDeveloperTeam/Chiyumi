// 기상청 지진정보 조회서비스 (공공데이터포털 KMA_API_KEY)
// 최근 30일 지진 발생 위치를 CartoDB 지도 위에 표시

const { createCanvas, loadImage, GlobalFonts } = require("@napi-rs/canvas");
const { boldBase64, regularBase64 } = require("../assets/fontData");
const { getRecentEarthquakes } = require("./earthquakeApi");

GlobalFonts.register(Buffer.from(boldBase64,    "base64"), "Plex Bold");
GlobalFonts.register(Buffer.from(regularBase64, "base64"), "Plex Regular");

// zoom 6, 한반도 주변 (레이더와 동일 범위)
const ZOOM   = 6;
const TILE_W = [53, 54, 55];
const TILE_H = [23, 24, 25];
const TS     = 512;
const N      = 2 ** ZOOM;
const IMG_W  = TS * TILE_W.length;
const IMG_H  = TS * TILE_H.length;
const OUT_W  = 900;
const OUT_H  = 900;

function llToPx(lat, lon) {
  const xf   = (lon + 180) / 360 * N;
  const latR = lat * Math.PI / 180;
  const yf   = (1 - Math.log(Math.tan(latR) + 1 / Math.cos(latR)) / Math.PI) / 2 * N;
  return { x: (xf - TILE_W[0]) * TS, y: (yf - TILE_H[0]) * TS };
}

function magColor(mag) {
  if (mag >= 5.0) return "#ff2222";
  if (mag >= 4.0) return "#ff6600";
  if (mag >= 3.0) return "#ffaa00";
  if (mag >= 2.0) return "#ffee00";
  return "#88ccff";
}

function magRadius(mag) {
  return Math.max(8, Math.min(36, mag * 7));
}

function fmtDate(d) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
}

async function fetchKmaEarthquakes() {
  const key     = process.env.KMA_API_KEY ?? "";
  const today   = new Date();
  const past30  = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const url = `https://apis.data.go.kr/1360000/EqkInfoService/getEqkInfoList` +
              `?serviceKey=${encodeURIComponent(key)}` +
              `&pageNo=1&numOfRows=100&dataType=JSON` +
              `&startDt=${fmtDate(past30)}&endDt=${fmtDate(today)}`;

  console.log("[지진지도] KMA API 호출");
  const ctrl = new AbortController();
  const t    = setTimeout(() => ctrl.abort(), 10000);
  const res  = await fetch(url, { signal: ctrl.signal, headers: { "User-Agent": "ChiyumiBot/1.0" } });
  clearTimeout(t);

  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    console.log("[지진지도] KMA 비JSON 응답 (HTTP", res.status, "):", text.slice(0, 120));
    throw new Error(`KMA 비JSON 응답: ${text.slice(0, 80)}`);
  }
  if (!res.ok) {
    console.log("[지진지도] KMA HTTP 오류:", res.status, JSON.stringify(json).slice(0, 120));
    throw new Error(`KMA HTTP ${res.status}`);
  }
  console.log("[지진지도] KMA 응답 코드:", json?.response?.header?.resultCode);

  const items = json?.response?.body?.items?.item ?? [];
  const list  = Array.isArray(items) ? items : [items]; // 1건이면 객체로 오는 경우 대비

  return list.map((item) => ({
    lat:  parseFloat(item.lat),
    lon:  parseFloat(item.lon),
    mag:  parseFloat(item.mag),
    dep:  parseFloat(item.dep ?? 0),
    loc:  item.loc ?? "",
    time: item.tmEqk ?? "", // YYYYMMDDHHMMSS
  })).filter((e) => !isNaN(e.lat) && !isNaN(e.lon) && e.mag >= 1.0);
}

async function safeTile(url) {
  try {
    const ctrl = new AbortController();
    const t    = setTimeout(() => ctrl.abort(), 8000);
    const res  = await fetch(url, { signal: ctrl.signal, headers: { "User-Agent": "ChiyumiBot/1.0" } });
    clearTimeout(t);
    if (!res.ok) return null;
    return loadImage(Buffer.from(await res.arrayBuffer()));
  } catch { return null; }
}

async function buildEarthquakeMapImage() {
  // 1. 지진 데이터: KMA 우선, 실패 시 USGS fallback
  let quakes = [];
  let dataSource = "기상청";

  try {
    quakes = await fetchKmaEarthquakes();
    console.log(`[지진지도] KMA ${quakes.length}건 로드`);
  } catch (e) {
    console.log("[지진지도] KMA 실패:", e?.message);
  }

  if (!quakes.length) {
    try {
      const usgs = await getRecentEarthquakes();
      quakes = usgs
        .filter((q) => q.lat != null && q.lon != null)
        .map((q) => ({
          lat:  q.lat,
          lon:  q.lon,
          mag:  q.magnitude,
          dep:  q.depth,
          loc:  q.place,
          time: String(q.time),
        }));
      if (quakes.length) dataSource = "USGS";
      console.log(`[지진지도] USGS fallback ${quakes.length}건`);
    } catch (e) {
      console.log("[지진지도] USGS fallback 실패:", e?.message);
    }
  }

  // 2. 지도 타일
  const coords = [];
  for (const y of TILE_H) for (const x of TILE_W) coords.push([x, y]);

  const tiles = await Promise.all(
    coords.map(([x, y]) =>
      safeTile(`https://basemaps.cartocdn.com/dark_all/${ZOOM}/${x}/${y}.png`)
    )
  );

  // 3. 캔버스
  const canvas = createCanvas(IMG_W, IMG_H);
  const ctx    = canvas.getContext("2d");
  ctx.fillStyle = "#111827";
  ctx.fillRect(0, 0, IMG_W, IMG_H);

  coords.forEach(([x, y], i) => {
    if (!tiles[i]) return;
    const xi = TILE_W.indexOf(x), yi = TILE_H.indexOf(y);
    ctx.drawImage(tiles[i], xi * TS, yi * TS, TS, TS);
  });

  // 4. 지진 마커 (작은 것 먼저 → 큰 것 위에)
  const sorted = [...quakes].sort((a, b) => a.mag - b.mag);
  for (const q of sorted) {
    const p = llToPx(q.lat, q.lon);
    if (p.x < -40 || p.x > IMG_W + 40 || p.y < -40 || p.y > IMG_H + 40) continue;

    const col = magColor(q.mag);
    const r   = magRadius(q.mag);

    ctx.save();
    ctx.fillStyle   = col + "55";
    ctx.strokeStyle = col;
    ctx.lineWidth   = 2;
    ctx.shadowColor = col;
    ctx.shadowBlur  = 12;
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // M3.0 이상은 라벨 표시
    if (q.mag >= 3.0) {
      ctx.fillStyle = "#ffffff";
      ctx.font      = "bold 18px 'Plex Bold'";
      ctx.fillText(`M${q.mag.toFixed(1)}`, p.x + r + 4, p.y + 6);
    }
  }

  // 5. 지진 없을 때
  if (!quakes.length) {
    ctx.fillStyle = "rgba(0,0,0,0.65)";
    ctx.fillRect(IMG_W / 2 - 300, IMG_H / 2 - 36, 600, 72);
    ctx.fillStyle = "#57f287";
    ctx.font      = "bold 34px 'Plex Bold'";
    ctx.textAlign = "center";
    ctx.fillText("최근 30일 지진 없음 😸", IMG_W / 2, IMG_H / 2 + 13);
    ctx.textAlign = "left";
  }

  // 6. 범례
  const LEGEND = [
    { color: "#ff2222", label: "M5.0 이상" },
    { color: "#ff6600", label: "M4.0 이상" },
    { color: "#ffaa00", label: "M3.0 이상" },
    { color: "#ffee00", label: "M2.0 이상" },
    { color: "#88ccff", label: "M1.0 이상" },
  ];
  const LX = 20, LY = IMG_H - 46 - LEGEND.length * 38 - 44;
  ctx.fillStyle = "rgba(0,0,0,0.7)";
  ctx.fillRect(LX - 10, LY - 36, 220, LEGEND.length * 38 + 48);
  ctx.fillStyle = "#aaaaaa";
  ctx.font      = "bold 22px 'Plex Bold'";
  ctx.fillText("규모 기준", LX, LY - 10);
  LEGEND.forEach(({ color, label }, i) => {
    const y = LY + i * 38 + 26;
    ctx.save();
    ctx.fillStyle = color; ctx.shadowColor = color; ctx.shadowBlur = 8;
    ctx.beginPath(); ctx.arc(LX + 9, y - 7, 8, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    ctx.fillStyle = "#dddddd";
    ctx.font      = "19px 'Plex Regular'";
    ctx.fillText(label, LX + 26, y);
  });

  // 7. 하단 정보 바
  const now    = new Date(Date.now() + 9 * 60 * 60 * 1000);
  const pad    = (n) => String(n).padStart(2, "0");
  const nowStr = `${now.getUTCMonth() + 1}/${now.getUTCDate()} ${pad(now.getUTCHours())}:${pad(now.getUTCMinutes())} KST`;

  ctx.fillStyle = "rgba(0,0,0,0.75)";
  ctx.fillRect(0, IMG_H - 46, IMG_W, 46);
  ctx.fillStyle = "#e1aa74";
  ctx.font      = "bold 28px 'Plex Bold'";
  ctx.textAlign = "left";
  ctx.fillText("🔴 지진 발생 현황 (최근 30일)", 20, IMG_H - 12);
  ctx.fillStyle = "#cccccc";
  ctx.font      = "20px 'Plex Regular'";
  ctx.textAlign = "right";
  ctx.fillText(`기준: ${nowStr} · 출처: ${dataSource} · CARTO`, IMG_W - 20, IMG_H - 12);

  // 8. 리사이즈
  const out  = createCanvas(OUT_W, OUT_H);
  const octx = out.getContext("2d");
  octx.drawImage(canvas, 0, 0, IMG_W, IMG_H, 0, 0, OUT_W, OUT_H);
  return out.encode("png");
}

module.exports = { buildEarthquakeMapImage };
