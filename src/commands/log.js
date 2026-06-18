const {
  ChannelType,
  PermissionFlagsBits,
  SlashCommandBuilder,
} = require("discord.js");
const { nya } = require("../utils/nya");
const { setLogChannel, setLogOption } = require("../utils/guildConfig");

const OPTION_LABELS = {
  message_delete: "메시지 삭제",
  message_edit: "메시지 수정",
  voice_join: "음성 채널 입장",
  voice_leave: "음성 채널 퇴장",
};

const OPTION_KEY_MAP = {
  message_delete: "messageDelete",
  message_edit: "messageEdit",
  voice_join: "voiceJoin",
  voice_leave: "voiceLeave",
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName("log")
    .setNameLocalizations({ ko: "로그" })
    .setDescription("Configure moderation logging")
    .setDescriptionLocalizations({ ko: "로그 설정을 관리합니다" })
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setDMPermission(false)
    .addSubcommand((sub) =>
      sub
        .setName("channel")
        .setNameLocalizations({ ko: "채널" })
        .setDescription("Set the channel where logs are sent")
        .setDescriptionLocalizations({ ko: "로그를 받을 채널을 지정합니다" })
        .addChannelOption((option) =>
          option
            .setName("channel")
            .setNameLocalizations({ ko: "채널" })
            .setDescription("로그를 받을 채널")
            .setDescriptionLocalizations({ ko: "로그를 받을 채널" })
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("option")
        .setNameLocalizations({ ko: "옵션" })
        .setDescription("Turn a log type on or off")
        .setDescriptionLocalizations({ ko: "로그 종류를 켜거나 끕니다" })
        .addStringOption((option) =>
          option
            .setName("type")
            .setNameLocalizations({ ko: "종류" })
            .setDescription("로그 종류")
            .setDescriptionLocalizations({ ko: "로그 종류" })
            .setRequired(true)
            .addChoices(
              { name: "메시지 삭제", value: "message_delete" },
              { name: "메시지 수정", value: "message_edit" },
              { name: "음성 채널 입장", value: "voice_join" },
              { name: "음성 채널 퇴장", value: "voice_leave" },
            ),
        )
        .addBooleanOption((option) =>
          option
            .setName("enabled")
            .setNameLocalizations({ ko: "활성화" })
            .setDescription("켜기/끄기")
            .setDescriptionLocalizations({ ko: "켜기/끄기" })
            .setRequired(true),
        ),
    ),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === "channel") {
      const channel = interaction.options.getChannel("channel", true);
      setLogChannel(interaction.guild.id, channel.id);

      await interaction.reply({
        content: nya(`로그 채널을 ${channel}로 설정했습니다.`),
        ephemeral: true,
      });
      return;
    }

    const type = interaction.options.getString("type", true);
    const enabled = interaction.options.getBoolean("enabled", true);
    const key = OPTION_KEY_MAP[type];

    setLogOption(interaction.guild.id, key, enabled);

    await interaction.reply({
      content: nya(
        `${OPTION_LABELS[type]} 로그를 ${enabled ? "켰습니다" : "껐습니다"}.`,
      ),
      ephemeral: true,
    });
  },
};
