const { Events } = require("discord.js");

const VERIFY_BUTTON_PREFIX = "verify:";

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction) {
    if (interaction.isButton()) {
      await handleButton(interaction);
      return;
    }

    if (!interaction.isChatInputCommand()) return;

    const command = interaction.client.commands.get(interaction.commandName);

    if (!command) {
      console.error(`${interaction.commandName} 명령어를 찾을 수 없습니다.`);
      return;
    }

    try {
      await command.execute(interaction);
    } catch (error) {
      console.error(error);

      const message = {
        content: "명령어를 실행하는 중 오류가 발생했습니다.",
        ephemeral: true,
      };

      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(message);
      } else {
        await interaction.reply(message);
      }
    }
  },
};

async function handleButton(interaction) {
  if (!interaction.customId.startsWith(VERIFY_BUTTON_PREFIX)) return;

  if (!interaction.inGuild()) {
    await interaction.reply({
      content: "서버에서만 사용할 수 있는 버튼입니다.",
      ephemeral: true,
    });
    return;
  }

  const roleId = interaction.customId.slice(VERIFY_BUTTON_PREFIX.length);
  const role = interaction.guild.roles.cache.get(roleId);

  if (!role) {
    await interaction.reply({
      content: "인증 역할을 찾을 수 없습니다. 관리자에게 문의해주세요.",
      ephemeral: true,
    });
    return;
  }

  if (interaction.member.roles.cache.has(role.id)) {
    await interaction.reply({
      content: `이미 ${role} 역할을 가지고 있습니다.`,
      ephemeral: true,
    });
    return;
  }

  try {
    await interaction.member.roles.add(role);
    await interaction.reply({
      content: `${role} 역할이 지급되었습니다.`,
      ephemeral: true,
    });
  } catch (error) {
    console.error(error);
    await interaction.reply({
      content:
        "역할을 지급하지 못했습니다. 봇 권한과 역할 순서를 확인해주세요.",
      ephemeral: true,
    });
  }
}
