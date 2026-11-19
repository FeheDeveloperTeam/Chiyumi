const { EmbedBuilder } = require("discord.js");
const { getLevelUpChannelId, getLevelUpMessage, isLevelUpEnabled } = require("./guildConfig");
const { formatLevelUpMessage } = require("./levelUpFormat");

// 서버 관리자가 /레벨업알림설정에서 알림을 켠 서버에만 보낸다.
async function announceLevelUp(guild, user, defaultChannel, newLevel) {
  if (!guild || !isLevelUpEnabled(guild.id)) return;
  const channelId = getLevelUpChannelId(guild.id);
  const targetChannel = channelId ? guild.channels.cache.get(channelId) : defaultChannel;
  if (!targetChannel) return;

  const template = getLevelUpMessage(guild.id);
  const description = formatLevelUpMessage(template, { user, level: newLevel });

  const embed = new EmbedBuilder().setDescription(description).setColor(0xe1aa74);

  await targetChannel.send({ embeds: [embed] }).catch(() => {});
}

module.exports = { announceLevelUp };
