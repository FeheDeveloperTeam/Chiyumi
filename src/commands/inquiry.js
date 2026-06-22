const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  SlashCommandBuilder,
} = require("discord.js");
const { nya } = require("../utils/nya");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("inquiry")
    .setNameLocalizations({ ko: "문의" })
    .setDescription("Contact information for inquiries")
    .setDescriptionLocalizations({ ko: nya("문의 시 연락할 수 있는 정보를 안내합니다") }),

  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle("문의하기")
      .setDescription(
        nya(
          "아래 버튼으로 신고나 피드백을 보내주시거나, fehe@fehe.dev로 이메일 문의를 보내주세요",
        ),
      )
      .setColor(0xe1aa74);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("inquiry-action:report")
        .setLabel("신고")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId("inquiry-action:feedback")
        .setLabel("피드백")
        .setStyle(ButtonStyle.Primary),
    );

    await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
  },
};
