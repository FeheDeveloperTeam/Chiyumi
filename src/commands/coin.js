const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  SlashCommandBuilder,
} = require("discord.js");
const { nya } = require("../utils/nya");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("coin")
    .setNameLocalizations({ ko: "코인" })
    .setDescription("This is 치유미코인. Manage your coin.")
    .setDescriptionLocalizations({
      ko: "이거는 치유미코인입니다 코인 관련 기능을 사용합니다",
    }),

  async execute(interaction) {
    const checkButton = new ButtonBuilder()
      .setCustomId("coin-action:check")
      .setLabel("잔액 조회")
      .setStyle(ButtonStyle.Primary);

    const claimButton = new ButtonBuilder()
      .setCustomId("coin-action:claim")
      .setLabel("일일 지급 받기")
      .setStyle(ButtonStyle.Success);

    const row = new ActionRowBuilder().addComponents(checkButton, claimButton);

    await interaction.reply({
      content: nya("어떤 기능을 사용할까요?"),
      components: [row],
      ephemeral: true,
    });
  },
};
