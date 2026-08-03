const { EmbedBuilder } = require("discord.js");
const { nya } = require("./nya");

const KST_TIMEZONE = "Asia/Seoul";

function isOperatingHours() {
  const now = new Date();
  const kst = new Date(now.toLocaleString("en-US", { timeZone: KST_TIMEZONE }));
  const hour = kst.getHours();
  return hour >= 19; // 19:00 ~ 자정
}

function buildSupportEmbed() {
  const operating = isOperatingHours();
  const statusLine = operating
    ? nya("현재 서포터 서버 운영 시간입니다! 편하게 들어오세요")
    : nya("현재 서포터 서버 운영 시간이 아닙니다. 오후 7시 이후에 다시 찾아주세요");

  return new EmbedBuilder()
    .setTitle("🐾 서포터 서버 안내")
    .setDescription(
      `${statusLine}\n\n🕐 **운영 시간:** 매일 오후 7:00 - 자정 (00:00)`,
    )
    .setColor(operating ? 0x57f287 : 0xed4245);
}

module.exports = { isOperatingHours, buildSupportEmbed };
