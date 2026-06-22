const { Events, ActivityType } = require("discord.js");
const { nya } = require("../utils/nya");

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

module.exports = {
  name: Events.ClientReady,
  once: true,
  execute(client) {
    console.log(`${client.user.tag} 봇이 준비되었습니다.`);
    updatePresence(client);
    client.on(Events.GuildCreate, () => updatePresence(client));
    client.on(Events.GuildDelete, () => updatePresence(client));
  },
};
