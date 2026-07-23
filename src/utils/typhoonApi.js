// IBTrACS ACTIVE — NOAA (무료, API 키 불필요)
// 서태평양(WP) 활동 태풍 중 한반도 주변 3500km 이내만 필터링

const IBTRACS_URL =
  "https://www.ncei.noaa.gov/data/international-best-track-archive-for-climate-stewardship-ibtracs" +
  "/v04r00/access/csv/ibtracs.ACTIVE.list.v04r00.csv";

// 주요 지점
const SEOUL   = { lat: 37.5,  lon: 126.9 };
const JAPAN   = { lat: 34.5,  lon: 137.5 }; // 혼슈 중심
const CHINA   = { lat: 31.0,  lon: 121.5 }; // 상하이 인근

const MAX_DIST_KM = 3500;

// ── 이름 한국어 사전 ───────────────────────────────────────────
const NAMES_KO = {
  // 대한민국 기여
  "GAEMI":     "개미",   "NARI":      "나리",   "JANGMI":    "장미",
  "MIRINAE":   "미리내", "NORU":      "노루",   "GEURUM":    "구름",
  "KONI":      "고니",   "DOKSURI":   "독수리", "GIREOGI":   "기러기",
  "JEBI":      "제비",   "NEOGURI":   "너구리",
  // 북한 기여
  "TORAJI":    "도라지", "PODUL":     "버들",   "KHANUN":    "칸눈",
  "BOLAVEN":   "볼라벤", "SANBA":     "산바",
  // 일본 기여
  "SHANSHAN":  "산산",   "YAGI":      "야기",   "AMPIL":     "암필",
  "WUKONG":    "우쿵",   "USAGI":     "우사기", "FAXAI":     "파사이",
  "HAGIBIS":   "하기비스","MITAG":    "미탁",   "TAPAH":     "타파",
  "KRATHON":   "크라톤", "HAGUPIT":  "하구핏", "SINLAKU":   "신라쿠",
  "ETAU":      "에타우",
  // 캄보디아 기여
  "DAMREY":    "담레이", "NAKRI":     "나크리", "KETSANA":   "켓사나",
  // 중국 기여
  "HAIKUI":    "하이쿠이","YUTU":     "위투",   "HAISHEN":   "하이선",
  "MUYIFA":    "무이파", "MERBOK":    "머복",   "DUJUAN":    "두쥐엔",
  "MUJIGAE":   "무지개", "CHAN-HOM":  "찬홈",   "LINFA":     "린파",
  "NANGKA":    "낭카",   "IN-FA":     "인파",
  // 베트남 기여
  "TRAMI":     "트라미", "KONG-REY":  "콩레이", "MANGKHUT":  "망쿳",
  "KAMMURI":   "캄무리", "MAWAR":     "마와르", "VAMCO":     "밤코",
  "KROVANH":   "크로바나",
  // 태국 기여
  "PRAPIROON": "쁘라삐룬","WIPHA":    "위파",   "MEKKHALA":  "멕칼라",
  "NOUL":      "노울",   "MATMO":     "마트모",
  // 마카오 기여
  "HATO":      "하토",   "BEBINCA":   "버빈카",
  // 홍콩 기여
  "SARIKA":    "사리카", "HAIMA":     "하이마", "PAKHAR":    "팍하",
  // 말레이시아 기여
  "RUMBIA":    "룸비아", "SOULIK":    "솔릭",   "CIMARON":   "시마론",
  // 미국/미크로네시아 기여
  "WUTIP":     "우팁",   "BUALOI":    "부알로이","PHANFONE":  "판폰",
  // 최근 주요 태풍
  "HINNAMNOR": "힌남노", "MAYSAK":    "마이삭", "BAVI":      "바비",
  "LINGLING":  "링링",   "KROSA":     "크로사", "LEKIMA":    "레키마",
  "FRANCISCO": "프란시스코","BAILU":  "바이루", "VONGFONG":  "봉퐁",
  "MAN-YI":    "만이",   "FUNG-WONG": "풍웡",  "NIDA":      "나이다",
  "HALONG":    "할롱",   "KALMAEGI":  "칼마에기","SOUDELOR":  "소우델로르",
  "MOLAVE":    "몰라베", "CHOI-WAN":  "차이완", "KOPPU":     "코푸",
  "CHAMPI":    "참피",   "RAI":       "라이",   "MELOR":     "멜로르",
  "ATSANI":    "아싸니", "CEMPAKA":   "첨파카",
};

function localName(raw) {
  const upper = raw.toUpperCase().trim();
  if (!upper || upper === "NOT_NAMED" || upper === "NO-NAME") return null;
  return NAMES_KO[upper] ?? null;
}

