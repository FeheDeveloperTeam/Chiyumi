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

async function execute(interaction) {
  const sub = interaction.options.getSubcommand();
  const guildId = interaction.guild.id;

  if (sub === "add") {
    const row = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId("streamalert:platform")
        .setPlaceholder("플랫폼 선택")
        .addOptions(
          new StringSelectMenuOptionBuilder().setLabel("유튜브").setEmoji("▶️").setValue("youtube"),
          new StringSelectMenuOptionBuilder().setLabel("치지직").setEmoji("🟢").setValue("chzzk"),
          new StringSelectMenuOptionBuilder().setLabel("SOOP").setEmoji("🔵").setValue("soop"),
        ),
    );
    await interaction.reply({
      content: nya("알림을 등록할 플랫폼을 선택하세요"),
      components: [row],
      ephemeral: true,
    });
    return;
  }

  const alerts = getGuildAlerts(guildId);

  if (sub === "list") {
    if (alerts.length === 0) {
      await interaction.reply({ content: nya("등록된 방송 알림이 없습니다"), ephemeral: true });
      return;
    }
    await interaction.reply({ embeds: [buildAlertListEmbed(alerts)], ephemeral: true });
    return;
  }

  if (sub === "remove" || sub === "test") {
    if (alerts.length === 0) {
      await interaction.reply({ content: nya("등록된 방송 알림이 없습니다"), ephemeral: true });
      return;
    }
    const customId = sub === "remove" ? "streamalert:delete_select" : "streamalert:test_select";
    const label =
      sub === "remove" ? "삭제할 방송인을 선택하세요" : "테스트 알림을 보낼 방송인을 선택하세요";
    const row = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(customId)
        .setPlaceholder(label)
        .addOptions(
          alerts
            .slice(0, 25)
            .map((a) =>
              new StringSelectMenuOptionBuilder()
                .setLabel(`${a.channelName} (${PLATFORM_LABELS[a.platform]})`)
                .setValue(a.id),
            ),
        ),
    );
    await interaction.reply({ content: nya(label), components: [row], ephemeral: true });
    return;
  }
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("streamalert")
    .setNameLocalizations({ ko: "방송알림" })
    .setDescription("방송 알림을 관리합니다")
    .setDescriptionLocalizations({ ko: "방송 알림을 관리합니다" })
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((sub) =>
      sub
        .setName("add")
        .setNameLocalizations({ ko: "추가" })
        .setDescription("방송 알림을 추가합니다")
        .setDescriptionLocalizations({ ko: "방송 알림을 추가합니다" }),
    )
    .addSubcommand((sub) =>
      sub
        .setName("remove")
        .setNameLocalizations({ ko: "삭제" })
        .setDescription("방송 알림을 삭제합니다")
        .setDescriptionLocalizations({ ko: "방송 알림을 삭제합니다" }),
    )
    .addSubcommand((sub) =>
      sub
        .setName("list")
        .setNameLocalizations({ ko: "목록" })
        .setDescription("등록된 방송 알림 목록을 확인합니다")
        .setDescriptionLocalizations({ ko: "등록된 방송 알림 목록을 확인합니다" }),
    )
    .addSubcommand((sub) =>
      sub
        .setName("test")
        .setNameLocalizations({ ko: "테스트" })
        .setDescription("방송 알림 테스트 전송")
        .setDescriptionLocalizations({ ko: "방송 알림 테스트 전송" }),
    ),
  execute,
  buildAlertListEmbed,
  PLATFORM_LABELS,
  PLATFORM_EMOJIS,
};
