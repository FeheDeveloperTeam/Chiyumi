const {
  ActionRowBuilder,
  AttachmentBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  SlashCommandBuilder,
} = require("discord.js");
const { nya } = require("../utils/nya");
const { getUserXp, levelFromXp, getRank } = require("../utils/levels");
const { getBalance } = require("../utils/credits");
const { buildRankCardImage } = require("../utils/rankCard");
const { getLevelUpChannelId, getLevelUpMessage } = require("../utils/guildConfig");

function buildLevelUpEmbed(guildId) {
  const channelId = getLevelUpChannelId(guildId);
  const channelText = channelId ? `<#${channelId}>` : "레벨업이 발생한 채팅방";

  return new EmbedBuilder()
    .setTitle("레벨업 알림 설정")
    .setDescription(
      nya("아래 버튼으로 알림 채널과 문구를 설정하세요 ({유저}, {레벨} 치환 가능)"),
    )
    .addFields(
      { name: "알림 채널", value: channelText },
      { name: "알림 문구", value: getLevelUpMessage(guildId) },
    )
    .setColor(0xe1aa74);
}

function buildLevelUpRow() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("rank-levelup-action:channel")
      .setLabel("채널 설정")
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId("rank-levelup-action:message")
      .setLabel("문구 설정")
      .setStyle(ButtonStyle.Primary),
  );
}

module.exports = {
  category: "정보",
  data: new SlashCommandBuilder()
    .setName("rank")
    .setNameLocalizations({ ko: "순위" })
    .setDescription(nya("내 레벨과 순위를 카드 이미지로 보여줍니다"))
    .setDescriptionLocalizations({ ko: nya("내 레벨과 순위를 카드 이미지로 보여줍니다") }),

  async execute(interaction) {
    await interaction.deferReply();

    const userId = interaction.user.id;
    const guildId = interaction.guild?.id ?? "global";
    const xp = getUserXp(guildId, userId);
    const { level, currentLevelXp, neededXp } = levelFromXp(xp);
    const { position } = getRank(guildId, userId);
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
          .setLabel("채팅 순위")
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId("rank-action:voice")
          .setLabel("음성 통화 순위")
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId("rank-action:levelup")
          .setLabel("레벨업 알림 설정")
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

  buildLevelUpEmbed,
  buildLevelUpRow,
};
