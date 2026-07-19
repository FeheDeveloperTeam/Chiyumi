const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
} = require("discord.js");
const { nya } = require("../utils/nya");
const {
  getWarnConfig,
  setWarnThreshold,
  removeWarnThreshold,
  setWarnMaxCount,
  setWarnLogChannel,
} = require("../utils/guildConfig");
const { getUserWarnings, addWarning, removeWarning, resetWarnings } = require("../utils/warnData");

const ACTION_LABEL = { none: "없음", kick: "킥", ban: "영구 밴" };

module.exports = {
  category: "관리",
  data: new SlashCommandBuilder()
    .setName("warn")
    .setNameLocalizations({ ko: "경고" })
    .setDescription("Warning system")
    .setDescriptionLocalizations({ ko: nya("경고 시스템을 관리합니다") })
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .setDMPermission(false)
    .addSubcommand((s) =>
      s
        .setName("give")
        .setNameLocalizations({ ko: "주기" })
        .setDescription(nya("유저에게 경고를 줍니다"))
        .addUserOption((o) =>
          o.setName("유저").setDescription("경고 대상 유저").setRequired(true)
        )
        .addStringOption((o) =>
          o.setName("이유").setDescription("경고 이유").setRequired(false)
        )
    )
    .addSubcommand((s) =>
      s
        .setName("remove")
        .setNameLocalizations({ ko: "취소" })
        .setDescription(nya("경고를 취소합니다"))
        .addUserOption((o) =>
          o.setName("유저").setDescription("경고를 취소할 유저").setRequired(true)
        )
        .addIntegerOption((o) =>
          o.setName("개수").setDescription("취소할 경고 수 (기본 1)").setMinValue(1).setRequired(false)
        )
    )
    .addSubcommand((s) =>
      s
        .setName("check")
        .setNameLocalizations({ ko: "조회" })
        .setDescription(nya("경고 내역을 조회합니다"))
        .addUserOption((o) =>
          o.setName("유저").setDescription("조회할 유저").setRequired(true)
        )
    )
    .addSubcommand((s) =>
      s
        .setName("reset")
        .setNameLocalizations({ ko: "초기화" })
        .setDescription(nya("경고를 모두 초기화합니다"))
        .addUserOption((o) =>
          o.setName("유저").setDescription("초기화할 유저").setRequired(true)
        )
    )
    .addSubcommandGroup((g) =>
      g
        .setName("config")
        .setNameLocalizations({ ko: "설정" })
        .setDescription(nya("경고 시스템 설정"))
        .addSubcommand((s) =>
          s
            .setName("view")
            .setNameLocalizations({ ko: "보기" })
            .setDescription(nya("현재 경고 설정을 확인합니다"))
        )
        .addSubcommand((s) =>
          s
            .setName("add")
            .setNameLocalizations({ ko: "추가" })
            .setDescription(nya("경고 기준을 추가하거나 수정합니다"))
            .addIntegerOption((o) =>
              o.setName("횟수").setDescription("경고 횟수 기준").setMinValue(1).setRequired(true)
            )
            .addStringOption((o) =>
              o
                .setName("행동")
                .setDescription("해당 횟수 도달 시 수행할 행동")
                .setRequired(true)
                .addChoices(
                  { name: "없음 (역할만 부여)", value: "none" },
                  { name: "킥 (서버 추방)", value: "kick" },
                  { name: "영구 밴", value: "ban" },
                )
            )
            .addRoleOption((o) =>
              o.setName("역할").setDescription("부여할 역할 (선택)").setRequired(false)
            )
        )
        .addSubcommand((s) =>
          s
            .setName("delete")
            .setNameLocalizations({ ko: "제거" })
            .setDescription(nya("경고 기준을 제거합니다"))
            .addIntegerOption((o) =>
              o.setName("횟수").setDescription("제거할 경고 횟수 기준").setMinValue(1).setRequired(true)
            )
        )
        .addSubcommand((s) =>
          s
            .setName("max")
            .setNameLocalizations({ ko: "최대" })
            .setDescription(nya("경고 최대 횟수를 설정합니다"))
            .addIntegerOption((o) =>
              o
                .setName("횟수")
                .setDescription("최대 경고 횟수 (이 횟수 도달 시 자동 영구 밴 · 비워두면 해제)")
                .setMinValue(1)
                .setRequired(false)
            )
        )
        .addSubcommand((s) =>
          s
            .setName("logchannel")
            .setNameLocalizations({ ko: "로그채널" })
            .setDescription(nya("경고 로그 채널을 설정합니다"))
            .addChannelOption((o) =>
              o.setName("채널").setDescription("로그 채널 (비워두면 해제)").setRequired(false)
            )
        )
    ),

  async execute(interaction) {
    const group = interaction.options.getSubcommandGroup(false);
    const sub = interaction.options.getSubcommand();

    if (group === "config") return handleConfig(interaction, sub);

    switch (sub) {
      case "give":   return handleGive(interaction);
      case "remove": return handleRemove(interaction);
      case "check":  return handleCheck(interaction);
      case "reset":  return handleReset(interaction);
    }
  },
};

