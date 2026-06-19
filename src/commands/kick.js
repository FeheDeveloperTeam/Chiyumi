const {
  EmbedBuilder,
  PermissionFlagsBits,
  SlashCommandBuilder,
} = require("discord.js");
const { nya } = require("../utils/nya");
const { sendLog } = require("../utils/guildConfig");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("kick")
    .setNameLocalizations({ ko: "킥" })
    .setDescription("Kick a member from the server")
    .setDescriptionLocalizations({ ko: nya("서버에서 사용자를 추방합니다") })
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
    .setDMPermission(false)
    .addUserOption((option) =>
      option
        .setName("user")
        .setNameLocalizations({ ko: "사용자" })
        .setDescription(nya("추방할 사용자"))
        .setDescriptionLocalizations({ ko: nya("추방할 사용자") })
        .setRequired(true),
    )
    .addStringOption((option) =>
      option
        .setName("reason")
        .setNameLocalizations({ ko: "이유" })
        .setDescription(nya("추방 이유"))
        .setDescriptionLocalizations({ ko: nya("추방 이유") })
        .setMaxLength(512),
    ),

  async execute(interaction) {
    const targetUser = interaction.options.getUser("user", true);
    const reason = interaction.options.getString("reason") ?? "이유 없음";
    const member = interaction.options.getMember("user");

    if (!member) {
      await interaction.reply({
        content: nya(
          "해당 사용자를 서버에서 찾을 수 없습니다 (오류 코드: KICK-001)",
        ),
        ephemeral: true,
      });
      return;
    }

    if (!member.kickable) {
      await interaction.reply({
        content: nya(
          "이 사용자를 추방할 수 없습니다. 권한과 역할 순서를 확인해주세요 (오류 코드: KICK-002)",
        ),
        ephemeral: true,
      });
      return;
    }

    try {
      await member.kick(reason);
    } catch (error) {
      console.error(error);
      await interaction.reply({
        content: nya("사용자를 추방하지 못했습니다 (오류 코드: KICK-003)"),
        ephemeral: true,
      });
      return;
    }

    await interaction.reply({
      content: nya(`${targetUser}님을 추방했습니다. 이유: ${reason}`),
      ephemeral: true,
    });

    const embed = new EmbedBuilder()
      .setTitle("멤버 추방")
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
