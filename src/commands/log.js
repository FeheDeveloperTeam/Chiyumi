const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits,
  SlashCommandBuilder,
} = require("discord.js");
const { nya } = require("../utils/nya");
const { getLogChannelId, getLogOptions, getLogTypeChannels } = require("../utils/guildConfig");

const OPTION_DEFS = [
  { key: "messageDelete", label: "메시지 삭제" },
  { key: "messageEdit", label: "메시지 수정" },
  { key: "voiceJoin", label: "음성 채널 입장" },
  { key: "voiceLeave", label: "음성 채널 퇴장" },
  { key: "profanityFilter", label: "욕설 검열" },
  { key: "spamFilter", label: "도배 검열" },
  { key: "warnLog", label: "경고" },
];

function chunk(array, size) {
  const result = [];
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size));
  }
  return result;
}

function buildLogContent(guildId) {
  const defaultId = getLogChannelId(guildId);
  const defaultText = defaultId ? `<#${defaultId}>` : "설정 안 됨";
  const typeChannels = getLogTypeChannels(guildId);

  const typeLines = OPTION_DEFS.map(({ key, label }) => {
    const chId = typeChannels[key];
    return `${label}: ${chId ? `<#${chId}>` : "(기본 채널)"}`;
  }).join("\n");

  return nya(`기본 채널: ${defaultText}\n\n${typeLines}\n\n아래 버튼으로 채널과 로그 종류를 설정하세요.`);
}

function buildLogRows(guildId) {
  const options = getLogOptions(guildId);

  const topRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("log-action:channel")
      .setLabel("기본 채널 설정")
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId("log-action:per-channel")
      .setLabel("채널별 설정")
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId("log-action:test")
      .setLabel("테스트")
      .setStyle(ButtonStyle.Secondary),
  );

  const toggleButtons = OPTION_DEFS.map(({ key, label }) =>
    new ButtonBuilder()
      .setCustomId(`log-toggle:${key}`)
      .setLabel(`${label}: ${options[key] ? "켜짐" : "꺼짐"}`)
      .setStyle(options[key] ? ButtonStyle.Success : ButtonStyle.Secondary),
  );

  const toggleRows = chunk(toggleButtons, 5).map((group) =>
    new ActionRowBuilder().addComponents(...group),
  );

  return [topRow, ...toggleRows];
}

module.exports = {
  OPTION_DEFS,
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
