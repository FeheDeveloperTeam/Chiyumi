const { createCanvas, GlobalFonts } = require("@napi-rs/canvas");
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

function roundedRectPath(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// --- icon helpers ---

function drawSun(ctx, cx, cy, r) {
  // glow
  const glow = ctx.createRadialGradient(cx, cy, r * 0.5, cx, cy, r * 2);
  glow.addColorStop(0, "rgba(245, 200, 66, 0.22)");
  glow.addColorStop(1, "rgba(245, 200, 66, 0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 2, 0, Math.PI * 2);
  ctx.fill();

  // rays
  ctx.strokeStyle = "#f5c842";
  ctx.lineWidth = 7;
  ctx.lineCap = "round";
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI * 2) / 8;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * (r + 10), cy + Math.sin(a) * (r + 10));
    ctx.lineTo(cx + Math.cos(a) * (r + 28), cy + Math.sin(a) * (r + 28));
    ctx.stroke();
  }

  // body
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = "#f5c842";
  ctx.fill();

  // shine
  ctx.beginPath();
  ctx.arc(cx - r * 0.28, cy - r * 0.28, r * 0.38, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255, 255, 200, 0.32)";
  ctx.fill();
}

function drawCloud(ctx, cx, cy, size, color) {
  ctx.fillStyle = color;
  const parts = [
    [cx - size * 0.28, cy + size * 0.15, size * 0.30],
    [cx + size * 0.28, cy + size * 0.15, size * 0.30],
    [cx,               cy - size * 0.08, size * 0.38],
    [cx - size * 0.17, cy + size * 0.04, size * 0.28],
    [cx + size * 0.17, cy + size * 0.04, size * 0.28],
  ];
  for (const [x, y, r] of parts) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillRect(cx - size * 0.58, cy + size * 0.04, size * 1.16, size * 0.42);
}

function drawRainDrops(ctx, cx, startY, spread, color, count = 5) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 3.5;
  ctx.lineCap = "round";
  for (let i = 0; i < count; i++) {
    const x = cx - spread / 2 + (spread / (count - 1)) * i;
    const y = startY + (i % 2 === 0 ? 0 : 12);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - 7, y + 22);
    ctx.stroke();
  }
}

