const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  PermissionFlagsBits,
  SlashCommandBuilder,
} = require("discord.js");
const { nya } = require("../utils/nya");
const { getSubscription, SETTINGS_URL } = require("../utils/premium");

// 유료: 이 서버에서만 보이는 치유미 프로필(이름·프로필 사진·배너·소개글) 꾸미기.
// 실제 설정은 fehe.dev 서버 관리 화면(봇 프로필)에서 하고, 이 명령은 이용권 상태와 그 화면으로 가는 버튼을 보여 준다.
const DESCRIPTION = nya("이 서버에서만 보이는 치유미의 이름·프로필 사진·배너·소개글을 꾸미는 유료 기능을 안내하는 명령어입니다");

module.exports = {
  category: "관리",
  data: new SlashCommandBuilder()
    .setName("botprofile")
    .setNameLocalizations({ ko: "봇프로필" })
    .setDescription(DESCRIPTION)
    .setDescriptionLocalizations({ ko: DESCRIPTION })
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setDMPermission(false),

  async execute(interaction) {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
      await interaction.reply({ content: nya("서버 관리 권한이 있어야 쓸 수 있습니다") + "\n(오류 코드: AUTH-001)", ephemeral: true });
      return;
    }

    await interaction.deferReply({ ephemeral: true });

    let subscription;
    try {
      subscription = await getSubscription(interaction.guildId);
    } catch (err) {
      console.error("[봇프로필] 이용권 조회 실패:", err.message);
      await interaction.editReply({ content: nya("유료 이용권 정보를 불러오지 못했습니다. 잠시 후 다시 시도해주세요") + "\n(오류 코드: PREMIUM-001)" });
      return;
    }

    const statusText = subscription.permanent
      ? "✅ 이용 중 · **영구 이용권** (기간 제한 없음)"
      : subscription.active
      ? `✅ 이용 중 · 만료일 **${subscription.endDate}**${subscription.daysLeft === 0 ? " (오늘까지)" : ` (${subscription.daysLeft}일 남음)`}`
      : [
          `❌ 이 서버에는 이용권이 없어요${subscription.endDate ? ` (${subscription.endDate}에 끝남)` : ""}.`,
          "서버마다 한 달 단위로 쓰는 유료 기능이에요. 이용 신청과 문의는 help@fehe.dev로 보내주세요.",
        ].join("\n");

    const embed = new EmbedBuilder()
      .setTitle("🎨 치유미 봇 프로필 꾸미기 (유료)")
      .setColor(0x5865f2)
      .setDescription(
        [
          "이 서버에서만 보이는 치유미의 **이름 · 프로필 사진 · 배너 · 소개글**을 바꿀 수 있어요. 다른 서버의 치유미는 그대로예요.",
          "설정은 fehe.dev의 서버 관리 화면에서 해요. 서버 관리 권한이 있는 사람만 들어갈 수 있어요.",
        ].join("\n"),
      )
      .addFields({ name: "이용권", value: statusText })
      .setFooter({ text: subscription.permanent ? "영구 이용권은 기간이 끝나지 않아요" : "이용권이 끝나면 치유미가 자동으로 기본 프로필로 돌아가요" });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel("봇 프로필 설정 열기").setURL(SETTINGS_URL(interaction.guildId)),
      new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel("이용약관").setURL("https://www.fehe.dev/DiscordBot/Chiyumi/terms"),
    );

    await interaction.editReply({ embeds: [embed], components: [row] });
  },
};
