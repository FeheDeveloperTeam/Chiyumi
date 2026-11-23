const { ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder } = require("discord.js");
const { nya } = require("../utils/nya");
const { isValorantConfigured } = require("../utils/valorant");

module.exports = {
  category: "정보",
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

    // 발로란트는 HenrikDev API 키(HENRIK_API_KEY)가 있어야 조회할 수 있어서, 키가 있을 때만 버튼을 보인다.
    if (isValorantConfigured()) {
      row.addComponents(
        new ButtonBuilder()
          .setCustomId("stats-action:valorant")
          .setLabel("발로란트")
          .setStyle(ButtonStyle.Primary),
      );
    }

    await interaction.reply({
      content: nya("어떤 게임의 전적을 검색할까요?"),
      components: [row],
      ephemeral: true,
    });
  },
};
