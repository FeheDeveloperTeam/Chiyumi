// /전적검색 → 리그 오브 레전드: 입력 창, 전적 목록, 큐 필터, 경기 상세(같은 메시지 안에서 전환).
// 데이터는 Riot Games API(riot.js), 챔피언 한국어 이름·아이콘은 Data Dragon(키 없음, 하루 캐시).
const path = require("path");
const {
  ActionRowBuilder,
  AttachmentBuilder,
  EmbedBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require("discord.js");
const { nya } = require("./nya");
const { createSession, getSession } = require("./statsSession");
const {
  getAccountByRiotId,
  getSummonerByPuuid,
  getLeagueEntriesByPuuid,
  getMatchIdsByPuuid,
  getMatchById,
} = require("./riot");
const {
  relativeTime,
  buildFilterRow,
  buildMatchPicker,
  buildDetailNavRow,
  deleteGamePicker,
  rememberStatsMessage,
} = require("./statsUi");

const LOL_MODAL_ID = "stats-modal:";
const LOL_PREFIX = "stats-";
const LOL_FILTER_PREFIX = "stats-filter:";
const LOL_PICK_PREFIX = "stats-pick:";
const LOL_DETAIL_PREFIX = "stats-detail:";
const LOL_BACK_PREFIX = "stats-back:";
const LOL_SHARE_PREFIX = "stats-share:";
const LOL_COLOR = 0xe1aa74;

const QUEUE_NAMES = {
  420: "솔로랭크",
  440: "자유랭크",
  400: "일반(드래프트)",
  430: "일반(블라인드)",
  480: "신속 대전",
  490: "일반(빠른 대전)",
  450: "칼바람 나락",
  1700: "아레나",
  900: "우르프",
  1900: "우르프",
};

const FILTERS = [
  { id: "all", label: "전체", queues: null },
  { id: "420", label: "솔로랭크", queues: [420] },
  { id: "440", label: "자유랭크", queues: [440] },
  { id: "normal", label: "일반", queues: [400, 430, 480, 490] },
  { id: "450", label: "칼바람", queues: [450] },
];

const POSITION_LABELS = { TOP: "탑", JUNGLE: "정글", MIDDLE: "미드", BOTTOM: "원딜", UTILITY: "서폿" };
const POSITION_ORDER = ["TOP", "JUNGLE", "MIDDLE", "BOTTOM", "UTILITY"];

const TIER_COLORS = {
  IRON: 0x958a8a,
  BRONZE: 0xad5624,
  SILVER: 0x839aa3,
  GOLD: 0xcd8b3d,
  PLATINUM: 0x4aa387,
  EMERALD: 0x1a9e60,
  DIAMOND: 0x576cce,
  MASTER: 0x9d48e0,
  GRANDMASTER: 0xd44942,
  CHALLENGER: 0xf4c874,
};
const TIER_NAMES = {
  IRON: "아이언",
  BRONZE: "브론즈",
  SILVER: "실버",
  GOLD: "골드",
  PLATINUM: "플래티넘",
  EMERALD: "에메랄드",
  DIAMOND: "다이아몬드",
  MASTER: "마스터",
  GRANDMASTER: "그랜드마스터",
  CHALLENGER: "챌린저",
};

const TIER_DATA = (() => {
  try {
    return require(path.join(__dirname, "..", "assets", "tiers", "tierData.js"));
  } catch {
    return {};
  }
})();

const EXPIRED = () => nya("전적 정보가 만료되었습니다. 다시 검색해주세요.") + "\n(오류 코드: STATS-004)";

async function showLolStatsModal(interaction) {
  const modal = new ModalBuilder().setCustomId(LOL_MODAL_ID).setTitle("리그 오브 레전드 전적 검색");
  modal.addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId("riot_id")
        .setLabel("닉네임#태그")
        .setStyle(TextInputStyle.Short)
        .setPlaceholder("예: Hide on bush#KR1")
        .setRequired(true),
    ),
  );
  await interaction.showModal(modal);
}

