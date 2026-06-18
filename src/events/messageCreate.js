const { Events } = require("discord.js");
const { nya } = require("../utils/nya");

const CALL_NAME_PATTERN = /^유미야[,!~]?\s*(.*)$/s;

const RULES = [
  { keywords: ["안녕"], reply: "안녕하세요" },
  { keywords: ["사랑해"], reply: "저도 사랑해요" },
  { keywords: ["이름"], reply: "제 이름은 치유미예요" },
  { keywords: ["코인"], reply: "코인이 궁금하면 /코인 명령어를 사용해보세요" },
  { keywords: ["고마워", "감사"], reply: "천만에요" },
  { keywords: ["잘자", "잘 자"], reply: "잘 자요, 좋은 꿈 꿔요" },
  { keywords: ["뭐해"], reply: "서버를 지키고 있어요" },
];

const DEFAULT_REPLY = "무슨 말인지 잘 모르겠어요";
const EMPTY_CALL_REPLY = "네, 불러주셨어요?";

function findReply(message) {
  const rule = RULES.find(({ keywords }) =>
    keywords.some((keyword) => message.includes(keyword)),
  );

  return rule ? rule.reply : DEFAULT_REPLY;
}

module.exports = {
  name: Events.MessageCreate,
  async execute(message) {
    if (message.author.bot) return;

    const match = message.content.match(CALL_NAME_PATTERN);
    if (!match) return;

    const rest = match[1].trim();

    if (!rest) {
      await message.reply(nya(EMPTY_CALL_REPLY));
      return;
    }

    await message.reply(nya(findReply(rest)));
  },
};
