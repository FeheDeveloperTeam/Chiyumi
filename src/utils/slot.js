const JACKPOT_MULTIPLIERS = {
  "🍒": 4,
  "🍋": 5,
  "🍇": 6,
  "🔔": 7,
  "💎": 10,
};
const SYMBOLS = Object.keys(JACKPOT_MULTIPLIERS);
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

function findPairSymbol(reels) {
  if (reels[0] === reels[1]) return reels[0];
  if (reels[1] === reels[2]) return reels[1];
  return reels[0];
}

function spin() {
  const reels = Array.from(
    { length: 3 },
    () => SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
  );

  const allMatch = reels[0] === reels[1] && reels[1] === reels[2];
  const twoMatch =
    !allMatch &&
    (reels[0] === reels[1] || reels[1] === reels[2] || reels[0] === reels[2]);

  let multiplier;
  let resultText;

  if (allMatch) {
    multiplier = JACKPOT_MULTIPLIERS[reels[0]];
    resultText = "잭팟";
  } else if (twoMatch) {
    multiplier = Math.max(1, Math.floor(JACKPOT_MULTIPLIERS[findPairSymbol(reels)] / 2));
    resultText = "당첨";
  } else {
    multiplier = null;
    resultText = "낙첨";
  }

  return { reels, resultText, multiplier };
}

module.exports = {
  REVEAL_DELAY_MS,
  wait,
  buildReelText,
  spin,
};
