const { SlashCommandBuilder } = require("discord.js");
const { nya } = require("../utils/nya");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("inquiry")
    .setNameLocalizations({ ko: "문의" })
    .setDescription("Contact information for inquiries")
    .setDescriptionLocalizations({ ko: "문의 시 연락할 수 있는 정보를 안내합니다" }),

  async execute(interaction) {
    await interaction.reply({
      content: nya("문의사항은 fehe@fehe.dev로 메일을 보내주세요"),
      ephemeral: true,
    });
  },
};
