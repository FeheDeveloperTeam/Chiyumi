const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits,
  SlashCommandBuilder,
} = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("verify")
    .setNameLocalizations({ ko: "인증" })
    .setDescription("Create a verification button message.")
    .setDescriptionLocalizations({
      ko: "인증 버튼 메시지를 생성합니다.",
    })
    .addRoleOption((option) =>
      option
        .setName("role")
        .setNameLocalizations({ ko: "역할" })
        .setDescription("Role to give when a user verifies.")
        .setDescriptionLocalizations({
          ko: "인증한 사용자에게 지급할 역할입니다.",
        })
        .setRequired(true),
    )
    .addStringOption((option) =>
      option
        .setName("message")
        .setNameLocalizations({ ko: "메시지" })
        .setDescription("Message shown above the verification button.")
        .setDescriptionLocalizations({
          ko: "인증 버튼 위에 표시할 메시지입니다.",
        })
        .setRequired(false),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    .setDMPermission(false),

  async execute(interaction) {
    const role = interaction.options.getRole("role", true);
    const message =
      interaction.options.getString("message") ||
      "아래 버튼을 눌러 서버 인증을 완료하세요.";

    if (!role.editable) {
      await interaction.reply({
        content:
          "이 역할은 봇이 지급할 수 없습니다. 봇 역할을 해당 역할보다 위로 올려주세요.",
        ephemeral: true,
      });
      return;
    }

    const button = new ButtonBuilder()
      .setCustomId(`verify:${role.id}`)
      .setLabel("인증 받기")
      .setStyle(ButtonStyle.Success);

    const row = new ActionRowBuilder().addComponents(button);

    await interaction.channel.send({
      content: message,
      components: [row],
    });

    await interaction.reply({
      content: `${role} 역할을 지급하는 인증 버튼을 생성했습니다.`,
      ephemeral: true,
    });
  },
};
