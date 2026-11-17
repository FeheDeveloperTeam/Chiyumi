const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
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
//  - 채널 추가: 아직 추가하지 않은 채널만 보여 주는 선택 메뉴(25개씩 쪽 넘김)에서 여러 개 골라 더한다.
//    디스코드 기본 채널 선택 메뉴는 특정 채널을 숨길 수 없어서 일반 선택 메뉴로 직접 목록을 만든다.
//  - 채널 제거: 이미 등록된 채널만 보여 주는 메뉴에서 뺄 채널을 여러 개 고른다.
//  - 모두 삭제: 확인 버튼을 한 번 더 눌러야 지운다.

const PREFIX = "yumichannel:";
const IDS = {
  add: `${PREFIX}add:`, // 뒤에 쪽 번호
  page: `${PREFIX}page:`, // 뒤에 이동할 쪽 번호
  remove: `${PREFIX}remove`,
  reset: `${PREFIX}reset`,
  resetConfirm: `${PREFIX}reset-confirm`,
  resetCancel: `${PREFIX}reset-cancel`,
};
const PAGE_SIZE = 25; // 선택 메뉴 한 개에 넣을 수 있는 최대 항목 수
const ALLOWED_TYPES = [ChannelType.GuildText, ChannelType.GuildAnnouncement, ChannelType.GuildForum];

function liveChannelIds(guild) {
  // 최대 개수를 넘는 값이 들어 있어도(예: 파일 직접 수정) 선택 메뉴 한도(25개)를 넘지 않게 자른다.
  return getAiChannelIds(guild.id).filter((id) => guild.channels.cache.has(id)).slice(0, AI_CHANNEL_LIMIT);
}

// 아직 추가하지 않은 채널(텍스트·공지·포럼)을 디스코드 채널 목록 순서대로 돌려준다.
function addableChannels(guild) {
  const live = new Set(liveChannelIds(guild));
  const order = (c) => [c.parent?.rawPosition ?? -1, c.rawPosition ?? 0];
  return [...guild.channels.cache.values()]
    .filter((c) => ALLOWED_TYPES.includes(c.type) && !live.has(c.id))
    .sort((a, b) => {
      const [pa, ca] = order(a);
      const [pb, cb] = order(b);
      return pa - pb || ca - cb;
    });
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
        "➕ **채널 추가** — 아직 추가하지 않은 채널 중에서 여러 개를 골라 더합니다",
        "➖ **채널 제거** — 이미 등록된 채널 중에서 뺄 채널을 고릅니다",
        "🗑️ **모두 삭제** — 정한 채널을 전부 지워 AI 대화를 끕니다",
      ].join("\n"),
    })
    .setFooter({ text: `${live.length} / ${AI_CHANNEL_LIMIT}개` });
  return embed;
}

function buildPanel(guild, notice, page = 0) {
  const live = liveChannelIds(guild);
  const rows = [];

  // ➕ 채널 추가: 등록되지 않은 채널만, 25개씩 쪽으로 나눈다.
  const candidates = addableChannels(guild);
  const pageCount = Math.max(1, Math.ceil(candidates.length / PAGE_SIZE));
  page = Math.min(Math.max(0, page), pageCount - 1);
  const pageItems = candidates.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const room = AI_CHANNEL_LIMIT - live.length;
  const canAdd = room > 0 && pageItems.length > 0;
  const addMenu = new StringSelectMenuBuilder()
    .setCustomId(`${IDS.add}${page}`)
    .setPlaceholder(
      room <= 0
        ? `최대 ${AI_CHANNEL_LIMIT}개까지 정할 수 있습니다`
        : candidates.length
          ? `➕ 채널 추가 (여러 개 선택 가능)${pageCount > 1 ? ` · ${page + 1}/${pageCount}쪽` : ""}`
          : "추가할 수 있는 채널이 없습니다",
    )
    .setMinValues(1)
    .setMaxValues(canAdd ? Math.min(room, pageItems.length) : 1)
    .setDisabled(!canAdd);
  if (pageItems.length) {
    addMenu.addOptions(
      pageItems.map((c) => ({
        label: `#${c.name}`.slice(0, 100),
        value: c.id,
        ...(c.parent ? { description: c.parent.name.slice(0, 100) } : {}),
      })),
    );
  } else {
    addMenu.addOptions({ label: "추가할 수 있는 채널이 없습니다", value: "none" });
  }
  rows.push(new ActionRowBuilder().addComponents(addMenu));

  // ➖ 채널 제거: 이미 등록된 채널만.
  if (live.length) {
    rows.push(
      new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId(IDS.remove)
          .setPlaceholder("➖ 채널 제거 (여러 개 선택 가능)")
          .setMinValues(1)
          .setMaxValues(live.length)
          .addOptions(
            live.map((id) => {
              const c = guild.channels.cache.get(id);
              return {
                label: `#${c?.name ?? id}`.slice(0, 100),
                value: id,
                ...(c?.parent ? { description: c.parent.name.slice(0, 100) } : {}),
              };
            }),
          ),
      ),
    );
  }

  const buttons = [];
  if (pageCount > 1) {
    buttons.push(
      new ButtonBuilder()
        .setCustomId(`${IDS.page}${page - 1}`)
        .setLabel("◀ 이전 쪽")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(page === 0),
      new ButtonBuilder()
        .setCustomId(`${IDS.page}${page + 1}`)
        .setLabel("다음 쪽 ▶")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(page >= pageCount - 1),
    );
  }
  buttons.push(
    new ButtonBuilder()
      .setCustomId(IDS.reset)
      .setLabel("모두 삭제")
      .setEmoji("🗑️")
      .setStyle(ButtonStyle.Danger)
      .setDisabled(!live.length),
  );
  rows.push(new ActionRowBuilder().addComponents(buttons));

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

  if (customId.startsWith(IDS.page)) {
    await interaction.update(buildPanel(guild, null, Number(customId.slice(IDS.page.length)) || 0));
    return;
  }

  if (customId.startsWith(IDS.add)) {
    const page = Number(customId.slice(IDS.add.length)) || 0;
    const fresh = interaction.values.filter((id) => id !== "none" && !live.includes(id) && guild.channels.cache.has(id));
    const added = fresh.slice(0, AI_CHANNEL_LIMIT - live.length);
    const skipped = fresh.length - added.length;
    if (added.length) setAiChannelIds(guild.id, [...live, ...added]);
    const notice = added.length
      ? `${added.map((id) => `<#${id}>`).join(", ")} 추가 완료냥!${skipped ? ` (최대 개수를 넘어 ${skipped}개는 추가하지 못했다냥)` : ""}`
      : "고른 채널은 이미 모두 목록에 있다냥";
    await interaction.update(buildPanel(guild, notice, page));
    return;
  }

  if (customId === IDS.remove) {
    setAiChannelIds(guild.id, live.filter((id) => !interaction.values.includes(id)));
    await interaction.update(buildPanel(guild, `${interaction.values.map((id) => `<#${id}>`).join(", ")} 제거 완료냥!`));
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

const DESCRIPTION = nya("유미와 \"유미야\" AI 대화를 할 수 있는 채널을 추가·제거·삭제하는 설정 패널을 여는 명령어입니다");

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
