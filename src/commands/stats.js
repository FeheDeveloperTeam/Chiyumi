const { ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder } = require("discord.js");
const { nya } = require("../utils/nya");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("stats")
    .setNameLocalizations({ ko: "전적검색" })
    .setDescription(nya("게임 전적을 검색합니다"))
    .setDescriptionLocalizations({ ko: nya("게임 전적을 검색합니다") }),

  async execute(interaction) {
    const lolButton = new ButtonBuilder()
      .setCustomId("stats-action:lol")
      .setLabel("리그 오브 레전드")
      .setStyle(ButtonStyle.Primary);

    const row = new ActionRowBuilder().addComponents(lolButton);

    await interaction.reply({
      content: nya("어떤 게임의 전적을 검색할까요?"),
      components: [row],
      ephemeral: true,
    });
  },
};
