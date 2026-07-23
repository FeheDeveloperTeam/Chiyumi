const { Events, EmbedBuilder } = require("discord.js");
const { getWelcomeChannelId, getWelcomeOptions, getWelcomeMessage } = require("../utils/guildConfig");
const { formatWelcomeMessage } = require("../utils/welcomeFormat");
const { findUsedInvite } = require("../utils/inviteTracker");

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
    const description = formatWelcomeMessage(template, { user: member.user, guild: member.guild });

    const embed = new EmbedBuilder()
      .setDescription(description)
      .setThumbnail(member.user.displayAvatarURL())
      .setColor(0xe1aa74)
      .setTimestamp();

    const inviter = options.showInviter ? await findUsedInvite(member.guild) : null;

    const fields = [];
    if (options.showCreatedAt) {
      fields.push({
        name: "📅 계정 생성일",
        value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:F>`,
        inline: true,
      });
    }
    if (options.showJoinedAt) {
      fields.push({
        name: "🚪 서버 입장일",
        value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:F>`,
        inline: true,
      });
    }
    if (options.showInviter) {
      fields.push({
        name: "📨 초대자",
        value: inviter ? `${inviter}` : "알 수 없음",
        inline: true,
      });
    }
    if (options.showMemberCount) {
      fields.push({
        name: "👥 현재 인원",
        value: `${member.guild.memberCount}명`,
        inline: true,
      });
    }
    if (fields.length) embed.addFields(fields);

    await channel.send({ embeds: [embed] }).catch(() => {});
  },
};
