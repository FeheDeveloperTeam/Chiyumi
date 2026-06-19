const REGIONAL_ROUTING = "asia";
const PLATFORM_ROUTING = "kr";

async function riotFetch(url) {
  const response = await fetch(url, {
    headers: { "X-Riot-Token": process.env.RIOT_API_KEY },
  });

  if (!response.ok) {
    const error = new Error(`Riot API error: ${response.status}`);
    error.status = response.status;
    throw error;
  }

  return response.json();
}

function getAccountByRiotId(gameName, tagLine) {
  const url = `https://${REGIONAL_ROUTING}.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`;
  return riotFetch(url);
}

function getSummonerByPuuid(puuid) {
  const url = `https://${PLATFORM_ROUTING}.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/${puuid}`;
  return riotFetch(url);
}

function getLeagueEntriesByPuuid(puuid) {
  const url = `https://${PLATFORM_ROUTING}.api.riotgames.com/lol/league/v4/entries/by-puuid/${puuid}`;
  return riotFetch(url);
}

function getMatchIdsByPuuid(puuid, count = 5) {
  const url = `https://${REGIONAL_ROUTING}.api.riotgames.com/lol/match/v5/matches/by-puuid/${puuid}/ids?start=0&count=${count}`;
  return riotFetch(url);
}

function getMatchById(matchId) {
  const url = `https://${REGIONAL_ROUTING}.api.riotgames.com/lol/match/v5/matches/${matchId}`;
  return riotFetch(url);
}

module.exports = {
  getAccountByRiotId,
  getSummonerByPuuid,
  getLeagueEntriesByPuuid,
  getMatchIdsByPuuid,
  getMatchById,
};
