const {
  ActionRowBuilder,
  ChannelSelectMenuBuilder,
  ChannelType,
  EmbedBuilder,
  PermissionFlagsBits,
  SlashCommandBuilder,
} = require("discord.js");
const { nya } = require("../utils/nya");
const { AI_CHANNEL_LIMIT, getAiChannelIds, setAiChannelIds } = require("../utils/guildConfig");

// "유미야 …" AI 대화는 서버 관리자가 이 명령어로 채널을 지정해야 쓸 수 있다.
// 채널은 여러 개(최대 AI_CHANNEL_LIMIT개) 지정할 수 있고, 지정한 채널 안의 스레드에서도 대화할 수 있다
// (messageCreate의 isAiChannelAllowed 참고).
//  - /유미채널설정 추가: 한 번에 최대 5개까지 더한다.
//  - /유미채널설정 목록: 채널 선택 메뉴로 허용 채널 전체를 한꺼번에 고른다(선택한 채널로 목록을 바꿈).

const SELECT_ID = "yumichannel:select";
const ALLOWED_TYPES = [ChannelType.GuildText, ChannelType.GuildAnnouncement, ChannelType.GuildForum];
const ADD_OPTION_NAMES = ["channel", "channel2", "channel3", "channel4", "channel5"];

function liveChannelIds(guild) {
  return getAiChannelIds(guild.id).filter((id) => guild.channels.cache.has(id));
}

function buildListEmbed(guild) {
  const live = liveChannelIds(guild);
  return new EmbedBuilder()
    .setTitle("🐾 AI 대화 채널")
    .setColor(0xe1aa74)
    .setDescription(
      live.length
        ? `${live.map((id) => `<#${id}>`).join("\n")}\n\n이 채널들(과 그 안의 스레드)에서 "유미야"로 대화할 수 있다냥.`
        : "아직 지정된 채널이 없어서 이 서버에서는 AI 대화를 쓸 수 없다냥.\n아래 메뉴에서 채널을 고르거나 `/유미채널설정 추가`로 지정해줘냥!",
    )
    .setFooter({ text: `${live.length} / ${AI_CHANNEL_LIMIT}개 · 아래 메뉴에서 여러 채널을 한꺼번에 고르거나 뺄 수 있습니다` });
}

function buildPanel(guild) {
  const live = liveChannelIds(guild);
  const menu = new ChannelSelectMenuBuilder()
    .setCustomId(SELECT_ID)
    .setPlaceholder("AI 대화를 허용할 채널을 모두 골라주세요")
    .setChannelTypes(...ALLOWED_TYPES)
    .setMinValues(0)
    .setMaxValues(AI_CHANNEL_LIMIT);
  if (live.length) menu.setDefaultChannels(...live);
  return { embeds: [buildListEmbed(guild)], components: [new ActionRowBuilder().addComponents(menu)] };
}

// 목록 패널의 채널 선택 메뉴: 고른 채널들이 그대로 새 허용 목록이 된다.
async function handleSelect(interaction) {
  if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
    await interaction.reply({ content: nya("서버 관리 권한이 있어야 바꿀 수 있습니다"), ephemeral: true });
    return;
  }
  setAiChannelIds(interaction.guild.id, interaction.values.slice(0, AI_CHANNEL_LIMIT));
  await interaction.update(buildPanel(interaction.guild));
}

function addChannelOption(sub, name, index) {
  return sub.addChannelOption((opt) =>
    opt
      .setName(name)
      .setNameLocalizations({ ko: index === 0 ? "채널" : `채널${index + 1}` })
      .setDescription(nya(index === 0 ? "AI 대화를 허용할 채널입니다" : "함께 추가할 채널입니다 (선택)"))
      .setDescriptionLocalizations({ ko: nya(index === 0 ? "AI 대화를 허용할 채널입니다" : "함께 추가할 채널입니다 (선택)") })
      .addChannelTypes(...ALLOWED_TYPES)
      .setRequired(index === 0),
  );
}

