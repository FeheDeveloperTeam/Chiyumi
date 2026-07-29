const { EmbedBuilder } = require("discord.js");
const { sendLog, setRaidLocked, getAnnounceChannelId, getLogOptions } = require("./guildConfig");

// 같은 닉네임이 이 숫자 이상 윈도우 안에 입장하면 레이드로 판단
const RAID_SAME_NAME_THRESHOLD = 5;
const RAID_WINDOW_MS = 10_000; // 10초

// guildId → Map<normalizedName, { timestamps: number[], members: GuildMember[] }>
const recentJoins = new Map();

function getDisplayName(member) {
  return (member.user.globalName ?? member.user.username).toLowerCase().trim();
}

async function checkRaid(member, raidConfig) {
  if (!raidConfig.enabled) return;

  const { action, lockdown } = raidConfig;
  const announceChannelId = getAnnounceChannelId(member.guild.id);
  const now     = Date.now();
  const guildId = member.guild.id;
  const name    = getDisplayName(member);

  if (!recentJoins.has(guildId)) recentJoins.set(guildId, new Map());
  const guildMap = recentJoins.get(guildId);

  const entry = guildMap.get(name) ?? { timestamps: [], members: [] };

  // 윈도우 밖 항목 제거
  const alive = entry.timestamps
    .map((t, i) => ({ t, m: entry.members[i] }))
    .filter(({ t }) => now - t <= RAID_WINDOW_MS);
  entry.timestamps = alive.map(({ t }) => t);
  entry.members    = alive.map(({ m }) => m);

  entry.timestamps.push(now);
  entry.members.push(member);
  guildMap.set(name, entry);

  if (entry.timestamps.length < RAID_SAME_NAME_THRESHOLD) return;

  // 레이드 감지 — 해당 닉네임 항목 초기화 (중복 트리거 방지)
  const raiders = [...entry.members];
  guildMap.set(name, { timestamps: [], members: [] });

  const actionLabel  = action === "ban" ? "🔨 자동 밴" : action === "kick" ? "👢 자동 킥" : "⚠️ 경고만";
  const memberList   = raiders.map((m) => `<@${m.id}> \`${m.user.tag}\``).join("\n").slice(0, 1000);
  const displayLabel = raiders[0].user.globalName ?? raiders[0].user.username;

  // 관리자용 상세 임베드
  const adminEmbed = new EmbedBuilder()
    .setTitle("🚨 레이드 감지!")
    .setColor(0xed4245)
    .addFields(
      { name: "감지 닉네임", value: `\`${displayLabel}\``,   inline: true },
      { name: "입장 인원",   value: `${raiders.length}명`,   inline: true },
      { name: "조치",        value: actionLabel,              inline: true },
      { name: "입장자 목록", value: memberList || "없음" },
    )
    .setTimestamp();

  // 서버 멤버용 공지 임베드
  const publicEmbedBuilder = new EmbedBuilder()
    .setTitle("🚨 서버 보안 경보")
    .setDescription("동일한 닉네임의 대량 입장이 감지되었습니다.")
    .setColor(0xed4245)
    .setTimestamp();

  if (lockdown) {
    publicEmbedBuilder.addFields(
      { name: "초대 링크", value: "🔴 일시 차단",     inline: true },
      { name: "채널 잠금", value: "🔴 임시 잠금",     inline: true },
      { name: "상태",      value: "🔧 관리자 조치 중", inline: true },
      { name: "안내", value: "관리자가 상황을 처리하고 있습니다. 잠시 기다려 주세요." },
    );
  } else {
    publicEmbedBuilder.addFields(
      { name: "상태", value: "🔧 관리자 확인 중", inline: true },
      { name: "안내", value: "관리자가 상황을 확인하고 있습니다. 잠시 기다려 주세요.", inline: true },
    );
  }

  const publicEmbed = publicEmbedBuilder;

  // 로그 채널 (레이드 알림 옵션이 켜진 경우만)
  if (getLogOptions(member.guild.id).raidAlert) {
    await sendLog(member.guild, adminEmbed);
  }

  // 3) 잠금 모드
  if (lockdown) {
    setRaidLocked(guildId, true);

    for (const [, channel] of member.guild.channels.cache) {
      if (!channel.isTextBased?.() || !channel.permissionOverwrites) continue;
      await channel.permissionOverwrites.edit(
        member.guild.roles.everyone,
        { SendMessages: false },
        { reason: "레이드 감지 자동 잠금" },
      ).catch(() => {});
    }

    await member.guild.edit({
      features: [...member.guild.features, "INVITES_DISABLED"],
    }).catch(() => {});
  }

  // 4) 서버원 공지 (raidAnnounce 옵션이 켜진 경우만)
  if (getLogOptions(guildId).raidAnnounce && announceChannelId) {
    const announceChannel = member.guild.channels.cache.get(announceChannelId);
    if (announceChannel) await announceChannel.send({ embeds: [publicEmbed] }).catch(() => {});
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
