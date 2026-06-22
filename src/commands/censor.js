const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  PermissionFlagsBits,
  SlashCommandBuilder,
} = require("discord.js");
const { nya } = require("../utils/nya");
const { getLogOptions } = require("../utils/guildConfig");

const FILTER_INFO = {
  profanityFilter: {
    title: "욕설 검열",
    description:
      "켜면 제가 서버의 모든 채팅방을 지켜보면서 욕설이 적힌 메시지를 바로 삭제합니다. 신중하게 설정해주세요",
  },
  spamFilter: {
    title: "도배 검열",
    description:
      "켜면 같은 메시지를 반복하거나 짧은 시간에 메시지를 연달아 보내는 도배를 감지해서 바로 삭제합니다. 신중하게 설정해주세요",
  },
};

function buildMenuEmbed() {
  return new EmbedBuilder()
    .setTitle("검열 설정")
    .setDescription(nya("욕설검열 또는 도배검열 중 설정할 항목을 선택하세요"))
    .setColor(0xe1aa74);
}

function buildMenuRow() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("censor-action:profanity")
      .setLabel("욕설검열")
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId("censor-action:spam")
      .setLabel("도배검열")
      .setStyle(ButtonStyle.Primary),
  );
}

function buildFilterEmbed(guildId, key) {
  const enabled = getLogOptions(guildId)[key];
  const info = FILTER_INFO[key];

  return new EmbedBuilder()
    .setTitle(info.title)
    .setDescription(
      nya(`${info.description}\n현재 상태: ${enabled ? "켜져 있습니다" : "꺼져 있습니다"}`),
    )
    .setColor(0xe1aa74);
}

function buildFilterRow(guildId, key) {
  const enabled = getLogOptions(guildId)[key];

  const toggleButton = new ButtonBuilder()
    .setCustomId(`censor-toggle:${key}`)
    .setLabel(enabled ? "끄기" : "켜기")
    .setStyle(enabled ? ButtonStyle.Success : ButtonStyle.Secondary);

  return new ActionRowBuilder().addComponents(toggleButton);
}

module.exports = {
  category: "관리",
  data: new SlashCommandBuilder()
    .setName("censor")
    .setNameLocalizations({ ko: "검열" })
    .setDescription(nya("욕설 검열과 도배 검열 기능을 켜고 끕니다"))
    .setDescriptionLocalizations({ ko: nya("욕설 검열과 도배 검열 기능을 켜고 끕니다") })
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setDMPermission(false),

  async execute(interaction) {
    await interaction.reply({
      embeds: [buildMenuEmbed()],
      components: [buildMenuRow()],
      ephemeral: true,
    });
  },

  buildMenuEmbed,
  buildMenuRow,
  buildFilterEmbed,
  buildFilterRow,
};
