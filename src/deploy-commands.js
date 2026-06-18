require("dotenv").config();

const fs = require("node:fs");
const path = require("node:path");
const { REST, Routes } = require("discord.js");
const { requireEnv } = require("./utils/env");

const token = requireEnv("DISCORD_TOKEN");
const clientId = requireEnv("DISCORD_CLIENT_ID");
const guildId = requireEnv("DISCORD_GUILD_ID");

const commands = [];
const commandsPath = path.join(__dirname, "commands");
const commandFiles = fs
  .readdirSync(commandsPath)
  .filter((file) => file.endsWith(".js"));

for (const file of commandFiles) {
  const command = require(path.join(commandsPath, file));

  if ("data" in command && "execute" in command) {
    commands.push(command.data.toJSON());
  } else {
    console.warn(`[WARN] ${file} 파일에는 data 또는 execute가 없습니다.`);
  }
}

const rest = new REST().setToken(token);

(async () => {
  try {
    console.log(`${commands.length}개의 슬래시 명령어를 등록합니다.`);

    const data = await rest.put(
      Routes.applicationGuildCommands(clientId, guildId),
      { body: commands },
    );

    console.log(`${data.length}개의 슬래시 명령어 등록 완료.`);
  } catch (error) {
    console.error(error);
  }
})();