// ---- 챔피언 한국어 이름·아이콘 (실패하면 영어 이름 그대로)
const DDRAGON = "https://ddragon.leagueoflegends.com";
const CHAMP_TTL_MS = 24 * 60 * 60 * 1000;
let champCache = null;
let champFetchedAt = 0;

async function getChampionLocale() {
  if (champCache && Date.now() - champFetchedAt < CHAMP_TTL_MS) return champCache;
  try {
    const signal = () => AbortSignal.timeout(15_000);
    const version = (await (await fetch(`${DDRAGON}/api/versions.json`, { signal: signal() })).json())[0];
    const data = (await (await fetch(`${DDRAGON}/cdn/${version}/data/ko_KR/champion.json`, { signal: signal() })).json()).data;
    champCache = new Map(
      Object.values(data).map((c) => [c.id.toLowerCase(), { name: c.name, icon: `${DDRAGON}/cdn/${version}/img/champion/${c.image.full}` }]),
    );
    champFetchedAt = Date.now();
  } catch (error) {
    console.error("[롤 전적] 챔피언 한국어 이름을 불러오지 못했습니다:", error.message);
    if (!champCache) champCache = new Map();
  }
  return champCache;
}

// 세션(10분)에 넣을 만큼만 줄인다. 원본 경기 데이터는 한 판에 수십 KB다.
function slimMatch(match, champs) {
  const info = match.info ?? {};
  return {
    queueId: info.queueId,
    duration: info.gameDuration ?? 0,
    endedAt: info.gameEndTimestamp ?? (info.gameStartTimestamp ? info.gameStartTimestamp + (info.gameDuration ?? 0) * 1000 : null),
    participants: (info.participants ?? []).map((p) => {
      const champ = champs.get(String(p.championName ?? "").toLowerCase());
      return {
        puuid: p.puuid,
        name: p.riotIdGameName ? `${p.riotIdGameName}${p.riotIdTagline ? `#${p.riotIdTagline}` : ""}` : p.summonerName || "알 수 없음",
        champion: champ?.name ?? p.championName,
        championIcon: champ?.icon ?? null,
        teamId: p.teamId,
        position: p.teamPosition,
        win: Boolean(p.win),
        kills: p.kills,
        deaths: p.deaths,
        assists: p.assists,
        gold: p.goldEarned,
        cs: (p.totalMinionsKilled ?? 0) + (p.neutralMinionsKilled ?? 0),
        damage: p.totalDamageDealtToChampions,
        vision: p.visionScore,
      };
    }),
  };
}

// ---- 계산
function formatDuration(seconds) {
  return `${Math.floor(seconds / 60)}분 ${seconds % 60}초`;
}

const queueName = (match) => QUEUE_NAMES[match.queueId] ?? `큐 ${match.queueId}`;
const findMe = (match, puuid) => match.participants.find((p) => p.puuid === puuid) ?? null;
const resultIcon = (p) => (p.win ? "✅" : "❌");
const resultText = (p) => (p.win ? "승리" : "패배");

function visibleOrder(session) {
  const filter = FILTERS.find((f) => f.id === session.filter) ?? FILTERS[0];
  return session.matches
    .map((match, index) => ({ match, index }))
    .filter(({ match }) => !filter.queues || filter.queues.includes(match.queueId))
    .map(({ index }) => index);
}

function getTierAttachment(tier, suffix) {
  if (!tier) return null;
  const key = tier.toLowerCase();
  const b64 = TIER_DATA[key];
  if (!b64) return null;
  return new AttachmentBuilder(Buffer.from(b64, "base64"), { name: `${key}-${suffix}.png` });
}

function formatRankEntry(entry) {
  if (!entry) return "배치 전";
  const games = entry.wins + entry.losses;
  const rate = games > 0 ? Math.round((entry.wins / games) * 100) : 0;
  return `**${TIER_NAMES[entry.tier] ?? entry.tier} ${entry.rank}** ${entry.leaguePoints}LP\n${entry.wins}승 ${entry.losses}패 (${rate}%)`;
}

