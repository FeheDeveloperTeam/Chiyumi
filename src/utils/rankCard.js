const { createCanvas, loadImage, GlobalFonts } = require("@napi-rs/canvas");
const { boldBase64, regularBase64 } = require("../assets/fontData");

GlobalFonts.register(Buffer.from(boldBase64, "base64"), "Plex Bold");
GlobalFonts.register(Buffer.from(regularBase64, "base64"), "Plex Regular");

const WIDTH = 900;
const HEIGHT = 300;
const CARD_RADIUS = 28;
const AVATAR_SIZE = 176;
const AVATAR_X = 62;
const AVATAR_Y = (HEIGHT - AVATAR_SIZE) / 2;
const ACCENT_COLOR = "#e1aa74";
const ACCENT_SOFT = "#f3d9b1";
const CREAM = "#fff6ea";

function roundedRectPath(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
}

function drawPawPrint(ctx, x, y, scale, color, alpha) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.translate(x, y);
  ctx.scale(scale, scale);

  ctx.beginPath();
  ctx.ellipse(0, 0, 16, 13, 0, 0, Math.PI * 2);
  ctx.fill();

  const toes = [
    { dx: -22, dy: -22, r: 7.5 },
    { dx: -2, dy: -30, r: 8 },
    { dx: 18, dy: -24, r: 7.5 },
    { dx: 30, dy: -6, r: 6.5 },
  ];

  for (const toe of toes) {
    ctx.beginPath();
    ctx.ellipse(toe.dx, toe.dy, toe.r, toe.r * 0.9, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function drawSparkle(ctx, x, y, size, color, alpha = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.translate(x, y);

  ctx.beginPath();
  ctx.moveTo(0, -size);
  ctx.quadraticCurveTo(size * 0.18, -size * 0.18, size, 0);
  ctx.quadraticCurveTo(size * 0.18, size * 0.18, 0, size);
  ctx.quadraticCurveTo(-size * 0.18, size * 0.18, -size, 0);
  ctx.quadraticCurveTo(-size * 0.18, -size * 0.18, 0, -size);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

function drawPill(ctx, x, y, width, height, fill, text, textColor, font) {
  roundedRectPath(ctx, x, y, width, height, height / 2);
  ctx.fillStyle = fill;
  ctx.fill();

  ctx.fillStyle = textColor;
  ctx.font = font;
  ctx.textBaseline = "middle";
  ctx.fillText(text, x + height / 2, y + height / 2 + 1);
  ctx.textBaseline = "alphabetic";
}

async function buildRankCardImage({
  avatarUrl,
  username,
  level,
  currentLevelXp,
  neededXp,
  rankPosition,
  coinBalance,
}) {
  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext("2d");

  roundedRectPath(ctx, 0, 0, WIDTH, HEIGHT, CARD_RADIUS);
  ctx.clip();

  const bgGradient = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
  bgGradient.addColorStop(0, "#3a2a1d");
  bgGradient.addColorStop(1, "#221610");
  ctx.fillStyle = bgGradient;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  const glow = ctx.createRadialGradient(
    AVATAR_X + AVATAR_SIZE / 2,
    AVATAR_Y + AVATAR_SIZE / 2,
    10,
    AVATAR_X + AVATAR_SIZE / 2,
    AVATAR_Y + AVATAR_SIZE / 2,
    AVATAR_SIZE,
  );
  glow.addColorStop(0, "rgba(225, 170, 116, 0.35)");
  glow.addColorStop(1, "rgba(225, 170, 116, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  drawPawPrint(ctx, WIDTH - 90, 60, 1.1, CREAM, 0.07);
  drawPawPrint(ctx, WIDTH - 180, 130, 0.75, CREAM, 0.05);
  drawSparkle(ctx, WIDTH - 60, HEIGHT - 50, 14, ACCENT_SOFT, 0.4);
  drawSparkle(ctx, WIDTH - 130, HEIGHT - 30, 8, ACCENT_SOFT, 0.3);

  try {
    const response = await fetch(avatarUrl);
    const buffer = Buffer.from(await response.arrayBuffer());
    const avatarImage = await loadImage(buffer);

    ctx.save();
    ctx.beginPath();
    ctx.arc(
      AVATAR_X + AVATAR_SIZE / 2,
      AVATAR_Y + AVATAR_SIZE / 2,
      AVATAR_SIZE / 2,
      0,
      Math.PI * 2,
    );
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(avatarImage, AVATAR_X, AVATAR_Y, AVATAR_SIZE, AVATAR_SIZE);
    ctx.restore();
  } catch {
    // 아바타를 불러오지 못해도 카드 자체는 계속 그린다
  }

  ctx.beginPath();
  ctx.arc(
    AVATAR_X + AVATAR_SIZE / 2,
    AVATAR_Y + AVATAR_SIZE / 2,
    AVATAR_SIZE / 2 + 9,
    0,
    Math.PI * 2,
  );
  ctx.strokeStyle = CREAM;
  ctx.lineWidth = 4;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(
    AVATAR_X + AVATAR_SIZE / 2,
    AVATAR_Y + AVATAR_SIZE / 2,
    AVATAR_SIZE / 2 + 3,
    0,
    Math.PI * 2,
  );
  ctx.strokeStyle = ACCENT_COLOR;
  ctx.lineWidth = 5;
  ctx.stroke();

  const badgeRadius = 26;
  const badgeX = AVATAR_X + AVATAR_SIZE - 10;
  const badgeY = AVATAR_Y + AVATAR_SIZE - 10;

  ctx.beginPath();
  ctx.arc(badgeX, badgeY, badgeRadius, 0, Math.PI * 2);
  ctx.fillStyle = ACCENT_COLOR;
  ctx.fill();
  ctx.strokeStyle = CREAM;
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.fillStyle = "#2a1c10";
  ctx.font = "20px 'Plex Bold'";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(`${level}`, badgeX, badgeY + 1);
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";

  const textX = AVATAR_X + AVATAR_SIZE + 50;

  ctx.fillStyle = CREAM;
  ctx.font = "36px 'Plex Bold'";
  ctx.fillText(username, textX, 88);

  const rankText = `전체 순위 #${rankPosition}`;
  ctx.font = "18px 'Plex Bold'";
  const rankWidth = ctx.measureText(rankText).width + 28;
  drawPill(ctx, textX, 104, rankWidth, 34, "rgba(255, 246, 234, 0.12)", rankText, ACCENT_SOFT, "18px 'Plex Bold'");

  ctx.font = "18px 'Plex Regular'";
  ctx.fillStyle = "#d8c7b4";
  ctx.fillText(`치유미코인 ${coinBalance}개`, textX + rankWidth + 14, 126);

  const barX = textX;
  const barY = 172;
  const barWidth = WIDTH - barX - 60;
  const barHeight = 28;
  const progress = Math.max(0, Math.min(1, currentLevelXp / neededXp));

  roundedRectPath(ctx, barX, barY, barWidth, barHeight, barHeight / 2);
  ctx.fillStyle = "rgba(255, 246, 234, 0.12)";
  ctx.fill();

  const fillWidth = Math.max(barHeight, barWidth * progress);

  if (progress > 0) {
    roundedRectPath(ctx, barX, barY, fillWidth, barHeight, barHeight / 2);
    const barGradient = ctx.createLinearGradient(barX, 0, barX + fillWidth, 0);
    barGradient.addColorStop(0, "#caa06a");
    barGradient.addColorStop(1, ACCENT_COLOR);
    ctx.fillStyle = barGradient;
    ctx.fill();

    roundedRectPath(ctx, barX + 4, barY + 3, Math.max(0, fillWidth - 8), barHeight * 0.32, barHeight * 0.16);
    ctx.fillStyle = "rgba(255, 255, 255, 0.25)";
    ctx.fill();
  }

  ctx.fillStyle = "#2a1c10";
  ctx.font = "15px 'Plex Bold'";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(`${currentLevelXp} / ${neededXp} XP`, barX + barWidth / 2, barY + barHeight / 2 + 1);
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";

  roundedRectPath(ctx, 3, 3, WIDTH - 6, HEIGHT - 6, CARD_RADIUS - 3);
  ctx.strokeStyle = ACCENT_COLOR;
  ctx.lineWidth = 3;
  ctx.stroke();

  return canvas.encode("png");
}

module.exports = { buildRankCardImage };
