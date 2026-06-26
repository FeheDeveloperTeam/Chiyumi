const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  PermissionFlagsBits,
  SlashCommandBuilder,
} = require("discord.js");
const { nya } = require("../utils/nya");
const { getWordChainChannelId } = require("../utils/guildConfig");

function buildWordChainEmbed(guildId) {
  const channelId = getWordChainChannelId(guildId);
  const channelText = channelId ? `<#${channelId}>` : "설정 안 됨";

  return new EmbedBuilder()
    .setTitle("끝말잇기 설정")
    .setDescription(
      nya(
        "아래 버튼으로 끝말잇기 채널을 설정한 뒤, '메시지 게시'로 채널에 파티 모집 버튼을 올리세요",
      ),
    )
    .addFields({ name: "끝말잇기 채널", value: channelText })
    .setColor(0xe1aa74);
}

function buildWordChainRow() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("wordchain-action:channel")
      .setLabel("채널 설정")
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId("wordchain-action:post")
      .setLabel("메시지 게시")
      .setStyle(ButtonStyle.Primary),
  );
}

module.exports = {
  category: "관리",
  data: new SlashCommandBuilder()
    .setName("wordchain")
    .setNameLocalizations({ ko: "끝말잇기" })
    .setDescription(nya("끝말잇기 채널을 설정합니다"))
    .setDescriptionLocalizations({ ko: nya("끝말잇기 채널을 설정합니다") })
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setDMPermission(false),

  async execute(interaction) {
    await interaction.reply({
      embeds: [buildWordChainEmbed(interaction.guild.id)],
      components: [buildWordChainRow()],
      ephemeral: true,
    });
  },

  buildWordChainEmbed,
  buildWordChainRow,
};
