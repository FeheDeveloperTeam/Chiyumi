const {
  ActionRowBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
  SlashCommandBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} = require("discord.js");
const { nya } = require("../utils/nya");
const { getGuildAlerts } = require("../utils/streamAlert");

const PLATFORM_LABELS = { youtube: "유튜브", chzzk: "치지직", soop: "SOOP" };
const PLATFORM_EMOJIS = { youtube: "▶️", chzzk: "🟢", soop: "🔵" };

function alertDisplayName(alert) {
  return alert.channelName.length > 20 ? alert.channelName.slice(0, 20) + "…" : alert.channelName;
}

function buildAlertListEmbed(alerts) {
  const embed = new EmbedBuilder().setTitle("📡 방송 알림").setColor(0x5865f2);
  if (alerts.length === 0) {
    return embed.setDescription("등록된 방송 알림이 없습니다.");
  }
  return embed.setDescription(
    alerts
      .map(
        (a, i) =>
          `**${i + 1}.** ${PLATFORM_EMOJIS[a.platform]} [${alertDisplayName(a)}](${a.channelLink}) · <#${a.notifChannelId}>`,
      )
      .join("\n"),
  );
}

function buildStreamAlertComponents(alerts) {
  const rows = [
    new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId("streamalert:platform")
        .setPlaceholder("플랫폼 선택하여 방송 알림 추가")
        .addOptions(
          new StringSelectMenuOptionBuilder().setLabel("유튜브").setEmoji("▶️").setValue("youtube"),
          new StringSelectMenuOptionBuilder().setLabel("치지직").setEmoji("🟢").setValue("chzzk"),
          new StringSelectMenuOptionBuilder().setLabel("SOOP").setEmoji("🔵").setValue("soop"),
        ),
    ),
  ];

  if (alerts.length > 0) {
    rows.push(
      new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId("streamalert:delete_select")
          .setPlaceholder("방송 알림 삭제")
          .addOptions(
            alerts.slice(0, 25).map((a) =>
              new StringSelectMenuOptionBuilder()
                .setLabel(`${PLATFORM_EMOJIS[a.platform]} ${alertDisplayName(a)} (${PLATFORM_LABELS[a.platform]})`)
                .setValue(a.id),
            ),
          ),
      ),
      new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId("streamalert:test_select")
          .setPlaceholder("테스트 알림 전송")
          .addOptions(
            alerts.slice(0, 25).map((a) =>
              new StringSelectMenuOptionBuilder()
                .setLabel(`${PLATFORM_EMOJIS[a.platform]} ${alertDisplayName(a)} (${PLATFORM_LABELS[a.platform]})`)
                .setValue(a.id),
            ),
          ),
      ),
    );
  }

  return rows;
}

async function execute(interaction) {
  const alerts = getGuildAlerts(interaction.guild.id);
  await interaction.reply({
    embeds: [buildAlertListEmbed(alerts)],
    components: buildStreamAlertComponents(alerts),
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
  buildStreamAlertComponents,
  PLATFORM_LABELS,
  PLATFORM_EMOJIS,
};
