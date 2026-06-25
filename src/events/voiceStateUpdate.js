const { Events, EmbedBuilder } = require("discord.js");
const { sendLog, getLogOptions } = require("../utils/guildConfig");
const { startSession, endSession } = require("../utils/voiceTime");

module.exports = {
  name: Events.VoiceStateUpdate,
  async execute(oldState, newState) {
    const guild = newState.guild;
    const options = getLogOptions(guild.id);
    const member = newState.member ?? oldState.member;

    if (!member.user.bot) {
      if (!oldState.channelId && newState.channelId) {
        startSession(guild.id, member.id);
      } else if (oldState.channelId && !newState.channelId) {
        endSession(guild.id, member.id);
      }
    }

    if (!oldState.channelId && newState.channelId) {
      if (!options.voiceJoin) return;

      const embed = new EmbedBuilder()
        .setTitle("음성 채널 입장")
        .addFields(
          { name: "사용자", value: `${member}` },
          { name: "채널", value: `${newState.channel}` },
        )
        .setColor(0xe1aa74)
        .setTimestamp();

      await sendLog(guild, embed);
      return;
    }

    if (oldState.channelId && !newState.channelId) {
      if (!options.voiceLeave) return;

      const embed = new EmbedBuilder()
        .setTitle("음성 채널 퇴장")
        .addFields(
          { name: "사용자", value: `${member}` },
          { name: "채널", value: `${oldState.channel}` },
        )
        .setColor(0xed4245)
        .setTimestamp();

      await sendLog(guild, embed);
      return;
    }

    if (
      oldState.channelId &&
      newState.channelId &&
      oldState.channelId !== newState.channelId
    ) {
      if (!options.voiceJoin && !options.voiceLeave) return;

      const embed = new EmbedBuilder()
        .setTitle("음성 채널 이동")
        .addFields(
          { name: "사용자", value: `${member}` },
          { name: "이전 채널", value: `${oldState.channel}` },
          { name: "이동한 채널", value: `${newState.channel}` },
        )
        .setColor(0xe1aa74)
        .setTimestamp();

      await sendLog(guild, embed);
    }
  },
};