const DESC = {
  cmd: nya("유미와 \"유미야\" AI 대화를 할 수 있는 채널을 정하는 명령어입니다. 채널은 여러 개 정할 수 있고, 정하기 전에는 AI 대화를 쓸 수 없습니다"),
  add: nya(`유미와 AI 대화를 할 수 있는 채널을 더하는 명령어입니다. 한 번에 5개까지, 모두 합쳐 ${AI_CHANNEL_LIMIT}개까지 정할 수 있습니다`),
  remove: nya("AI 대화 채널 목록에서 채널을 빼는 명령어입니다"),
  list: nya("AI 대화 채널 목록을 보고, 메뉴에서 여러 채널을 한꺼번에 고르거나 뺄 수 있는 명령어입니다"),
  reset: nya("지정한 AI 대화 채널을 모두 지워 이 서버의 AI 대화를 끄는 명령어입니다"),
};

module.exports = {
  category: "관리",
  data: new SlashCommandBuilder()
    .setName("yumichannel")
    .setNameLocalizations({ ko: "유미채널설정" })
    .setDescription(DESC.cmd)
    .setDescriptionLocalizations({ ko: DESC.cmd })
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setDMPermission(false)
    .addSubcommand((sub) => {
      sub
        .setName("add")
        .setNameLocalizations({ ko: "추가" })
        .setDescription(DESC.add)
        .setDescriptionLocalizations({ ko: DESC.add });
      ADD_OPTION_NAMES.forEach((name, i) => addChannelOption(sub, name, i));
      return sub;
    })
    .addSubcommand((sub) =>
      sub
        .setName("remove")
        .setNameLocalizations({ ko: "제거" })
        .setDescription(DESC.remove)
        .setDescriptionLocalizations({ ko: DESC.remove })
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
        .setDescription(DESC.list)
        .setDescriptionLocalizations({ ko: DESC.list }),
    )
    .addSubcommand((sub) =>
      sub
        .setName("reset")
        .setNameLocalizations({ ko: "초기화" })
        .setDescription(DESC.reset)
        .setDescriptionLocalizations({ ko: DESC.reset }),
    ),

  async execute(interaction) {
    const { guild } = interaction;
    const sub = interaction.options.getSubcommand();

    if (sub === "add") {
      const picked = ADD_OPTION_NAMES.map((n) => interaction.options.getChannel(n)).filter(Boolean);
      const live = liveChannelIds(guild);
      const fresh = [...new Map(picked.filter((c) => !live.includes(c.id)).map((c) => [c.id, c])).values()];
      if (!fresh.length) {
        return interaction.reply({ content: nya("고른 채널은 이미 모두 AI 대화 채널이다"), ...buildPanel(guild), ephemeral: true });
      }
      const room = AI_CHANNEL_LIMIT - live.length;
      if (room <= 0) {
        return interaction.reply({
          content: nya(`AI 대화 채널은 최대 ${AI_CHANNEL_LIMIT}개까지 지정할 수 있다. 아래 메뉴나 \`/유미채널설정 제거\`로 몇 개 빼고 다시 해줘`),
          ...buildPanel(guild),
          ephemeral: true,
        });
      }
      const added = fresh.slice(0, room);
      const skipped = fresh.slice(room);
      setAiChannelIds(guild.id, [...live, ...added.map((c) => c.id)]);
      const note = skipped.length ? `\n최대 개수를 넘어서 ${skipped.join(", ")}은(는) 추가하지 못했다냥.` : "";
      return interaction.reply({
        content: nya(`${added.join(", ")}에서 "유미야"로 대화할 수 있게 됐다`) + note,
        ...buildPanel(guild),
        ephemeral: true,
      });
    }

    if (sub === "remove") {
      const channel = interaction.options.getChannel("channel", true);
      const ids = getAiChannelIds(guild.id);
      if (!ids.includes(channel.id)) {
        return interaction.reply({ content: nya(`${channel}은(는) AI 대화 채널이 아니다`), ephemeral: true });
      }
      setAiChannelIds(guild.id, ids.filter((id) => id !== channel.id));
      return interaction.reply({
        content: nya(`${channel}을(를) AI 대화 채널에서 뺐다`),
        ...buildPanel(guild),
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

    return interaction.reply({ ...buildPanel(guild), ephemeral: true });
  },

  YUMI_CHANNEL_SELECT_ID: SELECT_ID,
  handleYumiChannelSelect: handleSelect,
};
