const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  SlashCommandBuilder,
} = require("discord.js");
const { nya } = require("../utils/nya");
const { getOrCreatePet, getAgeDays, getStage, ACTIONS } = require("../utils/pets");

function buildPetEmbed(pet, username) {
  const ageDays = getAgeDays(pet);
  const stage = getStage(ageDays);

  return new EmbedBuilder()
    .setTitle(`${stage.emoji} ${username}님의 고양이`)
    .setDescription(nya(`${stage.name} · ${ageDays}일째 함께하고 있다`))
    .addFields(
      { name: "배고픔", value: `${pet.hunger}/100`, inline: true },
      { name: "청결", value: `${pet.cleanliness}/100`, inline: true },
      { name: "애정", value: `${pet.affection}/100`, inline: true },
    )
    .setColor(0xe1aa74);
}

function buildPetRow(ownerId) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`pet-action:feed:${ownerId}`)
      .setLabel(ACTIONS.feed.label)
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(`pet-action:wash:${ownerId}`)
      .setLabel(ACTIONS.wash.label)
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(`pet-action:play:${ownerId}`)
      .setLabel(ACTIONS.play.label)
      .setStyle(ButtonStyle.Primary),
  );
}

module.exports = {
  category: "게임",
  data: new SlashCommandBuilder()
    .setName("raise")
    .setNameLocalizations({ ko: "키우기" })
    .setDescription(nya("내 고양이에게 밥을 주거나 씻기거나 놀아줍니다"))
    .setDescriptionLocalizations({
      ko: nya("내 고양이에게 밥을 주거나 씻기거나 놀아줍니다"),
    }),

  async execute(interaction) {
    const pet = getOrCreatePet(interaction.user.id);

    await interaction.reply({
      embeds: [buildPetEmbed(pet, interaction.user.username)],
      components: [buildPetRow(interaction.user.id)],
    });
  },

  buildPetEmbed,
  buildPetRow,
};
