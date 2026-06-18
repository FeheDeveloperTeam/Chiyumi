const {
  ActionRowBuilder,
  PermissionFlagsBits,
  RoleSelectMenuBuilder,
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
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    .setDMPermission(false),

  async execute(interaction) {
    const roleSelect = new RoleSelectMenuBuilder()
      .setCustomId("verify-setup:role")
      .setPlaceholder("인증 완료 시 지급할 역할을 선택하세요.")
      .setMinValues(1)
      .setMaxValues(1);

    const row = new ActionRowBuilder().addComponents(roleSelect);

    await interaction.reply({
      content: "인증 버튼 설정을 시작합니다. 먼저 지급할 역할을 선택하세요.",
      components: [row],
      ephemeral: true,
    });
  },
};