async function handleGive(interaction) {
  const target = interaction.options.getMember("유저");
  const reason = interaction.options.getString("이유") ?? "이유 없음";

  if (!target) {
    return interaction.reply({ content: "해당 유저를 찾을 수 없어요.", ephemeral: true });
  }
  if (target.user.bot) {
    return interaction.reply({ content: "봇에게는 경고를 줄 수 없어요!", ephemeral: true });
  }
  if (target.id === interaction.user.id) {
    return interaction.reply({ content: "자기 자신에게 경고를 줄 수 없어요!", ephemeral: true });
  }

  const config = getWarnConfig(interaction.guild.id);
  const currentData = getUserWarnings(interaction.guild.id, target.id);

  // 최대 횟수 도달 여부 확인
  if (config.maxCount !== null && currentData.count >= config.maxCount) {
    return interaction.reply({
      content: `⚠️ ${target} 님은 이미 최대 경고 횟수(${config.maxCount}회)에 도달했습니다.`,
      ephemeral: true,
    });
  }

  const { count } = addWarning(interaction.guild.id, target.id, reason, interaction.user.id);

  // 정확히 일치하는 기준 찾기
  const threshold = config.thresholds.find((t) => t.count === count);
  // 최대 횟수 도달 여부
  const isMaxReached = config.maxCount !== null && count >= config.maxCount;

  // 역할 부여
  if (threshold?.roleId) {
    const role = interaction.guild.roles.cache.get(threshold.roleId);
    if (role) await target.roles.add(role).catch(() => {});
  }

  // 최대 도달 시 행동 결정
  const effectiveAction = isMaxReached ? "ban" : threshold?.action ?? null;

  const embed = new EmbedBuilder()
    .setTitle("⚠️ 경고 지급")
    .setThumbnail(target.user.displayAvatarURL())
    .addFields(
      { name: "대상",      value: `${target}`,           inline: true },
      { name: "현재 경고", value: `**${count}회**${config.maxCount ? ` / ${config.maxCount}회` : ""}`, inline: true },
      { name: "담당자",    value: `${interaction.user}`,  inline: true },
      { name: "이유",      value: reason },
    )
    .setColor(0xffa500)
    .setTimestamp();

  if (threshold) {
    const roleText = threshold.roleId
      ? (interaction.guild.roles.cache.get(threshold.roleId)?.toString() ?? "역할 없음")
      : "없음";
    embed.addFields(
      { name: "부여 역할", value: roleText,                            inline: true },
      { name: "자동 제재", value: ACTION_LABEL[threshold.action] ?? "없음", inline: true },
    );
  }

  if (isMaxReached && !threshold) {
    embed.addFields({ name: "🚨 자동 제재", value: "최대 경고 도달 → 영구 밴", inline: false });
  }

  await interaction.reply({ embeds: [embed] });

  // 로그 채널 전송
  if (config.logChannelId) {
    const logCh = interaction.guild.channels.cache.get(config.logChannelId);
    await logCh?.send({ embeds: [embed] }).catch(() => {});
  }

  // 제재 실행 (reply 이후)
  if (effectiveAction === "kick") {
    await target.kick(`경고 ${count}회: ${reason}`).catch(() => {});
  } else if (effectiveAction === "ban") {
    await target.ban({ reason: `경고 ${count}회: ${reason}` }).catch(() => {});
  }
}

async function handleRemove(interaction) {
  const target = interaction.options.getUser("유저");
  const amount = interaction.options.getInteger("개수") ?? 1;

  const { count } = removeWarning(interaction.guild.id, target.id, amount);

  await interaction.reply({
    embeds: [
      new EmbedBuilder()
        .setTitle("✅ 경고 취소")
        .addFields(
          { name: "대상",      value: `${target}`, inline: true },
          { name: "취소한 경고", value: `${amount}회`, inline: true },
          { name: "남은 경고", value: `${count}회`,  inline: true },
        )
        .setColor(0x57f287)
        .setTimestamp(),
    ],
    ephemeral: true,
  });
}

