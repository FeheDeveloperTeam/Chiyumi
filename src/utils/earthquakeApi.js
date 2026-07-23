// USGS Earthquake API (무료, API 키 불필요)

async function getRecentEarthquakes() {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const url =
    `https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson` +
    `&minmagnitude=2.0&limit=10&orderby=time` +
    `&minlatitude=33&maxlatitude=43&minlongitude=124&maxlongitude=132` +
    `&starttime=${since}`;

  const ctrl = new AbortController();
  const t    = setTimeout(() => ctrl.abort(), 10000);
  const res  = await fetch(url, { signal: ctrl.signal, headers: { "User-Agent": "ChiyumiBot/1.0" } });
  clearTimeout(t);
  const json = await res.json();
  console.log("[지진] USGS 응답:", res.status, "건수:", json?.features?.length ?? 0);

  return (json?.features ?? []).map((f) => ({
    magnitude: f.properties.mag,
    place:     f.properties.place,
    time:      f.properties.time,
    depth:     Math.round(f.geometry.coordinates[2]),
    lat:       f.geometry.coordinates[1],
    lon:       f.geometry.coordinates[0],
  }));
}

function formatEarthquakeResponse(quakes) {
  if (quakes.length === 0) {
    return "최근 30일간 한반도 주변 규모 2.0 이상 지진은 없냥! 안전하냥~ 😸";
  }

  const pad = (n) => String(n).padStart(2, "0");
  const lines = quakes.map((q) => {
    const kst  = new Date(q.time + 9 * 60 * 60 * 1000);
    const date = `${kst.getUTCMonth() + 1}/${kst.getUTCDate()} ${pad(kst.getUTCHours())}:${pad(kst.getUTCMinutes())}`;
    const flag = q.magnitude >= 5.0 ? " 🚨" : q.magnitude >= 4.0 ? " ⚠️" : "";
    return `**M${q.magnitude.toFixed(1)}**${flag} · ${date} KST · ${q.place} · 깊이 ${q.depth}km`;
  });

  const hasBig = quakes.some((q) => q.magnitude >= 4.0);
  const header = hasBig ? `⚠️ **규모 4.0 이상 지진 발생!** 조심하라냥!\n\n` : "";

  return `${header}**최근 30일 한반도 주변 지진 (규모 2.0+)**\n${lines.join("\n")}\n\n출처: USGS`;
}

module.exports = { getRecentEarthquakes, formatEarthquakeResponse };
