const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const { nya } = require("../utils/nya");

const TWO_WEEKS_MS = 14 * 24 * 60 * 60 * 1000;

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

    await interaction.deferReply({ ephemeral: true });

    const messages = await interaction.channel.messages.fetch({ limit: amount }).catch(() => null);

    if (!messages) {
      await interaction.editReply({
        content: nya("메시지를 불러오는 데 실패했습니다. 봇 권한을 확인해주세요") + " (오류 코드: PURGE-001)",
      });
      return;
    }

    const cutoff = Date.now() - TWO_WEEKS_MS;
    const recent = messages.filter((m) => m.createdTimestamp > cutoff);
    const old = messages.filter((m) => m.createdTimestamp <= cutoff);

    let deleted = 0;

    if (recent.size > 0) {
      const bulkResult = await interaction.channel.bulkDelete(recent, true).catch(() => null);
      if (bulkResult) deleted += bulkResult.size;
    }

    for (const msg of old.values()) {
      const ok = await msg.delete().catch(() => null);
      if (ok) deleted++;
    }

    await interaction.editReply({ content: nya(`메시지 ${deleted}개를 삭제했습니다`) });
  },
};
