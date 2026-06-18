const { SlashCommandBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("ping")
    .setDescription("봇의 응답 속도를 확인합니다."),
  async execute(interaction) {
    await interaction.reply(`Pong! ${interaction.client.ws.ping}ms`);
  },
};
