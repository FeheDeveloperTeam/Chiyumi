const { createCanvas, loadImage, GlobalFonts } = require("@napi-rs/canvas");
const { boldBase64, regularBase64 } = require("../assets/fontData");

GlobalFonts.register(Buffer.from(boldBase64, "base64"), "Plex Bold");
GlobalFonts.register(Buffer.from(regularBase64, "base64"), "Plex Regular");

const WIDTH       = 900;
const HEIGHT      = 280;
const CARD_RADIUS = 28;
const ACCENT      = "#e1aa74";
const ACCENT_SOFT = "#f3d9b1";
const CREAM       = "#fff6ea";
const MUTED       = "#b8a090";

// 날씨별 배경 테마 (테두리는 항상 ACCENT)
const THEMES = {
  sunny:        { bg1: "#3d2800", bg2: "#1e1000", glow: "rgba(255, 180, 60, 0.25)"   },
  partlyCloudy: { bg1: "#2d2418", bg2: "#181008", glow: "rgba(225, 170, 116, 0.18)" },
  cloudy:       { bg1: "#1a1e24", bg2: "#0c1018", glow: "rgba(120, 140, 160, 0.22)" },
  rainy:        { bg1: "#0d1828", bg2: "#060c18", glow: "rgba(60, 120, 210, 0.22)"  },
  sleet:        { bg1: "#0f1c28", bg2: "#080e16", glow: "rgba(80, 150, 190, 0.2)"   },
  snowy:        { bg1: "#121e30", bg2: "#090f1c", glow: "rgba(150, 190, 230, 0.22)" },
  typhoon:      { bg1: "#18102a", bg2: "#090614", glow: "rgba(160, 80, 210, 0.22)"  },
};

function getTheme(sky, pty, windGust) {
  const gust = parseFloat(windGust ?? "0");
  if (gust >= 17)              return THEMES.typhoon;
  if (pty === 3)               return THEMES.snowy;
  if (pty === 2)               return THEMES.sleet;
  if (pty === 1 || pty === 4)  return THEMES.rainy;
  if (sky === 4)               return THEMES.cloudy;
  if (sky === 3)               return THEMES.partlyCloudy;
  return THEMES.sunny;
}

// twemoji PNG (72x72)
function getEmojiCodepoint(sky, pty, windGust) {
  const gust = parseFloat(windGust ?? "0");
  if (gust >= 17)              return "1f300"; // 🌀
  if (gust >= 14)              return "1f32c"; // 🌬️
  if (pty === 3)               return "2744";  // ❄️
  if (pty === 2)               return "1f328"; // 🌨️
  if (pty === 4)               return "1f326"; // 🌦️
  if (pty === 1)               return "1f327"; // 🌧️
  if (sky === 4)               return "2601";  // ☁️
  if (sky === 3)               return "26c5";  // ⛅
  return "2600";                               // ☀️
}

async function loadWeatherEmoji(sky, pty, windGust) {
  const cp  = getEmojiCodepoint(sky, pty, windGust);
  const url = `https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/${cp}.png`;
  const res = await fetch(url);
  return loadImage(Buffer.from(await res.arrayBuffer()));
}

