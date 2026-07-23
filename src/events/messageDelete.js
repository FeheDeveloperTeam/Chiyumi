const { Events, EmbedBuilder } = require("discord.js");
const { sendLog, getLogOptions } = require("../utils/guildConfig");
const { getPartyByMessageId, removeParty } = require("../utils/wordchainGame");

module.exports = {
  name: Events.MessageDelete,
  async execute(message) {
    if (!message.guild) return;

    // 끝말잇기 파티 모집 메시지 삭제 시 파티 자동 해체
    if (message.author?.bot) {
      const party = getPartyByMessageId(message.id);
      if (party) removeParty(party.partyId);
      return;
    }

    const options = getLogOptions(message.guild.id);
    if (!options.messageDelete) return;

    const embed = new EmbedBuilder()
      .setTitle("메시지 삭제")
      .addFields(
        {
          name: "작성자",
          value: message.author ? `${message.author}` : "알 수 없음",
          inline: true,
        },
        { name: "채널", value: `${message.channel}`, inline: true },
        {
          name: "내용",
          value: message.content?.slice(0, 1000) || "(내용을 알 수 없음)",
        },
      )
      .setColor(0xed4245)
      .setTimestamp();

    await sendLog(message.guild, embed, "messageDelete");
  },
};
