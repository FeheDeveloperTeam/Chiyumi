// /전적검색 → 발로란트: 입력 창, 전적 화면, 게임 모드 필터, 경기 상세.
// 롤 전적검색과 같은 흐름(세션 10분, 다음 검색 때 이전 메시지 삭제)을 쓴다.
const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require("discord.js");
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

const VAL_MODAL_ID = "stats-modal-val";
const VAL_FILTER_PREFIX = "stats-vfilter:";
const VAL_DETAIL_PREFIX = "stats-vdetail:";
const VAL_COLOR = 0xff4655;
const DISPLAY_COUNT = 5;

const FILTERS = [
  { id: "all", label: "전체" },
  { id: "competitive", label: "경쟁전" },
  { id: "unrated", label: "일반전" },
  { id: "swiftplay", label: "신속플레이" },
  { id: "deathmatch", label: "데스매치" },
];

const EXPIRED = () => nya("전적 정보가 만료되었습니다. 다시 검색해주세요.") + "\n(오류 코드: STATS-004)";

async function showValorantStatsModal(interaction) {
  if (!isValorantConfigured()) {
    await interaction.reply({
      content: nya("발로란트 전적 검색은 아직 준비 중입니다.") + "\n(오류 코드: STATS-007)",
      ephemeral: true,
    });
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
  const rank = placement ?? [...match.players].sort((a, b) => b.kills - a.kills || b.score - a.score).findIndex((p) => p.puuid === me.puuid) + 1;
  return { icon: rank === 1 ? "🏆" : "▫️", text: `${rank}위`, score: "" };
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

function buildMatchLines(session, displayWithIdx) {
  const lines = displayWithIdx
    .map(({ match }, i) => {
      const me = findMe(match, session.puuid);
      if (!me) return null;
      const r = resultOf(match, me);
      return `\`${i + 1}\` ${match.queueName}  **${me.agentName}**  ${match.mapName}  ${me.kills}/${me.deaths}/${me.assists}  ${r.icon} ${r.text}${r.score ? ` ${r.score}` : ""}`;
    })
    .filter(Boolean);
  if (session.matches.length === 0) return "최근 경기 기록이 없습니다";
  return lines.join("\n") || "해당 게임 모드의 전적이 없습니다";
}

function buildValorantEmbeds(session, displayWithIdx) {
  const { account, mmr, locale } = session;
  const current = mmr?.current;
  const currentTier = current?.tier?.id ?? 0;
  const peak = mmr?.peak;

  let currentText = tierText(locale, currentTier, currentTier ? current?.rr : null);
  if (!currentTier && current?.games_needed_for_rating > 0) {
    currentText += `\n배치 ${current.games_needed_for_rating}판 남음`;
  }

  const embed = new EmbedBuilder()
    .setTitle(`${account.name}#${account.tag}`)
    .setColor(locale.tiers.get(currentTier)?.color || VAL_COLOR)
    .addFields(
      { name: "계정 레벨", value: `Lv. **${account.account_level ?? "?"}**`, inline: true },
      { name: "현재 티어", value: currentText, inline: true },
      {
        name: "최고 티어",
        value: peak?.tier?.id ? `${tierText(locale, peak.tier.id, null)}${peak.season?.short ? ` (${peak.season.short})` : ""}` : "기록 없음",
        inline: true,
      },
      { name: "최근 전적", value: buildMatchLines(session, displayWithIdx) },
    )
    .setFooter({ text: "HenrikDev API · 본 기능은 Riot Games의 공식 제품이 아닙니다" });

  const tierIcon = locale.tiers.get(currentTier)?.icon;
  if (currentTier && tierIcon) embed.setThumbnail(tierIcon);
  if (account.card) {
    embed.setAuthor({ name: "발로란트", iconURL: `https://media.valorant-api.com/playercards/${account.card}/smallart.png` });
  }

  return [embed];
}

function buildValorantRows(sessionId, displayWithIdx, session) {
  const present = new Set(session.matches.map((m) => m.queueId));
  const rows = [];

  const filters = FILTERS.filter((f) => f.id === "all" || present.has(f.id));
  if (filters.length > 1) {
    rows.push(
      new ActionRowBuilder().addComponents(
        filters.map((f) =>
          new ButtonBuilder()
            .setCustomId(`${VAL_FILTER_PREFIX}${sessionId}:${f.id}`)
            .setLabel(f.label)
            .setStyle(ButtonStyle.Secondary),
        ),
      ),
    );
  }

  if (displayWithIdx.length > 0) {
    rows.push(
      new ActionRowBuilder().addComponents(
        displayWithIdx.map(({ originalIndex }, i) =>
          new ButtonBuilder()
            .setCustomId(`${VAL_DETAIL_PREFIX}${sessionId}:${originalIndex}`)
            .setLabel(`${i + 1}경기 더보기`)
            .setStyle(ButtonStyle.Primary),
        ),
      ),
    );
  }

  return rows;
}

function filterMatches(session, filterId) {
  return session.matches
    .map((match, originalIndex) => ({ match, originalIndex }))
    .filter(({ match }) => filterId === "all" || match.queueId === filterId)
    .slice(0, DISPLAY_COUNT);
}

async function handleValorantStatsModal(interaction, { userStatsTokens, tryDeleteInteractionMsg }) {
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
    await interaction.reply({
      content: nya("발로란트 전적 검색은 아직 준비 중입니다.") + "\n(오류 코드: STATS-007)",
      ephemeral: true,
    });
    return;
  }

  // 게임 선택 메시지 삭제 (모달 제출 시점에 더 이상 필요 없음)
  const prev = userStatsTokens.get(interaction.user.id);
  if (prev?.cmdToken) {
    userStatsTokens.set(interaction.user.id, { applicationId: prev.applicationId });
    await tryDeleteInteractionMsg(interaction.client, prev.applicationId, prev.cmdToken);
  }

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
    const session = { kind: "valorant", puuid: account.puuid, account, mmr, matches, locale };
    const sessionId = createSession(session);

    const displayWithIdx = filterMatches(session, "all");
    await interaction.editReply({
      content: null,
      embeds: buildValorantEmbeds(session, displayWithIdx),
      components: buildValorantRows(sessionId, displayWithIdx, session),
    });

    // 다음 검색 시 삭제할 수 있도록 토큰 보관
    userStatsTokens.set(interaction.user.id, {
      applicationId: interaction.applicationId,
      statsToken: interaction.token,
    });
  } catch (error) {
    await interaction.editReply(failText(error));
  }
}

