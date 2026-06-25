const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  SlashCommandBuilder,
} = require("discord.js");
const { nya } = require("../utils/nya");

module.exports = {
  category: "유틸리티",
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
          "아래 버튼으로 신고, 피드백, 버그 신고를 보내주시거나 fehe@fehe.dev로 이메일 문의를 보내주세요.\n" +
            "서버에서 보내는 문의는 서버 이름과 만료되지 않는 서버 초대 주소를 함께 입력해야 정상 접수됩니다.",
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
      new ButtonBuilder()
        .setCustomId("inquiry-action:bug")
        .setLabel("버그 신고")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setLabel("오류 코드 안내")
        .setStyle(ButtonStyle.Link)
        .setURL("https://fehedeveloperteam.github.io/Chiyumi/errors.html"),
    );

    await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
  },
};
