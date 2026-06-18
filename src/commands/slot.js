const { SlashCommandBuilder } = require("discord.js");
const { nya } = require("../utils/nya");
const { getBalance, addBalance } = require("../utils/credits");

const SYMBOLS = ["🍒", "🍋", "🍇", "🔔", "💎"];
const HIDDEN_SYMBOL = "❓";
const REVEAL_DELAY_MS = 800;

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildReelText(reels, revealedCount) {
  return reels
    .map((symbol, index) => (index < revealedCount ? symbol : HIDDEN_SYMBOL))
    .join(" ");
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("slot")
    .setNameLocalizations({ ko: "슬롯" })
    .setDescription("치유미코인을 걸고 슬롯머신을 돌립니다")
    .setDescriptionLocalizations({ ko: "치유미코인을 걸고 슬롯머신을 돌립니다" })
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
          `보유한 치유미코인(${balance}개)보다 많은 금액을 베팅할 수 없습니다. (오류 코드: SLOT-001)`,
        ),
        ephemeral: true,
      });
      return;
    }

    const reels = Array.from(
      { length: 3 },
      () => SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
    );

    const allMatch = reels[0] === reels[1] && reels[1] === reels[2];
    const twoMatch =
      !allMatch &&
      (reels[0] === reels[1] || reels[1] === reels[2] || reels[0] === reels[2]);

    let delta;
    let resultText;

    if (allMatch) {
      delta = bet * 5;
      resultText = "잭폿";
    } else if (twoMatch) {
      delta = bet;
      resultText = "당첨";
    } else {
      delta = -bet;
      resultText = "낙첨";
    }

    await interaction.reply(
      nya(`🎰 ${buildReelText(reels, 0)} 두근두근...`),
    );

    for (let revealed = 1; revealed <= reels.length; revealed += 1) {
      await wait(REVEAL_DELAY_MS);
      await interaction.editReply(nya(`🎰 ${buildReelText(reels, revealed)}`));
    }

    const newBalance = addBalance(userId, delta);
    const deltaText = delta > 0 ? `+${delta}` : `${delta}`;

    await wait(REVEAL_DELAY_MS);
    await interaction.editReply(
      nya(
        `🎰 ${reels.join(" ")} → ${resultText}! (${deltaText} 치유미코인, 현재 보유: ${newBalance}개)`,
      ),
    );
  },
};
