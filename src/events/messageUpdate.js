const { Events, EmbedBuilder } = require("discord.js");
const { sendLog, getLogOptions } = require("../utils/guildConfig");

module.exports = {
  name: Events.MessageUpdate,
  async execute(oldMessage, newMessage) {
    if (!newMessage.guild) return;
    if (newMessage.author?.bot) return;
    if (oldMessage.content === newMessage.content) return;

    const options = getLogOptions(newMessage.guild.id);
    if (!options.messageEdit) return;

    const embed = new EmbedBuilder()
      .setTitle("메시지 수정")
      .addFields(
        { name: "작성자", value: `${newMessage.author}` },
        { name: "채널", value: `${newMessage.channel}` },
        {
          name: "이전 내용",
          value: oldMessage.content?.slice(0, 1000) || "(내용을 알 수 없음)",
        },
        {
          name: "변경된 내용",
          value: newMessage.content?.slice(0, 1000) || "(내용 없음)",
        },
      )
      .setColor(0xe1aa74)
      .setTimestamp();

    await sendLog(newMessage.guild, embed);
  },
};
