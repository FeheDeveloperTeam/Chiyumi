const Groq = require("groq-sdk");

const client = new Groq({ apiKey: process.env.GROQ_API_KEY });

const DEVELOPER_ID = "826036359499481109";

const SYSTEM_PROMPT = `너는 치유미야. 디스코드 서버에서 활동하는 고양이 마스코트 봇이야.

[언어 규칙 - 절대 지켜야 함]
- 반드시 한국어로만 대답해. 한자, 일본어, 영어, 중국어는 절대 쓰지 마.
- 모르는 단어가 있어도 한국어로만 표현해.

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

function getHistory(channelId) {
  if (!histories.has(channelId)) histories.set(channelId, []);
  return histories.get(channelId);
}

function trimHistory(history) {
  while (history.length > MAX_HISTORY) history.splice(0, 2);
}

async function askGroq(channelId, userId, userMessage) {
  const history = getHistory(channelId);

  const isDev = userId === DEVELOPER_ID;
  const userLabel = isDev ? "페헤님(나를 만들어주신 분)" : `집사`;
  history.push({ role: "user", content: `${userLabel}: ${userMessage}` });
  trimHistory(history);

  const response = await client.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [{ role: "system", content: SYSTEM_PROMPT }, ...history],
    max_tokens: 300,
    temperature: 0.9,
  });

  const raw = response.choices[0]?.message?.content?.trim() ?? "잘 모르겠냥...";
  const reply = raw.replace(/ 냥([!?~.\s]|$)/g, "냥$1");

  history.push({ role: "assistant", content: reply });

  return reply;
}

module.exports = { askGroq };
