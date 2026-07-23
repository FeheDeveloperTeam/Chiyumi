const { Events, EmbedBuilder, AttachmentBuilder } = require("discord.js");
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
const { getWeather, getWeatherComment } = require("../utils/weatherApi");
const { buildWeatherCardImage } = require("../utils/weatherCard");
const { getRecentEarthquakes, formatEarthquakeResponse } = require("../utils/earthquakeApi");
const { getActiveTyphoons, buildTyphoonEmbedOptions } = require("../utils/typhoonApi");
const { buildRadarImage }    = require("../utils/radarApi");
const { buildTyphoonMapImage } = require("../utils/typhoonMapApi");

const CALL_NAME_PATTERN = /^유미야[,!~]?\s*(.*)$/s;

const WEATHER_STOP_WORDS = new Set([
  "오늘", "내일", "지금", "현재", "날씨", "어때", "알려줘",
  "어때요", "알려주세요", "어떤지", "궁금해", "좀", "한번", "요즘",
]);

// 날씨 임베드 제목 이모지 + 도시명
function weatherEmbedTitle(w) {
  const g = parseFloat(w.windGust ?? "0");
  let emoji;
  if      (g >= 17)               emoji = "🌀";
  else if (g >= 14)               emoji = "🌬️";
  else if (w.pty === 3)           emoji = "❄️";
  else if (w.pty === 2)           emoji = "🌨️";
  else if (w.pty === 4)           emoji = "🌦️";
  else if (w.pty === 1)           emoji = "🌧️";
  else if (w.sky === 4)           emoji = "☁️";
  else if (w.sky === 3)           emoji = "⛅";
  else                            emoji = "☀️";
  return `${emoji} ${w.cityName} 날씨`;
}

// 날씨 임베드 사이드바 색상 (날씨 카드 테마와 동일 기준)
function weatherEmbedColor(w) {
  const g = parseFloat(w.windGust ?? "0");
  if (g >= 17)                        return 0x9b59b6; // 태풍급
  if (g >= 14)                        return 0xe67e22; // 강풍
  if (w.pty === 3)                    return 0xaec6e8; // 눈
  if (w.pty === 2)                    return 0x6699bb; // 비눈
  if (w.pty === 1 || w.pty === 4)     return 0x3a7fe8; // 비/소나기
  if (w.sky === 4)                    return 0x7f8c8d; // 흐림
  if (w.sky === 3)                    return 0xd4a843; // 구름많음
  return 0xe1aa74;                                     // 맑음
}

