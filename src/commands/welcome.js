const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  PermissionFlagsBits,
  SlashCommandBuilder,
} = require("discord.js");
const { nya } = require("../utils/nya");
const {
  getWelcomeChannelId,
  getWelcomeOptions,
  getWelcomeMessage,
} = require("../utils/guildConfig");

function buildWelcomeEmbed(guildId) {
  const channelId = getWelcomeChannelId(guildId);
  const channelText = channelId ? `<#${channelId}>` : "설정 안 됨";
  const options = getWelcomeOptions(guildId);

  return new EmbedBuilder()
    .setTitle("입퇴장 알림 설정")
    .setDescription(
      nya("아래 버튼으로 채널, 문구, 알림 여부를 설정하세요 ({유저}, {서버} 치환 가능)"),
    )
    .addFields(
      { name: "채널", value: channelText },
      {
        name: "알림 상태",
        value: `입장: ${options.joinEnabled ? "켜짐" : "꺼짐"} / 퇴장: ${options.leaveEnabled ? "켜짐" : "꺼짐"}`,
      },
      { name: "입장 문구", value: getWelcomeMessage(guildId, "join") },
      { name: "퇴장 문구", value: getWelcomeMessage(guildId, "leave") },
    )
    .setColor(0xe1aa74);
}

function buildWelcomeRows(guildId) {
  const options = getWelcomeOptions(guildId);

  const channelButton = new ButtonBuilder()
    .setCustomId("welcome-action:channel")
    .setLabel("채널 설정")
    .setStyle(ButtonStyle.Primary);

  const joinMessageButton = new ButtonBuilder()
    .setCustomId("welcome-action:join-message")
    .setLabel("입장 문구 설정")
    .setStyle(ButtonStyle.Primary);

  const leaveMessageButton = new ButtonBuilder()
    .setCustomId("welcome-action:leave-message")
    .setLabel("퇴장 문구 설정")
    .setStyle(ButtonStyle.Primary);

  const joinToggleButton = new ButtonBuilder()
    .setCustomId("welcome-toggle:joinEnabled")
    .setLabel(`입장 알림: ${options.joinEnabled ? "켜짐" : "꺼짐"}`)
    .setStyle(options.joinEnabled ? ButtonStyle.Success : ButtonStyle.Secondary);

  const leaveToggleButton = new ButtonBuilder()
    .setCustomId("welcome-toggle:leaveEnabled")
    .setLabel(`퇴장 알림: ${options.leaveEnabled ? "켜짐" : "꺼짐"}`)
    .setStyle(options.leaveEnabled ? ButtonStyle.Success : ButtonStyle.Secondary);

  return [
    new ActionRowBuilder().addComponents(channelButton, joinMessageButton, leaveMessageButton),
    new ActionRowBuilder().addComponents(joinToggleButton, leaveToggleButton),
  ];
}

module.exports = {
  category: "관리",
  data: new SlashCommandBuilder()
    .setName("welcome")
    .setNameLocalizations({ ko: "입퇴장" })
    .setDescription("Configure join/leave announcement messages")
    .setDescriptionLocalizations({
      ko: nya("입장 및 퇴장 알림 메시지를 설정합니다"),
    })
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setDMPermission(false),

  async execute(interaction) {
    await interaction.reply({
      embeds: [buildWelcomeEmbed(interaction.guild.id)],
      components: buildWelcomeRows(interaction.guild.id),
      ephemeral: true,
    });
  },

  buildWelcomeEmbed,
  buildWelcomeRows,
};
