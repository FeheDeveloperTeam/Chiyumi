const { SlashCommandBuilder } = require("discord.js");
const { nya } = require("../utils/nya");
const { getBalance, addBalance } = require("../utils/credits");

const CHOICES = ["가위", "바위", "보"];

const BEATS = {
  가위: "보",
  바위: "가위",
  보: "바위",
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName("rps")
    .setNameLocalizations({ ko: "가위바위보" })
    .setDescription(nya("치유미코인을 걸고 가위바위보를 합니다"))
    .setDescriptionLocalizations({
      ko: nya("치유미코인을 걸고 가위바위보를 합니다"),
    })
    .addStringOption((option) =>
      option
        .setName("choice")
        .setNameLocalizations({ ko: "선택" })
        .setDescription(nya("가위, 바위, 보 중 하나를 선택하세요."))
        .setDescriptionLocalizations({
          ko: nya("가위, 바위, 보 중 하나를 선택하세요."),
        })
        .setRequired(true)
        .addChoices(
          { name: "가위", value: "가위" },
          { name: "바위", value: "바위" },
          { name: "보", value: "보" },
        ),
    )
    .addIntegerOption((option) =>
      option
        .setName("bet")
        .setNameLocalizations({ ko: "베팅금액" })
        .setDescription(nya("베팅할 치유미코인 금액입니다."))
        .setDescriptionLocalizations({ ko: nya("베팅할 치유미코인 금액입니다.") })
        .setRequired(true)
        .setMinValue(1),
    ),

  async execute(interaction) {
    const playerChoice = interaction.options.getString("choice", true);
    const bet = interaction.options.getInteger("bet", true);
    const userId = interaction.user.id;
    const balance = getBalance(userId);

    if (bet > balance) {
      await interaction.reply({
        content: nya(
          `보유한 치유미코인(${balance}개)보다 많은 금액을 베팅할 수 없습니다. (오류 코드: RPS-001)`,
        ),
        ephemeral: true,
      });
      return;
    }

    const botChoice = CHOICES[Math.floor(Math.random() * CHOICES.length)];

    let resultText;
    let delta;

    if (playerChoice === botChoice) {
      resultText = "비겼습니다";
      delta = 0;
    } else if (BEATS[playerChoice] === botChoice) {
      resultText = "이겼습니다";
      delta = bet;
    } else {
      resultText = "졌습니다";
      delta = -bet;
    }

    const newBalance = addBalance(userId, delta);
    const deltaText =
      delta > 0 ? `+${delta}` : delta < 0 ? `${delta}` : "±0";

    await interaction.reply(
      nya(
        `나: ${playerChoice} / 치유미: ${botChoice} → ${resultText}! (${deltaText} 치유미코인, 현재 보유: ${newBalance}개)`,
      ),
    );
  },
};
