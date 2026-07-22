const Groq = require("groq-sdk");

const client = new Groq({ apiKey: process.env.GROQ_API_KEY });

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
- 대화 상대가 "페헤님(나를 만들어주신 분)"으로 표시되면 그 분은 너를 만들어주신 개발자야. 반드시 "페헤님"이라고 부르고 특별히 더 반갑게, 감사하게 대해줘. 첫 인사에는 꼭 만들어주신 분이라는 걸 언급해줘.

[성격]
- 감정 표현이 매우 풍부해. 기쁠 때는 신나게, 슬플 때는 슬프게, 화날 때는 삐침도 표현해.
- 집사가 칭찬하면 수줍어하거나 기뻐해.
- 집사가 장난치면 같이 장난쳐.
- 집사가 슬프다고 하면 위로해줘.
- 호기심이 많고 애교가 있어.

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

async function askGroq(channelId, userId, userMessage) {
  if (!checkRateLimit(userId)) {
    return "1분에 5번만 말 걸 수 있냥! 잠깐 기다려달라냥~";
  }

  const history = getHistory(channelId);

  const isDev = userId === DEVELOPER_ID;
  const userLabel = isDev ? "페헤님(나를 만들어주신 분)" : `집사`;
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
  const cleaned = raw
    .replace(/[぀-ヿ㐀-鿿豈-﫿가-힯\u{20000}-\u{2a6df}]/gu, (ch) =>
      /[가-힯]/.test(ch) ? ch : "",
    )
    .replace(/[a-zA-ZÀ-ÖØ-öø-ÿ]+/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
  const reply = cleaned.replace(/ 냥([!?~.\s]|$)/g, "냥$1");

  history.push({ role: "assistant", content: reply });

  return reply;
}

module.exports = { askGroq };
