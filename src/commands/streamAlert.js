const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  PermissionFlagsBits,
  SlashCommandBuilder,
} = require("discord.js");
const { nya } = require("../utils/nya");
const { getGuildAlerts } = require("../utils/streamAlert");

const PLATFORM_LABELS = {
  youtube: "유튜브 라이브",
  youtube_upload: "유튜브 업로드",
  chzzk: "치지직",
  soop: "SOOP",
};
const PLATFORM_EMOJIS = { youtube: "🔴", youtube_upload: "📹", chzzk: "🟢", soop: "🔵" };

function alertDisplayName(alert) {
  return alert.channelName.length > 20 ? alert.channelName.slice(0, 20) + "…" : alert.channelName;
}

function buildAlertDetailEmbed(alert, index, total) {
  return new EmbedBuilder()
    .setTitle(`📡 방송 알림 (${index + 1} / ${total})`)
    .setColor(0x5865f2)
    .setDescription(
      [
        `**플랫폼** ${PLATFORM_EMOJIS[alert.platform]} ${PLATFORM_LABELS[alert.platform]}`,
        `**채널** [${alertDisplayName(alert)}](${alert.channelLink})`,
        `**알림 채널** <#${alert.notifChannelId}>`,
        `**알림 메시지** ${alert.customText || "(기본 메시지)"}`,
        `**멘션** ${alert.mention === "none" ? "없음" : `@${alert.mention}`}`,
      ].join("\n"),
    );
}

function buildEmptyEmbed() {
  return new EmbedBuilder()
    .setTitle("📡 방송 알림")
    .setColor(0x5865f2)
    .setDescription("등록된 방송 알림이 없습니다.");
}

function buildStreamAlertPage(alerts, index = 0) {
  if (alerts.length === 0) {
    return {
      content: null,
      embeds: [buildEmptyEmbed()],
      components: [
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("streamalert:action:add")
            .setLabel("추가")
            .setStyle(ButtonStyle.Primary),
        ),
      ],
    };
  }

  const i = Math.max(0, Math.min(index, alerts.length - 1));
  const alert = alerts[i];

  const navRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`streamalert:nav:${i - 1}`)
      .setLabel("◀")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(i === 0),
    new ButtonBuilder()
      .setCustomId("streamalert:page:label")
      .setLabel(`${i + 1} / ${alerts.length}`)
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(true),
    new ButtonBuilder()
      .setCustomId(`streamalert:nav:${i + 1}`)
      .setLabel("▶")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(i >= alerts.length - 1),
  );

  const actionRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`streamalert:delete:${alert.id}`)
      .setLabel("삭제")
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId(`streamalert:edit:${alert.id}`)
      .setLabel("수정")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`streamalert:test:${alert.id}`)
      .setLabel("테스트")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("streamalert:action:add")
      .setLabel("추가")
      .setStyle(ButtonStyle.Primary),
  );

  return {
    content: null,
    embeds: [buildAlertDetailEmbed(alert, i, alerts.length)],
    components: [navRow, actionRow],
  };
}

function buildPlatformButtons() {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("streamalert:platform:youtube_upload")
        .setLabel("유튜브 업로드")
        .setEmoji("📹")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId("streamalert:platform:youtube")
        .setLabel("유튜브 라이브")
        .setEmoji("🔴")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId("streamalert:platform:chzzk")
        .setLabel("치지직")
        .setEmoji("🟢")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId("streamalert:platform:soop")
        .setLabel("SOOP")
        .setEmoji("🔵")
        .setStyle(ButtonStyle.Secondary),
    ),
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("streamalert:action:cancel")
        .setLabel("취소")
        .setStyle(ButtonStyle.Danger),
    ),
  ];
}

async function execute(interaction) {
  const alerts = getGuildAlerts(interaction.guild.id);
  await interaction.reply({
    ...buildStreamAlertPage(alerts, 0),
    ephemeral: true,
  });
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("streamalert")
    .setNameLocalizations({ ko: "방송알림" })
    .setDescription("방송 알림을 관리합니다")
    .setDescriptionLocalizations({ ko: "방송 알림을 관리합니다" })
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  execute,
  buildStreamAlertPage,
  buildPlatformButtons,
  PLATFORM_LABELS,
  PLATFORM_EMOJIS,
};
