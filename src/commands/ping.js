const { SlashCommandBuilder } = require("discord.js");
const { nya } = require("../utils/nya");

module.exports = {
  category: "유틸리티",
  data: new SlashCommandBuilder()
    .setName("ping")
    .setNameLocalizations({ ko: "핑" })
    .setDescription(nya("봇의 응답 속도를 확인합니다")),
  async execute(interaction) {
    await interaction.reply(nya(`Pong! ${interaction.client.ws.ping}ms`));
  },
};
