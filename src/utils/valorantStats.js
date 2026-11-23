// /전적검색 → 발로란트: 입력 창, 전적 목록, 모드 필터, 경기 상세(같은 메시지 안에서 전환).
// 화면 부품과 이전 메시지 정리는 statsUi.js를 롤 전적검색과 함께 쓴다.
const { EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require("discord.js");
const { nya } = require("./nya");
const { createSession, getSession } = require("./statsSession");
const {
  isValorantConfigured,
  getValorantAccount,
  getValorantMmr,
  getValorantMatches,
  getValorantLocale,
  toAffinity,
  slimMatch,
} = require("./valorant");
const {
  relativeTime,
  buildFilterRow,
  buildMatchPicker,
  buildDetailNavRow,
  deleteGamePicker,
  rememberStatsMessage,
} = require("./statsUi");

const VAL_MODAL_ID = "stats-modal-val";
const VAL_PREFIX = "stats-v"; // 아래 버튼·드롭다운 ID는 모두 이걸로 시작한다
const VAL_FILTER_PREFIX = "stats-vfilter:";
const VAL_PICK_PREFIX = "stats-vpick:";
const VAL_DETAIL_PREFIX = "stats-vdetail:";
const VAL_BACK_PREFIX = "stats-vback:";
const VAL_SHARE_PREFIX = "stats-vshare:";
const VAL_COLOR = 0xff4655;

const FILTERS = [
  { id: "all", label: "전체" },
  { id: "competitive", label: "경쟁전" },
  { id: "unrated", label: "일반전" },
  { id: "swiftplay", label: "신속플레이" },
  { id: "deathmatch", label: "데스매치" },
];

const EXPIRED = () => nya("전적 정보가 만료되었습니다. 다시 검색해주세요.") + "\n(오류 코드: STATS-004)";
const NOT_READY = () => nya("발로란트 전적 검색은 아직 준비 중입니다.") + "\n(오류 코드: STATS-007)";

async function showValorantStatsModal(interaction) {
  if (!isValorantConfigured()) {
    await interaction.reply({ content: NOT_READY(), ephemeral: true });
    return;
  }

  const modal = new ModalBuilder().setCustomId(VAL_MODAL_ID).setTitle("발로란트 전적 검색");
  modal.addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId("riot_id")
        .setLabel("닉네임#태그")
        .setStyle(TextInputStyle.Short)
        .setPlaceholder("예: 닉네임#KR1")
        .setRequired(true),
    ),
  );
  await interaction.showModal(modal);
}

// ---- 경기 계산
function formatDuration(ms) {
  const seconds = Math.round(ms / 1000);
  return `${Math.floor(seconds / 60)}분 ${seconds % 60}초`;
}

function findMe(match, puuid) {
  return match.players.find((p) => p.puuid === puuid) ?? null;
}

// 팀이 정확히 2개일 때만 팀전(경쟁전·일반전·신속플레이 등). 데스매치는 플레이어마다 팀이 하나씩 온다.
const isTeamMatch = (match) => match.teams.length === 2;

// 팀전이면 승리/패배/무승부와 라운드 점수, 개인전(데스매치 등)이면 순위.
function resultOf(match, me) {
  const team = isTeamMatch(match) ? match.teams.find((t) => t.id === me.teamId) : null;
  if (team) {
    const score = `${team.roundsWon}:${team.roundsLost}`;
    if (team.won) return { icon: "✅", text: "승리", score };
    if (team.roundsWon === team.roundsLost) return { icon: "➖", text: "무승부", score };
    return { icon: "❌", text: "패배", score };
  }
  const placement = match.teams.find((t) => t.id === me.teamId)?.placement;
  const rank =
    placement ??
    [...match.players].sort((a, b) => b.kills - a.kills || b.score - a.score).findIndex((p) => p.puuid === me.puuid) + 1;
  return { icon: rank === 1 ? "🏆" : "🎯", text: `${rank}위`, score: "" };
}

const acsOf = (match, p) => (isTeamMatch(match) && match.roundsPlayed > 0 ? Math.round(p.score / match.roundsPlayed) : null);

function headshotRate(p) {
  const shots = p.headshots + p.bodyshots + p.legshots;
  return shots > 0 ? Math.round((p.headshots / shots) * 100) : null;
}

