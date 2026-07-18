const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  SlashCommandBuilder,
} = require("discord.js");
const { nya } = require("../utils/nya");

function buildGambleEmbed() {
  return new EmbedBuilder()
    .setTitle("도박장")
    .setDescription(nya("치유미코인을 걸고 즐길 게임을 선택하세요\n게임 선택 후 배율(1배~5배)을 고를 수 있습니다"))
    .addFields(
      { name: "슬롯머신", value: nya("릴 4개 중 같은 심볼이 2개 이상이면 당첨 · 3배부터 당첨 확률 감소") },
      { name: "홀짝", value: nya("홀/짝 중 하나를 골라 치유미와 대결 · 1배 당첨 확률 50%") },
      { name: "숫자맞추기", value: nya("숫자를 맞히면 베팅액의 7배 획득 · 배율이 높을수록 범위가 넓어짐") },
      { name: "블랙잭", value: nya("딜러와 카드 합을 비교 · 버스트 시 1.5배 손실 · 동점은 딜러 승") },
      { name: "가위바위보", value: nya("치유미와 가위바위보 대결 · 비기면 패배 · 1배 당첨 확률 33%") },
    )
    .setColor(0xe1aa74);
}

function buildGambleRow() {
  return new ActionRowBuilder().addComponents(
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
}

module.exports = {
  category: "게임",
  data: new SlashCommandBuilder()
    .setName("gamble")
    .setNameLocalizations({ ko: "도박" })
    .setDescription(nya("치유미코인을 걸고 즐길 게임을 선택합니다"))
    .setDescriptionLocalizations({ ko: nya("치유미코인을 걸고 즐길 게임을 선택합니다") }),

  buildGambleEmbed,
  buildGambleRow,

  async execute(interaction) {
    await interaction.reply({ embeds: [buildGambleEmbed()], components: [buildGambleRow()], ephemeral: true });
  },
};
