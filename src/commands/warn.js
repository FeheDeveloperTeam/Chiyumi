const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  PermissionFlagsBits,
  SlashCommandBuilder,
} = require("discord.js");
const { nya } = require("../utils/nya");
const { getWarnConfig } = require("../utils/guildConfig");

const ACTION_LABEL = { none: "없음", mute: "뮤트", kick: "킥", ban: "영구 밴" };

function formatDuration(ms) {
  if (!ms) return "?";
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `${mins}분`;
  const hours = Math.floor(ms / 3600000);
  if (hours < 24) return `${hours}시간`;
  const days = Math.floor(ms / 86400000);
  return `${days}일`;
}

function buildWarnEmbed(guildId) {
  const config = getWarnConfig(guildId);
  const logText = config.logChannelId ? `<#${config.logChannelId}>` : "설정 안 됨";
  const maxText = config.maxCount ? `${config.maxCount}회 도달 시 영구 밴` : "설정 안 됨";
  const thresholdText =
    config.thresholds.length === 0
      ? "설정 없음 — [마법사로 설정] 버튼으로 추가하세요"
      : config.thresholds
          .map((t) => {
            const roleText = t.roleId ? `<@&${t.roleId}>` : "없음";
            const actionText =
              t.action === "mute" && t.duration
                ? `뮤트 (${formatDuration(t.duration)})`
                : ACTION_LABEL[t.action] ?? "없음";
            return `경고 **${t.count}회** → 역할: ${roleText} | 제재: **${actionText}**`;
          })
          .join("\n");

  return new EmbedBuilder()
    .setTitle("⚠️ 경고 시스템")
    .setDescription(nya("버튼으로 경고를 지급·관리하거나 기준을 설정할 수 있습니다"))
    .addFields(
      { name: "로그 채널", value: logText, inline: true },
      { name: "최대 경고 횟수", value: maxText, inline: true },
      { name: "​", value: "​", inline: true },
      { name: "경고 기준", value: thresholdText },
    )
    .setColor(0xffa500);
}

function buildWarnRows() {
  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("warn-btn:give").setLabel("경고 추가").setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId("warn-btn:remove").setLabel("경고 취소").setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId("warn-btn:check").setLabel("경고 조회").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("warn-btn:reset").setLabel("경고 초기화").setStyle(ButtonStyle.Secondary),
  );

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("warn-cfg:wizard").setLabel("마법사로 설정").setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId("warn-cfg:delete").setLabel("기준 제거").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("warn-cfg:max").setLabel("최대 횟수").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("warn-cfg:logchannel").setLabel("로그 채널").setStyle(ButtonStyle.Secondary),
  );

  return [row1, row2];
}

module.exports = {
  category: "관리",
  data: new SlashCommandBuilder()
    .setName("warn")
    .setNameLocalizations({ ko: "경고" })
    .setDescription("Warning system panel")
    .setDescriptionLocalizations({ ko: nya("경고 시스템 패널을 엽니다") })
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setDMPermission(false),

  async execute(interaction) {
    await interaction.reply({
      embeds: [buildWarnEmbed(interaction.guild.id)],
      components: buildWarnRows(),
      ephemeral: true,
    });
  },

  buildWarnEmbed,
  buildWarnRows,
  formatDuration,
};
