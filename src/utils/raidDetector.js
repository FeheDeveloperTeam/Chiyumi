const { EmbedBuilder } = require("discord.js");
const { sendLog, setRaidLocked, getAnnounceChannelId, getLogOptions } = require("./guildConfig");

// 고정 감지 기준
const RAID_THRESHOLD  = 5;   // 5명이
const RAID_WINDOW_MS  = 10_000; // 10초 안에 입장하면 레이드

const recentJoins = new Map(); // guildId → { timestamps: number[], members: GuildMember[] }

async function checkRaid(member, raidConfig) {
  if (!raidConfig.enabled) return;

  const { action, alertChannelId, lockdown } = raidConfig;
  const announceChannelId = getAnnounceChannelId(member.guild.id);
  const now     = Date.now();
  const guildId = member.guild.id;

  const entry = recentJoins.get(guildId) ?? { timestamps: [], members: [] };

  const alive = entry.timestamps
    .map((t, i) => ({ t, m: entry.members[i] }))
    .filter(({ t }) => now - t <= RAID_WINDOW_MS);
  entry.timestamps = alive.map(({ t }) => t);
  entry.members    = alive.map(({ m }) => m);

  entry.timestamps.push(now);
  entry.members.push(member);
  recentJoins.set(guildId, entry);

  if (entry.timestamps.length < RAID_THRESHOLD) return;

  // 레이드 감지 — 목록 초기화 (중복 트리거 방지)
  const raiders = [...entry.members];
  entry.timestamps = [];
  entry.members    = [];
  recentJoins.set(guildId, entry);

  const actionLabel = action === "ban" ? "🔨 자동 밴" : action === "kick" ? "👢 자동 킥" : "⚠️ 경고만";
  const memberList  = raiders.map((m) => `<@${m.id}> \`${m.user.tag}\``).join("\n").slice(0, 1000);

  // 관리자용 상세 임베드 (로그 채널 + 알림 채널)
  const adminEmbed = new EmbedBuilder()
    .setTitle("🚨 레이드 감지!")
    .setColor(0xed4245)
    .addFields(
      { name: "실제 입장", value: `${raiders.length}명`,  inline: true },
      { name: "조치",      value: actionLabel,             inline: true },
      { name: "입장자 목록", value: memberList || "없음" },
    )
    .setTimestamp();

  // 서버 멤버용 공지 임베드 (공지 채널)
  const publicEmbed = new EmbedBuilder()
    .setTitle("⚠️ 서버 보안 경보")
    .setDescription("대량 입장이 감지되어 채널이 임시 잠금되었습니다.\n관리자가 상황을 확인 중이니 잠시 기다려 주세요.")
    .setColor(0xff9900)
    .setTimestamp();

  // 1) 관리자 알림 채널
  if (alertChannelId) {
    const ch = member.guild.channels.cache.get(alertChannelId);
    if (ch) await ch.send({ embeds: [adminEmbed] }).catch(() => {});
  }

  // 2) 서버 로그 채널 (레이드 알림 옵션이 켜진 경우에만)
  if (getLogOptions(member.guild.id).raidAlert) {
    await sendLog(member.guild, adminEmbed);
  }

  // 3) 잠금 모드
  if (lockdown) {
    setRaidLocked(guildId, true);

    // 채널 잠금
    for (const [, channel] of member.guild.channels.cache) {
      if (!channel.isTextBased?.() || !channel.permissionOverwrites) continue;
      await channel.permissionOverwrites.edit(
        member.guild.roles.everyone,
        { SendMessages: false },
        { reason: "레이드 감지 자동 잠금" },
      ).catch(() => {});
    }

    // 초대 링크 일시 정지
    await member.guild.edit({
      features: [...member.guild.features, "INVITES_DISABLED"],
    }).catch(() => {});

    // 공지 채널에만 서버 멤버용 알림 1건 전송
    if (announceChannelId) {
      const announceChannel = member.guild.channels.cache.get(announceChannelId);
      if (announceChannel) await announceChannel.send({ embeds: [publicEmbed] }).catch(() => {});
    }
  }

  // 4) 킥 / 밴
  if (action === "kick" || action === "ban") {
    for (const raider of raiders) {
      if (action === "kick") {
        await raider.kick("레이드 감지 자동 처리").catch(() => {});
      } else {
        await raider.ban({ reason: "레이드 감지 자동 처리", deleteMessageSeconds: 86400 }).catch(() => {});
      }
    }
  }
}

module.exports = { checkRaid };