// ---- 목록 화면
function buildListView(sessionId, session) {
  const { account, summoner, soloEntry, flexEntry } = session;
  const order = visibleOrder(session);

  const lines = order.map((index, i) => {
    const match = session.matches[index];
    const me = findMe(match, session.puuid);
    return `\`${i + 1}\` ${resultIcon(me)} **${resultText(me)}** · ${me.champion} · ${queueName(match)} · ${me.kills}/${me.deaths}/${me.assists}`;
  });
  const wins = order.filter((i) => findMe(session.matches[i], session.puuid).win).length;
  const summary = order.length > 0 ? ` — 최근 ${order.length}판 ${wins}승 ${order.length - wins}패` : "";

  const soloAttachment = getTierAttachment(soloEntry?.tier, "solo");
  const flexAttachment = getTierAttachment(flexEntry?.tier, "flex");

  const embed1 = new EmbedBuilder()
    .setAuthor({ name: "리그 오브 레전드" })
    .setTitle(`${account.gameName}#${account.tagLine}`)
    .setColor(TIER_COLORS[soloEntry?.tier?.toUpperCase()] ?? LOL_COLOR)
    .addFields(
      { name: "소환사 레벨", value: `Lv. **${summoner.summonerLevel}**`, inline: true },
      { name: "솔로랭크", value: formatRankEntry(soloEntry), inline: true },
    );
  if (soloAttachment) embed1.setThumbnail(`attachment://${soloAttachment.name}`);

  const embed2 = new EmbedBuilder()
    .setColor(TIER_COLORS[flexEntry?.tier?.toUpperCase()] ?? LOL_COLOR)
    .addFields(
      { name: "자유랭크", value: formatRankEntry(flexEntry), inline: true },
      { name: `최근 전적${summary}`, value: lines.join("\n") || "해당 게임 모드의 전적이 없습니다" },
    );
  if (order.length > 0) embed2.setFooter({ text: "아래 목록에서 경기를 고르면 자세히 볼 수 있어요" });
  if (flexAttachment) embed2.setThumbnail(`attachment://${flexAttachment.name}`);

  const present = new Set(session.matches.map((m) => m.queueId));
  const filterRow = buildFilterRow(
    LOL_FILTER_PREFIX,
    sessionId,
    FILTERS.filter((f) => !f.queues || f.queues.some((q) => present.has(q))),
    session.filter,
  );
  const picker = buildMatchPicker(
    `${LOL_PICK_PREFIX}${sessionId}`,
    order.map((index, i) => {
      const match = session.matches[index];
      const me = findMe(match, session.puuid);
      return {
        index,
        emoji: resultIcon(me),
        label: `${i + 1}. ${resultText(me)} · ${me.champion} · ${queueName(match)}`,
        description: [
          `${me.kills}/${me.deaths}/${me.assists}`,
          `CS ${me.cs}`,
          `${Math.floor(match.duration / 60)}분`,
          relativeTime(match.endedAt),
        ]
          .filter(Boolean)
          .join(" · "),
      };
    }),
  );

  return {
    embeds: [embed1, embed2],
    components: [filterRow, picker].filter(Boolean),
    files: [soloAttachment, flexAttachment].filter(Boolean),
    attachments: [],
  };
}

// ---- 상세 화면
function buildMatchupText(match, puuid) {
  const byPosition = new Map();
  for (const p of match.participants) {
    if (!byPosition.has(p.position)) byPosition.set(p.position, []);
    byPosition.get(p.position).push(p);
  }
  const name = (p) => (p.puuid === puuid ? `**${p.champion}**` : p.champion);
  const lines = POSITION_ORDER.map((position) => {
    const pair = byPosition.get(position);
    const blue = pair?.find((p) => p.teamId === 100);
    const red = pair?.find((p) => p.teamId === 200);
    if (!blue || !red) return null;
    return (
      `${POSITION_LABELS[position]}: ${name(blue)} ${blue.kills}/${blue.deaths}/${blue.assists} vs ` +
      `${name(red)} ${red.kills}/${red.deaths}/${red.assists}`
    );
  }).filter(Boolean);
  return lines.length > 0 ? lines.join("\n") : "매치업 정보 없음";
}

