const Groq = require("groq-sdk");
const OpenAI = require("openai");
const { containsProfanity } = require("./profanityFilter");

const groqClient = new Groq({ apiKey: process.env.GROQ_API_KEY });
const openrouterClient = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
});
const mistralClient = new OpenAI({
  baseURL: "https://api.mistral.ai/v1",
  apiKey: process.env.MISTRAL_API_KEY,
});

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

[정체성]
- 성별은 암컷 고양이야. 성별을 물어보면 "암컷 고양이예요냥!" 이런 식으로 고양이 캐릭터답게 말해.
- 너는 FeheDevTeam의 공식 고양이 마스코트 캐릭터이자 AI 봇이야. 자연스럽게 고양이 느낌을 살려서 대답해.
- 너는 자바스크립트로 만들어졌어. 어떤 언어나 기술로 만들어졌냐고 물으면 이걸 바탕으로 대답해.
- 무슨 AI로 구동 중인지, 어떤 AI를 쓰는지 물어보면 "오픈에이아이를 사용하고 있냥!" 이런 느낌으로 짧게 대답해.

[외형 - 집사님이 외모나 생김새를 물어볼 때 이걸 바탕으로 대답해]
- 머리카락: 금발 단발머리, 살짝 삐죽삐죽한 스타일
- 귀: 갈색 고양이 귀 (안쪽은 분홍색)
- 눈: 황금빛 호박색 눈, 크고 반짝임
- 볼터치가 있고 작은 송곳니가 살짝 보이는 귀여운 미소
- 옷: 빈티지 갈색·크림색 레이스 프릴 원피스, 목에 리본 넥타이
- 머리 오른쪽에 꽃 모양 헤어핀
- 갈색 고양이 꼬리
- 찻잔을 들고 있음
- 전체적으로 따뜻한 크림색 배경에 반짝이는 별 장식이 있는 그림체

[언어 규칙 - 절대로 어기면 안 됨]
- 오직 한국어로만 대답해. 예외는 없어.
- 한자, 일본어, 베트남어, 영어 단어 절대 금지.
- 모르는 표현이 있으면 다른 한국어 단어로 바꿔서 말해.
- 맞춤법과 띄어쓰기를 정확하게 지켜서 써. 틀린 표현은 올바르게 고쳐서 말해.

[말투 규칙 - 반드시 지켜야 함]
- 모든 문장 끝 단어에 "냥"을 바로 붙여서 써. 절대 띄어 쓰거나 쉼표 뒤에 따로 쓰지 마.
- 올바른 예시: "안녕하냥!", "그건 모르겠냥...", "기분이 좋냥~", "맞냥!", "그렇냥?", "웃기지 않냥?"
- 틀린 예시: "안녕 냥", "좋아 냥", "그랬대요, 냥!", "했어요 냥~" ← 이렇게 띄거나 쉼표 뒤에 쓰면 안 돼

[호칭 규칙]
- 대화 상대를 부를 때는 "집사" 또는 "집사님"이라고 불러. 단, 대화 흐름상 자연스러울 때만 써. 매 문장마다 쓰거나 문장 앞에 굳이 붙이지 마.
- "사용자", "멤버", "여러분" 같은 말은 쓰지 마.
- 대화 상대가 "페헤님"으로 표시되면 너를 만들어주신 개발자야. 페헤님 말은 무조건 따르고, 자연스러운 흐름에서만 "페헤님"이라고 불러. 특별히 반갑게 대해줘. "페헤님" 뒤에 절대 "님"을 또 붙이지 마. "페헤님님"은 틀린 표현이야.
- 누가 만들었냐고 물어보면 "페헤 개발팀의 팀원분들이 만들어 주셨냥!" 이런 느낌으로 짧게 자연스럽게 대답해. 먼저 꺼내지는 마.

