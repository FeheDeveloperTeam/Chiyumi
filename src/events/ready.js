const { Events, ActivityType } = require("discord.js");
const { nya } = require("../utils/nya");
const { syncDataToSheets } = require("../utils/googleSheets");
const { updateDailyPrices } = require("../utils/stocks");
const { applyDailyInterest } = require("../utils/bank");
const { buildSupportEmbed } = require("../utils/supportInfo");
const { getAllConfigs } = require("../utils/guildConfig");
const { checkAllStreams } = require("../utils/streamAlert");
const { cacheGuildInvites } = require("../utils/inviteTracker");

const SHEETS_SYNC_INTERVAL_MS = 15 * 60 * 1000;
const KST_TIMEZONE = "Asia/Seoul";

const EXTRA_STATUSES = [
  "방송 알림 감시 중이다냥 👀",
  "코인 열심히 세는 중이다냥 🪙",
  "/출석 잊지 말라냥 ✅",
  "/끝말잇기 하러 오라냥 🎯",
  "주식 시세 분석 중이다냥 📈",
  "고양이는 원래 이렇게 바쁘다냥 😼",
  "졸린데 일해야 한다냥 😿",
];

function updatePresence(client) {
  client.user.setPresence({
    status: "online",
    activities: [
      {
        name: "status",
        type: ActivityType.Custom,
        state: nya(`${client.guilds.cache.size}개의 서버와 함께하는 중이다`),
      },
    ],
  });
}

function rotatePresence(client) {
  const all = [
    nya(`${client.guilds.cache.size}개의 서버와 함께하는 중이다`),
    `${client.guilds.cache.size}개의 서버 집사들 돌보는 중이다냥 🐾`,
    ...EXTRA_STATUSES,
  ];
  const state = all[Math.floor(Math.random() * all.length)];
  client.user.setPresence({
    status: "online",
    activities: [{ name: "status", type: ActivityType.Custom, state }],
  });
}

async function runSheetsSync(client) {
  try {
    await syncDataToSheets(client);
  } catch (error) {
    console.error("구글 시트 동기화 실패:", error);
  }
}

function getMsUntilNextKstMidnight() {
  const now = new Date();
  const kstNow = new Date(now.toLocaleString("en-US", { timeZone: KST_TIMEZONE }));
  const nextMidnight = new Date(kstNow);
  nextMidnight.setHours(24, 0, 0, 0);
  return nextMidnight.getTime() - kstNow.getTime();
}

function runDailyTasks() {
  try {
    updateDailyPrices();
  } catch (error) {
    console.error("주가 변동 실패:", error);
  }
  try {
    applyDailyInterest();
  } catch (error) {
    console.error("은행 이자 적용 실패:", error);
  }
}

function scheduleDailyTasks() {
  const delay = getMsUntilNextKstMidnight();
  setTimeout(() => {
    runDailyTasks();
    setInterval(runDailyTasks, 24 * 60 * 60 * 1000);
  }, delay);
}

async function updateSupportMessages(client) {
  const configs = getAllConfigs();
  for (const [guildId, config] of Object.entries(configs)) {
    const { supportChannelId, supportMessageId } = config;
    if (!supportChannelId || !supportMessageId) continue;
    try {
      const guild = client.guilds.cache.get(guildId);
      if (!guild) continue;
      const channel = guild.channels.cache.get(supportChannelId);
      if (!channel) continue;
      const message = await channel.messages.fetch(supportMessageId).catch(() => null);
      if (!message) continue;
      await message.edit({ embeds: [buildSupportEmbed()] });
    } catch {
      // 메시지 삭제됐거나 채널 없으면 무시
    }
  }
}

function getMsUntilNextKstHour(targetHour) {
  const now = new Date();
  const kstNow = new Date(now.toLocaleString("en-US", { timeZone: KST_TIMEZONE }));
  const next = new Date(kstNow);
  next.setHours(targetHour, 0, 0, 0);
  if (next <= kstNow) next.setDate(next.getDate() + 1);
  return next.getTime() - kstNow.getTime();
}

function scheduleSupportUpdates(client) {
  for (const hour of [10, 19]) {
    const delay = getMsUntilNextKstHour(hour);
    setTimeout(() => {
      updateSupportMessages(client);
      setInterval(() => updateSupportMessages(client), 24 * 60 * 60 * 1000);
    }, delay);
  }
}

module.exports = {
  name: Events.ClientReady,
  once: true,
  execute(client) {
    console.log(`${client.user.tag} 봇이 준비되었습니다.`);
    updatePresence(client);
    client.on(Events.GuildCreate, () => updatePresence(client));
    client.on(Events.GuildDelete, () => updatePresence(client));

    for (const guild of client.guilds.cache.values()) {
      cacheGuildInvites(guild).catch(() => {});
    }

    runSheetsSync(client);
    setInterval(() => runSheetsSync(client), SHEETS_SYNC_INTERVAL_MS);

    checkAllStreams(client).catch(() => {});
    setInterval(() => checkAllStreams(client).catch(() => {}), 5 * 60 * 1000);

    setInterval(() => rotatePresence(client), 20 * 1000);

    scheduleDailyTasks();
    updateSupportMessages(client).catch(() => {});
    scheduleSupportUpdates(client);
  },
};
