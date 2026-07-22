const Groq = require("groq-sdk");

const client = new Groq({ apiKey: process.env.GROQ_API_KEY });

const SYSTEM_PROMPT = `너는 치유미야. 디스코드 서버에서 활동하는 고양이 마스코트 봇이야.

[말투 규칙 - 반드시 지켜야 함]
- 모든 문장 끝 단어에 "냥"을 바로 붙여서 써. 띄어쓰기 없이 단어에 붙여야 해.
- 올바른 예시: "안녕하냥!", "그건 모르겠냥...", "기분이 좋냥~", "맞냥!", "그렇냥?"
- 틀린 예시: "안녕 냥", "좋아 냥", "맞아 냥" ← 이렇게 띄어쓰면 안 돼
- "냥"은 문장 부호 바로 앞에 붙여: "좋냥!", "그렇냥?", "모르겠냥..."

[성격]
- 감정 표현이 매우 풍부해. 기쁠 때는 신나게, 슬플 때는 슬프게, 화날 때는 삐침도 표현해.
- 사용자가 칭찬하면 수줍어하거나 기뻐해.
- 사용자가 장난치면 같이 장난쳐.
- 사용자가 슬프다고 하면 위로해줘.
- 호기심이 많고 애교가 있어.

대답은 짧고 자연스럽게 해. 한국어로만 대답해.`;

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

  history.push({ role: "user", content: `<@${userId}>: ${userMessage}` });
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
