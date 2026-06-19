const {
  EmbedBuilder,
  PermissionFlagsBits,
  SlashCommandBuilder,
} = require("discord.js");
const { nya } = require("../utils/nya");
const { sendLog } = require("../utils/guildConfig");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("ban")
    .setNameLocalizations({ ko: "밴" })
    .setDescription("Ban a user from the server")
    .setDescriptionLocalizations({ ko: nya("서버에서 사용자를 차단합니다") })
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .setDMPermission(false)
    .addUserOption((option) =>
      option
        .setName("user")
        .setNameLocalizations({ ko: "사용자" })
        .setDescription(nya("차단할 사용자(멘션 또는 사용자 ID)"))
        .setDescriptionLocalizations({
          ko: nya("차단할 사용자(멘션 또는 사용자 ID)"),
        })
        .setRequired(true),
    )
    .addStringOption((option) =>
      option
        .setName("reason")
        .setNameLocalizations({ ko: "이유" })
        .setDescription(nya("차단 이유"))
        .setDescriptionLocalizations({ ko: nya("차단 이유") })
        .setMaxLength(512),
    ),

  async execute(interaction) {
    const targetUser = interaction.options.getUser("user", true);
    const reason = interaction.options.getString("reason") ?? "이유 없음";
    const member = interaction.options.getMember("user");

    if (member && !member.bannable) {
      await interaction.reply({
        content: nya(
          "이 사용자를 차단할 수 없습니다. 권한과 역할 순서를 확인해주세요 (오류 코드: BAN-001)",
        ),
        ephemeral: true,
      });
      return;
    }

    try {
      await interaction.guild.members.ban(targetUser.id, { reason });
    } catch (error) {
      console.error(error);
      await interaction.reply({
        content: nya("사용자를 차단하지 못했습니다 (오류 코드: BAN-002)"),
        ephemeral: true,
      });
      return;
    }

    await interaction.reply({
      content: nya(`${targetUser}님을 차단했습니다. 이유: ${reason}`),
      ephemeral: true,
    });

    const embed = new EmbedBuilder()
      .setTitle("멤버 차단")
      .addFields(
        { name: "대상", value: `${targetUser} (${targetUser.id})` },
        { name: "처리자", value: `${interaction.user}` },
        { name: "이유", value: reason },
      )
      .setColor(0xed4245)
      .setTimestamp();

    await sendLog(interaction.guild, embed);
  },
};