function tierText(locale, tierId, rr) {
  if (!tierId) return "랭크 없음";
  const name = locale.tiers.get(tierId)?.name ?? `티어 ${tierId}`;
  return rr == null ? name : `${name}  ${rr}RR`;
}

// 지금 필터에 맞는 경기 번호 목록(최대 10개)
function visibleOrder(session) {
  return session.matches
    .map((match, index) => ({ match, index }))
    .filter(({ match }) => session.filter === "all" || match.queueId === session.filter)
    .map(({ index }) => index);
}

// ---- 목록 화면
function buildListView(sessionId, session) {
  const { account, mmr, locale } = session;
  const order = visibleOrder(session);
  const current = mmr?.current;
  const currentTier = current?.tier?.id ?? 0;
  const peak = mmr?.peak;

  let currentText = tierText(locale, currentTier, currentTier ? current?.rr : null);
  if (!currentTier && current?.games_needed_for_rating > 0) {
    currentText += `\n배치 ${current.games_needed_for_rating}판 남음`;
  }

  const lines = order.map((index, i) => {
    const match = session.matches[index];
    const me = findMe(match, session.puuid);
    const r = resultOf(match, me);
    return `\`${i + 1}\` ${r.icon} **${r.text}**${r.score ? ` ${r.score}` : ""} · ${me.agentName} · ${match.mapName} · ${me.kills}/${me.deaths}/${me.assists}`;
  });

  // 승률(팀전만)
  const teamGames = order.map((i) => session.matches[i]).filter(isTeamMatch);
  const wins = teamGames.filter((m) => resultOf(m, findMe(m, session.puuid)).text === "승리").length;
  const summaryLabel = teamGames.length === order.length ? "최근" : "팀전"; // 데스매치가 섞이면 팀전만 센다
  const summary = teamGames.length > 0 ? `${summaryLabel} ${teamGames.length}판 ${wins}승 ${teamGames.length - wins}패` : "";

  const embed = new EmbedBuilder()
    .setTitle(`${account.name}#${account.tag}`)
    .setColor(locale.tiers.get(currentTier)?.color || VAL_COLOR)
    .addFields(
      { name: "계정 레벨", value: `Lv. **${account.account_level ?? "?"}**`, inline: true },
      { name: "현재 티어", value: currentText, inline: true },
      {
        name: "최고 티어",
        value: peak?.tier?.id
          ? `${tierText(locale, peak.tier.id, null)}${peak.season?.short ? ` (${peak.season.short})` : ""}`
          : "기록 없음",
        inline: true,
      },
      {
        name: `최근 전적${summary ? ` — ${summary}` : ""}`,
        value:
          session.matches.length === 0
            ? "최근 경기 기록이 없습니다"
            : lines.join("\n") || "해당 게임 모드의 전적이 없습니다",
      },
    )
    .setFooter({
      text: `${order.length > 0 ? "아래 목록에서 경기를 고르면 자세히 볼 수 있어요 · " : ""}HenrikDev API · Riot Games 공식 제품이 아닙니다`,
    });

  const tierIcon = locale.tiers.get(currentTier)?.icon;
  if (currentTier && tierIcon) embed.setThumbnail(tierIcon);
  if (account.card) {
    embed.setAuthor({ name: "발로란트", iconURL: `https://media.valorant-api.com/playercards/${account.card}/smallart.png` });
  }

  const present = new Set(session.matches.map((m) => m.queueId));
  const filterRow = buildFilterRow(
    VAL_FILTER_PREFIX,
    sessionId,
    FILTERS.filter((f) => f.id === "all" || present.has(f.id)),
    session.filter,
  );
  const picker = buildMatchPicker(
    `${VAL_PICK_PREFIX}${sessionId}`,
    order.map((index, i) => {
      const match = session.matches[index];
      const me = findMe(match, session.puuid);
      const r = resultOf(match, me);
      const when = relativeTime(match.startedAt);
      return {
        index,
        emoji: r.icon,
        label: `${i + 1}. ${r.text}${r.score ? ` ${r.score}` : ""} · ${me.agentName} · ${match.mapName}`,
        description: [match.queueName, `${me.kills}/${me.deaths}/${me.assists}`, when].filter(Boolean).join(" · "),
      };
    }),
  );

  return { embeds: [embed], components: [filterRow, picker].filter(Boolean) };
}

