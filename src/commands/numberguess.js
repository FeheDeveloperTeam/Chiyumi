const { SlashCommandBuilder } = require("discord.js");
const { nya } = require("../utils/nya");
const { getBalance, addBalance } = require("../utils/credits");

const MAX_NUMBER = 10;
const WIN_MULTIPLIER = 9;

module.exports = {
  data: new SlashCommandBuilder()
    .setName("numberguess")
    .setNameLocalizations({ ko: "숫자맞추기" })
    .setDescription("1부터 10까지 숫자를 맞춰 치유미코인을 겁니다")
    .setDescriptionLocalizations({
      ko: "1부터 10까지 숫자를 맞춰 치유미코인을 겁니다",
    })
    .addIntegerOption((option) =>
      option
        .setName("guess")
        .setNameLocalizations({ ko: "예상숫자" })
        .setDescription("1부터 10 사이의 숫자를 예상하세요")
        .setDescriptionLocalizations({ ko: "1부터 10 사이의 숫자를 예상하세요" })
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(MAX_NUMBER),
    )
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
    const guess = interaction.options.getInteger("guess", true);
    const bet = interaction.options.getInteger("bet", true);
    const userId = interaction.user.id;
    const balance = getBalance(userId);

    if (bet > balance) {
      await interaction.reply({
        content: nya(
          `보유한 치유미코인(${balance}개)보다 많은 금액을 베팅할 수 없습니다. (오류 코드: NUMBER-001)`,
        ),
        ephemeral: true,
      });
      return;
    }

    const answer = Math.floor(Math.random() * MAX_NUMBER) + 1;
    const won = guess === answer;
    const delta = won ? bet * WIN_MULTIPLIER : -bet;
    const newBalance = addBalance(userId, delta);
    const deltaText = delta > 0 ? `+${delta}` : `${delta}`;

    await interaction.reply(
      nya(
        `정답: ${answer} → ${won ? "정답입니다" : "틀렸습니다"}! (${deltaText} 치유미코인, 현재 보유: ${newBalance}개)`,
      ),
    );
  },
};
