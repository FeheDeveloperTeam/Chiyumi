const BANNED_WORDS = [
  // 씨발 계열 (변형 포함)
  "씨발", "씨바", "시발", "시바",
  "씨팔", "씨빨", "씨빡", "씨벌", "씌발", "씨파",
  // 개새끼 계열
  "개새끼", "개새기", "개쌔끼", "개세끼",
  // 병신 계열
  "병신", "븅신", "빙신", "뼝신",
  // 지랄 계열
  "지랄",
  // 미친 계열
  "미친놈", "미친년", "미친새끼", "미쳤",
  // 좆 계열
  "좆",
  // 썅 계열
  "썅",
  // 성적 비하
  "보지", "자지", "창녀", "창년",
  // 가족 비하
  "느금마", "니애미", "니미럴",
  // 기타
  "걸레", "개자식", "개년", "개놈", "새끼",
  "존나", "존내",
  // 초성 축약형
  "ㅅㅂ", "ㅆㅂ", "ㅂㅅ", "ㅈㄹ", "ㄱㅅㄲ", "ㅁㅊ", "ㄷㅊ",
];

// 숫자·특수문자를 제거해 '시1발', '씨@발' 같은 우회 탐지
function normalize(text) {
  return text.toLowerCase().replace(/[^가-힣ㄱ-ㅎㅏ-ㅣa-z]/g, "");
}

function containsProfanity(text) {
  if (!text) return false;
  const normalized = normalize(text);
  return BANNED_WORDS.some((word) => normalized.includes(word));
}

module.exports = { containsProfanity };
