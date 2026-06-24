const { EmbedBuilder, SlashCommandBuilder } = require("discord.js");
const { nya } = require("../utils/nya");
const { claimDaily } = require("../utils/credits");
const { getUserXp, addXp, levelFromXp } = require("../utils/levels");
const { announceLevelUp } = require("../utils/levelUpAnnounce");

const ATTENDANCE_XP_AMOUNT = 100;

function formatRemainingTime(ms) {
  const totalMinutes = Math.ceil(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 0) return `${hours}시간 ${minutes}분`;
  return `${minutes}분`;
}

module.exports = {
  category: "경제",
  data: new SlashCommandBuilder()
    .setName("attendance")
    .setNameLocalizations({ ko: "출석" })
    .setDescription(nya("하루에 한 번 출석하고 치유미코인과 경험치를 받습니다"))
    .setDescriptionLocalizations({
      ko: nya("하루에 한 번 출석하고 치유미코인과 경험치를 받습니다"),
    }),

  async execute(interaction) {
    const userId = interaction.user.id;
    const result = claimDaily(userId);

    if (!result.success) {
      await interaction.reply({
        content: nya(
          `이미 오늘 출석했습니다. ${formatRemainingTime(result.remainingMs)} 후에 다시 출석할 수 있습니다. (오류 코드: ATTEND-001)`,
        ),
        ephemeral: true,
      });
      return;
    }

    const previousLevel = levelFromXp(getUserXp(userId)).level;
    const totalXp = addXp(userId, ATTENDANCE_XP_AMOUNT);
    const newLevel = levelFromXp(totalXp).level;

    const streakText = result.streak >= 2 ? `\n🔥 ${result.streak}일 연속이다` : "";

    const embed = new EmbedBuilder()
      .setTitle("출석 체크")
      .setDescription(
        nya(
          `치유미코인 ${result.amount}개와 경험치 ${ATTENDANCE_XP_AMOUNT}을 받았습니다! 현재 보유: ${result.balance}개${streakText}`,
        ),
      )
      .setColor(0xe1aa74);

    await interaction.reply({ embeds: [embed] });

    if (newLevel > previousLevel && interaction.guild) {
      await announceLevelUp(interaction.guild, interaction.user, interaction.channel, newLevel);
    }
  },
};
