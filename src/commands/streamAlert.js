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

const PLATFORM_LABELS = { youtube: "유튜브", chzzk: "치지직", soop: "SOOP" };
const PLATFORM_EMOJIS = { youtube: "▶️", chzzk: "🟢", soop: "🔵" };

function buildAlertListEmbed(alerts) {
  return new EmbedBuilder()
    .setTitle("📡 방송 알림 목록")
    .setColor(0x5865f2)
    .setDescription(
      alerts
        .map(
          (a, i) =>
            `**${i + 1}.** ${PLATFORM_EMOJIS[a.platform]} **${a.channelName}** · <#${a.notifChannelId}>\n└ ${a.channelLink}`,
        )
        .join("\n\n"),
    );
}

function buildPanelRow() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("streamalert:btn:add")
      .setLabel("추가")
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId("streamalert:btn:remove")
      .setLabel("삭제")
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId("streamalert:btn:list")
      .setLabel("목록")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("streamalert:btn:test")
      .setLabel("테스트")
      .setStyle(ButtonStyle.Secondary),
  );
}

async function execute(interaction) {
  await interaction.reply({
    content: nya("방송 알림을 관리합니다"),
    components: [buildPanelRow()],
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
  buildAlertListEmbed,
  buildPanelRow,
  PLATFORM_LABELS,
  PLATFORM_EMOJIS,
};
