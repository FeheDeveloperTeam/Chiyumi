const { Events } = require("discord.js");
const { getWelcomeChannelId, getWelcomeOptions, getWelcomeMessage } = require("../utils/guildConfig");
const { formatWelcomeMessage } = require("../utils/welcomeFormat");

module.exports = {
  name: Events.GuildMemberAdd,
  async execute(member) {
    const options = getWelcomeOptions(member.guild.id);
    if (!options.joinEnabled) return;

    const channelId = getWelcomeChannelId(member.guild.id);
    if (!channelId) return;

    const channel = member.guild.channels.cache.get(channelId);
    if (!channel) return;

    const template = getWelcomeMessage(member.guild.id, "join");
    const content = formatWelcomeMessage(template, { user: member.user, guild: member.guild });

    await channel.send(content).catch(() => {});
  },
};
