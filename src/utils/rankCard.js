const path = require("node:path");
const { createCanvas, loadImage, GlobalFonts } = require("@napi-rs/canvas");

const FONTS_DIR = path.join(__dirname, "..", "..", "assets", "fonts");
GlobalFonts.registerFromPath(path.join(FONTS_DIR, "IBMPlexSansKR-Bold.ttf"), "Plex Bold");
GlobalFonts.registerFromPath(path.join(FONTS_DIR, "IBMPlexSansKR-Regular.ttf"), "Plex Regular");

const WIDTH = 900;
const HEIGHT = 280;
const AVATAR_SIZE = 180;
const AVATAR_X = 50;
const AVATAR_Y = (HEIGHT - AVATAR_SIZE) / 2;
const ACCENT_COLOR = "#e1aa74";

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

  const bgGradient = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
  bgGradient.addColorStop(0, "#2b2118");
  bgGradient.addColorStop(1, "#1a1410");
  ctx.fillStyle = bgGradient;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  ctx.strokeStyle = ACCENT_COLOR;
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, WIDTH - 4, HEIGHT - 4);

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

  ctx.strokeStyle = ACCENT_COLOR;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(
    AVATAR_X + AVATAR_SIZE / 2,
    AVATAR_Y + AVATAR_SIZE / 2,
    AVATAR_SIZE / 2,
    0,
    Math.PI * 2,
  );
  ctx.stroke();

  const textX = AVATAR_X + AVATAR_SIZE + 40;

  ctx.fillStyle = "#ffffff";
  ctx.font = "38px 'Plex Bold'";
  ctx.fillText(username, textX, 90);

  ctx.fillStyle = ACCENT_COLOR;
  ctx.font = "28px 'Plex Bold'";
  ctx.fillText(`레벨 ${level}`, textX, 135);

  ctx.fillStyle = "#cccccc";
  ctx.font = "22px 'Plex Regular'";
  ctx.fillText(`전체 순위 #${rankPosition}`, textX, 170);
  ctx.fillText(`치유미코인 ${coinBalance}개`, textX, 200);

  const barX = textX;
  const barY = 220;
  const barWidth = WIDTH - barX - 50;
  const barHeight = 26;
  const progress = Math.min(1, currentLevelXp / neededXp);

  ctx.fillStyle = "#3a2f24";
  ctx.fillRect(barX, barY, barWidth, barHeight);

  ctx.fillStyle = ACCENT_COLOR;
  ctx.fillRect(barX, barY, barWidth * progress, barHeight);

  ctx.fillStyle = "#ffffff";
  ctx.font = "16px 'Plex Regular'";
  ctx.fillText(`${currentLevelXp} / ${neededXp} XP`, barX + 6, barY + 19);

  return canvas.encode("png");
}

module.exports = { buildRankCardImage };