function drawSnowDots(ctx, cx, startY, spread, color, count = 5) {
  ctx.fillStyle = color;
  for (let i = 0; i < count; i++) {
    const x = cx - spread / 2 + (spread / (count - 1)) * i;
    const y = startY + (i % 2 === 0 ? 0 : 12);
    ctx.beginPath();
    ctx.arc(x, y + 8, 5, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawWeatherIcon(ctx, cx, cy, sky, pty) {
  const CLOUD_LIGHT = "#c8cedd";
  const CLOUD_DARK  = "#7e8ea0";
  const RAIN_COLOR  = "#6ab0e8";
  const SNOW_COLOR  = "#d8eaff";

  if (pty === 3) {
    // 눈
    drawCloud(ctx, cx, cy - 15, 70, CLOUD_DARK);
    drawSnowDots(ctx, cx, cy + 44, 110, SNOW_COLOR);
  } else if (pty === 2) {
    // 비/눈
    drawCloud(ctx, cx, cy - 15, 70, CLOUD_DARK);
    drawRainDrops(ctx, cx - 18, cy + 44, 70, RAIN_COLOR, 3);
    drawSnowDots(ctx, cx + 22, cy + 44, 50, SNOW_COLOR, 2);
  } else if (pty === 1 || pty === 4) {
    // 비 / 소나기
    drawCloud(ctx, cx, cy - 15, 70, CLOUD_DARK);
    drawRainDrops(ctx, cx, cy + 44, 110, RAIN_COLOR);
  } else if (sky === 4) {
    // 흐림
    drawCloud(ctx, cx, cy, 70, CLOUD_LIGHT);
  } else if (sky === 3) {
    // 구름많음 → 작은 태양 + 앞에 구름
    drawSun(ctx, cx - 14, cy - 16, 30);
    drawCloud(ctx, cx + 12, cy + 8, 60, CLOUD_LIGHT);
  } else {
    // 맑음
    drawSun(ctx, cx, cy, 45);
  }
}

// ---

function getConditionLabel(sky, pty) {
  if (pty === 3) return "눈";
  if (pty === 2) return "비 / 눈";
  if (pty === 4) return "소나기";
  if (pty === 1) return "비";
  if (sky === 4) return "흐림";
  if (sky === 3) return "구름 많음";
  return "맑음";
}

function formatDateTime(fcstDate, fcstTime) {
  const month = parseInt(fcstDate.slice(4, 6));
  const day   = parseInt(fcstDate.slice(6, 8));
  const hour  = parseInt(fcstTime.slice(0, 2));
  const ampm  = hour < 12 ? "오전" : "오후";
  const h12   = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${month}월 ${day}일 ${ampm} ${h12}시 예보`;
}

function drawStatRow(ctx, x, y, label, value) {
  // small muted label
  ctx.fillStyle = MUTED;
  ctx.font = "15px 'Plex Regular'";
  ctx.fillText(label, x, y);

  // value
  ctx.fillStyle = CREAM;
  ctx.font = "22px 'Plex Bold'";
  ctx.fillText(value, x, y + 28);
}

async function buildWeatherCardImage(weather) {
  const { cityName, temperature, humidity, windSpeed, precipProb, sky, pty, fcstDate, fcstTime } = weather;

  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx    = canvas.getContext("2d");

  // clip to rounded rect
  roundedRectPath(ctx, 0, 0, WIDTH, HEIGHT, CARD_RADIUS);
  ctx.clip();

  // background
  const bg = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
  bg.addColorStop(0, "#3a2a1d");
  bg.addColorStop(1, "#221610");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // ambient glow (left icon area)
  const ambientGlow = ctx.createRadialGradient(115, 140, 20, 115, 140, 160);
  ambientGlow.addColorStop(0, "rgba(225, 170, 116, 0.18)");
  ambientGlow.addColorStop(1, "rgba(225, 170, 116, 0)");
  ctx.fillStyle = ambientGlow;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // divider line between icon and text
  ctx.strokeStyle = "rgba(255, 246, 234, 0.08)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(232, 24);
  ctx.lineTo(232, HEIGHT - 24);
  ctx.stroke();

  // divider between text and stats
  ctx.beginPath();
  ctx.moveTo(600, 24);
  ctx.lineTo(600, HEIGHT - 24);
  ctx.stroke();

  // --- weather icon ---
  drawWeatherIcon(ctx, 116, 138, sky, pty);

  // --- middle: city, date, condition, temperature ---
  const MX = 258;

  ctx.fillStyle = CREAM;
  ctx.font = "33px 'Plex Bold'";
  ctx.fillText(cityName, MX, 74);

  ctx.fillStyle = MUTED;
  ctx.font = "16px 'Plex Regular'";
  ctx.fillText(formatDateTime(fcstDate, fcstTime), MX, 102);

  const condLabel = getConditionLabel(sky, pty);
  ctx.fillStyle = ACCENT_SOFT;
  ctx.font = "19px 'Plex Bold'";
  ctx.fillText(condLabel, MX, 138);

  // big temperature
  ctx.fillStyle = CREAM;
  ctx.font = "82px 'Plex Bold'";
  ctx.fillText(`${temperature}`, MX, 228);

  // °C suffix
  const tempWidth = ctx.measureText(`${temperature}`).width;
  ctx.fillStyle = ACCENT;
  ctx.font = "34px 'Plex Bold'";
  ctx.fillText("°C", MX + tempWidth + 6, 206);

  // --- right: stats ---
  const RX = 628;

  drawStatRow(ctx, RX, 72,  "습도",    `${humidity}%`);
  drawStatRow(ctx, RX, 140, "풍속",    `${windSpeed} m/s`);
  drawStatRow(ctx, RX, 208, "강수확률", `${precipProb}%`);

  // border
  roundedRectPath(ctx, 3, 3, WIDTH - 6, HEIGHT - 6, CARD_RADIUS - 3);
  ctx.strokeStyle = ACCENT;
  ctx.lineWidth = 3;
  ctx.stroke();

  return canvas.encode("png");
}

module.exports = { buildWeatherCardImage };
