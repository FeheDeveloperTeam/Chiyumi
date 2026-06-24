const {
  ActionRowBuilder,
  EmbedBuilder,
  SlashCommandBuilder,
  StringSelectMenuBuilder,
} = require("discord.js");
const { nya } = require("../utils/nya");

const CATEGORY_ORDER = ["게임", "경제", "정보", "관리", "유틸리티", "개발자", "기타"];

function getCommandsByCategory(client) {
  const grouped = new Map();

  for (const command of client.commands.values()) {
    const category = command.category ?? "기타";
    if (!grouped.has(category)) grouped.set(category, []);
    grouped.get(category).push(command);
  }

  return grouped;
}

function buildCategoryOptions(grouped) {
  return CATEGORY_ORDER.filter((category) => grouped.has(category)).map((category) => ({
    label: category,
    value: category,
    description: `${grouped.get(category).length}개의 명령어`,
  }));
}

function buildCategoryEmbed(category, commands) {
  const lines = commands.map((command) => {
    const json = command.data.toJSON();
    const koName = json.name_localizations?.ko ?? json.name;
    const koDescription = json.description_localizations?.ko ?? json.description;
    return `**/${koName}** - ${koDescription}`;
  });

  return new EmbedBuilder()
    .setTitle(`도움말 - ${category}`)
    .setDescription(lines.join("\n"))
    .setColor(0xe1aa74);
}

module.exports = {
  category: "유틸리티",
  data: new SlashCommandBuilder()
    .setName("help")
    .setNameLocalizations({ ko: "도움말" })
    .setDescription(nya("카테고리별로 명령어 목록을 보여줍니다"))
    .setDescriptionLocalizations({ ko: nya("카테고리별로 명령어 목록을 보여줍니다") }),

  async execute(interaction) {
    const grouped = getCommandsByCategory(interaction.client);
    const options = buildCategoryOptions(grouped);

    const select = new StringSelectMenuBuilder()
      .setCustomId("help-category-select")
      .setPlaceholder("카테고리를 선택하세요")
      .addOptions(options);

    const row = new ActionRowBuilder().addComponents(select);

    const embed = new EmbedBuilder()
      .setTitle("도움말")
      .setDescription(nya("아래 드롭다운에서 카테고리를 선택하면 해당 명령어 목록을 보여줍니다"))
      .setColor(0xe1aa74);

    await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
  },

  getCommandsByCategory,
  buildCategoryEmbed,
};
