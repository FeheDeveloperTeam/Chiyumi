const { Events, EmbedBuilder } = require("discord.js");
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
    const description = formatWelcomeMessage(template, { user: member.user, guild: member.guild });

    const embed = new EmbedBuilder()
      .setDescription(description)
      .setThumbnail(member.user.displayAvatarURL())
      .setColor(0xed4245)
      .setFooter({ text: `현재 인원: ${member.guild.memberCount}명` })
      .setTimestamp();

    await channel.send({ embeds: [embed] }).catch(() => {});
  },
};
