const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits,
  SlashCommandBuilder,
} = require("discord.js");
const { nya } = require("../utils/nya");
const { getLogOptions } = require("../utils/guildConfig");

function buildCensorContent(guildId) {
  const enabled = getLogOptions(guildId).profanityFilter;
  const stateText = enabled ? "켜져 있습니다" : "꺼져 있습니다";

  return nya(
    `욕설검열을 켜면 제가 서버의 모든 채팅방을 지켜보면서 욕설이 적힌 메시지를 바로 삭제합니다. 신중하게 설정해주세요.\n현재 상태: ${stateText}`,
  );
}

function buildCensorRow(guildId) {
  const enabled = getLogOptions(guildId).profanityFilter;

  const toggleButton = new ButtonBuilder()
    .setCustomId("censor-action:toggle")
    .setLabel(enabled ? "욕설검열 끄기" : "욕설검열 켜기")
    .setStyle(enabled ? ButtonStyle.Success : ButtonStyle.Secondary);

  return new ActionRowBuilder().addComponents(toggleButton);
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("censor")
    .setNameLocalizations({ ko: "욕설검열" })
    .setDescription(nya("서버 전체 채팅에 욕설 검열 기능을 켜고 끕니다"))
    .setDescriptionLocalizations({
      ko: nya("서버 전체 채팅에 욕설 검열 기능을 켜고 끕니다"),
    })
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setDMPermission(false),

  async execute(interaction) {
    await interaction.reply({
      content: buildCensorContent(interaction.guild.id),
      components: [buildCensorRow(interaction.guild.id)],
      ephemeral: true,
    });
  },

  buildCensorContent,
  buildCensorRow,
};
