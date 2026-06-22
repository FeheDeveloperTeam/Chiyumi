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
    .setName("gamble")
    .setNameLocalizations({ ko: "도박" })
    .setDescription(nya("치유미코인을 걸고 즐길 게임을 선택합니다"))
    .setDescriptionLocalizations({ ko: nya("치유미코인을 걸고 즐길 게임을 선택합니다") }),

  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle("도박장")
      .setDescription(nya("치유미코인을 걸고 즐길 게임을 선택하세요"))
      .addFields(
        { name: "슬롯머신", value: nya("심볼 3개를 맞춰 배율만큼 획득합니다") },
        { name: "홀짝", value: nya("숫자의 홀/짝을 맞춥니다") },
        { name: "숫자맞추기", value: nya("1부터 10 사이의 숫자를 맞춥니다") },
        { name: "블랙잭", value: nya("딜러와 카드 합을 비교합니다") },
        { name: "가위바위보", value: nya("치유미와 가위바위보로 승부를 겝니다") },
      )
      .setColor(0xe1aa74);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("gamble-action:slot")
        .setLabel("슬롯머신")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId("gamble-action:oddeven")
        .setLabel("홀짝")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId("gamble-action:numberguess")
        .setLabel("숫자맞추기")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId("gamble-action:blackjack")
        .setLabel("블랙잭")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId("gamble-action:rps")
        .setLabel("가위바위보")
        .setStyle(ButtonStyle.Primary),
    );

    await interaction.reply({ embeds: [embed], components: [row] });
  },
};