function extractCityFromWeatherQuery(input) {
  const beforeWeather = input.split(/날씨/)[0].trim();
  const words = beforeWeather.split(/\s+/).filter((w) => w && !WEATHER_STOP_WORDS.has(w));
  return words[words.length - 1] ?? null;
}

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
      { name: "작성자", value: `${message.author}`, inline: true },
      { name: "채널", value: `${message.channel}`, inline: true },
      {
        name: "내용",
        value: message.content?.slice(0, 1000) || "(내용을 알 수 없음)",
      },
    )
    .setColor(0xed4245)
    .setTimestamp();

  await sendLog(message.guild, embed, "profanityFilter");
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
      { name: "작성자", value: `${message.author}`, inline: true },
      { name: "채널", value: `${message.channel}`, inline: true },
      {
        name: "내용",
        value: message.content?.slice(0, 1000) || "(내용을 알 수 없음)",
      },
    )
    .setColor(0xed4245)
    .setTimestamp();

  await sendLog(message.guild, embed, "spamFilter");
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

    // --- 지진 처리 ---
    if (input.includes("지진")) {
      await message.channel.sendTyping().catch(() => {});
      try {
        const quakes = await getRecentEarthquakes();
        await message.reply(formatEarthquakeResponse(quakes));
      } catch (err) {
        console.log("[지진] 에러:", err?.message);
        await message.reply("지진 정보를 가져오지 못했냥... 잠깐 후에 다시 물어봐달라냥ㅠ");
      }
      return;
    }

    // --- 레이더 이미지 ---
    if (input.includes("레이더")) {
      await message.channel.sendTyping().catch(() => {});
      try {
        const buf        = await buildRadarImage();
        const attachment = new AttachmentBuilder(buf, { name: "radar.png" });
        const radarEmbed = new EmbedBuilder()
          .setColor(0x2c5aa0)
          .setTitle("📡 강수 레이더 (한반도 주변)")
          .setImage("attachment://radar.png")
          .setFooter({ text: "RainViewer · CARTO" })
          .setTimestamp();
        await message.reply({
          embeds: [radarEmbed],
          files:  [attachment],
        });
      } catch (err) {
        console.log("[레이더] 에러:", err?.message);
        await message.reply("레이더 이미지를 불러오지 못했냥... 잠깐 후에 다시 물어봐달라냥ㅠ");
      }
      return;
    }

    // --- 태풍 북상 확인 ---
    if (input.includes("태풍") && !input.includes("날씨")) {
      await message.channel.sendTyping().catch(() => {});
      try {
        const typhoons = await getActiveTyphoons();
        const mapBuf   = await buildTyphoonMapImage(typhoons).catch((e) => {
          console.log("[태풍/지도] 실패:", e?.message);
          return null;
        });

        const opts  = buildTyphoonEmbedOptions(typhoons);
        const embed = new EmbedBuilder()
          .setColor(opts.color)
          .setTitle(opts.title)
          .setDescription(opts.description)
          .setFooter({ text: "출처: IBTrACS (NOAA) · RainViewer · 6시간 단위 갱신" })
          .setTimestamp();
        if (opts.fields.length) embed.addFields(opts.fields);
        if (mapBuf) embed.setImage("attachment://typhoon_map.png");

        const files = mapBuf ? [new AttachmentBuilder(mapBuf, { name: "typhoon_map.png" })] : [];
        await message.reply({ embeds: [embed], files });
      } catch (err) {
        console.log("[태풍] 에러:", err?.message);
        await message.reply("태풍 정보를 가져오지 못했냥... 잠깐 후에 다시 물어봐달라냥ㅠ");
      }
      return;
    }

    // --- 날씨 처리 ---
    if (input.includes("날씨")) {
      const cityQuery = extractCityFromWeatherQuery(input);
      console.log("[날씨] 도시 쿼리:", cityQuery, "| 원본:", input);
      if (!cityQuery) {
        await message.reply("어느 지역 날씨가 궁금하냥? 도시 이름을 같이 말해달라냥~");
        return;
      }

      await message.channel.sendTyping().catch(() => {});

      try {
        console.log("[날씨] API 호출 시작");
        const [weather, radarBuf] = await Promise.all([
          getWeather(cityQuery),
          buildRadarImage().catch((e) => { console.log("[날씨/레이더] 실패:", e?.message); return null; }),
        ]);
        console.log("[날씨] API 결과:", JSON.stringify(weather));
        if (!weather) {
          await message.reply(`**${cityQuery}**은(는) 아직 지원하지 않는 지역이냥... 😿 다른 도시 이름으로 물어봐달라냥~`);
          return;
        }

        console.log("[날씨] 카드 생성 시작");
        const cardBuffer = await buildWeatherCardImage(weather);
        console.log("[날씨] 카드 생성 완료");

        // 날씨 카드 → 임베드
        const embedColor = weatherEmbedColor(weather);
        const dateLabel  = `${weather.fcstDate.slice(4,6)}/${weather.fcstDate.slice(6,8)} ${weather.fcstTime.slice(0,2)}시 기준`;
        const embed = new EmbedBuilder()
          .setColor(embedColor)
          .setTitle(weatherEmbedTitle(weather))
          .setDescription(getWeatherComment(weather))
          .setImage("attachment://weather.png")
          .setFooter({ text: `Open-Meteo · ${dateLabel}` })
          .setTimestamp();

        await message.reply({
          embeds: [embed],
          files:  [new AttachmentBuilder(cardBuffer, { name: "weather.png" })],
        });

        // 레이더 → 별도 임베드 (갤러리 방지)
        if (radarBuf) {
          const radarEmbed = new EmbedBuilder()
            .setColor(0x2c5aa0)
            .setTitle("📡 강수 레이더 (한반도 주변)")
            .setImage("attachment://radar.png")
            .setFooter({ text: "RainViewer · CARTO" })
            .setTimestamp();
          await message.channel.send({
            embeds: [radarEmbed],
            files:  [new AttachmentBuilder(radarBuf, { name: "radar.png" })],
          });
        }
        console.log("[날씨] 응답 완료");
      } catch (err) {
        console.log("[날씨] 에러:", err?.message, err?.stack);
        await message.reply("날씨 정보를 가져오지 못했냥... 잠깐 후에 다시 물어봐달라냥ㅠ");
      }
      return;
    }

    await message.channel.sendTyping().catch(() => {});

    const reply = await askGroq(message.channel.id, message.author.id, input).catch(() => "지금 말하기가 어렵냥...");
    await message.reply(reply);
  },
};