async function handleCheck(interaction) {
  const target = interaction.options.getUser("유저");
  const { count, history } = getUserWarnings(interaction.guild.id, target.id);
  const config = getWarnConfig(interaction.guild.id);

  const historyText =
    history.length === 0
      ? "없음"
      : history
          .slice(-10)
          .map((h) => `**${h.id}.** ${h.reason} · <t:${h.timestamp}:d> · <@${h.moderatorId}>`)
          .join("\n");

  await interaction.reply({
    embeds: [
      new EmbedBuilder()
        .setTitle(`⚠️ ${target.username} 경고 내역`)
        .setThumbnail(target.displayAvatarURL())
        .addFields(
          {
            name: "현재 경고",
            value: `${count}회${config.maxCount ? ` / 최대 ${config.maxCount}회` : ""}`,
            inline: true,
          },
          { name: "경고 내역 (최근 10개)", value: historyText },
        )
        .setColor(0xffa500)
        .setTimestamp(),
    ],
    ephemeral: true,
  });
}

async function handleReset(interaction) {
  const target = interaction.options.getUser("유저");
  resetWarnings(interaction.guild.id, target.id);

  await interaction.reply({
    content: `✅ ${target} 님의 경고를 모두 초기화했습니다.`,
    ephemeral: true,
  });
}

async function handleConfig(interaction, sub) {
  switch (sub) {
    case "view":       return handleConfigView(interaction);
    case "add":        return handleConfigAdd(interaction);
    case "delete":     return handleConfigDelete(interaction);
    case "max":        return handleConfigMax(interaction);
    case "logchannel": return handleConfigLogChannel(interaction);
  }
}

async function handleConfigView(interaction) {
  const config = getWarnConfig(interaction.guild.id);

  const logText = config.logChannelId ? `<#${config.logChannelId}>` : "설정 안 됨";
  const maxText = config.maxCount ? `${config.maxCount}회 (도달 시 영구 밴)` : "설정 안 됨";

  const thresholdText =
    config.thresholds.length === 0
      ? "설정된 기준 없음\n`/경고 설정 추가`로 추가할 수 있어요"
      : config.thresholds
          .map((t) => {
            const roleText = t.roleId ? `<@&${t.roleId}>` : "없음";
            return `경고 **${t.count}회** → 역할: ${roleText} | 제재: **${ACTION_LABEL[t.action] ?? "없음"}**`;
          })
          .join("\n");

  await interaction.reply({
    embeds: [
      new EmbedBuilder()
        .setTitle("⚙️ 경고 시스템 설정")
        .addFields(
          { name: "로그 채널",    value: logText },
          { name: "최대 경고 횟수", value: maxText },
          { name: "경고 기준 목록", value: thresholdText },
        )
        .setColor(0x5865f2)
        .setTimestamp(),
    ],
    ephemeral: true,
  });
}

async function handleConfigAdd(interaction) {
  const count  = interaction.options.getInteger("횟수");
  const action = interaction.options.getString("행동");
  const role   = interaction.options.getRole("역할");

  setWarnThreshold(interaction.guild.id, count, role?.id ?? null, action);

  await interaction.reply({
    content: `✅ 경고 **${count}회** 기준 설정 완료\n역할: ${role ?? "없음"} | 제재: **${ACTION_LABEL[action]}**`,
    ephemeral: true,
  });
}

async function handleConfigDelete(interaction) {
  const count = interaction.options.getInteger("횟수");
  removeWarnThreshold(interaction.guild.id, count);

  await interaction.reply({
    content: `✅ 경고 **${count}회** 기준을 제거했습니다.`,
    ephemeral: true,
  });
}

async function handleConfigMax(interaction) {
  const maxCount = interaction.options.getInteger("횟수") ?? null;
  setWarnMaxCount(interaction.guild.id, maxCount);

  await interaction.reply({
    content: maxCount
      ? `✅ 최대 경고 횟수를 **${maxCount}회**로 설정했습니다. (도달 시 자동 영구 밴)`
      : "✅ 최대 경고 횟수 설정을 해제했습니다.",
    ephemeral: true,
  });
}

async function handleConfigLogChannel(interaction) {
  const channel = interaction.options.getChannel("채널");
  setWarnLogChannel(interaction.guild.id, channel?.id ?? null);

  await interaction.reply({
    content: channel
      ? `✅ 경고 로그 채널을 ${channel}로 설정했습니다.`
      : "✅ 경고 로그 채널 설정을 해제했습니다.",
    ephemeral: true,
  });
}
