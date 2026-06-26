const crypto = require("node:crypto");
const { EmbedBuilder } = require("discord.js");
const { isValidWord, lastChar, matchesChainStart, pickBotWord } = require("./wordchainWords");
const { isRealWord } = require("./wordchainDict");

const MIN_PARTY_SIZE = 2;
const MAX_PARTY_SIZE = 8;
const TURN_DURATION_MS = 20_000;
const BOT_THINK_DELAY_MS = 1500;
const THREAD_DELETE_DELAY_MS = 20_000;
const RESULT_MESSAGE_DELETE_DELAY_MS = 20_000;
const BOT_ID = "BOT";

const parties = new Map();
const games = new Map();

function createParty({ guildId, channelId, hostId, maxSize }) {
  const partyId = crypto.randomUUID().slice(0, 8);
  const party = {
    partyId,
    guildId,
    channelId,
    messageId: null,
    hostId,
    maxSize,
    members: [hostId],
    started: false,
  };
  parties.set(partyId, party);
  return party;
}

function getParty(partyId) {
  return parties.get(partyId);
}

function setPartyMessageId(partyId, messageId) {
  const party = parties.get(partyId);
  if (party) party.messageId = messageId;
}

function joinParty(partyId, userId) {
  const party = parties.get(partyId);
  if (!party) return { ok: false, reason: "not_found" };
  if (party.started) return { ok: false, reason: "started" };
  if (party.members.includes(userId)) return { ok: false, reason: "already_joined" };
  if (party.members.length >= party.maxSize) return { ok: false, reason: "full" };

  party.members.push(userId);
  return { ok: true, party };
}

function removeParty(partyId) {
  parties.delete(partyId);
}

