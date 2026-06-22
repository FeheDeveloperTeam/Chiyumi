const fs = require("node:fs");
const path = require("node:path");

const DATA_DIR = path.join(__dirname, "..", "..", "data");
const DATA_FILE = path.join(DATA_DIR, "guildConfig.json");

function loadAll() {
  if (!fs.existsSync(DATA_FILE)) return {};
  return JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
}

function saveAll(configs) {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(configs, null, 2));
}

const DEFAULT_LOG_OPTIONS = {
  messageDelete: false,
  messageEdit: false,
  voiceJoin: false,
  voiceLeave: false,
  profanityFilter: false,
  spamFilter: false,
};

function setLogChannel(guildId, channelId) {
  const configs = loadAll();
  configs[guildId] = { ...(configs[guildId] ?? {}), logChannelId: channelId };
  saveAll(configs);
}

function getLogChannelId(guildId) {
  const configs = loadAll();
  return configs[guildId]?.logChannelId ?? null;
}

function getLogOptions(guildId) {
  const configs = loadAll();
  return { ...DEFAULT_LOG_OPTIONS, ...(configs[guildId]?.logOptions ?? {}) };
}

function setLogOption(guildId, key, enabled) {
  const configs = loadAll();
  const current = configs[guildId] ?? {};
  configs[guildId] = {
    ...current,
    logOptions: {
      ...DEFAULT_LOG_OPTIONS,
      ...(current.logOptions ?? {}),
      [key]: enabled,
    },
  };
  saveAll(configs);
}

async function sendLog(guild, embed) {
  const channelId = getLogChannelId(guild.id);
  if (!channelId) return;

  const channel = guild.channels.cache.get(channelId);
  if (!channel) return;

  await channel.send({ embeds: [embed] }).catch(() => {});
}

const DEFAULT_WELCOME_OPTIONS = {
  joinEnabled: false,
  leaveEnabled: false,
};

const DEFAULT_JOIN_MESSAGE = "{유저}님이 {서버}에 입장했습니다";
const DEFAULT_LEAVE_MESSAGE = "{유저}님이 {서버}에서 퇴장했습니다";

function setWelcomeChannel(guildId, channelId) {
  const configs = loadAll();
  configs[guildId] = { ...(configs[guildId] ?? {}), welcomeChannelId: channelId };
  saveAll(configs);
}

function getWelcomeChannelId(guildId) {
  const configs = loadAll();
  return configs[guildId]?.welcomeChannelId ?? null;
}

function getWelcomeOptions(guildId) {
  const configs = loadAll();
  return { ...DEFAULT_WELCOME_OPTIONS, ...(configs[guildId]?.welcomeOptions ?? {}) };
}

function setWelcomeOption(guildId, key, enabled) {
  const configs = loadAll();
  const current = configs[guildId] ?? {};
  configs[guildId] = {
    ...current,
    welcomeOptions: {
      ...DEFAULT_WELCOME_OPTIONS,
      ...(current.welcomeOptions ?? {}),
      [key]: enabled,
    },
  };
  saveAll(configs);
}

function setWelcomeMessage(guildId, type, message) {
  const configs = loadAll();
  const current = configs[guildId] ?? {};
  configs[guildId] = {
    ...current,
    welcomeMessages: {
      ...(current.welcomeMessages ?? {}),
      [type]: message,
    },
  };
  saveAll(configs);
}

function getWelcomeMessage(guildId, type) {
  const configs = loadAll();
  const defaultMessage = type === "join" ? DEFAULT_JOIN_MESSAGE : DEFAULT_LEAVE_MESSAGE;
  return configs[guildId]?.welcomeMessages?.[type] ?? defaultMessage;
}

const DEFAULT_LEVELUP_MESSAGE = "{유저}님이 레벨이 올라서 이제 {레벨}레벨이다";

function setLevelUpChannel(guildId, channelId) {
  const configs = loadAll();
  configs[guildId] = { ...(configs[guildId] ?? {}), levelUpChannelId: channelId };
  saveAll(configs);
}

function getLevelUpChannelId(guildId) {
  const configs = loadAll();
  return configs[guildId]?.levelUpChannelId ?? null;
}

function setLevelUpMessage(guildId, message) {
  const configs = loadAll();
  configs[guildId] = { ...(configs[guildId] ?? {}), levelUpMessage: message };
  saveAll(configs);
}

function getLevelUpMessage(guildId) {
  const configs = loadAll();
  return configs[guildId]?.levelUpMessage ?? DEFAULT_LEVELUP_MESSAGE;
}

module.exports = {
  setLogChannel,
  getLogChannelId,
  sendLog,
  getLogOptions,
  setLogOption,
  setWelcomeChannel,
  getWelcomeChannelId,
  getWelcomeOptions,
  setWelcomeOption,
  setWelcomeMessage,
  getWelcomeMessage,
  DEFAULT_JOIN_MESSAGE,
  DEFAULT_LEAVE_MESSAGE,
  setLevelUpChannel,
  getLevelUpChannelId,
  setLevelUpMessage,
  getLevelUpMessage,
  DEFAULT_LEVELUP_MESSAGE,
};
