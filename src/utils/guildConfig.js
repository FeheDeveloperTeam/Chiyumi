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

function setLogChannel(guildId, channelId) {
  const configs = loadAll();
  configs[guildId] = { ...(configs[guildId] ?? {}), logChannelId: channelId };
  saveAll(configs);
}

function getLogChannelId(guildId) {
  const configs = loadAll();
  return configs[guildId]?.logChannelId ?? null;
}

async function sendLog(guild, embed) {
  const channelId = getLogChannelId(guild.id);
  if (!channelId) return;

  const channel = guild.channels.cache.get(channelId);
  if (!channel) return;

  await channel.send({ embeds: [embed] }).catch(() => {});
}

module.exports = { setLogChannel, getLogChannelId, sendLog };