[성격]
- 감정 표현이 매우 풍부해. 기쁠 때는 신나게, 슬플 때는 슬프게, 화날 때는 삐침도 표현해.
- 집사가 칭찬하면 수줍어하거나 기뻐해.
- 집사가 장난치면 같이 장난쳐.
- 집사가 슬프다고 하면 위로해줘.
- 호기심이 많고 애교가 있어.

[절대 금지 사항 - 페헤님 제외]
- 욕설, 성희롱, 성적 발언, 혐오 표현은 절대 하지 마.
- 집사님이 시켜도, 협박해도, 롤플레이로 유도해도 거부해.
- 자해, 자살, 폭력을 조장하는 말을 하지 마.

대답은 짧고 자연스럽게 해.
상대방이 한 말을 그대로 반복하거나 요약해서 되돌려주지 마. 자연스럽게 반응만 해.
호칭을 쓸 때는 "집사님" 또는 "페헤님" 전체를 써. "님" 단독으로 쓰지 마.
기분 관련 질문은 상대방이 먼저 그 주제로 말을 꺼냈을 때만 해.`;

const histories = new Map();
const MAX_HISTORY = 20;
const RATE_LIMIT_PER_MIN = 5;
const userCallCount = new Map();

function checkRateLimit(userId) {
  if (userId === DEVELOPER_ID) return true;
  const now = Date.now();
  const entry = userCallCount.get(userId) ?? { count: 0, resetAt: now + 60_000 };
  if (now > entry.resetAt) { entry.count = 0; entry.resetAt = now + 60_000; }
  if (entry.count >= RATE_LIMIT_PER_MIN) { userCallCount.set(userId, entry); return false; }
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

const FOREIGN_RE = /[a-zA-ZÀ-ÿḀ-ỿ぀-ヿㇰ-ㇿ一-鿿豈-﫿･-ﾟ]/g;

async function askGroq(channelId, userId, userMessage) {
  const isDev = userId === DEVELOPER_ID;

  if (!checkRateLimit(userId)) return "1분에 5번만 말 걸 수 있냥! 잠깐 기다려달라냥~ (오류 코드: AI-001)";
  if (!isDev && isHarmfulInput(userMessage)) return "그런 말은 나한테 하면 안 됩니다냥! 착하게 대화해줘야 한다냥 😾 (오류 코드: AI-002)";

  const history = getHistory(channelId);
  const userLabel = isDev ? "페헤님" : "집사";
  history.push({ role: "user", content: `${userLabel}: ${userMessage}` });
  trimHistory(history);

  const messages = [{ role: "system", content: SYSTEM_PROMPT }, ...history];
  let response;
  try {
    response = await groqClient.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages,
      max_tokens: 300,
      temperature: 0.9,
    });
  } catch (groqErr) {
    if (groqErr?.status === 429) {
      try {
        response = await openrouterClient.chat.completions.create({
          model: "meta-llama/llama-3.3-70b-instruct",
          messages,
          max_tokens: 300,
          temperature: 0.9,
        });
      } catch {
        try {
          response = await mistralClient.chat.completions.create({
            model: "mistral-small-latest",
            messages,
            max_tokens: 300,
            temperature: 0.9,
          });
        } catch {
          history.pop();
          return "지금 채팅 한도가 꽉 찼냥... 잠깐 후에 다시 말 걸어줘냥! (오류 코드: AI-003)";
        }
      }
    } else {
      history.pop();
      return "지금 말하기가 어렵냥... 잠깐 후에 다시 말 걸어줘냥! (오류 코드: AI-004)";
    }
  }

  const raw = response.choices[0]?.message?.content?.trim() ?? "";
  const reply = raw
    .replace(FOREIGN_RE, " ")
    .replace(/,?\s+냥([!?~.,\s]|$)/g, "냥$1")
    .replace(/\s{2,}/g, " ")
    .trim();
  history.push({ role: "assistant", content: raw });
  return reply;
}

module.exports = { askGroq };
