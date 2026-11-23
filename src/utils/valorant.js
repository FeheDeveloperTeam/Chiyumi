// 발로란트 전적: HenrikDev API(비공식, api.henrikdev.xyz)로 계정·티어·최근 경기를 가져오고,
// 요원·맵·티어의 한국어 이름과 아이콘은 valorant-api.com(키 없음)에서 받아 하루 동안 캐시한다.
// 라이엇 공식 발로란트 API는 승인받은 서비스 키에만 열려 있어 지금 RIOT_API_KEY로는 403이다.
const HENRIK_BASE = "https://api.henrikdev.xyz";
const ASSET_BASE = "https://valorant-api.com/v1";
const FETCH_TIMEOUT_MS = 15_000;
const LOCALE_TTL_MS = 24 * 60 * 60 * 1000;
const AFFINITIES = new Set(["na", "eu", "ap", "kr", "br", "latam"]);
const PLATFORM = "pc";

function isValorantConfigured() {
  return Boolean(process.env.HENRIK_API_KEY);
}

async function henrikFetch(pathname) {
  const response = await fetch(`${HENRIK_BASE}${pathname}`, {
    headers: { Authorization: process.env.HENRIK_API_KEY ?? "" },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });

  if (!response.ok) {
    const error = new Error(`HenrikDev API error: ${response.status}`);
    error.status = response.status;
    throw error;
  }

  return (await response.json()).data;
}

const riotIdPath = (name, tag) => `${encodeURIComponent(name)}/${encodeURIComponent(tag)}`;

function getValorantAccount(name, tag) {
  return henrikFetch(`/valorant/v2/account/${riotIdPath(name, tag)}`);
}

function toAffinity(region) {
  const value = String(region ?? "").toLowerCase();
  return AFFINITIES.has(value) ? value : "kr";
}

// 경쟁전을 한 번도 안 했으면 404가 올 수 있다 → 티어 없음으로 본다.
async function getValorantMmr(affinity, name, tag) {
  try {
    return await henrikFetch(`/valorant/v3/mmr/${affinity}/${PLATFORM}/${riotIdPath(name, tag)}`);
  } catch (error) {
    if (error.status === 404) return null;
    throw error;
  }
}

async function getValorantMatches(affinity, name, tag, size = 10) {
  try {
    return (await henrikFetch(`/valorant/v4/matches/${affinity}/${PLATFORM}/${riotIdPath(name, tag)}?size=${size}`)) ?? [];
  } catch (error) {
    if (error.status === 404) return [];
    throw error;
  }
}

// ---- 한국어 이름·아이콘 (실패하면 영어 이름 그대로 쓴다)
let localeCache = null;
let localeFetchedAt = 0;

async function fetchAsset(pathname) {
  const response = await fetch(`${ASSET_BASE}${pathname}`, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
  if (!response.ok) throw new Error(`valorant-api error: ${response.status}`);
  return (await response.json()).data;
}

async function getValorantLocale() {
  if (localeCache && Date.now() - localeFetchedAt < LOCALE_TTL_MS) return localeCache;

  try {
    const [agents, maps, tiers, queues] = await Promise.all([
      fetchAsset("/agents?language=ko-KR&isPlayableCharacter=true"),
      fetchAsset("/maps?language=ko-KR"),
      fetchAsset("/competitivetiers?language=ko-KR"),
      fetchAsset("/gamemodes/queues?language=ko-KR"),
    ]);
    const latestTiers = tiers.at(-1)?.tiers ?? [];
    localeCache = {
      agents: new Map(agents.map((a) => [a.uuid.toLowerCase(), { name: a.displayName, icon: a.displayIcon }])),
      maps: new Map(maps.map((m) => [m.uuid.toLowerCase(), m.displayName])),
      tiers: new Map(
        latestTiers.map((t) => [t.tier, { name: t.tierName, icon: t.largeIcon, color: parseInt(String(t.color).slice(0, 6), 16) }]),
      ),
      queues: new Map(queues.filter((q) => q.queueId).map((q) => [q.queueId.toLowerCase(), q.dropdownText])),
    };
    localeFetchedAt = Date.now();
  } catch (error) {
    console.error("[발로란트] 한국어 이름을 불러오지 못했습니다:", error.message);
    if (!localeCache) localeCache = { agents: new Map(), maps: new Map(), tiers: new Map(), queues: new Map() };
  }

  return localeCache;
}

// ---- 세션(10분)에 넣을 만큼만 경기 데이터를 줄인다. v4 원본은 라운드·킬 기록까지 있어 크다.
function slimMatch(match, locale) {
  const meta = match.metadata ?? {};
  const queueId = String(meta.queue?.id ?? "").toLowerCase();
  const mapId = String(meta.map?.id ?? "").toLowerCase();

  return {
    id: meta.match_id,
    queueId,
    queueName: locale.queues.get(queueId) ?? meta.queue?.name ?? (queueId || "알 수 없음"),
    mapName: locale.maps.get(mapId) ?? meta.map?.name ?? "알 수 없음",
    startedAt: meta.started_at,
    lengthMs: meta.game_length_in_ms ?? 0,
    roundsPlayed: Array.isArray(match.rounds) ? match.rounds.length : 0,
    teams: (match.teams ?? []).map((t) => ({
      id: t.team_id,
      won: Boolean(t.won),
      roundsWon: t.rounds?.won ?? 0,
      roundsLost: t.rounds?.lost ?? 0,
    })),
    players: (match.players ?? []).map((p) => {
      const agentId = String(p.agent?.id ?? "").toLowerCase();
      return {
        puuid: p.puuid,
        name: p.name,
        tag: p.tag,
        teamId: p.team_id,
        agentName: locale.agents.get(agentId)?.name ?? p.agent?.name ?? "?",
        agentIcon: locale.agents.get(agentId)?.icon ?? null,
        tierId: p.tier?.id ?? 0,
        kills: p.stats?.kills ?? 0,
        deaths: p.stats?.deaths ?? 0,
        assists: p.stats?.assists ?? 0,
        score: p.stats?.score ?? 0,
        headshots: p.stats?.headshots ?? 0,
        bodyshots: p.stats?.bodyshots ?? 0,
        legshots: p.stats?.legshots ?? 0,
        damage: p.stats?.damage?.dealt ?? 0,
      };
    }),
  };
}

module.exports = {
  isValorantConfigured,
  getValorantAccount,
  getValorantMmr,
  getValorantMatches,
  getValorantLocale,
  toAffinity,
  slimMatch,
};
