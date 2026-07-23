// IBTrACS ACTIVE — NOAA (무료, API 키 불필요)
// 서태평양(WP) 활동 태풍만 필터링

const IBTRACS_URL =
  "https://www.ncei.noaa.gov/data/international-best-track-archive-for-climate-stewardship-ibtracs" +
  "/v04r00/access/csv/ibtracs.ACTIVE.list.v04r00.csv";

// 서울 위치
const SEOUL = { lat: 37.5, lon: 126.9 };

function distKm(lat1, lon1, lat2, lon2) {
  const R  = 6371;
  const dL = ((lat2 - lat1) * Math.PI) / 180;
  const dO = ((lon2 - lon1) * Math.PI) / 180;
  const a  =
    Math.sin(dL / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dO / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

function classifyIntensity(windKt) {
  if (windKt >= 130) return "초강력 태풍";
  if (windKt >= 100) return "매우 강한 태풍";
  if (windKt >= 64)  return "강한 태풍";
  if (windKt >= 34)  return "태풍";
  if (windKt >= 22)  return "열대폭풍";
  return "열대저압부";
}

async function getActiveTyphoons() {
  const controller = new AbortController();
  const timer      = setTimeout(() => controller.abort(), 12000);

  let text;
  try {
    const res = await fetch(IBTRACS_URL, { signal: controller.signal });
    text = await res.text();
  } finally {
    clearTimeout(timer);
  }

  const lines = text.trim().split("\n");
  if (lines.length < 3) return [];

  // 첫 번째 줄: 헤더, 두 번째 줄: 단위 → 데이터는 세 번째 줄부터
  const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, "").toUpperCase());

  const col = (name) => headers.indexOf(name);
  const I = {
    sid:   col("SID"),
    name:  col("NAME"),
    basin: col("BASIN"),
    lat:   col("LAT"),
    lon:   col("LON"),
    wind:  col("WMO_WIND"),
    time:  col("ISO_TIME"),
  };

  const storms = new Map();

  for (const line of lines.slice(2)) {
    if (!line.trim()) continue;
    const c = line.split(",").map((v) => v.trim().replace(/^"|"$/g, ""));

    if (c[I.basin] !== "WP") continue;

    const lat  = parseFloat(c[I.lat]);
    const lon  = parseFloat(c[I.lon]);
    const wind = parseInt(c[I.wind]) || 0;
    if (isNaN(lat) || isNaN(lon)) continue;

    const sid = c[I.sid];
    if (!storms.has(sid)) {
      storms.set(sid, { name: c[I.name] || "NO-NAME", points: [] });
    }
    storms.get(sid).points.push({ lat, lon, wind, time: c[I.time] });
  }

  const result = [];

  for (const [, storm] of storms) {
    if (!storm.points.length) continue;

    const pts    = storm.points;
    const latest = pts[pts.length - 1];

    // 이동 방향: 마지막 두 관측점 위도 차이
    const latTrend = pts.length >= 2 ? latest.lat - pts[pts.length - 2].lat : 0;

    const dist = distKm(latest.lat, latest.lon, SEOUL.lat, SEOUL.lon);

    // 한국 영향권 판단: 서태평양 북상 중 + 적절한 경도대
    const approaching =
      latTrend > 0 &&
      latest.lat > 10 && latest.lat < 40 &&
      latest.lon > 115 && latest.lon < 145;

    let displayName = storm.name.replace(/^NOT[-_]?NAMED$/i, "무명");
    displayName = displayName.charAt(0) + displayName.slice(1).toLowerCase();

    result.push({
      name:       displayName,
      lat:        latest.lat,
      lon:        latest.lon,
      windKt:     latest.wind,
      windMs:     Math.round(latest.wind * 0.514),
      latTrend,
      movingNorth: latTrend > 0,
      distFromSeoul: dist,
      intensity:  classifyIntensity(latest.wind),
      approaching,
    });
  }

  // 서울에서 가까운 순 정렬
  result.sort((a, b) => a.distFromSeoul - b.distFromSeoul);
  return result;
}

function formatTyphoonResponse(typhoons) {
  if (typhoons.length === 0) {
    return "현재 서태평양에 활동 중인 태풍은 없냥! 😸 안전한 날씨다냥~";
  }

  const blocks = typhoons.map((t) => {
    const dir    = t.movingNorth ? "북상 중 ↑" : t.latTrend < 0 ? "남하 중 ↓" : "정체";
    const danger = t.approaching ? "\n│  ⚠️ **한국 접근 가능성 주의!**" : "";

    return (
      `**🌀 태풍 ${t.name}** (${t.intensity})\n` +
      `├ 위치: 북위 ${t.lat.toFixed(1)}° / 동경 ${t.lon.toFixed(1)}°\n` +
      `├ 최대풍속: ${t.windMs} m/s (${t.windKt}kt)\n` +
      `├ 이동: ${dir}${danger}\n` +
      `└ 서울까지: 약 ${t.distFromSeoul.toLocaleString()}km`
    );
  });

  const anyApproaching = typhoons.some((t) => t.approaching);
  const footer = anyApproaching
    ? "\n\n⚠️ 북상 중인 태풍이 있냥! 기상 예보 계속 확인해달라냥!"
    : "\n\n현재 한국에 직접 영향을 줄 태풍은 없는 것 같냥~";

  return (
    `**현재 서태평양 활동 태풍 현황**\n\n` +
    blocks.join("\n\n") +
    footer +
    "\n\n출처: IBTrACS (NOAA)"
  );
}

module.exports = { getActiveTyphoons, formatTyphoonResponse };
