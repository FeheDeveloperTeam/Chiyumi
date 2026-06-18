const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  SlashCommandBuilder,
} = require("discord.js");
const { nya } = require("../utils/nya");
const { getBalance, addBalance } = require("../utils/credits");
const { cardLabel, handTotal, isBlackjack, createSession } = require("../utils/blackjack");

function buildHandText(cards, hideSecond = false) {
  if (hideSecond) {
    return `${cardLabel(cards[0])} 🂠`;
  }
  return cards.map(cardLabel).join(" ");
}

function buildBjEmbed(session, { revealDealer = false, result = null } = {}) {
  const playerTotal = handTotal(session.playerCards);
  const embed = new EmbedBuilder()
    .setTitle("블랙잭")
    .addFields(
      {
        name: `내 카드 (${playerTotal})`,
        value: buildHandText(session.playerCards),
      },
      {
        name: revealDealer
          ? `딜러 카드 (${handTotal(session.dealerCards)})`
          : "딜러 카드",
        value: buildHandText(session.dealerCards, !revealDealer),
      },
    )
    .setColor(0xe1aa74)
    .setFooter({ text: `베팅: ${session.bet} 치유미코인` });

  if (result) {
    embed.setDescription(result);
  }

  return embed;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("blackjack")
    .setNameLocalizations({ ko: "블랙잭" })
    .setDescription("치유미코인을 걸고 블랙잭을 합니다")
    .setDescriptionLocalizations({ ko: "치유미코인을 걸고 블랙잭을 합니다" })
    .addIntegerOption((option) =>
      option
        .setName("bet")
        .setNameLocalizations({ ko: "베팅금액" })
        .setDescription("베팅할 치유미코인 금액입니다")
        .setDescriptionLocalizations({ ko: "베팅할 치유미코인 금액입니다" })
        .setRequired(true)
        .setMinValue(1),
    ),

  async execute(interaction) {
    const bet = interaction.options.getInteger("bet", true);
    const userId = interaction.user.id;
    const balance = getBalance(userId);

    if (bet > balance) {
      await interaction.reply({
        content: nya(
          `보유한 치유미코인(${balance}개)보다 많은 금액을 베팅할 수 없습니다. (오류 코드: BJ-001)`,
        ),
        ephemeral: true,
      });
      return;
    }

    const { id, session } = createSession(userId, bet);

    if (isBlackjack(session.playerCards)) {
      const dealerBlackjack = isBlackjack(session.dealerCards);
      const delta = dealerBlackjack ? 0 : Math.floor(bet * 1.5);
      const newBalance = addBalance(userId, delta);
      const resultText = dealerBlackjack
        ? `둘 다 블랙잭! 비겼습니다. 현재 보유: ${newBalance}개`
        : `블랙잭! ${delta} 치유미코인을 획득했습니다. 현재 보유: ${newBalance}개`;

      await interaction.reply({
        embeds: [
          buildBjEmbed(session, { revealDealer: true, result: nya(resultText) }),
        ],
      });
      return;
    }

    const hitButton = new ButtonBuilder()
      .setCustomId(`bj-action:${id}:hit`)
      .setLabel("히트")
      .setStyle(ButtonStyle.Primary);

    const standButton = new ButtonBuilder()
      .setCustomId(`bj-action:${id}:stand`)
      .setLabel("스탠드")
      .setStyle(ButtonStyle.Secondary);

    const row = new ActionRowBuilder().addComponents(hitButton, standButton);

    await interaction.reply({
      embeds: [buildBjEmbed(session)],
      components: [row],
    });
  },

  buildBjEmbed,
};
