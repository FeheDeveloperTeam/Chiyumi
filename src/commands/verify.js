const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits,
  SlashCommandBuilder,
} = require("discord.js");
const { nya } = require("../utils/nya");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("verify")
    .setNameLocalizations({ ko: "인증" })
    .setDescription("Manage verification button messages.")
    .setDescriptionLocalizations({
      ko: "인증 버튼 메시지를 관리합니다.",
    })
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    .setDMPermission(false),

  async execute(interaction) {
    const createButton = new ButtonBuilder()
      .setCustomId("verify-action:create")
      .setLabel("생성")
      .setStyle(ButtonStyle.Success);

    const editButton = new ButtonBuilder()
      .setCustomId("verify-action:edit")
      .setLabel("수정")
      .setStyle(ButtonStyle.Primary);

    const deleteButton = new ButtonBuilder()
      .setCustomId("verify-action:delete")
      .setLabel("삭제")
      .setStyle(ButtonStyle.Danger);

    const row = new ActionRowBuilder().addComponents(
      createButton,
      editButton,
      deleteButton,
    );

    await interaction.reply({
      content: nya("어떤 기능을 사용할까요?"),
      components: [row],
      ephemeral: true,
    });
  },
};
