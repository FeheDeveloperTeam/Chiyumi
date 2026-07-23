// 기상청(KMA) 한반도 합성 레이더 이미지
// URL: https://www.weather.go.kr/cgi-bin/rdr_new/nph-rdr_cmp_img
// API 키 불필요, 10분 단위 갱신

const { createCanvas, loadImage, GlobalFonts } = require("@napi-rs/canvas");
const { boldBase64, regularBase64 } = require("../assets/fontData");

GlobalFonts.register(Buffer.from(boldBase64,    "base64"), "Plex Bold");
GlobalFonts.register(Buffer.from(regularBase64, "base64"), "Plex Regular");

const OUT_W = 900;
const OUT_H = 900;

// 현재 KST를 YYYYMMDDHHMM (10분 단위 내림) 으로 반환
function kstStr(offsetMin = 0) {
  const d   = new Date(Date.now() - offsetMin * 60 * 1000 + 9 * 60 * 60 * 1000);
  const pad = (n) => String(n).padStart(2, "0");
  const m   = Math.floor(d.getUTCMinutes() / 10) * 10;
  return {
    str:   `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}${pad(d.getUTCHours())}${pad(m)}`,
    label: `${d.getUTCMonth() + 1}/${d.getUTCDate()} ${pad(d.getUTCHours())}:${pad(m)} KST`,
  };
}

async function fetchKmaRadar() {
  // 최신부터 30분 전까지 최대 4번 시도 (서버 업로드 지연 대비)
  for (const offsetMin of [0, 10, 20, 30]) {
    const { str, label } = kstStr(offsetMin);
    const url = `https://www.weather.go.kr/cgi-bin/rdr_new/nph-rdr_cmp_img` +
                `?tm=${str}&cmp=WRC&obs=ECHO&color=C4&ef=Y&qpf=N`;

    console.log(`[레이더] KMA 시도 (offset ${offsetMin}min): tm=${str}`);
    try {
      const ctrl = new AbortController();
      const t    = setTimeout(() => ctrl.abort(), 10000);
      const res  = await fetch(url, {
        signal:  ctrl.signal,
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          "Referer":    "https://www.weather.go.kr/w/weather/radar/single.do",
        },
      });
      clearTimeout(t);

      const ct   = res.headers.get("content-type") ?? "";
      const size = parseInt(res.headers.get("content-length") ?? "0");
      console.log(`[레이더] KMA 응답 ${res.status} | ct=${ct} | size=${size}`);

      if (res.ok && (ct.includes("image") || ct.includes("octet-stream"))) {
        const buf = Buffer.from(await res.arrayBuffer());
        if (buf.length > 1000) { // 빈 응답 방지
          return { buf, label };
        }
        console.log(`[레이더] KMA 이미지 너무 작음 (${buf.length}bytes), 다음 시도`);
      }
    } catch (e) {
      console.log(`[레이더] KMA 실패 (offset ${offsetMin}min):`, e?.message);
    }
  }
  return null;
}

async function buildRadarImage() {
  const result = await fetchKmaRadar();

  const canvas = createCanvas(OUT_W, OUT_H);
  const ctx    = canvas.getContext("2d");

  ctx.fillStyle = "#111827";
  ctx.fillRect(0, 0, OUT_W, OUT_H);

  let hasData   = false;
  let timeLabel = "시간 불명";

  if (result) {
    try {
      const img = await loadImage(result.buf);
      ctx.drawImage(img, 0, 0, OUT_W, OUT_H);
      timeLabel = result.label;
      hasData   = true;
    } catch (e) {
      console.log("[레이더] 이미지 로드 실패:", e?.message);
    }
  }

  if (!hasData) {
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fillRect(OUT_W / 2 - 280, OUT_H / 2 - 36, 560, 72);
    ctx.fillStyle = "#ffdd57";
    ctx.font      = "bold 32px 'Plex Bold'";
    ctx.textAlign = "center";
    ctx.fillText("레이더 데이터 없음", OUT_W / 2, OUT_H / 2 + 12);
    ctx.textAlign = "left";
  }

  // 하단 정보 바
  ctx.fillStyle = "rgba(0,0,0,0.75)";
  ctx.fillRect(0, OUT_H - 46, OUT_W, 46);

  ctx.fillStyle = "#e1aa74";
  ctx.font      = "bold 28px 'Plex Bold'";
  ctx.textAlign = "left";
  ctx.fillText("🌧 강수 레이더", 20, OUT_H - 12);

  ctx.fillStyle = "#cccccc";
  ctx.font      = "22px 'Plex Regular'";
  ctx.textAlign = "center";
  ctx.fillText(timeLabel, OUT_W / 2, OUT_H - 12);

  ctx.fillStyle = "#666666";
  ctx.font      = "18px 'Plex Regular'";
  ctx.textAlign = "right";
  ctx.fillText("© 기상청 (KMA)", OUT_W - 20, OUT_H - 12);

  return canvas.encode("png");
}

module.exports = { buildRadarImage };
