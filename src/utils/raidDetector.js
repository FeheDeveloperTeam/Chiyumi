const { EmbedBuilder } = require("discord.js");
const { sendLog, setRaidLocked } = require("./guildConfig");

const recentJoins = new Map(); // guildId → { timestamps: number[], members: GuildMember[] }

async function checkRaid(member, raidConfig) {
  if (!raidConfig.enabled) return;

  const { threshold, windowSecs, action, alertChannelId, lockdown } = raidConfig;
  const windowMs = windowSecs * 1000;
  const now = Date.now();
  const guildId = member.guild.id;

  const entry = recentJoins.get(guildId) ?? { timestamps: [], members: [] };

  const alive = entry.timestamps
    .map((t, i) => ({ t, m: entry.members[i] }))
    .filter(({ t }) => now - t <= windowMs);
  entry.timestamps = alive.map(({ t }) => t);
  entry.members    = alive.map(({ m }) => m);

  entry.timestamps.push(now);
  entry.members.push(member);
  recentJoins.set(guildId, entry);

  if (entry.timestamps.length < threshold) return;

  // 레이드 감지 — 목록 초기화 (중복 트리거 방지)
  const raiders = [...entry.members];
  entry.timestamps = [];
  entry.members    = [];
  recentJoins.set(guildId, entry);

  const actionLabel = action === "ban" ? "🔨 자동 밴" : action === "kick" ? "👢 자동 킥" : "⚠️ 경고만";
  const memberList  = raiders.map((m) => `<@${m.id}> \`${m.user.tag}\``).join("\n").slice(0, 1000);

  const raidEmbed = new EmbedBuilder()
    .setTitle("🚨 레이드 감지!")
    .setColor(0xed4245)
    .addFields(
      { name: "감지 기준", value: `${windowSecs}초 내 ${threshold}명 입장`, inline: true },
      { name: "실제 입장", value: `${raiders.length}명`,                     inline: true },
      { name: "조치",      value: actionLabel,                                inline: true },
      { name: "입장자 목록", value: memberList || "없음" },
    )
    .setTimestamp();

  const channelAlertEmbed = new EmbedBuilder()
    .setTitle("🚨 레이드 감지 — 채널이 임시 잠금되었습니다")
    .setDescription("서버 관리자가 상황을 확인 중입니다. `/검열`에서 경보를 해제할 수 있습니다.")
    .setColor(0xed4245)
    .setTimestamp();

  // 1) 지정 알림 채널 전송
  if (alertChannelId) {
    const alertChannel = member.guild.channels.cache.get(alertChannelId);
    if (alertChannel) await alertChannel.send({ embeds: [raidEmbed] }).catch(() => {});
  }

  // 2) 서버 로그 채널 전송
  await sendLog(member.guild, raidEmbed);

  // 3) 잠금 모드 — 모든 텍스트 채널 @everyone SendMessages 차단 + 각 채널에 알림
  if (lockdown) {
    setRaidLocked(guildId, true);

    for (const [, channel] of member.guild.channels.cache) {
      if (!channel.isTextBased?.() || !channel.permissionOverwrites) continue;
      try {
        await channel.permissionOverwrites.edit(
          member.guild.roles.everyone,
          { SendMessages: false },
          { reason: "레이드 감지 자동 잠금" },
        );
        await channel.send({ embeds: [channelAlertEmbed] }).catch(() => {});
      } catch {
        // 채널 접근 불가 무시
      }
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
