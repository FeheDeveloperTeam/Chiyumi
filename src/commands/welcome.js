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

const INFO_TOGGLES = [
  { key: "showCreatedAt",   label: "계정 생성일" },
  { key: "showJoinedAt",    label: "서버 입장일" },
  { key: "showLeftAt",      label: "퇴장 일시" },
  { key: "showMemberCount", label: "현재 인원" },
  { key: "showInviter",     label: "초대자" },
];

function buildWelcomeEmbed(guildId) {
  const channelId = getWelcomeChannelId(guildId);
  const channelText = channelId ? `<#${channelId}>` : "설정 안 됨";
  const options = getWelcomeOptions(guildId);

  const infoStatus = INFO_TOGGLES
    .map(({ key, label }) => `${label}: **${options[key] ? "켜짐" : "꺼짐"}**`)
    .join(" · ");

  return new EmbedBuilder()
    .setTitle("입퇴장 알림 설정")
    .setDescription(
      nya("아래 버튼으로 채널, 문구, 알림 여부를 설정하세요 ({유저}, {서버} 치환 가능)"),
    )
    .addFields(
      { name: "채널", value: channelText },
      {
        name: "알림 상태",
        value: `입장: ${options.joinEnabled ? "켜짐" : "꺼짐"} · 퇴장: ${options.leaveEnabled ? "켜짐" : "꺼짐"}`,
      },
      { name: "입장 문구", value: getWelcomeMessage(guildId, "join") },
      { name: "퇴장 문구", value: getWelcomeMessage(guildId, "leave") },
      { name: "정보 표시 (선택)", value: infoStatus },
    )
    .setColor(0xe1aa74);
}

function buildWelcomeRows(guildId) {
  const options = getWelcomeOptions(guildId);

  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("welcome-action:channel")
      .setLabel("채널 설정")
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId("welcome-action:join-message")
      .setLabel("입장 문구 설정")
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId("welcome-action:leave-message")
      .setLabel("퇴장 문구 설정")
      .setStyle(ButtonStyle.Primary),
  );

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("welcome-toggle:joinEnabled")
      .setLabel(`입장 알림: ${options.joinEnabled ? "켜짐" : "꺼짐"}`)
      .setStyle(options.joinEnabled ? ButtonStyle.Success : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("welcome-toggle:leaveEnabled")
      .setLabel(`퇴장 알림: ${options.leaveEnabled ? "켜짐" : "꺼짐"}`)
      .setStyle(options.leaveEnabled ? ButtonStyle.Success : ButtonStyle.Secondary),
  );

  const row3 = new ActionRowBuilder().addComponents(
    ...INFO_TOGGLES.map(({ key, label }) =>
      new ButtonBuilder()
        .setCustomId(`welcome-toggle:${key}`)
        .setLabel(`${label}: ${options[key] ? "켜짐" : "꺼짐"}`)
        .setStyle(options[key] ? ButtonStyle.Success : ButtonStyle.Secondary),
    ),
  );

  const row4 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("welcome-action:test-join")
      .setLabel("입장 테스트")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("welcome-action:test-leave")
      .setLabel("퇴장 테스트")
      .setStyle(ButtonStyle.Secondary),
  );

  return [row1, row2, row3, row4];
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