// ---- 상세 화면
function playerLine(match, p, puuid) {
  const acs = acsOf(match, p);
  const text = `${p.agentName} ${p.name}#${p.tag}  ${p.kills}/${p.deaths}/${p.assists}${acs != null ? `  ACS ${acs}` : ""}`;
  return p.puuid === puuid ? `**${text}**` : text;
}

function teamFields(match, puuid) {
  const byScore = (a, b) => b.score - a.score;
  if (isTeamMatch(match)) {
    // 내 팀을 먼저 보여 준다
    const me = findMe(match, puuid);
    const teams = [...match.teams].sort((a, b) => (b.id === me?.teamId) - (a.id === me?.teamId));
    return teams.map((team) => {
      const label = team.id === "Blue" ? "🔵 블루팀" : team.id === "Red" ? "🔴 레드팀" : team.id;
      const lines = match.players
        .filter((p) => p.teamId === team.id)
        .sort(byScore)
        .map((p) => playerLine(match, p, puuid));
      return {
        name: `${label}${team.id === me?.teamId ? " (내 팀)" : ""} · ${team.roundsWon}라운드${team.won ? " 승리" : ""}`,
        value: (lines.join("\n") || "정보 없음").slice(0, 1024),
      };
    });
  }
  const placeOf = (p) => match.teams.find((t) => t.id === p.teamId)?.placement ?? null;
  const lines = [...match.players]
    .sort((a, b) => (placeOf(a) ?? 99) - (placeOf(b) ?? 99) || b.kills - a.kills || byScore(a, b))
    .slice(0, 14)
    .map((p, i) => `\`${placeOf(p) ?? i + 1}\` ${playerLine(match, p, puuid)}`);
  return [{ name: "순위", value: (lines.join("\n") || "정보 없음").slice(0, 1024) }];
}

function buildDetailEmbed(session, match) {
  const me = findMe(match, session.puuid);
  const r = resultOf(match, me);
  const acs = acsOf(match, me);
  const hs = headshotRate(me);
  const kd = me.deaths > 0 ? (me.kills / me.deaths).toFixed(2) : String(me.kills);
  const stats = [
    `킬/데스/어시스트: **${me.kills}/${me.deaths}/${me.assists}** (K/D ${kd})`,
    acs != null ? `평균 전투 점수(ACS): ${acs}` : null,
    // 데스매치는 피해량이 0으로만 와서 0이면 줄을 뺀다.
    me.damage > 0
      ? `피해량: ${me.damage}${isTeamMatch(match) && match.roundsPlayed > 0 ? ` (라운드당 ${Math.round(me.damage / match.roundsPlayed)})` : ""}`
      : null,
    hs != null ? `헤드샷 비율: ${hs}%` : null,
  ].filter(Boolean);

  const embed = new EmbedBuilder()
    .setAuthor({ name: `${session.account.name}#${session.account.tag}` })
    .setTitle(`${r.icon} ${me.agentName} - ${r.text}${r.score ? ` (${r.score})` : ""}`)
    .setDescription(nya(`${match.queueName} | ${match.mapName} | ${formatDuration(match.lengthMs)}`))
    .addFields({ name: "내 기록", value: stats.join("\n") }, ...teamFields(match, session.puuid))
    .setColor(r.text === "승리" || r.text === "1위" ? 0x3ba55d : r.text === "패배" ? 0xed4245 : VAL_COLOR);
  if (me.agentIcon) embed.setThumbnail(me.agentIcon);
  if (match.startedAt) embed.setTimestamp(new Date(match.startedAt));
  return embed;
}

function buildDetailView(sessionId, session, index) {
  return {
    embeds: [buildDetailEmbed(session, session.matches[index])],
    components: [
      buildDetailNavRow({
        navPrefix: VAL_DETAIL_PREFIX,
        backId: `${VAL_BACK_PREFIX}${sessionId}`,
        sharePrefix: VAL_SHARE_PREFIX,
        sessionId,
        order: visibleOrder(session),
        index,
      }),
    ],
  };
}

