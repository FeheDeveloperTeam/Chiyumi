const {
  ActionRowBuilder,
  PermissionFlagsBits,
  RoleSelectMenuBuilder,
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
    .addSubcommand((subcommand) =>
      subcommand
        .setName("create")
        .setNameLocalizations({ ko: "생성" })
        .setDescription("Create a verification button message.")
        .setDescriptionLocalizations({
          ko: "인증 버튼 메시지를 생성합니다.",
        }),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("edit")
        .setNameLocalizations({ ko: "수정" })
        .setDescription("Edit an existing verification button message.")
        .setDescriptionLocalizations({
          ko: "기존 인증 버튼 메시지를 수정합니다.",
        })
        .addStringOption((option) =>
          option
            .setName("message_id")
            .setNameLocalizations({ ko: "메시지id" })
            .setDescription("Message ID of the verification message to edit.")
            .setDescriptionLocalizations({
              ko: "수정할 인증 메시지의 메시지 ID입니다.",
            })
            .setRequired(true),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("delete")
        .setNameLocalizations({ ko: "삭제" })
        .setDescription("Delete an existing verification button message.")
        .setDescriptionLocalizations({
          ko: "기존 인증 버튼 메시지를 삭제합니다.",
        })
        .addStringOption((option) =>
          option
            .setName("message_id")
            .setNameLocalizations({ ko: "메시지id" })
            .setDescription("Message ID of the verification message to delete.")
            .setDescriptionLocalizations({
              ko: "삭제할 인증 메시지의 메시지 ID입니다.",
            })
            .setRequired(true),
        ),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    .setDMPermission(false),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === "delete") {
      const rawMessageId = interaction.options.getString("message_id", true);
      const messageId = extractMessageId(rawMessageId);
      await deleteVerifyMessage(interaction, messageId);
      return;
    }

    const customId =
      subcommand === "edit"
        ? `verify-setup:role:edit:${extractMessageId(interaction.options.getString("message_id", true))}`
        : "verify-setup:role:create";

    const roleSelect = new RoleSelectMenuBuilder()
      .setCustomId(customId)
      .setPlaceholder("인증 완료 시 지급할 역할을 선택하세요.")
      .setMinValues(1)
      .setMaxValues(1);

    const row = new ActionRowBuilder().addComponents(roleSelect);

    await interaction.reply({
      content: nya("인증 버튼 설정을 시작합니다. 먼저 지급할 역할을 선택하세요."),
      components: [row],
      ephemeral: true,
    });
  },
};

function extractMessageId(input) {
  const matches = input.match(/\d{15,20}/g);
  return matches ? matches[matches.length - 1] : input;
}

async function deleteVerifyMessage(interaction, messageId) {
  try {
    const message = await interaction.channel.messages.fetch(messageId);

    if (message.author.id !== interaction.client.user.id) {
      await interaction.reply({
        content: nya(
          "이 봇이 만든 메시지만 삭제할 수 있습니다. (오류 코드: VERIFY-004)",
        ),
        ephemeral: true,
      });
      return;
    }

    await message.delete();
    await interaction.reply({
      content: nya("인증 메시지를 삭제했습니다."),
      ephemeral: true,
    });
  } catch (error) {
    console.error(error);
    await interaction.reply({
      content: nya(
        "메시지를 삭제하지 못했습니다. 메시지 ID와 채널이 맞는지 확인해주세요. (오류 코드: VERIFY-001)",
      ),
      ephemeral: true,
    });
  }
}