function roundedRectPath(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function formatDateTime(fcstDate, fcstTime) {
  const month = parseInt(fcstDate.slice(4, 6));
  const day   = parseInt(fcstDate.slice(6, 8));
  const hour  = parseInt(fcstTime.slice(0, 2));
  const ampm  = hour < 12 ? "오전" : "오후";
  const h12   = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${month}월 ${day}일 ${ampm} ${h12}시 기준`;
}

function getConditionLabel(sky, pty) {
  if (pty === 3) return "눈";
  if (pty === 2) return "비 / 눈";
  if (pty === 4) return "소나기";
  if (pty === 1) return "비";
  if (sky === 4) return "흐림";
  if (sky === 3) return "구름 많음";
  return "맑음";
}

function pm25Info(pm25) {
  if (pm25 < 0)   return { text: "정보없음", color: MUTED };
  if (pm25 <= 15) return { text: `좋음 ${pm25}`, color: "#88ddff" };
  if (pm25 <= 35) return { text: `보통 ${pm25}`, color: CREAM };
  if (pm25 <= 75) return { text: `나쁨 ${pm25}`, color: "#f0a030" };
  return                  { text: `매우나쁨 ${pm25}`, color: "#ed4245" };
}

function drawStatBlock(ctx, x, y, label, value, valueColor = CREAM) {
  ctx.fillStyle = MUTED;
  ctx.font = "14px 'Plex Regular'";
  ctx.fillText(label, x, y);

  ctx.fillStyle = valueColor;
  ctx.font = "21px 'Plex Bold'";
  ctx.fillText(value, x, y + 27);
}

async function buildWeatherCardImage(weather) {
  const {
    cityName, temperature, apparentTemp, humidity,
    windSpeed, windGust, precipProb, pm25,
    sky, pty, fcstDate, fcstTime,
  } = weather;

  const theme = getTheme(sky, pty, windGust);
  const gust  = parseFloat(windGust ?? "0");

  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx    = canvas.getContext("2d");

  // clip
  roundedRectPath(ctx, 0, 0, WIDTH, HEIGHT, CARD_RADIUS);
  ctx.clip();

  // background
  const bg = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
  bg.addColorStop(0, theme.bg1);
  bg.addColorStop(1, theme.bg2);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // ambient glow (icon area)
  const glow = ctx.createRadialGradient(115, 130, 15, 115, 130, 170);
  glow.addColorStop(0, theme.glow);
  glow.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // subtle dividers
  ctx.strokeStyle = "rgba(255,246,234,0.07)";
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(238, 28); ctx.lineTo(238, HEIGHT - 28); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(600, 28); ctx.lineTo(600, HEIGHT - 28); ctx.stroke();

  // --- 날씨 아이콘 (twemoji) ---
  const ICON_SIZE = 136;
  const ICON_X   = 115 - ICON_SIZE / 2;
  const ICON_Y   = 130 - ICON_SIZE / 2;

  try {
    const emojiImg = await loadWeatherEmoji(sky, pty, windGust);
    ctx.drawImage(emojiImg, ICON_X, ICON_Y, ICON_SIZE, ICON_SIZE);
  } catch {
    // fallback: 조건 텍스트
    ctx.fillStyle = CREAM;
    ctx.font = "72px 'Plex Bold'";
    ctx.textAlign = "center";
    ctx.fillText("?", 115, 160);
    ctx.textAlign = "left";
  }

  // --- 중간 패널 ---
  const MX = 256;

  ctx.fillStyle = CREAM;
  ctx.font = "33px 'Plex Bold'";
  ctx.fillText(cityName, MX, 74);

  ctx.fillStyle = MUTED;
  ctx.font = "15px 'Plex Regular'";
  ctx.fillText(formatDateTime(fcstDate, fcstTime), MX, 100);

  ctx.fillStyle = ACCENT_SOFT;
  ctx.font = "19px 'Plex Bold'";
  ctx.fillText(getConditionLabel(sky, pty), MX, 134);

  // 큰 기온
  ctx.fillStyle = CREAM;
  ctx.font = "80px 'Plex Bold'";
  ctx.fillText(`${temperature}`, MX, 236);

  const tempW = ctx.measureText(`${temperature}`).width;
  ctx.fillStyle = ACCENT;
  ctx.font = "32px 'Plex Bold'";
  ctx.fillText("°C", MX + tempW + 5, 214);

  // --- 오른쪽 2×2 스탯 ---
  const RX1 = 622;
  const RX2 = 752;

  drawStatBlock(ctx, RX1, 66,  "습도",    `${humidity}%`);
  drawStatBlock(ctx, RX2, 66,  "체감온도", `${apparentTemp}°C`);
  drawStatBlock(ctx, RX1, 150, "강수확률", `${precipProb}%`);

  const pm = pm25Info(pm25);
  drawStatBlock(ctx, RX2, 150, "미세먼지", pm.text, pm.color);

  // 태풍/강풍 경고 배너
  if (gust >= 14) {
    let pillText, pillColor;
    if      (gust >= 25) { pillText = `강한 태풍급  ${windGust} m/s`; pillColor = "#990000"; }
    else if (gust >= 17) { pillText = `태풍급  ${windGust} m/s`;      pillColor = "#ed4245"; }
    else                 { pillText = `강풍 주의  ${windGust} m/s`;   pillColor = "#c07820"; }

    const PW = 252;
    const PX = RX1;
    const PY = 228;
    roundedRectPath(ctx, PX, PY, PW, 28, 14);
    ctx.fillStyle = pillColor;
    ctx.fill();

    ctx.fillStyle = "#ffffff";
    ctx.font = "14px 'Plex Bold'";
    ctx.textAlign = "center";
    ctx.fillText(pillText, PX + PW / 2, PY + 19);
    ctx.textAlign = "left";
  }

  // 테두리 (항상 ACCENT)
  roundedRectPath(ctx, 3, 3, WIDTH - 6, HEIGHT - 6, CARD_RADIUS - 3);
  ctx.strokeStyle = ACCENT;
  ctx.lineWidth = 3;
  ctx.stroke();

  return canvas.encode("png");
}

module.exports = { buildWeatherCardImage };
