const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  SlashCommandBuilder,
} = require("discord.js");
const { nya } = require("../utils/nya");
const { isDeveloper } = require("../utils/devUser");

function buildDeveloperEmbed() {
  return new EmbedBuilder()
    .setTitle("🛠️ 개발자 전용 메뉴")
    .setDescription(nya("아래 버튼으로 사용자 이용제한을 관리하세요"))
    .setColor(0xe1aa74);
}

function buildDeveloperRow() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("dev-action:restrict")
      .setLabel("이용제한")
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId("dev-action:unrestrict")
      .setLabel("이용제한 해제")
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId("dev-action:check")
      .setLabel("이용제한 확인")
      .setStyle(ButtonStyle.Primary),
  );
}

module.exports = {
  category: "개발자",
  data: new SlashCommandBuilder()
    .setName("developer")
    .setNameLocalizations({ ko: "개발자" })
    .setDescription(nya("개발자 전용 기능을 사용합니다"))
    .setDescriptionLocalizations({ ko: nya("개발자 전용 기능을 사용합니다") }),

  async execute(interaction) {
    if (!isDeveloper(interaction.user.id)) {
      await interaction.reply({
        content: nya("이 명령어는 개발자만 사용할 수 있습니다. (오류 코드: DEV-001)"),
        ephemeral: true,
      });
      return;
    }

    await interaction.reply({
      embeds: [buildDeveloperEmbed()],
      components: [buildDeveloperRow()],
      ephemeral: true,
    });
  },

  buildDeveloperEmbed,
  buildDeveloperRow,
};