async function handleValorantFilterButton(interaction) {
  const [sessionId, filterId] = interaction.customId.slice(VAL_FILTER_PREFIX.length).split(":");
  const session = getSession(sessionId);
  if (!session || session.kind !== "valorant") {
    await interaction.reply({ content: EXPIRED(), ephemeral: true });
    return;
  }

  const displayWithIdx = filterMatches(session, filterId);
  await interaction.update({
    embeds: buildValorantEmbeds(session, displayWithIdx),
    components: buildValorantRows(sessionId, displayWithIdx, session),
  });
}

function playerLine(match, p, puuid) {
  const acs = acsOf(match, p);
  const text = `${p.agentName} ${p.name}#${p.tag}  ${p.kills}/${p.deaths}/${p.assists}${acs != null ? `  ACS ${acs}` : ""}`;
  return p.puuid === puuid ? `**${text}**` : text;
}

function teamFields(match, puuid) {
  const byScore = (a, b) => b.score - a.score;
  if (isTeamMatch(match)) {
    return match.teams.map((team) => {
      const label = team.id === "Blue" ? "🔵 블루팀" : team.id === "Red" ? "🔴 레드팀" : team.id;
      const lines = match.players.filter((p) => p.teamId === team.id).sort(byScore).map((p) => playerLine(match, p, puuid));
      return {
        name: `${label} ${team.roundsWon}라운드${team.won ? " (승리)" : ""}`,
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

async function handleValorantDetailButton(interaction) {
  const [sessionId, indexText] = interaction.customId.slice(VAL_DETAIL_PREFIX.length).split(":");
  const session = getSession(sessionId);
  if (!session || session.kind !== "valorant") {
    await interaction.reply({ content: EXPIRED(), ephemeral: true });
    return;
  }

  const match = session.matches[Number(indexText)];
  if (!match) {
    await interaction.reply({ content: nya("해당 경기를 찾을 수 없습니다.") + "\n(오류 코드: STATS-005)", ephemeral: true });
    return;
  }

  const me = findMe(match, session.puuid);
  if (!me) {
    await interaction.reply({ content: nya("경기 데이터를 불러올 수 없습니다.") + "\n(오류 코드: STATS-006)", ephemeral: true });
    return;
  }

  const r = resultOf(match, me);
  const acs = acsOf(match, me);
  const hs = headshotRate(me);
  const kd = me.deaths > 0 ? (me.kills / me.deaths).toFixed(2) : String(me.kills);
  const stats = [
    `킬/데스/어시스트: ${me.kills}/${me.deaths}/${me.assists} (K/D ${kd})`,
    acs != null ? `평균 전투 점수(ACS): ${acs}` : null,
    // 데스매치는 피해량이 0으로만 와서 0이면 줄을 뺀다.
    me.damage > 0
      ? `피해량: ${me.damage}${isTeamMatch(match) && match.roundsPlayed > 0 ? ` (라운드당 ${Math.round(me.damage / match.roundsPlayed)})` : ""}`
      : null,
    hs != null ? `헤드샷 비율: ${hs}%` : null,
  ].filter(Boolean);

  const embed = new EmbedBuilder()
    .setTitle(`${me.agentName} - ${r.text}${r.score ? ` (${r.score})` : ""}`)
    .setDescription(nya(`${match.queueName} | ${match.mapName} | ${formatDuration(match.lengthMs)}`))
    .addFields({ name: "전투 지표", value: stats.join("\n") }, ...teamFields(match, session.puuid))
    .setColor(VAL_COLOR);
  if (me.agentIcon) embed.setThumbnail(me.agentIcon);
  if (match.startedAt) embed.setTimestamp(new Date(match.startedAt));

  await interaction.reply({ embeds: [embed] });
}

module.exports = {
  VAL_MODAL_ID,
  VAL_FILTER_PREFIX,
  VAL_DETAIL_PREFIX,
  showValorantStatsModal,
  handleValorantStatsModal,
  handleValorantFilterButton,
  handleValorantDetailButton,
  // 테스트용
  buildValorantEmbeds,
  buildValorantRows,
  filterMatches,
};
