const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelSelectMenuBuilder,
  ChannelType,
  EmbedBuilder,
  PermissionFlagsBits,
  SlashCommandBuilder,
  StringSelectMenuBuilder,
} = require("discord.js");
const { nya } = require("../utils/nya");
const { AI_CHANNEL_LIMIT, getAiChannelIds, setAiChannelIds } = require("../utils/guildConfig");

// /유미채널설정 — "유미야 …" AI 대화를 쓸 수 있는 채널을 정하는 설정 패널(관리자 전용, 나만 보기).
// 채널을 하나도 정하지 않으면 그 서버에서는 AI 대화를 쓸 수 없다. 정한 채널 안의 스레드에서도 대화할 수 있다
// (messageCreate의 isAiChannelAllowed 참고).
//  - 채널 추가: 채널 선택 메뉴에서 여러 채널을 한꺼번에 골라 더한다.
//  - 채널 빼기: 지금 목록에서 뺄 채널을 여러 개 고른다.
//  - 모두 삭제: 확인 버튼을 한 번 더 눌러야 지운다.

const PREFIX = "yumichannel:";
const IDS = {
  add: `${PREFIX}add`,
  remove: `${PREFIX}remove`,
  reset: `${PREFIX}reset`,
  resetConfirm: `${PREFIX}reset-confirm`,
  resetCancel: `${PREFIX}reset-cancel`,
};
const ALLOWED_TYPES = [ChannelType.GuildText, ChannelType.GuildAnnouncement, ChannelType.GuildForum];

function liveChannelIds(guild) {
  return getAiChannelIds(guild.id).filter((id) => guild.channels.cache.has(id));
}

function buildEmbed(guild, notice) {
  const live = liveChannelIds(guild);
  const embed = new EmbedBuilder()
    .setTitle("🐾 유미 AI 대화 채널 설정")
    .setColor(0xe1aa74)
    .setDescription(
      [
        notice ? `**${notice}**\n` : null,
        live.length
          ? `${live.map((id) => `<#${id}>`).join("\n")}\n\n위 채널(과 그 안의 스레드)에서 "유미야"로 대화할 수 있다냥.`
          : "아직 정한 채널이 없어서 이 서버에서는 AI 대화를 쓸 수 없다냥.\n아래 **채널 추가** 메뉴에서 채널을 골라줘냥!",
      ]
        .filter(Boolean)
        .join("\n"),
    )
    .addFields({
      name: "사용 방법",
      value: [
        "➕ **채널 추가** — 메뉴에서 여러 채널을 한꺼번에 골라 더합니다",
        "➖ **채널 빼기** — 지금 목록에서 뺄 채널을 고릅니다",
        "🗑️ **모두 삭제** — 정한 채널을 전부 지워 AI 대화를 끕니다",
      ].join("\n"),
    })
    .setFooter({ text: `${live.length} / ${AI_CHANNEL_LIMIT}개` });
  return embed;
}

function buildPanel(guild, notice) {
  const live = liveChannelIds(guild);
  const rows = [];

  const room = AI_CHANNEL_LIMIT - live.length;
  rows.push(
    new ActionRowBuilder().addComponents(
      new ChannelSelectMenuBuilder()
        .setCustomId(IDS.add)
        .setPlaceholder(room > 0 ? "➕ 채널 추가 (여러 개 선택 가능)" : `최대 ${AI_CHANNEL_LIMIT}개까지 정할 수 있습니다`)
        .setChannelTypes(...ALLOWED_TYPES)
        .setMinValues(1)
        .setMaxValues(Math.max(1, room))
        .setDisabled(room <= 0),
    ),
  );

  if (live.length) {
    const names = live.map((id) => ({ id, name: guild.channels.cache.get(id)?.name ?? id }));
    rows.push(
      new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId(IDS.remove)
          .setPlaceholder("➖ 채널 빼기 (여러 개 선택 가능)")
          .setMinValues(1)
          .setMaxValues(names.length)
          .addOptions(names.map(({ id, name }) => ({ label: `#${name}`.slice(0, 100), value: id }))),
      ),
    );
  }

  rows.push(
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(IDS.reset)
        .setLabel("모두 삭제")
        .setEmoji("🗑️")
        .setStyle(ButtonStyle.Danger)
        .setDisabled(!live.length),
    ),
  );

  return { content: null, embeds: [buildEmbed(guild, notice)], components: rows };
}

function buildResetConfirm(guild) {
  return {
    content: null,
    embeds: [
      new EmbedBuilder()
        .setTitle("🗑️ AI 대화 채널을 모두 지울까냥?")
        .setColor(0xed4245)
        .setDescription(
          `${liveChannelIds(guild).map((id) => `<#${id}>`).join(", ")}\n\n모두 지우면 이 서버에서는 다시 채널을 정할 때까지 아무도 AI 대화를 쓸 수 없다냥.`,
        ),
    ],
    components: [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(IDS.resetConfirm).setLabel("모두 삭제").setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId(IDS.resetCancel).setLabel("취소").setStyle(ButtonStyle.Secondary),
      ),
    ],
  };
}

// 패널의 메뉴·버튼 처리. interactionCreate가 customId가 PREFIX로 시작하면 여기로 넘긴다.
async function handleComponent(interaction) {
  if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
    await interaction.reply({ content: nya("서버 관리 권한이 있어야 바꿀 수 있습니다") + "\n(오류 코드: AUTH-001)", ephemeral: true });
    return;
  }
  const { guild, customId } = interaction;
  const live = liveChannelIds(guild);

  if (customId === IDS.add) {
    const fresh = interaction.values.filter((id) => !live.includes(id));
    const added = fresh.slice(0, AI_CHANNEL_LIMIT - live.length);
    const skipped = fresh.length - added.length;
    if (added.length) setAiChannelIds(guild.id, [...live, ...added]);
    const notice = added.length
      ? `${added.map((id) => `<#${id}>`).join(", ")} 추가 완료냥!${skipped ? ` (최대 개수를 넘어 ${skipped}개는 추가하지 못했다냥)` : ""}`
      : "고른 채널은 이미 모두 목록에 있다냥";
    await interaction.update(buildPanel(guild, notice));
    return;
  }

  if (customId === IDS.remove) {
    setAiChannelIds(guild.id, live.filter((id) => !interaction.values.includes(id)));
    await interaction.update(buildPanel(guild, `${interaction.values.map((id) => `<#${id}>`).join(", ")} 빼기 완료냥!`));
    return;
  }

  if (customId === IDS.reset) {
    await interaction.update(buildResetConfirm(guild));
    return;
  }

  if (customId === IDS.resetConfirm) {
    setAiChannelIds(guild.id, []);
    await interaction.update(buildPanel(guild, "AI 대화 채널을 모두 지웠다냥"));
    return;
  }

  if (customId === IDS.resetCancel) {
    await interaction.update(buildPanel(guild));
  }
}

const DESCRIPTION = nya("유미와 \"유미야\" AI 대화를 할 수 있는 채널을 추가·빼기·삭제하는 설정 패널을 여는 명령어입니다");

module.exports = {
  category: "관리",
  data: new SlashCommandBuilder()
    .setName("yumichannel")
    .setNameLocalizations({ ko: "유미채널설정" })
    .setDescription(DESCRIPTION)
    .setDescriptionLocalizations({ ko: DESCRIPTION })
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setDMPermission(false),

  async execute(interaction) {
    await interaction.reply({ ...buildPanel(interaction.guild), ephemeral: true });
  },

  YUMI_CHANNEL_PREFIX: PREFIX,
  handleYumiChannelComponent: handleComponent,
};
