const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  PermissionFlagsBits,
  SlashCommandBuilder,
} = require("discord.js");
const { nya } = require("../utils/nya");
const { getLogOptions, getSpamLevel, getRaidConfig, isRaidLocked, getAnnounceChannelId } = require("../utils/guildConfig");
const { SPAM_LEVELS } = require("../utils/spamFilter");

const FILTER_INFO = {
  profanityFilter: {
    title: "욕설 검열",
    description: "서버의 모든 채팅방을 지켜보면서 욕설이 적힌 메시지를 바로 삭제합니다",
  },
};

// ─── 메인 메뉴 ──────────────────────────────────────────────────────────────

function buildMenuEmbed(guildId) {
  const opts = getLogOptions(guildId);
  const spamLevel = getSpamLevel(guildId);
  const raid = getRaidConfig(guildId);

  return new EmbedBuilder()
    .setTitle("검열 설정")
    .setDescription(nya("설정할 항목을 선택하세요"))
    .addFields(
      { name: "🤬 욕설 검열",  value: opts.profanityFilter ? "✅ 켜짐" : "⬜ 꺼짐",                       inline: true },
      { name: "💬 도배 검열",  value: opts.spamFilter ? `✅ 켜짐 (${spamLevel}단계)` : "⬜ 꺼짐",         inline: true },
      { name: "🚨 레이드 검열", value: raid.enabled ? "✅ 켜짐" : "⬜ 꺼짐",                              inline: true },
    )
    .addFields({
      name: "💡 로그 설정",
      value: nya("검열로 삭제된 메시지를 기록하려면 /로그 명령어에서 로그 채널을 설정해주세요"),
    })
    .setColor(0xe1aa74);
}

function buildMenuRow() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("censor-action:profanity").setLabel("욕설검열").setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId("censor-action:spam").setLabel("도배검열").setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId("censor-action:raid").setLabel("레이드검열").setStyle(ButtonStyle.Danger),
  );
}

// ─── 욕설 검열 패널 ─────────────────────────────────────────────────────────

function buildFilterEmbed(guildId, key) {
  const enabled = getLogOptions(guildId)[key];
  const info = FILTER_INFO[key];

  return new EmbedBuilder()
    .setTitle(info.title)
    .setDescription(nya(info.description))
    .addFields(
      { name: "현재 상태", value: enabled ? "✅ 켜짐" : "⬜ 꺼짐", inline: true },
      { name: "💡 로그",   value: nya("/로그 명령어에서 채널을 설정하면 기록이 남습니다"), inline: true },
    )
    .setColor(0xe1aa74);
}

function buildFilterRow(guildId, key) {
  const enabled = getLogOptions(guildId)[key];

  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("censor-action:back")
      .setLabel("← 뒤로")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`censor-toggle:${key}`)
      .setLabel(enabled ? "끄기" : "켜기")
      .setStyle(enabled ? ButtonStyle.Success : ButtonStyle.Secondary),
  );
}

// ─── 도배 검열 패널 ─────────────────────────────────────────────────────────

function buildSpamEmbed(guildId) {
  const enabled = getLogOptions(guildId).spamFilter;
  const level = getSpamLevel(guildId);
  const cfg = SPAM_LEVELS[level];

  return new EmbedBuilder()
    .setTitle("도배 검열 설정")
    .setDescription(nya("단계를 선택하면 바로 적용됩니다. 단계가 높을수록 더 엄격하게 감지합니다"))
    .addFields(
      { name: "현재 상태", value: enabled ? "✅ 켜짐" : "⬜ 꺼짐", inline: true },
      { name: "현재 단계", value: `**${level}단계** · ${cfg.name}`,  inline: true },
      { name: "감지 기준", value: cfg.desc },
    )
    .setColor(0xe1aa74);
}

function buildSpamRows(guildId) {
  const enabled = getLogOptions(guildId).spamFilter;
  const level = getSpamLevel(guildId);

  const levelRow = new ActionRowBuilder().addComponents(
    ...[1, 2, 3, 4, 5].map((n) =>
      new ButtonBuilder()
        .setCustomId(`censor-spam-level:${n}`)
        .setLabel(`${n}단계`)
        .setStyle(n === level ? ButtonStyle.Success : ButtonStyle.Secondary),
    ),
  );

  const ctrlRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("censor-action:back")
      .setLabel("← 뒤로")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("censor-toggle:spamFilter")
      .setLabel(enabled ? "끄기" : "켜기")
      .setStyle(enabled ? ButtonStyle.Success : ButtonStyle.Secondary),
  );

  return [levelRow, ctrlRow];
}