function shuffle(array) {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function getGame(threadId) {
  return games.get(threadId);
}

function buildGame(party) {
  const order = shuffle([...party.members, BOT_ID]);

  return {
    party,
    guildId: party.guildId,
    threadId: null,
    hostId: party.hostId,
    order,
    aliveIds: new Set(order),
    turnIndex: 0,
    usedWords: new Set(),
    lastChar: null,
    timer: null,
    eliminationOrder: [],
    ended: false,
  };
}

function formatPlayer(id) {
  return id === BOT_ID ? "치유미" : `<@${id}>`;
}

async function updatePartyMessageWithResult(game, thread, rankingText) {
  const party = game.party;
  if (!party?.messageId) return;

  const channel = thread.client.channels.cache.get(party.channelId);
  if (!channel) return;

  const message = await channel.messages.fetch(party.messageId).catch(() => null);
  if (!message) return;

  const embed = new EmbedBuilder()
    .setTitle("끝말잇기 결과")
    .setDescription(
      `게임이 종료되었습니다!\n\n🏆 최종 순위\n${rankingText}\n\n${RESULT_MESSAGE_DELETE_DELAY_MS / 1000}초 후 이 메시지는 삭제됩니다.`,
    )
    .setColor(0x95a5a6);

  await message.edit({ embeds: [embed], components: [] }).catch(() => {});

  setTimeout(() => {
    message.delete().catch(() => {});
    removeParty(party.partyId);
  }, RESULT_MESSAGE_DELETE_DELAY_MS);
}

function getCurrentPlayerId(game) {
  return game.order[game.turnIndex];
}

function advanceTurnIndex(game) {
  for (let step = 0; step < game.order.length; step += 1) {
    game.turnIndex = (game.turnIndex + 1) % game.order.length;
    if (game.aliveIds.has(game.order[game.turnIndex])) return;
  }
}

async function endGame(game, thread, winnerId) {
  game.ended = true;
  clearTimeout(game.timer);
  games.delete(game.threadId);

  const ranking = [winnerId, ...[...game.eliminationOrder].reverse()].filter(Boolean);
  const rankingText = ranking.map((id, index) => `${index + 1}위: ${formatPlayer(id)}`).join("\n");
  const winnerText = winnerId ? formatPlayer(winnerId) : "아무도";

  await thread
    .send(
      `게임 종료! 승자: ${winnerText}\n\n🏆 최종 순위\n${rankingText}\n\n20초 후 이 스레드가 삭제됩니다.`,
    )
    .catch(() => {});

  await updatePartyMessageWithResult(game, thread, rankingText);

  setTimeout(() => {
    thread.delete().catch(() => {});
  }, THREAD_DELETE_DELAY_MS);
}

async function eliminate(game, thread, userId, reasonText) {
  game.aliveIds.delete(userId);
  game.eliminationOrder.push(userId);

  if (userId !== BOT_ID) {
    await thread.permissionOverwrites
      .edit(userId, { SendMessagesInThreads: false })
      .catch(() => {});
  }

  await thread.send(`${formatPlayer(userId)} 탈락! (${reasonText})`).catch(() => {});

  if (game.aliveIds.size <= 1) {
    const winnerId = [...game.aliveIds][0] ?? null;
    await endGame(game, thread, winnerId);
    return true;
  }

  return false;
}

async function promptTurn(game, thread) {
  if (game.ended) return;

  const currentId = getCurrentPlayerId(game);
  const constraintText = game.lastChar
    ? `'${game.lastChar}'로 시작하는 단어를 입력하세요`
    : "자유롭게 단어를 입력하세요 (첫 턴)";

  if (currentId === BOT_ID) {
    await thread.send(`치유미의 차례입니다. 생각 중...`).catch(() => {});

    await new Promise((resolve) => setTimeout(resolve, BOT_THINK_DELAY_MS));

    const botWord = await pickBotWord(game.lastChar, game.usedWords);

    if (!botWord) {
      const ended = await eliminate(game, thread, BOT_ID, "더 이상 이어갈 단어가 없습니다");
      if (!ended) {
        advanceTurnIndex(game);
        await promptTurn(game, thread);
      }
      return;
    }

    game.usedWords.add(botWord);
    game.lastChar = lastChar(botWord);
    await thread.send(`치유미: ${botWord}`).catch(() => {});

    advanceTurnIndex(game);
    await promptTurn(game, thread);
    return;
  }

  await thread
    .send(`<@${currentId}>님의 차례입니다! ${constraintText} (제한시간 ${TURN_DURATION_MS / 1000}초)`)
    .catch(() => {});

  game.timer = setTimeout(async () => {
    const ended = await eliminate(game, thread, currentId, "제한시간 초과");
    if (!ended) {
      advanceTurnIndex(game);
      await promptTurn(game, thread);
    }
  }, TURN_DURATION_MS);
}

async function startGame(thread, party) {
  const game = buildGame(party);
  game.threadId = thread.id;
  games.set(thread.id, game);
  party.started = true;

  await promptTurn(game, thread);

  return game;
}

async function handleMessage(message) {
  const game = games.get(message.channel.id);
  if (!game || game.ended) return false;

  const currentId = getCurrentPlayerId(game);
  if (message.author.id !== currentId) return true;
  if (game.processing) return true;

  game.processing = true;

  try {
    const word = message.content.trim();

    if (!isValidWord(word)) {
      await message.reply("2글자 이상의 한글 단어만 가능합니다. 다시 시도해주세요.").catch(() => {});
      return true;
    }

    if (!matchesChainStart(word, game.lastChar)) {
      await message.reply(`'${game.lastChar}'로 시작하는 단어가 아닙니다.`).catch(() => {});
      return true;
    }

    if (game.usedWords.has(word)) {
      await message.reply("이미 사용된 단어입니다.").catch(() => {});
      return true;
    }

    const isReal = await Promise.race([
      isRealWord(word).catch(() => false),
      new Promise((resolve) => setTimeout(() => resolve(false), 7000)),
    ]);

    if (!isReal) {
      await message.reply("잘못된 단어입니다. 사전에 없는 단어예요. 다시 시도해주세요.").catch(() => {});
      return true;
    }

    clearTimeout(game.timer);
    game.usedWords.add(word);
    game.lastChar = lastChar(word);

    advanceTurnIndex(game);
    await promptTurn(game, message.channel);
    return true;
  } catch (error) {
    console.error("끝말잇기 메시지 처리 오류:", error);
    return true;
  } finally {
    game.processing = false;
  }
}

module.exports = {
  MIN_PARTY_SIZE,
  MAX_PARTY_SIZE,
  createParty,
  getParty,
  setPartyMessageId,
  joinParty,
  removeParty,
  startGame,
  handleMessage,
  getGame,
};
