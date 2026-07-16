const JACKPOT_MULTIPLIERS = {
  "🍒": 4,
  "🍋": 5,
  "🍇": 7,
  "🔔": 10,
  "💎": 20,
};
const WIN_SYMBOLS = Object.keys(JACKPOT_MULTIPLIERS);
const LOSS_SYMBOLS = ["🍑", "🌙", "💀"];

// 각 WIN 심볼 2개, 각 LOSS 심볼 2개 → 총 16개 풀
// P(WIN 심볼) ≈ 62.5% / 전체 당첨 확률 ≈ 21%
const SYMBOL_POOL = [
  ...WIN_SYMBOLS.flatMap((s) => [s, s]),
  ...LOSS_SYMBOLS.flatMap((s) => [s, s]),
];

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

function spin() {
  const pick = () => SYMBOL_POOL[Math.floor(Math.random() * SYMBOL_POOL.length)];
  const reels = [pick(), pick(), pick()];

  const allSame = reels[0] === reels[1] && reels[1] === reels[2];

  if (allSame && WIN_SYMBOLS.includes(reels[0])) {
    return { reels, resultText: "잭팟", multiplier: JACKPOT_MULTIPLIERS[reels[0]] };
  }

  for (const sym of WIN_SYMBOLS) {
    if (reels.filter((r) => r === sym).length === 2) {
      const multiplier = Math.max(1, Math.floor(JACKPOT_MULTIPLIERS[sym] / 3));
      return { reels, resultText: "당첨", multiplier };
    }
  }

  return { reels, resultText: "낙첨", multiplier: null };
}

module.exports = {
  REVEAL_DELAY_MS,
  wait,
  buildReelText,
  spin,
};
