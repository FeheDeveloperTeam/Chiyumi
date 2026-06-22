const { Events } = require("discord.js");
const { getWelcomeChannelId, getWelcomeOptions, getWelcomeMessage } = require("../utils/guildConfig");
const { formatWelcomeMessage } = require("../utils/welcomeFormat");

module.exports = {
  name: Events.GuildMemberRemove,
  async execute(member) {
    const options = getWelcomeOptions(member.guild.id);
    if (!options.leaveEnabled) return;

    const channelId = getWelcomeChannelId(member.guild.id);
    if (!channelId) return;

    const channel = member.guild.channels.cache.get(channelId);
    if (!channel) return;

    const template = getWelcomeMessage(member.guild.id, "leave");
    const content = formatWelcomeMessage(template, { user: member.user, guild: member.guild });

    await channel.send(content).catch(() => {});
  },
};
