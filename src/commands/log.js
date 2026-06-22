const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits,
  SlashCommandBuilder,
} = require("discord.js");
const { nya } = require("../utils/nya");
const { getLogChannelId, getLogOptions } = require("../utils/guildConfig");

const OPTION_DEFS = [
  { key: "messageDelete", label: "메시지 삭제" },
  { key: "messageEdit", label: "메시지 수정" },
  { key: "voiceJoin", label: "음성 채널 입장" },
  { key: "voiceLeave", label: "음성 채널 퇴장" },
  { key: "profanityFilter", label: "욕설 검열" },
  { key: "spamFilter", label: "도배 검열" },
];

function chunk(array, size) {
  const result = [];
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size));
  }
  return result;
}

function buildLogContent(guildId) {
  const channelId = getLogChannelId(guildId);
  const channelText = channelId ? `<#${channelId}>` : "설정 안 됨";

  return nya(
    `현재 로그 채널: ${channelText}\n아래 버튼으로 채널과 로그 종류를 설정하세요.`,
  );
}

function buildLogRows(guildId) {
  const options = getLogOptions(guildId);

  const channelButton = new ButtonBuilder()
    .setCustomId("log-action:channel")
    .setLabel("채널 설정")
    .setStyle(ButtonStyle.Primary);

  const toggleButtons = OPTION_DEFS.map(({ key, label }) =>
    new ButtonBuilder()
      .setCustomId(`log-toggle:${key}`)
      .setLabel(`${label}: ${options[key] ? "켜짐" : "꺼짐"}`)
      .setStyle(options[key] ? ButtonStyle.Success : ButtonStyle.Secondary),
  );

  const toggleRows = chunk(toggleButtons, 5).map((group) =>
    new ActionRowBuilder().addComponents(...group),
  );

  return [new ActionRowBuilder().addComponents(channelButton), ...toggleRows];
}

module.exports = {
  category: "관리",
  data: new SlashCommandBuilder()
    .setName("log")
    .setNameLocalizations({ ko: "로그" })
    .setDescription("Configure moderation logging")
    .setDescriptionLocalizations({ ko: nya("로그 설정을 관리합니다") })
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setDMPermission(false),

  async execute(interaction) {
    await interaction.reply({
      content: buildLogContent(interaction.guild.id),
      components: buildLogRows(interaction.guild.id),
      ephemeral: true,
    });
  },

  buildLogContent,
  buildLogRows,
};
