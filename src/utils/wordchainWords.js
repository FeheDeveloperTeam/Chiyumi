const WORD_LIST = [
  "가방", "가위", "가구", "가을", "가족", "가수", "가게", "가지",
  "나무", "나라", "나비", "나이", "나물", "나침반", "낙엽", "낚시",
  "다리", "다람쥐", "다이어트", "단어", "달력", "달팽이", "당근", "대화",
  "라면", "라디오", "랜턴", "레몬", "로봇", "리본", "리듬",
  "마늘", "마음", "마차", "만두", "말썽", "망치", "매미", "머리",
  "바다", "바늘", "바람", "바위", "박물관", "반지", "발자국", "방패",
  "사과", "사자", "사진", "산책", "삼각형", "새우", "생일", "선물",
  "아기", "아이스크림", "악기", "안경", "양말", "여름", "연필", "오리",
  "자동차", "자전거", "장난감", "저녁", "정원", "조개", "주말", "지구",
  "차표", "참새", "책상", "청소", "초콜릿", "치즈", "친구",
  "카메라", "카드", "커피", "코끼리", "콩나물", "쿠키", "크레용",
  "타조", "탁자", "태양", "토끼", "통나무", "튤립",
  "파도", "파리", "팔찌", "편지", "포도", "풍선", "피아노",
  "하늘", "하마", "학교", "한라산", "해바라기", "호랑이", "휴지",
  "구름", "구두", "국수", "굴뚝", "기차", "기타", "김치",
  "도토리", "도시", "독서", "돌고래", "동물원", "딸기",
  "무지개", "문어", "물고기", "미술관", "민들레",
  "벌레", "별빛", "병아리", "보름달", "복숭아", "불꽃",
  "수박", "수영장", "숲속", "스케이트", "시계", "시소",
  "야구공", "양파", "오징어", "오이", "우산", "우유", "운동장",
  "잠자리", "장미", "젓가락", "종이", "주전자", "지팡이",
  "참외", "창문", "책가방", "초인종", "축구공",
  "코뿔소", "콜라", "크림", "키위",
  "토마토", "트럭", "타워",
  "파인애플", "팥빙수", "포크",
  "호박", "화분", "회전목마", "후추",
];

const HANGUL_BASE = 0xac00;
const JUNGSEONG_COUNT = 21;
const JONGSEONG_COUNT = 28;
const Y_VOWEL_INDICES = new Set([2, 6, 7, 12, 17, 20]); // ㅑㅕㅖㅛㅠㅣ
const CHO_RIEUL = 5; // ㄹ
const CHO_NIEUN = 2; // ㄴ
const CHO_IEUNG = 11; // ㅇ (소리값 없음)

function decompose(char) {
  const code = char.charCodeAt(0) - HANGUL_BASE;
  if (code < 0 || code > 11171) return null;

  const choIdx = Math.floor(code / (JUNGSEONG_COUNT * JONGSEONG_COUNT));
  const jungIdx = Math.floor((code % (JUNGSEONG_COUNT * JONGSEONG_COUNT)) / JONGSEONG_COUNT);
  const jongIdx = code % JONGSEONG_COUNT;
  return { choIdx, jungIdx, jongIdx };
}

function compose(choIdx, jungIdx, jongIdx) {
  return String.fromCharCode(
    HANGUL_BASE + choIdx * JUNGSEONG_COUNT * JONGSEONG_COUNT + jungIdx * JONGSEONG_COUNT + jongIdx,
  );
}

// 두음법칙: 어두에서 ㄹ→ㄴ/ㅇ, ㄴ→ㅇ(이중모음/'ㅣ' 앞)으로 바뀌는 한국어 발음 규칙
function applyDueum(char) {
  const decomposed = decompose(char);
  if (!decomposed) return char;

  const { choIdx, jungIdx, jongIdx } = decomposed;
  const isYVowel = Y_VOWEL_INDICES.has(jungIdx);

  if (choIdx === CHO_RIEUL) {
    return compose(isYVowel ? CHO_IEUNG : CHO_NIEUN, jungIdx, jongIdx);
  }

  if (choIdx === CHO_NIEUN && isYVowel) {
    return compose(CHO_IEUNG, jungIdx, jongIdx);
  }

  return char;
}

function isValidWord(word) {
  return /^[가-힣]{2,}$/.test(word);
}

function firstChar(word) {
  return word[0];
}

function lastChar(word) {
  return word[word.length - 1];
}

function matchesChainStart(word, requiredChar) {
  if (!requiredChar) return true;

  const start = firstChar(word);
  return start === requiredChar || start === applyDueum(requiredChar);
}

function pickBotWord(requiredChar, usedWords) {
  const candidates = WORD_LIST.filter(
    (word) => !usedWords.has(word) && matchesChainStart(word, requiredChar),
  );

  if (candidates.length === 0) return null;
  return candidates[Math.floor(Math.random() * candidates.length)];
}

module.exports = {
  WORD_LIST,
  isValidWord,
  firstChar,
  lastChar,
  applyDueum,
  matchesChainStart,
  pickBotWord,
};
