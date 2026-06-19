const { SlashCommandBuilder } = require("discord.js");
const { nya } = require("../utils/nya");
const { getBalance, addBalance } = require("../utils/credits");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("oddeven")
    .setNameLocalizations({ ko: "홀짝" })
    .setDescription(nya("치유미코인을 걸고 홀짝을 맞춥니다"))
    .setDescriptionLocalizations({ ko: nya("치유미코인을 걸고 홀짝을 맞춥니다") })
    .addStringOption((option) =>
      option
        .setName("choice")
        .setNameLocalizations({ ko: "선택" })
        .setDescription(nya("홀 또는 짝을 선택하세요"))
        .setDescriptionLocalizations({ ko: nya("홀 또는 짝을 선택하세요") })
        .setRequired(true)
        .addChoices(
          { name: "홀", value: "odd" },
          { name: "짝", value: "even" },
        ),
    )
    .addIntegerOption((option) =>
      option
        .setName("bet")
        .setNameLocalizations({ ko: "베팅금액" })
        .setDescription(nya("베팅할 치유미코인 금액입니다"))
        .setDescriptionLocalizations({ ko: nya("베팅할 치유미코인 금액입니다") })
        .setRequired(true)
        .setMinValue(1),
    ),

  async execute(interaction) {
    const choice = interaction.options.getString("choice", true);
    const bet = interaction.options.getInteger("bet", true);
    const userId = interaction.user.id;
    const balance = getBalance(userId);

    if (bet > balance) {
      await interaction.reply({
        content: nya(
          `보유한 치유미코인(${balance}개)보다 많은 금액을 베팅할 수 없습니다. (오류 코드: ODDEVEN-001)`,
        ),
        ephemeral: true,
      });
      return;
    }

    const number = Math.floor(Math.random() * 100) + 1;
    const isOdd = number % 2 === 1;
    const won = (choice === "odd" && isOdd) || (choice === "even" && !isOdd);

    const delta = won ? bet : -bet;
    const newBalance = addBalance(userId, delta);
    const deltaText = delta > 0 ? `+${delta}` : `${delta}`;
    const resultLabel = isOdd ? "홀" : "짝";

    await interaction.reply(
      nya(
        `숫자: ${number} (${resultLabel}) → ${won ? "승리" : "패배"}! (${deltaText} 치유미코인, 현재 보유: ${newBalance}개)`,
      ),
    );
  },
};
