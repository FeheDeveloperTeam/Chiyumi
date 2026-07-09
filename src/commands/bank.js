const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  SlashCommandBuilder,
} = require("discord.js");
const { nya } = require("../utils/nya");
const {
  getAccount,
  getTotalOwed,
  SAVINGS_INTEREST_RATE,
  LOAN_INTEREST_RATE,
  MAX_LOAN,
  MIN_LOAN,
} = require("../utils/bank");

function buildBankEmbed(userId) {
  const acc = getAccount(userId);
  const owed = getTotalOwed(acc.loan);

  const lines = [
    `**예금 잔액:** ${acc.savings.toLocaleString()}코인`,
    `예금 이자: 매일 자정 ${(SAVINGS_INTEREST_RATE * 100).toFixed(0)}% 자동 지급`,
  ];

  if (acc.loan) {
    const interest = Math.ceil(acc.loan.accruedInterest);
    lines.push("");
    lines.push(`**대출 중** (대출일: ${acc.loan.takenAt})`);
    lines.push(`원금 ${acc.loan.principal.toLocaleString()}코인 + 이자 ${interest.toLocaleString()}코인`);
    lines.push(`**상환 필요액: ${owed.toLocaleString()}코인**`);
    lines.push(`대출 이자: 하루 ${(LOAN_INTEREST_RATE * 100).toFixed(0)}% (복리)`);
  } else {
    lines.push("");
    lines.push(`대출 한도: ${MIN_LOAN.toLocaleString()} ~ ${MAX_LOAN.toLocaleString()}코인`);
    lines.push(`대출 이자: 하루 ${(LOAN_INTEREST_RATE * 100).toFixed(0)}% (복리, 매일 자정 적용)`);
    lines.push("대출은 1건만 유지할 수 있습니다.");
  }

  return new EmbedBuilder()
    .setTitle("🏦 치유미 은행")
    .setDescription(lines.join("\n"))
    .setColor(0xe1aa74);
}

function buildBankRow(hasLoan) {
  const components = [
    new ButtonBuilder()
      .setCustomId("bank-action:deposit")
      .setLabel("입금")
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId("bank-action:withdraw")
      .setLabel("출금")
      .setStyle(ButtonStyle.Secondary),
  ];

  if (hasLoan) {
    components.push(
      new ButtonBuilder()
        .setCustomId("bank-action:repay")
        .setLabel("대출 상환")
        .setStyle(ButtonStyle.Danger),
    );
  } else {
    components.push(
      new ButtonBuilder()
        .setCustomId("bank-action:loan")
        .setLabel("대출 신청")
        .setStyle(ButtonStyle.Primary),
    );
  }

  return new ActionRowBuilder().addComponents(...components);
}

module.exports = {
  category: "경제",
  data: new SlashCommandBuilder()
    .setName("bank")
    .setNameLocalizations({ ko: "은행" })
    .setDescription("Use the Chiyumi Bank: deposits, withdrawals, and loans")
    .setDescriptionLocalizations({ ko: nya("치유미 은행에서 예금, 출금, 대출을 이용합니다") }),

  buildBankEmbed,
  buildBankRow,

  async execute(interaction) {
    const acc = getAccount(interaction.user.id);
    await interaction.reply({
      embeds: [buildBankEmbed(interaction.user.id)],
      components: [buildBankRow(Boolean(acc.loan))],
      ephemeral: true,
    });
  },
};
