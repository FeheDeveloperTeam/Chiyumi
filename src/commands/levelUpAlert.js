const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelSelectMenuBuilder,
  ChannelType,
  EmbedBuilder,
  ModalBuilder,
  PermissionFlagsBits,
  SlashCommandBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require("discord.js");
const { nya } = require("../utils/nya");
const {
  DEFAULT_LEVELUP_MESSAGE,
  getLevelUpChannelId,
  getLevelUpMessage,
  isLevelUpEnabled,
  resetLevelUpMessage,
  setLevelUpChannel,
  setLevelUpEnabled,
  setLevelUpMessage,
} = require("../utils/guildConfig");
const { formatLevelUpMessage } = require("../utils/levelUpFormat");

// /레벨업알림설정 — 레벨업 알림을 켜고 끄고, 알릴 채널과 문구를 정하는 설정 패널(관리자 전용, 나만 보기).
// 관리자가 켜기 전에는 그 서버에서 레벨업 알림을 보내지 않는다(levelUpAnnounce 참고).

const PREFIX = "levelupalert:";
const IDS = {
  toggle: `${PREFIX}toggle`,
  channel: `${PREFIX}channel`,
  here: `${PREFIX}here`,
  message: `${PREFIX}message`,
  resetMessage: `${PREFIX}reset-message`,
  modal: `${PREFIX}modal`,
};
const PREVIEW_LEVEL = 10;

function buildEmbed(guild, user, notice) {
  const enabled = isLevelUpEnabled(guild.id);
  const channelId = getLevelUpChannelId(guild.id);
  const channelMissing = channelId && !guild.channels.cache.has(channelId);
  const channelText = !channelId
    ? "레벨업한 사람이 채팅한 채널"
    : channelMissing
      ? "⚠️ 정한 채널이 삭제되어 알림을 보낼 수 없습니다. 아래에서 다시 골라주세요"
      : `<#${channelId}>`;
  const template = getLevelUpMessage(guild.id);

  return new EmbedBuilder()
    .setTitle("🎉 레벨업 알림 설정")
    .setColor(enabled ? 0xe1aa74 : 0x99aab5)
    .setDescription(
      [
        notice ? `**${notice}**\n` : null,
        enabled
          ? "✅ 레벨업 알림이 **켜져** 있습니다냥."
          : "⛔ 레벨업 알림이 **꺼져** 있습니다냥. 아래 **알림 켜기**를 눌러야 알림이 갑니다냥.",
      ]
        .filter(Boolean)
        .join("\n"),
    )
    .addFields(
      { name: "알림 채널", value: channelText },
      { name: "알림 문구", value: template.slice(0, 1024) },
      { name: "미리보기", value: formatLevelUpMessage(template, { user, level: PREVIEW_LEVEL }).slice(0, 1024) },
      {
        name: "사용 방법",
        value: [
          "🔔 **알림 켜기 / 끄기** — 레벨업 알림을 보낼지 정합니다",
          "📢 **채널 선택** — 알림을 보낼 채널을 고릅니다",
          "💬 **레벨업한 채널에서 알리기** — 따로 정한 채널 없이 레벨업한 사람이 채팅한 채널에 알립니다",
          "✏️ **문구 수정** — `{유저}`는 레벨업한 사람, `{레벨}`은 새 레벨로 바뀝니다",
          "↩️ **기본 문구로** — 처음 문구로 되돌립니다",
        ].join("\n"),
      },
    );
}

function buildPanel(guild, user, notice) {
  const enabled = isLevelUpEnabled(guild.id);
  const channelId = getLevelUpChannelId(guild.id);
  const isDefaultMessage = getLevelUpMessage(guild.id) === DEFAULT_LEVELUP_MESSAGE;

  const channelMenu = new ChannelSelectMenuBuilder()
    .setCustomId(IDS.channel)
    .setPlaceholder("📢 알림을 보낼 채널 선택")
    .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
    .setMinValues(1)
    .setMaxValues(1);
  if (channelId && guild.channels.cache.has(channelId)) channelMenu.setDefaultChannels(channelId);

  return {
    content: null,
    embeds: [buildEmbed(guild, user, notice)],
    components: [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(IDS.toggle)
          .setLabel(enabled ? "알림 끄기" : "알림 켜기")
          .setEmoji(enabled ? "🔕" : "🔔")
          .setStyle(enabled ? ButtonStyle.Secondary : ButtonStyle.Success),
      ),
      new ActionRowBuilder().addComponents(channelMenu),
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(IDS.here)
          .setLabel("레벨업한 채널에서 알리기")
          .setEmoji("💬")
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(!channelId),
        new ButtonBuilder().setCustomId(IDS.message).setLabel("문구 수정").setEmoji("✏️").setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId(IDS.resetMessage)
          .setLabel("기본 문구로")
          .setEmoji("↩️")
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(isDefaultMessage),
      ),
    ],
  };
}

