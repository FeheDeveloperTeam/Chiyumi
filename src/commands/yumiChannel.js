const {
  ChannelType,
  EmbedBuilder,
  PermissionFlagsBits,
  SlashCommandBuilder,
} = require("discord.js");
const { nya } = require("../utils/nya");
const { AI_CHANNEL_LIMIT, getAiChannelIds, setAiChannelIds } = require("../utils/guildConfig");

// "유미야 …" AI 대화는 서버 관리자가 이 명령어로 채널을 지정해야 쓸 수 있다.
// 지정한 채널 안의 스레드에서도 대화할 수 있다(messageCreate의 isAiChannelAllowed 참고).

function buildListEmbed(guild) {
  const ids = getAiChannelIds(guild.id);
  const live = ids.filter((id) => guild.channels.cache.has(id));
  return new EmbedBuilder()
    .setTitle("🐾 AI 대화 채널")
    .setColor(0xe1aa74)
    .setDescription(
      live.length
        ? `${live.map((id) => `<#${id}>`).join("\n")}\n\n이 채널(과 그 안의 스레드)에서만 "유미야"로 대화할 수 있다냥.`
        : "아직 지정된 채널이 없어서 이 서버에서는 AI 대화를 쓸 수 없다냥.\n`/유미채널설정 추가`로 채널을 지정해줘냥!",
    )
    .setFooter({ text: `최대 ${AI_CHANNEL_LIMIT}개까지 지정할 수 있습니다` });
}

module.exports = {
  category: "관리",
  data: new SlashCommandBuilder()
    .setName("yumichannel")
    .setNameLocalizations({ ko: "유미채널설정" })
    .setDescription(nya("유미와 \"유미야\" AI 대화를 할 수 있는 채널을 정하는 명령어입니다. 채널을 정하기 전에는 이 서버에서 AI 대화를 쓸 수 없습니다"))
    .setDescriptionLocalizations({ ko: nya("유미와 \"유미야\" AI 대화를 할 수 있는 채널을 정하는 명령어입니다. 채널을 정하기 전에는 이 서버에서 AI 대화를 쓸 수 없습니다") })
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setDMPermission(false)
    .addSubcommand((sub) =>
      sub
        .setName("add")
        .setNameLocalizations({ ko: "추가" })
        .setDescription(nya("유미와 AI 대화를 할 수 있는 채널을 추가하는 명령어입니다. 최대 10개까지 정할 수 있고 그 채널 안의 스레드도 포함됩니다"))
        .setDescriptionLocalizations({ ko: nya("유미와 AI 대화를 할 수 있는 채널을 추가하는 명령어입니다. 최대 10개까지 정할 수 있고 그 채널 안의 스레드도 포함됩니다") })
        .addChannelOption((opt) =>
          opt
            .setName("channel")
            .setNameLocalizations({ ko: "채널" })
            .setDescription(nya("AI 대화를 허용할 채널입니다"))
            .setDescriptionLocalizations({ ko: nya("AI 대화를 허용할 채널입니다") })
            .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement, ChannelType.GuildForum)
            .setRequired(true),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("remove")
        .setNameLocalizations({ ko: "제거" })
        .setDescription(nya("AI 대화 채널 목록에서 채널을 빼는 명령어입니다"))
        .setDescriptionLocalizations({ ko: nya("AI 대화 채널 목록에서 채널을 빼는 명령어입니다") })
        .addChannelOption((opt) =>
          opt
            .setName("channel")
            .setNameLocalizations({ ko: "채널" })
            .setDescription(nya("AI 대화 채널에서 뺄 채널입니다"))
            .setDescriptionLocalizations({ ko: nya("AI 대화 채널에서 뺄 채널입니다") })
            .setRequired(true),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("list")
        .setNameLocalizations({ ko: "목록" })
        .setDescription(nya("지금 AI 대화를 할 수 있는 채널 목록을 보여주는 명령어입니다"))
        .setDescriptionLocalizations({ ko: nya("지금 AI 대화를 할 수 있는 채널 목록을 보여주는 명령어입니다") }),
    )
    .addSubcommand((sub) =>
      sub
        .setName("reset")
        .setNameLocalizations({ ko: "초기화" })
        .setDescription(nya("지정한 AI 대화 채널을 모두 지워 이 서버의 AI 대화를 끄는 명령어입니다"))
        .setDescriptionLocalizations({ ko: nya("지정한 AI 대화 채널을 모두 지워 이 서버의 AI 대화를 끄는 명령어입니다") }),
    ),

  async execute(interaction) {
    const { guild } = interaction;
    const sub = interaction.options.getSubcommand();
    const ids = getAiChannelIds(guild.id);

    if (sub === "add") {
      const channel = interaction.options.getChannel("channel", true);
      if (ids.includes(channel.id)) {
        return interaction.reply({ content: nya(`${channel}은(는) 이미 AI 대화 채널이다`), ephemeral: true });
      }
      // 삭제된 채널은 자리 수에서 빼고 센다.
      const live = ids.filter((id) => guild.channels.cache.has(id));
      if (live.length >= AI_CHANNEL_LIMIT) {
        return interaction.reply({
          content: nya(`AI 대화 채널은 최대 ${AI_CHANNEL_LIMIT}개까지 지정할 수 있다. \`/유미채널설정 제거\`로 하나 빼고 다시 해줘`),
          ephemeral: true,
        });
      }
      setAiChannelIds(guild.id, [...live, channel.id]);
      return interaction.reply({
        content: nya(`${channel}에서 "유미야"로 대화할 수 있게 됐다`),
        embeds: [buildListEmbed(guild)],
        ephemeral: true,
      });
    }

    if (sub === "remove") {
      const channel = interaction.options.getChannel("channel", true);
      if (!ids.includes(channel.id)) {
        return interaction.reply({ content: nya(`${channel}은(는) AI 대화 채널이 아니다`), ephemeral: true });
      }
      setAiChannelIds(guild.id, ids.filter((id) => id !== channel.id));
      return interaction.reply({
        content: nya(`${channel}을(를) AI 대화 채널에서 뺐다`),
        embeds: [buildListEmbed(guild)],
        ephemeral: true,
      });
    }

    if (sub === "reset") {
      setAiChannelIds(guild.id, []);
      return interaction.reply({
        content: nya("AI 대화 채널을 모두 지웠다. 이제 이 서버에서는 AI 대화를 쓸 수 없다"),
        ephemeral: true,
      });
    }

    return interaction.reply({ embeds: [buildListEmbed(guild)], ephemeral: true });
  },
};
