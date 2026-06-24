const { EmbedBuilder } = require("discord.js");
const { getLevelUpChannelId, getLevelUpMessage } = require("./guildConfig");
const { formatLevelUpMessage } = require("./levelUpFormat");

async function announceLevelUp(guild, user, defaultChannel, newLevel) {
  const channelId = getLevelUpChannelId(guild.id);
  const targetChannel = channelId ? guild.channels.cache.get(channelId) : defaultChannel;
  if (!targetChannel) return;

  const template = getLevelUpMessage(guild.id);
  const description = formatLevelUpMessage(template, { user, level: newLevel });

  const embed = new EmbedBuilder().setDescription(description).setColor(0xe1aa74);

  await targetChannel.send({ embeds: [embed] }).catch(() => {});
}

module.exports = { announceLevelUp };
