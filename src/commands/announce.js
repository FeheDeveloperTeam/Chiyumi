const {
  ActionRowBuilder,
  ChannelType,
  ModalBuilder,
  PermissionFlagsBits,
  SlashCommandBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require("discord.js");
const { nya } = require("../utils/nya");

module.exports = {
  category: "관리",
  data: new SlashCommandBuilder()
    .setName("announce")
    .setNameLocalizations({ ko: "공지" })
    .setDescription("Send an announcement embed to a channel")
    .setDescriptionLocalizations({ ko: nya("지정한 채널에 공지를 보냅니다") })
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setDMPermission(false)
    .addChannelOption((option) =>
      option
        .setName("channel")
        .setNameLocalizations({ ko: "채널" })
        .setDescription(nya("공지를 보낼 채널"))
        .setDescriptionLocalizations({ ko: nya("공지를 보낼 채널") })
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true),
    )
    .addStringOption((option) =>
      option
        .setName("mention")
        .setNameLocalizations({ ko: "멘션" })
        .setDescription("Whether to ping @everyone or @here")
        .setDescriptionLocalizations({ ko: nya("에브리핑 또는 히어핑 여부") })
        .addChoices(
          { name: "없음", value: "none" },
          { name: "에브리핑 (@everyone)", value: "everyone" },
          { name: "히어핑 (@here)", value: "here" },
        ),
    ),

  async execute(interaction) {
    const channel = interaction.options.getChannel("channel", true);
    const mention = interaction.options.getString("mention") ?? "none";

    const modal = new ModalBuilder()
      .setCustomId(`announce-modal:${channel.id}:${mention}`)
      .setTitle("공지 작성");

    const titleInput = new TextInputBuilder()
      .setCustomId("title")
      .setLabel("공지 제목 (선택)")
      .setStyle(TextInputStyle.Short)
      .setMaxLength(256)
      .setRequired(false);

    const contentInput = new TextInputBuilder()
      .setCustomId("content")
      .setLabel("공지 내용")
      .setStyle(TextInputStyle.Paragraph)
      .setMaxLength(4000)
      .setRequired(true);

    modal.addComponents(
      new ActionRowBuilder().addComponents(titleInput),
      new ActionRowBuilder().addComponents(contentInput),
    );

    await interaction.showModal(modal);
  },
};
