const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  PermissionFlagsBits,
  SlashCommandBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} = require("discord.js");
const { nya } = require("../utils/nya");
const { getLogChannelId, getLogOptions, getLogTypeChannels, getAnnounceChannelId } = require("../utils/guildConfig");

const OPTION_DEFS = [
  { key: "messageDelete", label: "메시지 삭제" },
  { key: "messageEdit",   label: "메시지 수정" },
  { key: "voiceJoin",     label: "음성 채널 입장" },
  { key: "voiceLeave",    label: "음성 채널 퇴장" },
  { key: "profanityFilter", label: "욕설 검열" },
  { key: "spamFilter",    label: "도배 검열" },
  { key: "warnLog",       label: "경고" },
  { key: "raidAlert",    label: "레이드 알림" },
  { key: "raidAnnounce", label: "레이드 공지(서버원)" },
];

function buildLogEmbed(guildId) {
  const options = getLogOptions(guildId);
  const typeChannels = getLogTypeChannels(guildId);
  const defaultId = getLogChannelId(guildId);

  return new EmbedBuilder()
    .setTitle("로그 설정")
    .setDescription(nya("항목을 선택해 채널과 활성화 여부를 개별 설정하거나, 아래 버튼으로 전체 일괄 설정할 수 있습니다"))
    .addFields(
      OPTION_DEFS.map(({ key, label }) => {
        const enabled = options[key];
        const ownId   = key === "raidAnnounce" ? getAnnounceChannelId(guildId) : typeChannels[key];
        const channelText = ownId
          ? `<#${ownId}>`
          : defaultId
            ? `<#${defaultId}>`
            : "채널 없음";
        return { name: label, value: `${enabled ? "✅" : "⬜"} ${channelText}`, inline: true };
      }),
    )
    .setColor(0xe1aa74);
}

function buildLogMainRows() {
  const typeSelect = new StringSelectMenuBuilder()
    .setCustomId("log-type-select")
    .setPlaceholder("로그 항목 선택 → 채널·켜기/끄기 개별 설정")
    .addOptions(
      OPTION_DEFS.map(({ key, label }) =>
        new StringSelectMenuOptionBuilder().setLabel(label).setValue(key),
      ),
    );

  const bulkRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("log-bulk-channel")
      .setLabel("전체 채널 설정")
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId("log-bulk-on")
      .setLabel("전체 켜기")
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId("log-bulk-off")
      .setLabel("전체 끄기")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("log-action:test")
      .setLabel("테스트")
      .setStyle(ButtonStyle.Secondary),
  );

  return [new ActionRowBuilder().addComponents(typeSelect), bulkRow];
}

function buildLogTypeEmbed(guildId, key) {
  const label = OPTION_DEFS.find((d) => d.key === key)?.label ?? key;
  const enabled = getLogOptions(guildId)[key];
  const typeChannels = getLogTypeChannels(guildId);
  const defaultId   = getLogChannelId(guildId);
  const ownId       = key === "raidAnnounce" ? getAnnounceChannelId(guildId) : typeChannels[key];

  return new EmbedBuilder()
    .setTitle(`로그 설정 — ${label}`)
    .addFields(
      { name: "현재 상태", value: enabled ? "✅ 켜짐" : "⬜ 꺼짐", inline: true },
      {
        name: "전용 채널",
        value: ownId
          ? `<#${ownId}>`
          : key === "raidAnnounce"
            ? "설정 안 됨"
            : defaultId ? `<#${defaultId}> (기본)` : "설정 안 됨",
        inline: true,
      },
    )
    .setColor(0xe1aa74);
}

function buildLogTypeRows(guildId, key) {
  const enabled = getLogOptions(guildId)[key];

  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("log-action:back")
        .setLabel("← 뒤로")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`log-toggle:${key}`)
        .setLabel(enabled ? "끄기" : "켜기")
        .setStyle(enabled ? ButtonStyle.Success : ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`log-type-channel-btn:${key}`)
        .setLabel("채널 설정")
        .setStyle(ButtonStyle.Primary),
    ),
  ];
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
      embeds: [buildLogEmbed(interaction.guild.id)],
      components: buildLogMainRows(),
      ephemeral: true,
    });
  },

  buildLogEmbed,
  buildLogMainRows,
  buildLogTypeEmbed,
  buildLogTypeRows,
};
