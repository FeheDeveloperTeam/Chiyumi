const {
  ActionRowBuilder,
  AttachmentBuilder,
  ButtonBuilder,
  ButtonStyle,
  SlashCommandBuilder,
} = require("discord.js");
const { nya } = require("../utils/nya");
const { getUserXp, levelFromXp, getRank } = require("../utils/levels");
const { getBalance } = require("../utils/credits");
const { buildRankCardImage } = require("../utils/rankCard");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("rank")
    .setNameLocalizations({ ko: "순위" })
    .setDescription(nya("내 레벨과 순위를 카드 이미지로 보여줍니다"))
    .setDescriptionLocalizations({ ko: nya("내 레벨과 순위를 카드 이미지로 보여줍니다") }),

  async execute(interaction) {
    await interaction.deferReply();

    const userId = interaction.user.id;
    const xp = getUserXp(userId);
    const { level, currentLevelXp, neededXp } = levelFromXp(xp);
    const { position } = getRank(userId);
    const coinBalance = getBalance(userId);
    const avatarUrl = interaction.user.displayAvatarURL({ extension: "png", size: 256 });

    try {
      const buffer = await buildRankCardImage({
        avatarUrl,
        username: interaction.user.username,
        level,
        currentLevelXp,
        neededXp,
        rankPosition: position,
        coinBalance,
      });

      const attachment = new AttachmentBuilder(buffer, { name: "rank.png" });
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("rank-action:chat")
          .setLabel("이 서버 채팅 순위")
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId("rank-action:voice")
          .setLabel("이 서버 음성 통화 순위")
          .setStyle(ButtonStyle.Primary),
      );

      await interaction.editReply({ files: [attachment], components: [row] });
    } catch (error) {
      console.error(error);
      await interaction.editReply(
        nya("순위 카드를 만드는 중 오류가 발생했습니다. (오류 코드: RANK-001)"),
      );
    }
  },
};