// ── Haversine 거리 ────────────────────────────────────────────
function distKm(lat1, lon1, lat2, lon2) {
  const R  = 6371;
  const dL = (lat2 - lat1) * Math.PI / 180;
  const dO = (lon2 - lon1) * Math.PI / 180;
  const a  = Math.sin(dL / 2) ** 2 +
             Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dO / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

// ── 진행 방향 베어링 ──────────────────────────────────────────
function bearing(lat1, lon1, lat2, lon2) {
  const φ1 = lat1 * Math.PI / 180, φ2 = lat2 * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;
  const y  = Math.sin(Δλ) * Math.cos(φ2);
  const x  = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
}

function angDiff(a, b) { return Math.min(Math.abs(a - b), 360 - Math.abs(a - b)); }

// korea | japan | china | other
function classifyTarget(lat, lon, pts) {
  if (pts.length < 2) return "other";
  const prev = pts[pts.length - 2];
  const mb   = bearing(prev.lat, prev.lon, lat, lon);

  const bK = bearing(lat, lon, SEOUL.lat,  SEOUL.lon);
  const bJ = bearing(lat, lon, JAPAN.lat,  JAPAN.lon);
  const bC = bearing(lat, lon, CHINA.lat,  CHINA.lon);

  const dK = angDiff(mb, bK);
  const dJ = angDiff(mb, bJ);
  const dC = angDiff(mb, bC);

  const best = Math.min(dK, dJ, dC);
  if (best > 75) return "other"; // 어느 방향도 아님
  if (best === dK) return "korea";
  if (best === dJ) return "japan";
  return "china";
}

function classifyIntensity(windKt) {
  if (windKt >= 130) return "초강력 태풍";
  if (windKt >= 100) return "매우 강한 태풍";
  if (windKt >= 64)  return "강한 태풍";
  if (windKt >= 34)  return "태풍";
  if (windKt >= 22)  return "열대폭풍";
  return "열대저압부";
}

// ── 데이터 로드 ───────────────────────────────────────────────
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

  const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, "").toUpperCase());
  const col = (n) => headers.indexOf(n);
  const I = {
    sid: col("SID"), name: col("NAME"), basin: col("BASIN"),
    lat: col("LAT"), lon: col("LON"), wind: col("WMO_WIND"),
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
    if (!storms.has(sid)) storms.set(sid, { name: c[I.name] || "", points: [] });
    storms.get(sid).points.push({ lat, lon, wind });
  }

  const result = [];

  for (const [, storm] of storms) {
    if (!storm.points.length) continue;

    const pts    = storm.points;
    const latest = pts[pts.length - 1];
    const dist   = distKm(latest.lat, latest.lon, SEOUL.lat, SEOUL.lon);

    if (dist > MAX_DIST_KM) continue; // 너무 먼 태풍 제외

    const latTrend = pts.length >= 2 ? latest.lat - pts[pts.length - 2].lat : 0;
    const lonTrend = pts.length >= 2 ? latest.lon - pts[pts.length - 2].lon : 0;
    const target   = classifyTarget(latest.lat, latest.lon, pts);

    const rawName = storm.name;
    const koName  = localName(rawName);
    const displayName = koName ?? (rawName && rawName !== "NOT_NAMED" ? rawName : null);

    result.push({
      name:        displayName,
      lat:         latest.lat,
      lon:         latest.lon,
      windKt:      latest.wind,
      windMs:      Math.round(latest.wind * 0.514),
      latTrend,
      lonTrend,
      movingNorth: latTrend > 0,
      distFromSeoul: dist,
      intensity:   classifyIntensity(latest.wind),
      target,       // "korea" | "japan" | "china" | "other"
    });
  }

  result.sort((a, b) => a.distFromSeoul - b.distFromSeoul);
  return result;
}

// ── 임베드 옵션 빌더 ─────────────────────────────────────────
const TARGET_LABEL = {
  korea: "🇰🇷 한국 방향 ⚠️",
  japan: "🇯🇵 일본 방향",
  china: "🇨🇳 중국 방향",
};

// 태풍 1개당 필드 4개: 헤더(전폭) + 위치·풍속·거리(3컬럼 inline)
function typhoonFields(t) {
  const name  = t.name ? `태풍 ${t.name}` : "무명 태풍";
  const dir   = TARGET_LABEL[t.target] ?? "기타 방향";
  const arrow = t.movingNorth ? "↑ 북상 중" : "→ 진행 중";
  return [
    {
      name:   `🌀 ${name} — ${dir}`,
      value:  `${t.intensity}`,
      inline: false,
    },
    {
      name:   "📍 현재 위치",
      value:  `북위 ${t.lat.toFixed(1)}°\n동경 ${t.lon.toFixed(1)}°`,
      inline: true,
    },
    {
      name:   "💨 최대풍속",
      value:  `${t.windMs} m/s (${t.windKt}kt)\n${arrow}`,
      inline: true,
    },
    {
      name:   "📏 서울까지",
      value:  `약 ${t.distFromSeoul.toLocaleString()}km`,
      inline: true,
    },
  ];
}

function buildTyphoonEmbedOptions(typhoons) {
  if (!typhoons.length) {
    return {
      color:       0x57f287,
      title:       "🌐 서태평양 태풍 현황",
      description: "현재 한반도 주변 3,500km 이내에 활동 중인 태풍은 없냥! 😸\n안전한 날씨다냥~",
      fields:      [],
    };
  }

  const koreaBound   = typhoons.filter((t) => t.target === "korea");
  const nearbyOthers = typhoons.filter((t) => t.target === "japan" || t.target === "china");
  const fields       = [...koreaBound, ...nearbyOthers].flatMap(typhoonFields);

  if (koreaBound.length) {
    return {
      color:       0xed4245,
      title:       "⚠️ 서태평양 태풍 현황",
      description: "**한국 방향으로 접근 중인 태풍이 있냥!**\n기상 예보를 계속 확인해달라냥!",
      fields,
    };
  }

  return {
    color:       nearbyOthers.length ? 0xfee75c : 0x57f287,
    title:       "🌐 서태평양 태풍 현황",
    description: "현재 한국 방향으로 오는 태풍은 없냥~ ✅" +
                 (nearbyOthers.length ? "\n아래는 주변 태풍 현황이냥 (참고)" : ""),
    fields,
  };
}

module.exports = { getActiveTyphoons, buildTyphoonEmbedOptions };
