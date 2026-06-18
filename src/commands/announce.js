const {
  ChannelType,
  EmbedBuilder,
  PermissionFlagsBits,
  SlashCommandBuilder,
} = require("discord.js");
const { nya } = require("../utils/nya");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("announce")
    .setNameLocalizations({ ko: "공지" })
    .setDescription("Send an announcement embed to a channel")
    .setDescriptionLocalizations({ ko: "지정한 채널에 공지를 보냅니다" })
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setDMPermission(false)
    .addChannelOption((option) =>
      option
        .setName("channel")
        .setNameLocalizations({ ko: "채널" })
        .setDescription("공지를 보낼 채널")
        .setDescriptionLocalizations({ ko: "공지를 보낼 채널" })
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true),
    )
    .addStringOption((option) =>
      option
        .setName("title")
        .setNameLocalizations({ ko: "제목" })
        .setDescription("공지 제목")
        .setDescriptionLocalizations({ ko: "공지 제목" })
        .setRequired(true)
        .setMaxLength(256),
    )
    .addStringOption((option) =>
      option
        .setName("content")
        .setNameLocalizations({ ko: "내용" })
        .setDescription("공지 내용")
        .setDescriptionLocalizations({ ko: "공지 내용" })
        .setRequired(true)
        .setMaxLength(4000),
    ),

  async execute(interaction) {
    const channel = interaction.options.getChannel("channel", true);
    const title = interaction.options.getString("title", true);
    const content = interaction.options.getString("content", true);

    const embed = new EmbedBuilder()
      .setTitle(title)
      .setDescription(content)
      .setColor(0x5865f2)
      .setTimestamp();

    await channel.send({ embeds: [embed] });

    await interaction.reply({
      content: nya(`${channel}에 공지를 보냈습니다`),
      ephemeral: true,
    });
  },
};
