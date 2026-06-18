const { SlashCommandBuilder } = require("discord.js");
const { nya } = require("../utils/nya");
const { getBalance } = require("../utils/credits");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("credits")
    .setNameLocalizations({ ko: "치유미코인" })
    .setDescription("치유미코인을 관리합니다.")
    .setDescriptionLocalizations({ ko: "치유미코인을 관리합니다." })
    .addSubcommand((subcommand) =>
      subcommand
        .setName("check")
        .setNameLocalizations({ ko: "조회" })
        .setDescription("치유미코인 보유량을 조회합니다.")
        .setDescriptionLocalizations({
          ko: "치유미코인 보유량을 조회합니다.",
        })
        .addUserOption((option) =>
          option
            .setName("user")
            .setNameLocalizations({ ko: "유저" })
            .setDescription("조회할 유저입니다. 비워두면 자신을 조회합니다.")
            .setDescriptionLocalizations({
              ko: "조회할 유저입니다. 비워두면 자신을 조회합니다.",
            })
            .setRequired(false),
        ),
    ),

  async execute(interaction) {
    const targetUser = interaction.options.getUser("user") ?? interaction.user;
    const balance = getBalance(targetUser.id);

    await interaction.reply({
      content: nya(`${targetUser}님의 치유미코인 보유량: ${balance}개`),
      ephemeral: targetUser.id === interaction.user.id,
    });
  },
};
