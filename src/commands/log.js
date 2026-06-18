const {
  ChannelType,
  PermissionFlagsBits,
  SlashCommandBuilder,
} = require("discord.js");
const { nya } = require("../utils/nya");
const { setLogChannel } = require("../utils/guildConfig");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("log")
    .setNameLocalizations({ ko: "로그" })
    .setDescription("Set the channel where moderation logs are sent")
    .setDescriptionLocalizations({ ko: "관리 로그를 받을 채널을 지정합니다" })
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setDMPermission(false)
    .addChannelOption((option) =>
      option
        .setName("channel")
        .setNameLocalizations({ ko: "채널" })
        .setDescription("로그를 받을 채널")
        .setDescriptionLocalizations({ ko: "로그를 받을 채널" })
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true),
    ),

  async execute(interaction) {
    const channel = interaction.options.getChannel("channel", true);

    setLogChannel(interaction.guild.id, channel.id);

    await interaction.reply({
      content: nya(`로그 채널을 ${channel}로 설정했습니다`),
      ephemeral: true,
    });
  },
};