function buildModal(guildId) {
  return new ModalBuilder()
    .setCustomId(IDS.modal)
    .setTitle("레벨업 알림 문구 수정")
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("message")
          .setLabel("{유저}, {레벨}을 넣으면 바뀌어 나옵니다")
          .setStyle(TextInputStyle.Paragraph)
          .setValue(getLevelUpMessage(guildId))
          .setRequired(true)
          .setMaxLength(1000),
      ),
    );
}

// 패널의 버튼·메뉴·모달 처리. interactionCreate가 customId가 PREFIX로 시작하면 여기로 넘긴다.
async function handleComponent(interaction) {
  if (!interaction.inGuild()) return;
  if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
    await interaction.reply({ content: nya("서버 관리 권한이 있어야 바꿀 수 있습니다") + "\n(오류 코드: AUTH-001)", ephemeral: true });
    return;
  }
  const { guild, user, customId } = interaction;
  // 예전 서버는 켜짐 여부를 채널·문구 설정으로 추정하므로, 무엇을 바꾸든 지금 상태를 먼저 확정해 둔다.
  const pinEnabled = () => setLevelUpEnabled(guild.id, isLevelUpEnabled(guild.id));

  if (customId === IDS.toggle) {
    const next = !isLevelUpEnabled(guild.id);
    setLevelUpEnabled(guild.id, next);
    await interaction.update(buildPanel(guild, user, next ? "레벨업 알림을 켰다냥!" : "레벨업 알림을 껐다냥"));
    return;
  }

  if (customId === IDS.channel) {
    pinEnabled();
    const channelId = interaction.values[0];
    setLevelUpChannel(guild.id, channelId);
    await interaction.update(buildPanel(guild, user, `이제 <#${channelId}>에 레벨업 알림을 보낸다냥!`));
    return;
  }

  if (customId === IDS.here) {
    pinEnabled();
    setLevelUpChannel(guild.id, null);
    await interaction.update(buildPanel(guild, user, "이제 레벨업한 사람이 채팅한 채널에 알린다냥!"));
    return;
  }

  if (customId === IDS.message) {
    await interaction.showModal(buildModal(guild.id));
    return;
  }

  if (customId === IDS.resetMessage) {
    pinEnabled();
    resetLevelUpMessage(guild.id);
    await interaction.update(buildPanel(guild, user, "기본 문구로 되돌렸다냥"));
    return;
  }

  if (customId === IDS.modal) {
    const message = interaction.fields.getTextInputValue("message").trim();
    if (!message) {
      await interaction.reply({ content: nya("문구는 비워둘 수 없습니다.") + "\n(오류 코드: MSG-001)", ephemeral: true });
      return;
    }
    pinEnabled();
    setLevelUpMessage(guild.id, message);
    await interaction.update(buildPanel(guild, user, "알림 문구를 바꿨다냥!"));
  }
}

const DESCRIPTION = nya("레벨업 알림을 켜고 끄고, 알림을 보낼 채널과 문구를 정하는 설정 패널을 여는 명령어입니다");

module.exports = {
  category: "관리",
  data: new SlashCommandBuilder()
    .setName("levelupalert")
    .setNameLocalizations({ ko: "레벨업알림설정" })
    .setDescription(DESCRIPTION)
    .setDescriptionLocalizations({ ko: DESCRIPTION })
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setDMPermission(false),

  async execute(interaction) {
    await interaction.reply({ ...buildPanel(interaction.guild, interaction.user), ephemeral: true });
  },

  LEVELUP_ALERT_PREFIX: PREFIX,
  handleLevelUpAlertComponent: handleComponent,
  buildLevelUpAlertPanel: buildPanel,
};
