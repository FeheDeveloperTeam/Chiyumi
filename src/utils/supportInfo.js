const { EmbedBuilder } = require("discord.js");
const { nya } = require("./nya");

const KST_TIMEZONE = "Asia/Seoul";

function isOperatingHours() {
  const now = new Date();
  const kst = new Date(now.toLocaleString("en-US", { timeZone: KST_TIMEZONE }));
  const day = kst.getDay(); // 0=Sun, 6=Sat
  if (day === 0 || day === 6) return false;
  const hour = kst.getHours();
  return hour >= 10 && hour < 19;
}

function buildSupportEmbed() {
  const operating = isOperatingHours();
  const statusLine = operating
    ? nya("현재 운영 시간입니다! 티켓을 생성하거나 편하게 문의해주세요")
    : nya("현재 운영 시간이 아닙니다. 이메일로 문의해 주세요");

  return new EmbedBuilder()
    .setTitle("📞 운영 안내")
    .setDescription(
      `${statusLine}\n\n📧 **이메일:** help@fehe.dev\n🕐 **운영 시간:** 평일 10:00 - 19:00 (주말 제외)`,
    )
    .setColor(operating ? 0x57f287 : 0xed4245);
}

module.exports = { isOperatingHours, buildSupportEmbed };
