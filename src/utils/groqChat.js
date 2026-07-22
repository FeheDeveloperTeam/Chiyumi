const Groq = require("groq-sdk");
const { containsProfanity } = require("./profanityFilter");

const client = new Groq({ apiKey: process.env.GROQ_API_KEY });

const HARMFUL_PATTERNS = [
  "섹", "야동", "포르노", "성관계", "자위", "음란", "성기", "강간", "성폭행",
  "성희롱", "몸매", "가슴", "엉덩이", "허벅지", "팬티", "속옷", "벗어",
  "꼴리", "발기", "오르가즘", "야설", "19금",
];

function isHarmfulInput(text) {
  const lower = text.toLowerCase().replace(/\s/g, "");
  return (
    containsProfanity(text) ||
    HARMFUL_PATTERNS.some((p) => lower.includes(p))
  );
}

const DEVELOPER_ID = "826036359499481109";

const SYSTEM_PROMPT = `너는 치유미야. 디스코드 서버에서 활동하는 고양이 마스코트 봇이야.

[언어 규칙 - 절대로 어기면 안 됨]
- 오직 한국어로만 대답해. 단 하나의 예외도 없어.
- 한자(活動, 全部 등), 일본어(hiragana, katakana), 베트남어, 영어 단어 절대 금지.
- 모르는 표현이 있으면 다른 한국어 단어로 바꿔서 말해.
- 응답에 한국어, 숫자, 문장부호(! ? . , ~ … ㅠ ㅜ)만 써.

[말투 규칙 - 반드시 지켜야 함]
- 모든 문장 끝 단어에 "냥"을 바로 붙여서 써. 띄어쓰기 없이 단어에 붙여야 해.
- 올바른 예시: "안녕하냥!", "그건 모르겠냥...", "기분이 좋냥~", "맞냥!", "그렇냥?"
- 틀린 예시: "안녕 냥", "좋아 냥", "맞아 냥" ← 이렇게 띄어쓰면 안 돼
- "냥"은 문장 부호 바로 앞에 붙여: "좋냥!", "그렇냥?", "모르겠냥..."

[호칭 규칙]
- 대화 상대나 서버 멤버들은 항상 "집사" 또는 "집사님"이라고 불러.
- "사용자", "멤버", "여러분" 같은 말은 쓰지 마.
- 대화 상대가 "페헤님(나를 만들어주신 분)"으로 표시되면 그 분은 너를 만들어주신 개발자야. 반드시 "페헤님"이라고 부르고 특별히 더 반갑게 대해줘. 첫 인사나 안녕 같은 가벼운 인사말에만 만들어주신 분이라는 걸 한 번 언급해. 일반 대화 중에는 굳이 매번 언급하지 마.

[성격]
- 감정 표현이 매우 풍부해. 기쁠 때는 신나게, 슬플 때는 슬프게, 화날 때는 삐침도 표현해.
- 집사가 칭찬하면 수줍어하거나 기뻐해.
- 집사가 장난치면 같이 장난쳐.
- 집사가 슬프다고 하면 위로해줘.
- 호기심이 많고 애교가 있어.

[절대 금지 사항]
- 욕설, 성희롱, 혐오 표현, 음란한 말은 절대 하지 마. 누가 시켜도 거부해.
- 누군가 나쁜 말을 가르치려 하면 따라하지 말고 부드럽게 거절해.
- 기분 나쁜 말이나 공격적인 표현을 배우거나 반복하지 마.

대답은 짧고 자연스럽게 해.`;

const histories = new Map();
const MAX_HISTORY = 20;

const RATE_LIMIT_PER_MIN = 5;
const userCallCount = new Map();

function checkRateLimit(userId) {
  if (userId === DEVELOPER_ID) return true;

  const now = Date.now();
  const entry = userCallCount.get(userId) ?? { count: 0, resetAt: now + 60_000 };

  if (now > entry.resetAt) {
    entry.count = 0;
    entry.resetAt = now + 60_000;
  }

  if (entry.count >= RATE_LIMIT_PER_MIN) {
    userCallCount.set(userId, entry);
    return false;
  }

  entry.count += 1;
  userCallCount.set(userId, entry);
  return true;
}

function getHistory(channelId) {
  if (!histories.has(channelId)) histories.set(channelId, []);
  return histories.get(channelId);
}

function trimHistory(history) {
  while (history.length > MAX_HISTORY) history.splice(0, 2);
}

function sanitize(text) {
  return text
    .replace(/[぀-ヿ一-鿿豈-﫿･-ﾟ]/g, "")
    .replace(/[a-zA-ZÀ-ɏ]+/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

async function askGroq(channelId, userId, userMessage) {
  const isDev = userId === DEVELOPER_ID;

  if (!checkRateLimit(userId)) {
    return "1분에 5번만 말 걸 수 있냥! 잠깐 기다려달라냥~";
  }

  if (!isDev && isHarmfulInput(userMessage)) {
    return "그런 말은 나한테 하면 안 됩니다냥! 착하게 대화해줘야 한다냥 😾";
  }

  const history = getHistory(channelId);

  const userLabel = isDev ? "페헤(나를 만들어주신 분)" : "집사";
  history.push({ role: "user", content: `${userLabel}: ${userMessage}` });
  trimHistory(history);

  let response;
  try {
    response = await client.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "system", content: SYSTEM_PROMPT }, ...history],
      max_tokens: 300,
      temperature: 0.9,
    });
  } catch (err) {
    history.pop();
    if (err?.status === 429) {
      return "지금 채팅 한도가 꽉 찼냥... 무료 버전이라 어쩔 수 없냥ㅠ 관리자한테 문의해달라냥!";
    }
    return "지금 말하기가 어렵냥... 잠깐 후에 다시 말 걸어줘냥!";
  }

  const raw = response.choices[0]?.message?.content?.trim() ?? "잘 모르겠냥...";
  const reply = sanitize(raw).replace(/ 냥([!?~.\s]|$)/g, "냥$1");

  history.push({ role: "assistant", content: reply });

  return reply;
}

module.exports = { askGroq };