function teamFields(match, puuid) {
  const me = findMe(match, puuid);
  const teams = [100, 200]
    .map((teamId) => match.participants.filter((p) => p.teamId === teamId))
    .filter((t) => t.length > 0);
  if (teams.length !== 2) return [];
  teams.sort((a, b) => (b[0].teamId === me.teamId) - (a[0].teamId === me.teamId));
  return teams.map((team) => {
    const label = team[0].teamId === 100 ? "🔵 블루팀" : "🔴 레드팀";
    const lines = team.map((p) => {
      const text = `${p.champion} ${p.name}  ${p.kills}/${p.deaths}/${p.assists}`;
      return p.puuid === puuid ? `**${text}**` : text;
    });
    return {
      name: `${label}${team[0].teamId === me.teamId ? " (내 팀)" : ""}${team[0].win ? " · 승리" : ""}`,
      value: lines.join("\n").slice(0, 1024),
    };
  });
}

function buildDetailEmbed(session, match) {
  const me = findMe(match, session.puuid);
  const minutes = Math.max(match.duration / 60, 1);
  const kda = me.deaths > 0 ? ((me.kills + me.assists) / me.deaths).toFixed(2) : "Perfect";

  const embed = new EmbedBuilder()
    .setAuthor({ name: `${session.account.gameName}#${session.account.tagLine}` })
    .setTitle(`${resultIcon(me)} ${me.champion} - ${resultText(me)}`)
    .setDescription(nya(`${queueName(match)} | ${formatDuration(match.duration)}`))
    .addFields(
      {
        name: "내 기록",
        value:
          `킬/데스/어시스트: **${me.kills}/${me.deaths}/${me.assists}** (평점 ${kda})\n` +
          `CS: ${me.cs} (분당 ${(me.cs / minutes).toFixed(1)})\n` +
          `골드: ${me.gold}\n` +
          `챔피언 대상 피해량: ${me.damage}\n` +
          `시야 점수: ${me.vision}`,
      },
      { name: "라인전 매치업", value: buildMatchupText(match, session.puuid) },
      ...teamFields(match, session.puuid),
    )
    .setColor(me.win ? 0x3ba55d : 0xed4245);
  if (me.championIcon) embed.setThumbnail(me.championIcon);
  if (match.endedAt) embed.setTimestamp(new Date(match.endedAt));
  return embed;
}

function buildDetailView(sessionId, session, index) {
  return {
    embeds: [buildDetailEmbed(session, session.matches[index])],
    components: [
      buildDetailNavRow({
        navPrefix: LOL_DETAIL_PREFIX,
        backId: `${LOL_BACK_PREFIX}${sessionId}`,
        sharePrefix: LOL_SHARE_PREFIX,
        sessionId,
        order: visibleOrder(session),
        index,
      }),
    ],
    files: [],
    attachments: [],
  };
}

