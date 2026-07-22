const { Events, EmbedBuilder } = require("discord.js");
const { nya } = require("../utils/nya");
const { containsProfanity } = require("../utils/profanityFilter");
const { isSpam } = require("../utils/spamFilter");
const { getLogOptions, sendLog } = require("../utils/guildConfig");
const { grantActivityReward, levelFromXp } = require("../utils/levels");
const { addBalance } = require("../utils/credits");
const { announceLevelUp } = require("../utils/levelUpAnnounce");
const { hasAgreed } = require("../utils/consent");
const { handleMessage: handleWordChainMessage } = require("../utils/wordchainGame");
const { askGroq } = require("../utils/groqChat");

const CALL_NAME_PATTERN = /^유미야[,!~]?\s*(.*)$/s;

async function handleProfanity(message) {
  await message.delete().catch(() => {});

  const warning = await message.channel
    .send(nya(`${message.author} 욕설이 감지되어 메시지를 지웠습니다`))
    .catch(() => null);

  if (warning) {
    setTimeout(() => warning.delete().catch(() => {}), 5000);
  }

  const embed = new EmbedBuilder()
    .setTitle("욕설 검열")
    .addFields(
      { name: "작성자", value: `${message.author}` },
      { name: "채널", value: `${message.channel}` },
      {
        name: "내용",
        value: message.content?.slice(0, 1000) || "(내용을 알 수 없음)",
      },
    )
    .setColor(0xed4245)
    .setTimestamp();

  await sendLog(message.guild, embed);
}

async function handleSpam(message) {
  await message.delete().catch(() => {});

  const warning = await message.channel
    .send(nya(`${message.author} 도배가 감지되어 메시지를 지웠습니다`))
    .catch(() => null);

  if (warning) {
    setTimeout(() => warning.delete().catch(() => {}), 5000);
  }

  const embed = new EmbedBuilder()
    .setTitle("도배 검열")
    .addFields(
      { name: "작성자", value: `${message.author}` },
      { name: "채널", value: `${message.channel}` },
      {
        name: "내용",
        value: message.content?.slice(0, 1000) || "(내용을 알 수 없음)",
      },
    )
    .setColor(0xed4245)
    .setTimestamp();

  await sendLog(message.guild, embed);
}

module.exports = {
  name: Events.MessageCreate,
  async execute(message) {
    if (message.author.bot) return;

    if (message.channel.isThread() && (await handleWordChainMessage(message))) {
      return;
    }

    if (
      message.guild &&
      getLogOptions(message.guild.id).profanityFilter &&
      containsProfanity(message.content)
    ) {
      await handleProfanity(message);
      return;
    }

    if (
      message.guild &&
      getLogOptions(message.guild.id).spamFilter &&
      isSpam(message.author.id, message.content)
    ) {
      await handleSpam(message);
      return;
    }

    if (message.guild && hasAgreed(message.author.id)) {
      const reward = grantActivityReward(message.guild.id, message.author.id);

      if (reward) {
        addBalance(message.author.id, reward.coinsGained);

        const previousLevel = levelFromXp(reward.totalXp - reward.xpGained).level;
        const newLevel = levelFromXp(reward.totalXp).level;

        if (newLevel > previousLevel) {
          await announceLevelUp(message.guild, message.author, message.channel, newLevel);
        }
      }
    }

    const match = message.content.match(CALL_NAME_PATTERN);
    if (!match) return;

    const rest = match[1].trim();
    const input = rest || "불렀어?";

    await message.channel.sendTyping().catch(() => {});

    const reply = await askGroq(message.channel.id, message.author.id, input).catch(() => "지금 말하기가 어렵냥...");
    await message.reply(reply);
  },
};
