const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  PermissionFlagsBits,
  SlashCommandBuilder,
} = require("discord.js");
const { nya } = require("../utils/nya");
const { getTicketChannelId, getTicketMessage } = require("../utils/guildConfig");

function buildTicketEmbed(guildId) {
  const channelId = getTicketChannelId(guildId);
  const channelText = channelId ? `<#${channelId}>` : "설정 안 됨";

  return new EmbedBuilder()
    .setTitle("티켓 설정")
    .setDescription(
      nya(
        "아래 버튼으로 티켓 채널과 안내 문구를 설정한 뒤, '메시지 게시'로 채널에 티켓 생성 버튼을 올리세요",
      ),
    )
    .addFields(
      { name: "티켓 채널", value: channelText },
      { name: "안내 문구", value: getTicketMessage(guildId) },
    )
    .setColor(0xe1aa74);
}

function buildTicketRow() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("ticket-action:channel")
      .setLabel("채널 설정")
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId("ticket-action:message")
      .setLabel("문구 설정")
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId("ticket-action:post")
      .setLabel("메시지 게시")
      .setStyle(ButtonStyle.Primary),
  );
}

module.exports = {
  category: "관리",
  data: new SlashCommandBuilder()
    .setName("ticket")
    .setNameLocalizations({ ko: "티켓" })
    .setDescription(nya("티켓 채널과 안내 문구를 설정합니다"))
    .setDescriptionLocalizations({ ko: nya("티켓 채널과 안내 문구를 설정합니다") })
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setDMPermission(false),

  async execute(interaction) {
    await interaction.reply({
      embeds: [buildTicketEmbed(interaction.guild.id)],
      components: [buildTicketRow()],
      ephemeral: true,
    });
  },

  buildTicketEmbed,
  buildTicketRow,
};