// ─── 레이드 검열 패널 ───────────────────────────────────────────────────────

function buildRaidEmbed(guildId) {
  const cfg     = getRaidConfig(guildId);
  const locked  = isRaidLocked(guildId);
  const announceChannelId = getAnnounceChannelId(guildId);
  const actionLabel = cfg.action === "ban" ? "🔨 자동 밴" : cfg.action === "kick" ? "👢 자동 킥" : "⚠️ 경고만";

  return new EmbedBuilder()
    .setTitle(locked ? "🚨 레이드 검열 설정 — 현재 잠금 중" : "레이드 검열 설정")
    .setDescription(nya("30초 안에 동일한 닉네임을 가진 멤버가 3명 이상 입장하면 레이드로 자동 감지합니다"))
    .addFields(
      { name: "감지",        value: cfg.enabled ? "✅ 켜짐" : "⬜ 꺼짐",                           inline: true },
      { name: "잠금 모드",   value: cfg.lockdown ? "🔒 켜짐" : "🔓 꺼짐",                          inline: true },
      { name: "조치",        value: actionLabel,                                                     inline: true },
      { name: "관리자 알림", value: cfg.alertChannelId ? `<#${cfg.alertChannelId}>` : "설정 안 됨", inline: true },
      { name: "서버 공지 알림", value: announceChannelId ? `<#${announceChannelId}>` : "설정 안 됨", inline: true },
      { name: "현재 상태",   value: locked ? "🔴 경보 중 (채널 잠금됨)" : "🟢 정상",               inline: true },
    )
    .setColor(locked ? 0xff0000 : 0xed4245);
}

function buildRaidRows(guildId) {
  const cfg    = getRaidConfig(guildId);
  const locked = isRaidLocked(guildId);

  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("censor-action:back")
      .setLabel("← 뒤로")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("censor-raid-toggle:enabled")
      .setLabel(cfg.enabled ? "감지 끄기" : "감지 켜기")
      .setStyle(cfg.enabled ? ButtonStyle.Success : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("censor-raid-toggle:lockdown")
      .setLabel(`잠금 모드: ${cfg.lockdown ? "켜짐" : "꺼짐"}`)
      .setStyle(cfg.lockdown ? ButtonStyle.Danger : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("censor-raid-unlock")
      .setLabel(locked ? "🔓 경보 해제" : "경보 해제")
      .setStyle(locked ? ButtonStyle.Danger : ButtonStyle.Secondary)
      .setDisabled(!locked),
  );

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("censor-raid-channel-btn")
      .setLabel("관리자 알림 채널 설정")
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId("censor-raid-announce-btn")
      .setLabel("서버 공지 채널 설정")
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId("censor-raid-test-btn")
      .setLabel("🧪 레이드 테스트")
      .setStyle(ButtonStyle.Secondary),
  );

  const row3 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("censor-raid-action:alert")
      .setLabel("⚠️ 경고만")
      .setStyle(cfg.action === "alert" ? ButtonStyle.Primary : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("censor-raid-action:kick")
      .setLabel("👢 자동 킥")
      .setStyle(cfg.action === "kick" ? ButtonStyle.Primary : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("censor-raid-action:ban")
      .setLabel("🔨 자동 밴")
      .setStyle(cfg.action === "ban" ? ButtonStyle.Danger : ButtonStyle.Secondary),
  );

  return [row1, row2, row3];
}

// ─── 슬래시 커맨드 ──────────────────────────────────────────────────────────

module.exports = {
  category: "관리",
  data: new SlashCommandBuilder()
    .setName("censor")
    .setNameLocalizations({ ko: "검열" })
    .setDescription(nya("욕설 검열, 도배 검열, 레이드 검열 기능을 설정합니다"))
    .setDescriptionLocalizations({ ko: nya("욕설 검열, 도배 검열, 레이드 검열 기능을 설정합니다") })
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setDMPermission(false),

  async execute(interaction) {
    await interaction.reply({
      embeds: [buildMenuEmbed(interaction.guild.id)],
      components: [buildMenuRow()],
      ephemeral: true,
    });
  },

  buildMenuEmbed,
  buildMenuRow,
  buildFilterEmbed,
  buildFilterRow,
  buildSpamEmbed,
  buildSpamRows,
  buildRaidEmbed,
  buildRaidRows,
};
