// 레이더·지진·태풍 지도 공용 배경 지도
// CARTO 무료 타일(basemaps.cartocdn.com)이 API 키를 요구하도록 바뀌어 "API KEY REQUIRED" 타일만 내려왔다.
// 외부 지도 서비스에 기대지 않도록 Natural Earth 1:10m(퍼블릭 도메인) 해안선·국경을 직접 그린다.
// 데이터: src/assets/eastAsiaMap.json — 경도 110~149°, 위도 20~50° 범위만 잘라 단순화한 것.
//   land: 육지 폴리곤 [lon, lat, lon, lat, ...], borders: 육상 국경선 같은 형식.

const MAP = require("../assets/eastAsiaMap.json");

// 폴리곤마다 경계 상자를 미리 계산해 화면 밖 도형은 건너뛴다.
function withBounds(flat) {
  let w = Infinity, e = -Infinity, s = Infinity, n = -Infinity;
  for (let i = 0; i < flat.length; i += 2) {
    const lon = flat[i], lat = flat[i + 1];
    if (lon < w) w = lon; if (lon > e) e = lon;
    if (lat < s) s = lat; if (lat > n) n = lat;
  }
  return { flat, w, e, s, n };
}
const LAND    = MAP.land.map(withBounds);
const BORDERS = MAP.borders.map(withBounds);

// Web Mercator 타일 격자(zoom, 왼쪽 위 타일 x0/y0, 타일 한 변 ts 픽셀) 기준 위경도 → 캔버스 픽셀
function makeProjector({ zoom, x0, y0, ts }) {
  const n = 2 ** zoom;
  return (lon, lat) => {
    const rad = (lat * Math.PI) / 180;
    const tx  = ((lon + 180) / 360) * n;
    const ty  = ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * n;
    return [(tx - x0) * ts, (ty - y0) * ts];
  };
}

function inverseLat(ty, n) {
  return (Math.atan(Math.sinh(Math.PI * (1 - (2 * ty) / n))) * 180) / Math.PI;
}

function tracePath(ctx, flat, project, close) {
  ctx.beginPath();
  for (let i = 0; i < flat.length; i += 2) {
    const [x, y] = project(flat[i], flat[i + 1]);
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  if (close) ctx.closePath();
}

/**
 * 바다·육지·해안선·국경을 그린다.
 * grid: { zoom, x0, y0, ts, cols, rows } — 캔버스가 덮는 타일 격자
 */
function drawBaseMap(ctx, grid, { lineScale = 1 } = {}) {
  const { zoom, x0, y0, ts, cols, rows } = grid;
  const n       = 2 ** zoom;
  const project = makeProjector(grid);
  const view = {
    w: (x0 / n) * 360 - 180,
    e: ((x0 + cols) / n) * 360 - 180,
    n: inverseLat(y0, n),
    s: inverseLat(y0 + rows, n),
  };
  const visible = (b) => b.e >= view.w && b.w <= view.e && b.n >= view.s && b.s <= view.n;
  const land    = LAND.filter(visible);

  ctx.save();
  ctx.fillStyle = "#0f1722";               // 바다
  ctx.fillRect(0, 0, cols * ts, rows * ts);

  ctx.fillStyle = "#262c36";               // 육지
  for (const p of land) { tracePath(ctx, p.flat, project, true); ctx.fill(); }

  ctx.strokeStyle = "#566273";             // 해안선
  ctx.lineWidth   = 2 * lineScale;
  ctx.lineJoin    = "round";
  for (const p of land) { tracePath(ctx, p.flat, project, true); ctx.stroke(); }

  ctx.strokeStyle = "#7a8698";             // 국경
  ctx.lineWidth   = 2 * lineScale;
  ctx.setLineDash([10 * lineScale, 8 * lineScale]);
  for (const b of BORDERS.filter(visible)) { tracePath(ctx, b.flat, project, false); ctx.stroke(); }
  ctx.restore();
}

module.exports = { drawBaseMap, makeProjector };
