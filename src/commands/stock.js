const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  SlashCommandBuilder,
} = require("discord.js");
const { nya } = require("../utils/nya");
const { STOCK_DEFS, getCurrentPrices, getStockHistory, getPortfolio } = require("../utils/stocks");

function buildMarketEmbed() {
  const prices = getCurrentPrices();

  const lines = STOCK_DEFS.map((def) => {
    const price = prices[def.id] ?? def.initialPrice;
    const history = getStockHistory(def.id);
    const prevPrice = history.length >= 2 ? history[history.length - 2] : price;
    const change = price - prevPrice;
    const changePct = prevPrice > 0 ? ((change / prevPrice) * 100).toFixed(1) : "0.0";
    const arrow = change > 0 ? "▲" : change < 0 ? "▼" : "━";
    const sign = change > 0 ? "+" : "";

    return `**[${def.id}] ${def.name}** (${def.sector})\n${price.toLocaleString()}코인  ${arrow} ${sign}${change.toLocaleString()} (${sign}${changePct}%)`;
  });

  return new EmbedBuilder()
    .setTitle("📈 치유미 주식 시장")
    .setDescription(lines.join("\n\n"))
    .setColor(0xe1aa74)
    .setFooter({ text: "주가는 매일 자정(KST)에 변동됩니다 | 매수/매도 시 종목 코드를 입력하세요" });
}

function buildPortfolioEmbed(userId) {
  const portfolio = getPortfolio(userId);
  const prices = getCurrentPrices();
  const entries = Object.entries(portfolio).filter(([, qty]) => qty > 0);

  if (entries.length === 0) {
    return new EmbedBuilder()
      .setTitle("💼 내 포트폴리오")
      .setDescription(nya("보유 중인 주식이 없습니다."))
      .setColor(0xe1aa74);
  }

  let totalValue = 0;
  let totalCost = 0;
  const lines = entries.map(([stockId, { qty, avgPrice }]) => {
    const def = STOCK_DEFS.find((s) => s.id === stockId);
    const price = prices[stockId] ?? 0;
    const value = price * qty;
    const cost = avgPrice * qty;
    const pnl = value - cost;
    const pnlPct = cost > 0 ? ((pnl / cost) * 100).toFixed(1) : "0.0";
    const sign = pnl > 0 ? "+" : "";
    const arrow = pnl > 0 ? "▲" : pnl < 0 ? "▼" : "━";
    totalValue += value;
    totalCost += cost;
    return [
      `**[${stockId}] ${def?.name ?? stockId}**`,
      `${qty}주 × ${price.toLocaleString()}코인 = **${value.toLocaleString()}코인**`,
      `평단 ${avgPrice.toLocaleString()}코인 | ${arrow} ${sign}${pnl.toLocaleString()}코인 (${sign}${pnlPct}%)`,
    ].join("\n");
  });

  const totalPnl = totalValue - totalCost;
  const totalSign = totalPnl > 0 ? "+" : "";
  const totalPnlPct = totalCost > 0 ? ((totalPnl / totalCost) * 100).toFixed(1) : "0.0";
  lines.push(`\n**총 평가액: ${totalValue.toLocaleString()}코인** (${totalSign}${totalPnl.toLocaleString()}코인, ${totalSign}${totalPnlPct}%)`);

  return new EmbedBuilder()
    .setTitle("💼 내 포트폴리오")
    .setDescription(lines.join("\n\n"))
    .setColor(0xe1aa74);
}

function buildStockRow() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("stock-action:portfolio")
      .setLabel("내 포트폴리오")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("stock-action:buy")
      .setLabel("매수")
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId("stock-action:sell")
      .setLabel("매도")
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId("stock-action:refresh")
      .setLabel("새로고침")
      .setStyle(ButtonStyle.Secondary),
  );
}

module.exports = {
  category: "경제",
  data: new SlashCommandBuilder()
    .setName("stock")
    .setNameLocalizations({ ko: "주식" })
    .setDescription("View the Chiyumi stock market and manage your portfolio")
    .setDescriptionLocalizations({ ko: nya("치유미 주식 시장을 확인하고 주식을 거래합니다") }),

  buildMarketEmbed,
  buildPortfolioEmbed,
  buildStockRow,

  async execute(interaction) {
    await interaction.reply({
      embeds: [buildMarketEmbed()],
      components: [buildStockRow()],
      ephemeral: true,
    });
  },
};
