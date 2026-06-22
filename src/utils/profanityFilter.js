const BANNED_WORDS = [
  "씨발",
  "씨바",
  "시발",
  "개새끼",
  "병신",
  "지랄",
  "미친놈",
  "미친년",
  "좆",
  "썅",
  "걸레",
  "개자식",
];

function normalize(text) {
  return text.toLowerCase().replace(/[\s.,!?~^*\-_]/g, "");
}

function containsProfanity(text) {
  if (!text) return false;
  const normalized = normalize(text);
  return BANNED_WORDS.some((word) => normalized.includes(word));
}

module.exports = { containsProfanity };
