const { Events, EmbedBuilder } = require("discord.js");
const { sendLog, getLogOptions } = require("../utils/guildConfig");

module.exports = {
  name: Events.MessageDelete,
  async execute(message) {
    if (!message.guild) return;
    if (message.author?.bot) return;

    const options = getLogOptions(message.guild.id);
    if (!options.messageDelete) return;

    const embed = new EmbedBuilder()
      .setTitle("메시지 삭제")
      .addFields(
        {
          name: "작성자",
          value: message.author ? `${message.author}` : "알 수 없음",
        },
        { name: "채널", value: `${message.channel}` },
        {
          name: "내용",
          value: message.content?.slice(0, 1000) || "(내용을 알 수 없음)",
        },
      )
      .setColor(0xed4245)
      .setTimestamp();

    await sendLog(message.guild, embed);
  },
};