// ---- 검색
async function handleValorantStatsModal(interaction) {
  const riotId = interaction.fields.getTextInputValue("riot_id").trim();
  const [name, tag] = riotId.split("#").map((part) => part?.trim());

  if (!name || !tag) {
    await interaction.reply({
      content: nya("닉네임#태그 형식으로 입력해주세요. 예: 닉네임#KR1") + "\n(오류 코드: STATS-001)",
      ephemeral: true,
    });
    return;
  }

  if (!isValorantConfigured()) {
    await interaction.reply({ content: NOT_READY(), ephemeral: true });
    return;
  }

  await deleteGamePicker(interaction);
  await interaction.deferReply({ ephemeral: true });

  const failText = (error) => {
    if (error.status === 404) return nya(`'${name}#${tag}' 플레이어를 찾을 수 없습니다.`) + "\n(오류 코드: STATS-002)";
    if (error.status === 429) return nya("지금 전적 조회 요청이 많습니다. 1분 뒤에 다시 시도해주세요.") + "\n(오류 코드: STATS-008)";
    console.error("[발로란트 전적]", error.status ?? "", error.message);
    return nya("전적을 불러오는 중 오류가 발생했습니다.") + "\n(오류 코드: STATS-003)";
  };

  let account;
  try {
    account = await getValorantAccount(name, tag);
  } catch (error) {
    await interaction.editReply(failText(error));
    return;
  }

  try {
    const affinity = toAffinity(account.region);
    const [mmr, rawMatches, locale] = await Promise.all([
      getValorantMmr(affinity, account.name, account.tag),
      getValorantMatches(affinity, account.name, account.tag, 10),
      getValorantLocale(),
    ]);

    const matches = rawMatches.map((m) => slimMatch(m, locale)).filter((m) => findMe(m, account.puuid));
    const session = { kind: "valorant", puuid: account.puuid, account, mmr, matches, locale, filter: "all" };
    const sessionId = createSession(session);

    await interaction.editReply({ content: null, ...buildListView(sessionId, session) });
    rememberStatsMessage(interaction);
  } catch (error) {
    await interaction.editReply(failText(error));
  }
}

// ---- 버튼·드롭다운 (처리했으면 true)
async function handleValorantComponent(interaction) {
  const id = interaction.customId;
  if (!id.startsWith(VAL_PREFIX)) return false;

  const prefix = [VAL_FILTER_PREFIX, VAL_PICK_PREFIX, VAL_DETAIL_PREFIX, VAL_BACK_PREFIX, VAL_SHARE_PREFIX].find((p) =>
    id.startsWith(p),
  );
  if (!prefix) return false;

  const [sessionId, arg] = id.slice(prefix.length).split(":");
  const session = getSession(sessionId);
  if (!session || session.kind !== "valorant") {
    await interaction.reply({ content: EXPIRED(), ephemeral: true });
    return true;
  }

  if (prefix === VAL_FILTER_PREFIX) {
    session.filter = FILTERS.some((f) => f.id === arg) ? arg : "all";
    await interaction.update(buildListView(sessionId, session));
    return true;
  }

  if (prefix === VAL_BACK_PREFIX) {
    await interaction.update(buildListView(sessionId, session));
    return true;
  }

  const index = Number(prefix === VAL_PICK_PREFIX ? interaction.values?.[0] : arg);
  const match = session.matches[index];
  if (!match) {
    await interaction.reply({ content: nya("해당 경기를 찾을 수 없습니다.") + "\n(오류 코드: STATS-005)", ephemeral: true });
    return true;
  }
  if (!findMe(match, session.puuid)) {
    await interaction.reply({ content: nya("경기 데이터를 불러올 수 없습니다.") + "\n(오류 코드: STATS-006)", ephemeral: true });
    return true;
  }

  if (prefix === VAL_SHARE_PREFIX) {
    await interaction.reply({
      content: `📢 <@${interaction.user.id}>님이 공유한 발로란트 전적`,
      embeds: [buildDetailEmbed(session, match)],
      allowedMentions: { parse: [] },
    });
    return true;
  }

  await interaction.update(buildDetailView(sessionId, session, index));
  return true;
}

module.exports = {
  VAL_MODAL_ID,
  showValorantStatsModal,
  handleValorantStatsModal,
  handleValorantComponent,
  // 테스트용
  buildListView,
  buildDetailView,
};
