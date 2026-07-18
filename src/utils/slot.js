const JACKPOT_MULTIPLIERS = {
  "7️⃣": 50,
  "💎": 20,
  "🔔": 10,
  "🍇": 7,
  "🍋": 5,
  "🍒": 4,
};
const WIN_SYMBOLS = Object.keys(JACKPOT_MULTIPLIERS);

// 희귀도별 풀 가중치 (낮은 배율 심볼일수록 많이 등장)
// 7️⃣:1 / 💎:2 / 🔔:3 / 🍇:5 / 🍋:7 / 🍒:9 → 총 27개
const SYMBOL_POOL = [
  "7️⃣",
  "💎", "💎",
  "🔔", "🔔", "🔔",
  "🍇", "🍇", "🍇", "🍇", "🍇",
  "🍋", "🍋", "🍋", "🍋", "🍋", "🍋", "🍋",
  "🍒", "🍒", "🍒", "🍒", "🍒", "🍒", "🍒", "🍒", "🍒",
];

const BLANK = "⬛"; // 당첨 없는 빈 칸 심볼

// 3배: 빈 칸 27개 추가 → 당첨 확률 약 절반으로 감소
const SYMBOL_POOL_3X = [...SYMBOL_POOL, ...Array(27).fill(BLANK)];

// 5배: 빈 칸 54개 추가 → 당첨 확률 약 1/3로 감소
const SYMBOL_POOL_5X = [...SYMBOL_POOL, ...Array(54).fill(BLANK)];

function getPool(riskMult) {
  if (riskMult >= 5) return SYMBOL_POOL_5X;
  if (riskMult >= 3) return SYMBOL_POOL_3X;
  return SYMBOL_POOL;
}

const HIDDEN_SYMBOL = "❓";
const REVEAL_DELAY_MS = 800;

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildReelText(reels, revealedCount) {
  const symbols = reels.map((symbol, index) => (index < revealedCount ? symbol : HIDDEN_SYMBOL));
  return `[ ${symbols.join(" │ ")} ]`;
}

function spin(riskMult = 1) {
  const pool = getPool(riskMult);
  const pick = () => pool[Math.floor(Math.random() * pool.length)];
  const reels = [pick(), pick(), pick(), pick()];

  // 잭팟: 4개 모두 같은 WIN 심볼
  if (reels.every((r) => r === reels[0]) && WIN_SYMBOLS.includes(reels[0])) {
    return { reels, resultText: "잭팟", multiplier: JACKPOT_MULTIPLIERS[reels[0]] };
  }

  // 당첨: WIN 심볼 3개 일치
  for (const sym of WIN_SYMBOLS) {
    if (reels.filter((r) => r === sym).length === 3) {
      return { reels, resultText: "당첨", multiplier: Math.max(1, Math.floor(JACKPOT_MULTIPLIERS[sym] / 2)) };
    }
  }

  // 소당첨: WIN 심볼 2개 일치 (희귀 심볼 우선)
  for (const sym of WIN_SYMBOLS) {
    if (reels.filter((r) => r === sym).length === 2) {
      return { reels, resultText: "소당첨", multiplier: Math.max(1, Math.floor(JACKPOT_MULTIPLIERS[sym] / 4)) };
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
