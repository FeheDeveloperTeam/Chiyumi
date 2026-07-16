const JACKPOT_MULTIPLIERS = {
  "7️⃣": 50,
  "💎": 20,
  "🔔": 10,
  "🍇": 7,
  "🍋": 5,
  "🍒": 4,
};
const WIN_SYMBOLS = Object.keys(JACKPOT_MULTIPLIERS);
const LOSS_SYMBOLS = ["🍑", "🌙", "💀"];

// 7️⃣: 풀에 1개 (초희귀) / 나머지 WIN 심볼 3개씩 / LOSS 심볼 2개씩 → 총 22개
const SYMBOL_POOL = [
  "7️⃣",
  ...WIN_SYMBOLS.slice(1).flatMap((s) => [s, s, s]),
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
