const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const { nya } = require("../utils/nya");

module.exports = {
  category: "서버 관리",
  data: new SlashCommandBuilder()
    .setName("purge")
    .setNameLocalizations({ ko: "채팅청소" })
    .setDescription("Bulk delete messages in the current channel")
    .setDescriptionLocalizations({ ko: nya("현재 채널의 메시지를 한꺼번에 삭제합니다") })
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addIntegerOption((option) =>
      option
        .setName("수량")
        .setDescription("삭제할 메시지 수 (1~100)")
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(100),
    ),

  async execute(interaction) {
    const amount = interaction.options.getInteger("수량");

    const deleted = await interaction.channel.bulkDelete(amount, true).catch(() => null);

    if (deleted === null) {
      await interaction.reply({
        content: nya("메시지 삭제에 실패했습니다. 봇 권한을 확인해주세요") + " (오류 코드: PURGE-001)",
        ephemeral: true,
      });
      return;
    }

    await interaction.reply({ content: nya(`메시지 ${deleted.size}개를 삭제했습니다`), ephemeral: true });
  },
};