// ---- 검색
async function handleLolStatsModal(interaction) {
  const riotId = interaction.fields.getTextInputValue("riot_id").trim();
  const [gameName, tagLine] = riotId.split("#").map((part) => part?.trim());

  if (!gameName || !tagLine) {
    await interaction.reply({
      content: nya("닉네임#태그 형식으로 입력해주세요. 예: Hide on bush#KR1") + "\n(오류 코드: STATS-001)",
      ephemeral: true,
    });
    return;
  }

  await deleteGamePicker(interaction);
  await interaction.deferReply({ ephemeral: true });

  let account;
  try {
    account = await getAccountByRiotId(gameName, tagLine);
  } catch (error) {
    if (error.status === 404) {
      await interaction.editReply(nya(`'${gameName}#${tagLine}' 소환사를 찾을 수 없습니다.`) + "\n(오류 코드: STATS-002)");
      return;
    }
    console.error(error);
    await interaction.editReply(nya("전적을 불러오는 중 오류가 발생했습니다.") + "\n(오류 코드: STATS-003)");
    return;
  }

  try {
    const [summoner, leagueEntries, matchIds, champs] = await Promise.all([
      getSummonerByPuuid(account.puuid),
      getLeagueEntriesByPuuid(account.puuid),
      getMatchIdsByPuuid(account.puuid, 10),
      getChampionLocale(),
    ]);

    if (matchIds.length === 0) {
      await interaction.editReply(nya(`'${gameName}#${tagLine}'님은 전적이 비공개라서 표시할 수 없습니다.`));
      return;
    }

    const rawMatches = await Promise.all(matchIds.map((id) => getMatchById(id)));
    const matches = rawMatches.map((m) => slimMatch(m, champs)).filter((m) => findMe(m, account.puuid));

    const session = {
      kind: "lol",
      puuid: account.puuid,
      account,
      summoner,
      soloEntry: leagueEntries.find((e) => e.queueType === "RANKED_SOLO_5x5") ?? null,
      flexEntry: leagueEntries.find((e) => e.queueType === "RANKED_FLEX_SR") ?? null,
      matches,
      filter: "all",
    };
    const sessionId = createSession(session);

    const { attachments: _unused, ...view } = buildListView(sessionId, session);
    await interaction.editReply({ content: null, ...view });
    rememberStatsMessage(interaction);
  } catch (error) {
    console.error(error);
    await interaction.editReply(nya("전적을 불러오는 중 오류가 발생했습니다.") + "\n(오류 코드: STATS-003)");
  }
}

// ---- 버튼·드롭다운 (처리했으면 true)
async function handleLolComponent(interaction) {
  const id = interaction.customId;
  const prefix = [LOL_FILTER_PREFIX, LOL_PICK_PREFIX, LOL_DETAIL_PREFIX, LOL_BACK_PREFIX, LOL_SHARE_PREFIX].find((p) =>
    id.startsWith(p),
  );
  if (!id.startsWith(LOL_PREFIX) || !prefix) return false;

  const [sessionId, arg] = id.slice(prefix.length).split(":");
  const session = getSession(sessionId);
  if (!session || session.kind !== "lol") {
    await interaction.reply({ content: EXPIRED(), ephemeral: true });
    return true;
  }

  if (prefix === LOL_FILTER_PREFIX) {
    session.filter = FILTERS.some((f) => f.id === arg) ? arg : "all";
    await interaction.update(buildListView(sessionId, session));
    return true;
  }

  if (prefix === LOL_BACK_PREFIX) {
    await interaction.update(buildListView(sessionId, session));
    return true;
  }

  const index = Number(prefix === LOL_PICK_PREFIX ? interaction.values?.[0] : arg);
  const match = session.matches[index];
  if (!match) {
    await interaction.reply({ content: nya("해당 경기를 찾을 수 없습니다.") + "\n(오류 코드: STATS-005)", ephemeral: true });
    return true;
  }
  if (!findMe(match, session.puuid)) {
    await interaction.reply({ content: nya("경기 데이터를 불러올 수 없습니다.") + "\n(오류 코드: STATS-006)", ephemeral: true });
    return true;
  }

  if (prefix === LOL_SHARE_PREFIX) {
    await interaction.reply({
      content: `📢 <@${interaction.user.id}>님이 공유한 리그 오브 레전드 전적`,
      embeds: [buildDetailEmbed(session, match)],
      allowedMentions: { parse: [] },
    });
    return true;
  }

  await interaction.update(buildDetailView(sessionId, session, index));
  return true;
}

module.exports = {
  LOL_MODAL_ID,
  showLolStatsModal,
  handleLolStatsModal,
  handleLolComponent,
  // 테스트용
  buildListView,
  buildDetailView,
  slimMatch,
};
