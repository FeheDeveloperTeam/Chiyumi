const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelSelectMenuBuilder,
  ChannelType,
  EmbedBuilder,
  Events,
  ModalBuilder,
  PermissionFlagsBits,
  RoleSelectMenuBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require("discord.js");
const { nya } = require("../utils/nya");
const { getBalance, addBalance, claimDaily } = require("../utils/credits");
const {
  sendLog,
  setLogChannel,
  getLogOptions,
  setLogOption,
} = require("../utils/guildConfig");
const { buildLogContent, buildLogRows } = require("../commands/log");
const { buildCensorContent, buildCensorRow } = require("../commands/censor");
const { isDeveloper } = require("../utils/devUser");
const { hasAgreed, agree } = require("../utils/consent");
const {
  drawCard,
  handTotal,
  isBlackjack,
  createSession: createBjSession,
  getSession: getBjSession,
  deleteSession: deleteBjSession,
  buildBjEmbed,
} = require("../utils/blackjack");
const { wait: slotWait, buildReelText: buildSlotReelText, spin: spinSlot } = require("../utils/slot");
const {
  getAccountByRiotId,
  getSummonerByPuuid,
  getLeagueEntriesByPuuid,
  getMatchIdsByPuuid,
  getMatchById,
} = require("../utils/riot");
const {
  createSession: createStatsSession,
  getSession: getStatsSession,
} = require("../utils/statsSession");

const COIN_ACTION_PREFIX = "coin-action:";
const BJ_ACTION_PREFIX = "bj-action:";
const STATS_ACTION_PREFIX = "stats-action:";
const STATS_MODAL_PREFIX = "stats-modal:";
const STATS_DETAIL_PREFIX = "stats-detail:";
const GAMBLE_ACTION_PREFIX = "gamble-action:";
const GAMBLE_MODAL_PREFIX = "gamble-modal:";
const GAMBLE_TITLES = {
  slot: "슬롯머신",
  oddeven: "홀짝",
  numberguess: "숫자맞추기",
  blackjack: "블랙잭",
  rps: "가위바위보",
};
const RPS_CHOICES = ["가위", "바위", "보"];
const RPS_BEATS = {
  가위: "보",
  바위: "가위",
  보: "바위",
};
const INQUIRY_ACTION_PREFIX = "inquiry-action:";
const INQUIRY_MODAL_PREFIX = "inquiry-modal:";
const INQUIRY_CHANNEL_ID = "1518461357735936000";
const INQUIRY_TITLES = { report: "신고", feedback: "피드백", bug: "버그 신고" };
const VERIFY_BUTTON_PREFIX = "verify:";
const VERIFY_ACTION_PREFIX = "verify-action:";
const VERIFY_ACTION_MODAL_PREFIX = "verify-action-modal:";
const VERIFY_SETUP_ROLE_SELECT_PREFIX = "verify-setup:role:";
const VERIFY_SETUP_DEFAULT_PREFIX = "verify-setup:default:";
const VERIFY_SETUP_MODAL_PREFIX = "verify-setup:modal:";
const VERIFY_MODAL_PREFIX = "verify-modal:";
const ANNOUNCE_MODAL_PREFIX = "announce-modal:";
const LOG_ACTION_PREFIX = "log-action:";
const LOG_TOGGLE_PREFIX = "log-toggle:";
const LOG_CHANNEL_SELECT_ID = "log-channel-select";
const COIN_DEV_ACTION_PREFIX = "coin-dev-action:";
const COIN_DEV_MODAL_PREFIX = "coin-dev-modal:";
const DEFAULT_VERIFY_MESSAGE = nya("아래 버튼을 눌러 서버 인증을 완료하세요.");
const CONSENT_AGREE_ID = "consent-action:agree";
const TERMS_URL = "https://fehedeveloperteam.github.io/Chiyumi/terms.html";
const PRIVACY_URL = "https://fehedeveloperteam.github.io/Chiyumi/privacy.html";

function hasManageGuild(interaction) {
  return Boolean(interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild));
}

function formatRemainingTime(ms) {
  const totalMinutes = Math.ceil(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 0) return `${hours}시간 ${minutes}분`;
  return `${minutes}분`;
}

function extractMessageId(input) {
  const matches = input.match(/\d{15,20}/g);
  return matches ? matches[matches.length - 1] : input;
}

async function promptConsent(interaction) {
  const embed = new EmbedBuilder()
    .setTitle("이용약관 동의")
    .setDescription(
      nya(
        "치유미를 이용하려면 먼저 이용약관과 개인정보 처리방침에 동의해야 합니다. 아래 동의하기 버튼을 누르면 약관에 동의한 것으로 간주됩니다",
      ),
    )
    .addFields(
      { name: "이용약관", value: TERMS_URL },
      { name: "개인정보 처리방침", value: PRIVACY_URL },
    )
    .setColor(0xe1aa74);

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(CONSENT_AGREE_ID)
      .setLabel("동의하기")
      .setStyle(ButtonStyle.Primary),
  );

  await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
}

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction) {
    if (interaction.isChatInputCommand() && !hasAgreed(interaction.user.id)) {
      await promptConsent(interaction);
      return;
    }

    if (interaction.isButton()) {
      if (interaction.customId === CONSENT_AGREE_ID) {
        agree(interaction.user.id);
        await interaction.reply({
          content: nya(
            "동의해주셔서 감사합니다! 이제 명령어를 다시 입력하면 바로 이용할 수 있습니다",
          ),
          ephemeral: true,
        });
        return;
      }

      await handleButton(interaction);
      return;
    }

    if (interaction.isRoleSelectMenu()) {
      await handleRoleSelect(interaction);
      return;
    }

    if (interaction.isChannelSelectMenu()) {
      await handleChannelSelect(interaction);
      return;
    }

    if (interaction.isModalSubmit()) {
      await handleModalSubmit(interaction);
      return;
    }

    if (!interaction.isChatInputCommand()) return;

    const command = interaction.client.commands.get(interaction.commandName);

    if (!command) {
      console.error(`${interaction.commandName} 명령어를 찾을 수 없습니다.`);
      return;
    }

    try {
      await command.execute(interaction);
    } catch (error) {
      console.error(error);

      const message = {
        content: nya(
          "명령어를 실행하는 중 오류가 발생했습니다. (오류 코드: CMD-001)",
        ),
        ephemeral: true,
      };

      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(message);
      } else {
        await interaction.reply(message);
      }
    }
  },
};

async function handleRoleSelect(interaction) {
  if (!interaction.customId.startsWith(VERIFY_SETUP_ROLE_SELECT_PREFIX)) return;

  if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageRoles)) {
    await interaction.reply({
      content: nya(
        "이 설정은 역할 관리 권한이 있는 관리자만 사용할 수 있습니다. (오류 코드: AUTH-001)",
      ),
      ephemeral: true,
    });
    return;
  }

  const roleId = interaction.values[0];
  const role = interaction.guild.roles.cache.get(roleId);
  const setup = parseSetupCustomId(
    interaction.customId,
    VERIFY_SETUP_ROLE_SELECT_PREFIX,
  );

  if (!role) {
    await interaction.update({
      content: nya(
        "선택한 역할을 찾을 수 없습니다. 다시 시도해주세요. (오류 코드: ROLE-001)",
      ),
      components: [],
    });
    return;
  }

  if (!role.editable) {
    await interaction.update({
      content: nya(
        "이 역할은 봇이 지급할 수 없습니다. 봇 역할을 해당 역할보다 위로 올려주세요. (오류 코드: ROLE-002)",
      ),
      components: [],
    });
    return;
  }

  const defaultButton = new ButtonBuilder()
    .setCustomId(buildSetupCustomId(VERIFY_SETUP_DEFAULT_PREFIX, setup, role.id))
    .setLabel("기본 메시지로 생성")
    .setStyle(ButtonStyle.Success);

  const customButton = new ButtonBuilder()
    .setCustomId(buildSetupCustomId(VERIFY_SETUP_MODAL_PREFIX, setup, role.id))
    .setLabel("메시지 입력")
    .setStyle(ButtonStyle.Primary);

  const row = new ActionRowBuilder().addComponents(defaultButton, customButton);

  await interaction.update({
    content: nya(
      `${role} 역할을 인증 역할로 선택했습니다. 인증 메시지를 어떻게 만들까요?`,
    ),
    components: [row],
  });
}

async function handleChannelSelect(interaction) {
  if (interaction.customId !== LOG_CHANNEL_SELECT_ID) return;

  if (!hasManageGuild(interaction)) {
    await interaction.reply({
      content: nya(
        "이 설정은 서버 관리 권한이 있는 관리자만 사용할 수 있습니다. (오류 코드: AUTH-001)",
      ),
      ephemeral: true,
    });
    return;
  }

  const channelId = interaction.values[0];
  setLogChannel(interaction.guild.id, channelId);

  await interaction.update({
    content: buildLogContent(interaction.guild.id),
    components: buildLogRows(interaction.guild.id),
  });
}

async function handleButton(interaction) {
  if (interaction.customId.startsWith(LOG_ACTION_PREFIX)) {
    if (!hasManageGuild(interaction)) {
      await interaction.reply({
        content: nya(
          "이 설정은 서버 관리 권한이 있는 관리자만 사용할 수 있습니다. (오류 코드: AUTH-001)",
        ),
        ephemeral: true,
      });
      return;
    }

    const action = interaction.customId.slice(LOG_ACTION_PREFIX.length);

    if (action === "channel") {
      const channelSelect = new ChannelSelectMenuBuilder()
        .setCustomId(LOG_CHANNEL_SELECT_ID)
        .setPlaceholder("로그를 받을 채널을 선택하세요")
        .addChannelTypes(ChannelType.GuildText)
        .setMinValues(1)
        .setMaxValues(1);

      const row = new ActionRowBuilder().addComponents(channelSelect);

      await interaction.update({
        content: nya("로그를 받을 채널을 선택하세요."),
        components: [row],
      });
      return;
    }

    return;
  }

  if (interaction.customId.startsWith(LOG_TOGGLE_PREFIX)) {
    if (!hasManageGuild(interaction)) {
      await interaction.reply({
        content: nya(
          "이 설정은 서버 관리 권한이 있는 관리자만 사용할 수 있습니다. (오류 코드: AUTH-001)",
        ),
        ephemeral: true,
      });
      return;
    }

    const key = interaction.customId.slice(LOG_TOGGLE_PREFIX.length);
    const options = getLogOptions(interaction.guild.id);
    setLogOption(interaction.guild.id, key, !options[key]);

    await interaction.update({
      content: buildLogContent(interaction.guild.id),
      components: buildLogRows(interaction.guild.id),
    });
    return;
  }

  if (interaction.customId === "censor-action:toggle") {
    if (!hasManageGuild(interaction)) {
      await interaction.reply({
        content: nya(
          "이 설정은 서버 관리 권한이 있는 관리자만 사용할 수 있습니다. (오류 코드: AUTH-001)",
        ),
        ephemeral: true,
      });
      return;
    }

    const enabled = getLogOptions(interaction.guild.id).profanityFilter;
    setLogOption(interaction.guild.id, "profanityFilter", !enabled);

    await interaction.update({
      content: buildCensorContent(interaction.guild.id),
      components: [buildCensorRow(interaction.guild.id)],
    });
    return;
  }

  if (interaction.customId.startsWith(BJ_ACTION_PREFIX)) {
    await handleBlackjackAction(interaction);
    return;
  }

  if (interaction.customId.startsWith(COIN_ACTION_PREFIX)) {
    const action = interaction.customId.slice(COIN_ACTION_PREFIX.length);

    if (action === "check") {
      const balance = getBalance(interaction.user.id);
      await interaction.reply({
        content: nya(`${interaction.user}님의 치유미코인 보유량: ${balance}개`),
        ephemeral: true,
      });
      return;
    }

    if (action === "claim") {
      const result = claimDaily(interaction.user.id);

      if (!result.success) {
        await interaction.reply({
          content: nya(
            `이미 오늘의 지급을 받았습니다. ${formatRemainingTime(result.remainingMs)} 후에 다시 받을 수 있습니다. (오류 코드: COIN-001)`,
          ),
          ephemeral: true,
        });
        return;
      }

      await interaction.reply({
        content: nya(
          `오늘의 치유미코인 ${result.amount}개를 지급받았습니다! 현재 보유량: ${result.balance}개`,
        ),
        ephemeral: true,
      });
      return;
    }

    if (action === "dev") {
      if (!isDeveloper(interaction.user.id)) {
        await interaction.reply({
          content: nya("이 버튼은 개발자만 사용할 수 있습니다. (오류 코드: DEV-001)"),
          ephemeral: true,
        });
        return;
      }

      const grantButton = new ButtonBuilder()
        .setCustomId(`${COIN_DEV_ACTION_PREFIX}grant`)
        .setLabel("코인 지급")
        .setStyle(ButtonStyle.Success);

      const deductButton = new ButtonBuilder()
        .setCustomId(`${COIN_DEV_ACTION_PREFIX}deduct`)
        .setLabel("코인 차감")
        .setStyle(ButtonStyle.Danger);

      const row = new ActionRowBuilder().addComponents(grantButton, deductButton);

      await interaction.update({
        content: nya("개발자 전용 메뉴입니다. 어떤 작업을 할까요?"),
        components: [row],
      });
      return;
    }

    return;
  }

  if (interaction.customId.startsWith(COIN_DEV_ACTION_PREFIX)) {
    if (!isDeveloper(interaction.user.id)) {
      await interaction.reply({
        content: nya("이 버튼은 개발자만 사용할 수 있습니다. (오류 코드: DEV-001)"),
        ephemeral: true,
      });
      return;
    }

    const direction = interaction.customId.slice(COIN_DEV_ACTION_PREFIX.length);
    await showDevGrantModal(interaction, direction);
    return;
  }

  if (interaction.customId.startsWith(STATS_ACTION_PREFIX)) {
    const action = interaction.customId.slice(STATS_ACTION_PREFIX.length);

    if (action === "lol") {
      await showLolStatsModal(interaction);
    }

    return;
  }

  if (interaction.customId.startsWith(STATS_DETAIL_PREFIX)) {
    await handleStatsDetailButton(interaction);
    return;
  }

  if (interaction.customId.startsWith(GAMBLE_ACTION_PREFIX)) {
    const game = interaction.customId.slice(GAMBLE_ACTION_PREFIX.length);
    await showGambleModal(interaction, game);
    return;
  }

  if (interaction.customId.startsWith(INQUIRY_ACTION_PREFIX)) {
    const type = interaction.customId.slice(INQUIRY_ACTION_PREFIX.length);
    await showInquiryModal(interaction, type);
    return;
  }

  if (interaction.customId.startsWith(VERIFY_ACTION_PREFIX)) {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageRoles)) {
      await interaction.reply({
        content: nya(
          "이 설정은 역할 관리 권한이 있는 관리자만 사용할 수 있습니다. (오류 코드: AUTH-001)",
        ),
        ephemeral: true,
      });
      return;
    }

    const action = interaction.customId.slice(VERIFY_ACTION_PREFIX.length);

    if (action === "create") {
      await replyWithRoleSelect(interaction, "verify-setup:role:create");
      return;
    }

    await showMessageIdModal(interaction, action);
    return;
  }

  if (interaction.customId.startsWith(VERIFY_SETUP_DEFAULT_PREFIX)) {
    const setup = parseSetupCustomId(
      interaction.customId,
      VERIFY_SETUP_DEFAULT_PREFIX,
    );
    await saveVerifyMessage(interaction, setup, DEFAULT_VERIFY_MESSAGE);
    return;
  }

  if (interaction.customId.startsWith(VERIFY_SETUP_MODAL_PREFIX)) {
    const setup = parseSetupCustomId(
      interaction.customId,
      VERIFY_SETUP_MODAL_PREFIX,
    );
    await showMessageModal(interaction, setup);
    return;
  }

  if (!interaction.customId.startsWith(VERIFY_BUTTON_PREFIX)) return;

  if (!interaction.inGuild()) {
    await interaction.reply({
      content: nya("서버에서만 사용할 수 있는 버튼입니다. (오류 코드: GUILD-001)"),
      ephemeral: true,
    });
    return;
  }

  const roleId = interaction.customId.slice(VERIFY_BUTTON_PREFIX.length);
  const role = interaction.guild.roles.cache.get(roleId);

  if (!role) {
    await interaction.reply({
      content: nya(
        "인증 역할을 찾을 수 없습니다. 관리자에게 문의해주세요. (오류 코드: ROLE-003)",
      ),
      ephemeral: true,
    });
    return;
  }

  if (interaction.member.roles.cache.has(role.id)) {
    await interaction.reply({
      content: nya(`이미 ${role} 역할을 가지고 있습니다.`),
      ephemeral: true,
    });
    return;
  }

  try {
    await interaction.member.roles.add(role);
    await interaction.reply({
      content: nya(`${role} 역할이 지급되었습니다.`),
      ephemeral: true,
    });
  } catch (error) {
    console.error(error);
    await interaction.reply({
      content: nya(
        "역할을 지급하지 못했습니다. 봇 권한과 역할 순서를 확인해주세요. (오류 코드: ROLE-004)",
      ),
      ephemeral: true,
    });
  }
}

async function showDevGrantModal(interaction, direction) {
  const isGrant = direction === "grant";

  const modal = new ModalBuilder()
    .setCustomId(`${COIN_DEV_MODAL_PREFIX}${direction}`)
    .setTitle(isGrant ? "코인 지급" : "코인 차감");

  const userIdInput = new TextInputBuilder()
    .setCustomId("user_id")
    .setLabel("대상 사용자 ID")
    .setStyle(TextInputStyle.Short)
    .setRequired(true);

  const amountInput = new TextInputBuilder()
    .setCustomId("amount")
    .setLabel(isGrant ? "지급할 금액" : "차감할 금액")
    .setStyle(TextInputStyle.Short)
    .setPlaceholder("예: 100")
    .setRequired(true);

  modal.addComponents(
    new ActionRowBuilder().addComponents(userIdInput),
    new ActionRowBuilder().addComponents(amountInput),
  );

  await interaction.showModal(modal);
}

async function handleDevGrantModal(interaction, direction) {
  if (!isDeveloper(interaction.user.id)) {
    await interaction.reply({
      content: nya("이 기능은 개발자만 사용할 수 있습니다. (오류 코드: DEV-001)"),
      ephemeral: true,
    });
    return;
  }

  const targetUserId = interaction.fields.getTextInputValue("user_id").trim();
  const amountText = interaction.fields.getTextInputValue("amount").trim();
  const rawAmount = Number(amountText);

  if (!/^\d{15,20}$/.test(targetUserId)) {
    await interaction.reply({
      content: nya("올바른 사용자 ID가 아닙니다. (오류 코드: DEV-002)"),
      ephemeral: true,
    });
    return;
  }

  if (!Number.isInteger(rawAmount) || rawAmount <= 0) {
    await interaction.reply({
      content: nya("올바른 금액이 아닙니다. (오류 코드: DEV-003)"),
      ephemeral: true,
    });
    return;
  }

  const amount = direction === "deduct" ? -rawAmount : rawAmount;
  const newBalance = addBalance(targetUserId, amount);
  const actionText = direction === "deduct" ? "차감" : "지급";

  await interaction.reply({
    content: nya(
      `<@${targetUserId}>님에게 ${Math.abs(amount)} 치유미코인을 ${actionText}했습니다. 현재 보유량: ${newBalance}개`,
    ),
    ephemeral: true,
  });
}

async function showLolStatsModal(interaction) {
  const modal = new ModalBuilder()
    .setCustomId(STATS_MODAL_PREFIX)
    .setTitle("리그 오브 레전드 전적 검색");

  const riotIdInput = new TextInputBuilder()
    .setCustomId("riot_id")
    .setLabel("닉네임#태그")
    .setStyle(TextInputStyle.Short)
    .setPlaceholder("예: Hide on bush#KR1")
    .setRequired(true);

  modal.addComponents(new ActionRowBuilder().addComponents(riotIdInput));

  await interaction.showModal(modal);
}

const QUEUE_NAMES = {
  420: "솔로랭크",
  440: "자유랭크",
  430: "일반(블라인드)",
  400: "일반(드래프트)",
  450: "칼바람 나락",
};

function formatDuration(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  return `${minutes}분 ${remaining}초`;
}

async function handleLolStatsModal(interaction) {
  const riotId = interaction.fields.getTextInputValue("riot_id").trim();
  const [gameName, tagLine] = riotId.split("#").map((part) => part?.trim());

  if (!gameName || !tagLine) {
    await interaction.reply({
      content: nya(
        "닉네임#태그 형식으로 입력해주세요. 예: Hide on bush#KR1 (오류 코드: STATS-001)",
      ),
      ephemeral: true,
    });
    return;
  }

  await interaction.deferReply({ ephemeral: true });

  let account;

  try {
    account = await getAccountByRiotId(gameName, tagLine);
  } catch (error) {
    if (error.status === 404) {
      await interaction.editReply(
        nya(`'${riotId}' 소환사를 찾을 수 없습니다. (오류 코드: STATS-002)`),
      );
      return;
    }

    console.error(error);
    await interaction.editReply(
      nya("전적을 불러오는 중 오류가 발생했습니다. (오류 코드: STATS-003)"),
    );
    return;
  }

  try {
    const [summoner, leagueEntries, matchIds] = await Promise.all([
      getSummonerByPuuid(account.puuid),
      getLeagueEntriesByPuuid(account.puuid),
      getMatchIdsByPuuid(account.puuid, 5),
    ]);

    if (matchIds.length === 0) {
      await interaction.editReply(
        nya(
          `'${riotId}'님은 전적이 비공개라서 표시할 수 없습니다.`,
        ),
      );
      return;
    }

    const matches = await Promise.all(matchIds.map((id) => getMatchById(id)));

    const soloEntry = leagueEntries.find((entry) => entry.queueType === "RANKED_SOLO_5x5");
    const rankText = soloEntry
      ? `${soloEntry.tier} ${soloEntry.rank} (${soloEntry.leaguePoints}LP, ${soloEntry.wins}승 ${soloEntry.losses}패)`
      : "랭크 정보 없음";

    const matchLines = matches.map((match, index) => {
      const participant = match.info.participants.find((p) => p.puuid === account.puuid);
      const queueName = QUEUE_NAMES[match.info.queueId] ?? `큐 ${match.info.queueId}`;
      const resultText = participant.win ? "승리" : "패배";

      return nya(
        `${index + 1}경기 | ${queueName} | ${participant.championName} | ${participant.kills}/${participant.deaths}/${participant.assists} | ${resultText} | ${formatDuration(match.info.gameDuration)}`,
      );
    });

    const embed = new EmbedBuilder()
      .setTitle(`${account.gameName}#${account.tagLine}`)
      .addFields(
        { name: "소환사 레벨", value: `${summoner.summonerLevel}` },
        { name: "솔로랭크", value: rankText },
        { name: "최근 전적", value: matchLines.join("\n") },
      )
      .setColor(0xe1aa74);

    const emblemUrl = getTierEmblemUrl(soloEntry?.tier);
    if (emblemUrl) embed.setThumbnail(emblemUrl);

    const sessionId = createStatsSession({ puuid: account.puuid, matches });
    const detailRow = new ActionRowBuilder().addComponents(
      matches.map((_, index) =>
        new ButtonBuilder()
          .setCustomId(`${STATS_DETAIL_PREFIX}${sessionId}:${index}`)
          .setLabel(`${index + 1}경기 더보기`)
          .setStyle(ButtonStyle.Primary),
      ),
    );

    await interaction.editReply({ content: null, embeds: [embed], components: [detailRow] });
  } catch (error) {
    console.error(error);
    await interaction.editReply(
      nya("전적을 불러오는 중 오류가 발생했습니다. (오류 코드: STATS-003)"),
    );
  }
}

const POSITION_LABELS = {
  TOP: "탑",
  JUNGLE: "정글",
  MIDDLE: "미드",
  BOTTOM: "원딜",
  UTILITY: "지원",
};
const POSITION_ORDER = ["TOP", "JUNGLE", "MIDDLE", "BOTTOM", "UTILITY"];

function formatParticipantName(participant) {
  if (participant.riotIdGameName) {
    const tagLine = participant.riotIdTagline ? `#${participant.riotIdTagline}` : "";
    return `${participant.riotIdGameName}${tagLine}`;
  }

  return participant.summonerName || "알 수 없음";
}

function buildMatchupText(participants) {
  const byPosition = new Map();

  for (const p of participants) {
    if (!byPosition.has(p.teamPosition)) byPosition.set(p.teamPosition, []);
    byPosition.get(p.teamPosition).push(p);
  }

  const lines = POSITION_ORDER.map((position) => {
    const pair = byPosition.get(position);
    const blue = pair?.find((p) => p.teamId === 100);
    const red = pair?.find((p) => p.teamId === 200);

    if (!blue || !red) return null;

    return (
      `${POSITION_LABELS[position]}: ${blue.championName} (${formatParticipantName(blue)}) ` +
      `${blue.kills}/${blue.deaths}/${blue.assists} vs ` +
      `${red.championName} (${formatParticipantName(red)}) ${red.kills}/${red.deaths}/${red.assists}`
    );
  }).filter(Boolean);

  return lines.length > 0 ? lines.join("\n") : "매치업 정보 없음";
}

const TIER_EMBLEM_BASE_URL =
  "https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-static-assets/global/default/images/ranked-emblems/emblem-";

function getTierEmblemUrl(tier) {
  if (!tier) return null;
  return `${TIER_EMBLEM_BASE_URL}${tier.toLowerCase()}.png`;
}

async function handleStatsDetailButton(interaction) {
  const [sessionId, indexText] = interaction.customId
    .slice(STATS_DETAIL_PREFIX.length)
    .split(":");
  const session = getStatsSession(sessionId);

  if (!session) {
    await interaction.reply({
      content: nya("전적 정보가 만료되었습니다. 다시 검색해주세요. (오류 코드: STATS-004)"),
      ephemeral: true,
    });
    return;
  }

  const match = session.matches[Number(indexText)];

  if (!match) {
    await interaction.reply({
      content: nya("해당 경기를 찾을 수 없습니다. (오류 코드: STATS-005)"),
      ephemeral: true,
    });
    return;
  }

  const participant = match.info.participants.find((p) => p.puuid === session.puuid);
  const queueName = QUEUE_NAMES[match.info.queueId] ?? `큐 ${match.info.queueId}`;

  const embed = new EmbedBuilder()
    .setTitle(`${participant.championName} - ${participant.win ? "승리" : "패배"}`)
    .setDescription(
      nya(`${queueName} | ${formatDuration(match.info.gameDuration)}`),
    )
    .addFields(
      {
        name: "전투 지표",
        value: nya(
          `킬/데스/어시스트: ${participant.kills}/${participant.deaths}/${participant.assists}\n` +
            `골드: ${participant.goldEarned}\n` +
            `CS: ${participant.totalMinionsKilled + participant.neutralMinionsKilled}\n` +
            `챔피언 대상 피해량: ${participant.totalDamageDealtToChampions}\n` +
            `시야 점수: ${participant.visionScore}`,
        ),
      },
      { name: "라인전 매치업", value: buildMatchupText(match.info.participants) },
    )
    .setColor(0xe1aa74);

  await interaction.reply({ embeds: [embed] });
}

async function showInquiryModal(interaction, type) {
  const modal = new ModalBuilder()
    .setCustomId(`${INQUIRY_MODAL_PREFIX}${type}`)
    .setTitle(INQUIRY_TITLES[type] ?? "문의");

  const serverNameInput = new TextInputBuilder()
    .setCustomId("server_name")
    .setLabel("서버 이름")
    .setStyle(TextInputStyle.Short)
    .setPlaceholder("예: 치유미 테스트 서버")
    .setRequired(true);

  const serverInviteInput = new TextInputBuilder()
    .setCustomId("server_invite")
    .setLabel("서버 주소 (만료되지 않는 초대 링크)")
    .setStyle(TextInputStyle.Short)
    .setPlaceholder("예: https://discord.gg/xxxxxxx")
    .setRequired(true);

  const contentInput = new TextInputBuilder()
    .setCustomId("content")
    .setLabel(
      type === "report"
        ? "신고 내용을 입력하세요"
        : type === "bug"
          ? "버그 내용을 입력하세요"
          : "피드백 내용을 입력하세요",
    )
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true)
    .setMaxLength(1800);

  modal.addComponents(
    new ActionRowBuilder().addComponents(serverNameInput),
    new ActionRowBuilder().addComponents(serverInviteInput),
    new ActionRowBuilder().addComponents(contentInput),
  );

  await interaction.showModal(modal);
}

async function handleInquiryModal(interaction, type) {
  const serverName = interaction.fields.getTextInputValue("server_name").trim();
  const serverInvite = interaction.fields.getTextInputValue("server_invite").trim();
  const content = interaction.fields.getTextInputValue("content").trim();

  try {
    const channel = await interaction.client.channels.fetch(INQUIRY_CHANNEL_ID);

    const embed = new EmbedBuilder()
      .setTitle(INQUIRY_TITLES[type] ?? "문의")
      .addFields(
        { name: "작성자", value: `${interaction.user} (${interaction.user.id})` },
        { name: "서버 이름", value: serverName },
        { name: "서버 주소", value: serverInvite },
        { name: "내용", value: content },
      )
      .setColor(type === "report" ? 0xed4245 : 0xe1aa74)
      .setTimestamp();

    await channel.send({ embeds: [embed] });

    await interaction.reply({
      content: nya(
        "문의가 정상적으로 접수되었습니다. 서버 이름과 주소가 만료되지 않는 링크여야 정상 확인이 가능합니다",
      ),
      ephemeral: true,
    });
  } catch (error) {
    console.error(error);
    await interaction.reply({
      content: nya("문의를 전달하지 못했습니다. 잠시 후 다시 시도해주세요. (오류 코드: INQUIRY-001)"),
      ephemeral: true,
    });
  }
}

async function showGambleModal(interaction, game) {
  const modal = new ModalBuilder()
    .setCustomId(`${GAMBLE_MODAL_PREFIX}${game}`)
    .setTitle(GAMBLE_TITLES[game] ?? "도박");

  const rows = [];

  if (game === "oddeven") {
    const choiceInput = new TextInputBuilder()
      .setCustomId("choice")
      .setLabel("홀 또는 짝을 입력하세요")
      .setStyle(TextInputStyle.Short)
      .setPlaceholder("홀 또는 짝")
      .setRequired(true);
    rows.push(new ActionRowBuilder().addComponents(choiceInput));
  }

  if (game === "numberguess") {
    const guessInput = new TextInputBuilder()
      .setCustomId("guess")
      .setLabel("1부터 10 사이의 숫자를 입력하세요")
      .setStyle(TextInputStyle.Short)
      .setPlaceholder("예: 7")
      .setRequired(true);
    rows.push(new ActionRowBuilder().addComponents(guessInput));
  }

  if (game === "rps") {
    const choiceInput = new TextInputBuilder()
      .setCustomId("choice")
      .setLabel("가위, 바위, 보 중 하나를 입력하세요")
      .setStyle(TextInputStyle.Short)
      .setPlaceholder("가위, 바위, 보")
      .setRequired(true);
    rows.push(new ActionRowBuilder().addComponents(choiceInput));
  }

  const betInput = new TextInputBuilder()
    .setCustomId("bet")
    .setLabel("베팅할 치유미코인 금액")
    .setStyle(TextInputStyle.Short)
    .setPlaceholder("예: 100")
    .setRequired(true);
  rows.push(new ActionRowBuilder().addComponents(betInput));

  modal.addComponents(...rows);

  await interaction.showModal(modal);
}

async function handleGambleModal(interaction, game) {
  const betText = interaction.fields.getTextInputValue("bet").trim();
  const bet = Number(betText);

  if (!Number.isInteger(bet) || bet <= 0) {
    await interaction.reply({
      content: nya("올바른 베팅 금액이 아닙니다. (오류 코드: GAMBLE-001)"),
      ephemeral: true,
    });
    return;
  }

  const userId = interaction.user.id;
  const balance = getBalance(userId);

  if (bet > balance) {
    await interaction.reply({
      content: nya(
        `보유한 치유미코인(${balance}개)보다 많은 금액을 베팅할 수 없습니다. (오류 코드: GAMBLE-002)`,
      ),
      ephemeral: true,
    });
    return;
  }

  if (game === "slot") {
    await playSlotGame(interaction, userId, bet);
    return;
  }

  if (game === "oddeven") {
    await playOddEvenGame(interaction, userId, bet);
    return;
  }

  if (game === "numberguess") {
    await playNumberGuessGame(interaction, userId, bet);
    return;
  }

  if (game === "blackjack") {
    await playBlackjackGame(interaction, userId, bet);
    return;
  }

  if (game === "rps") {
    await playRpsGame(interaction, userId, bet);
    return;
  }
}

async function playSlotGame(interaction, userId, bet) {
  const { reels, resultText, multiplier } = spinSlot();
  const delta = multiplier ? bet * multiplier : -bet;

  const buildEmbed = (revealedCount, resultValue = null) => {
    const embed = new EmbedBuilder()
      .setTitle("슬롯머신")
      .setDescription(`🎰 ${buildSlotReelText(reels, revealedCount)}`)
      .setColor(0xe1aa74);

    if (resultValue) {
      embed.addFields({ name: "결과", value: resultValue });
    }

    return embed;
  };

  await interaction.reply({ embeds: [buildEmbed(0)] });

  for (let revealed = 1; revealed <= reels.length; revealed += 1) {
    await slotWait(800);
    await interaction.editReply({ embeds: [buildEmbed(revealed)] });
  }

  const newBalance = addBalance(userId, delta);
  const deltaText = delta > 0 ? `+${delta}` : `${delta}`;
  const multiplierText = multiplier ? ` (${multiplier}배)` : "";

  await slotWait(800);
  await interaction.editReply({
    embeds: [
      buildEmbed(
        reels.length,
        nya(
          `${resultText}${multiplierText}! ${deltaText} 치유미코인 (현재 보유: ${newBalance}개)`,
        ),
      ),
    ],
  });
}

async function playOddEvenGame(interaction, userId, bet) {
  const choiceRaw = interaction.fields.getTextInputValue("choice").trim();
  const choice = choiceRaw === "홀" ? "odd" : choiceRaw === "짝" ? "even" : null;

  if (!choice) {
    await interaction.reply({
      content: nya("홀 또는 짝 중 하나를 입력해주세요. (오류 코드: GAMBLE-003)"),
      ephemeral: true,
    });
    return;
  }

  const number = Math.floor(Math.random() * 100) + 1;
  const isOdd = number % 2 === 1;
  const won = (choice === "odd" && isOdd) || (choice === "even" && !isOdd);
  const delta = won ? bet : -bet;
  const newBalance = addBalance(userId, delta);
  const deltaText = delta > 0 ? `+${delta}` : `${delta}`;
  const resultLabel = isOdd ? "홀" : "짝";

  const embed = new EmbedBuilder()
    .setTitle("홀짝")
    .setDescription(nya(`숫자: ${number} (${resultLabel}) → ${won ? "승리" : "패배"}!`))
    .addFields({
      name: "결과",
      value: nya(`${deltaText} 치유미코인 (현재 보유: ${newBalance}개)`),
    })
    .setColor(0xe1aa74);

  await interaction.reply({ embeds: [embed] });
}

async function playNumberGuessGame(interaction, userId, bet) {
  const guessText = interaction.fields.getTextInputValue("guess").trim();
  const guess = Number(guessText);

  if (!Number.isInteger(guess) || guess < 1 || guess > 10) {
    await interaction.reply({
      content: nya("1부터 10 사이의 숫자를 입력해주세요. (오류 코드: GAMBLE-004)"),
      ephemeral: true,
    });
    return;
  }

  const answer = Math.floor(Math.random() * 10) + 1;
  const won = guess === answer;
  const delta = won ? bet * 9 : -bet;
  const newBalance = addBalance(userId, delta);
  const deltaText = delta > 0 ? `+${delta}` : `${delta}`;

  const embed = new EmbedBuilder()
    .setTitle("숫자맞추기")
    .setDescription(nya(`정답: ${answer} → ${won ? "정답입니다" : "틀렸습니다"}!`))
    .addFields({
      name: "결과",
      value: nya(`${deltaText} 치유미코인 (현재 보유: ${newBalance}개)`),
    })
    .setColor(0xe1aa74);

  await interaction.reply({ embeds: [embed] });
}

async function playBlackjackGame(interaction, userId, bet) {
  const { id, session } = createBjSession(userId, bet);

  if (isBlackjack(session.playerCards)) {
    const dealerBlackjack = isBlackjack(session.dealerCards);
    const delta = dealerBlackjack ? 0 : Math.floor(bet * 1.5);
    const newBalance = addBalance(userId, delta);
    const resultText = dealerBlackjack
      ? `둘 다 블랙잭! 비겼습니다. 현재 보유: ${newBalance}개`
      : `블랙잭! ${delta} 치유미코인을 획득했습니다. 현재 보유: ${newBalance}개`;

    await interaction.reply({
      embeds: [buildBjEmbed(session, { revealDealer: true, result: nya(resultText) })],
    });
    return;
  }

  const hitButton = new ButtonBuilder()
    .setCustomId(`bj-action:${id}:hit`)
    .setLabel("히트")
    .setStyle(ButtonStyle.Primary);

  const standButton = new ButtonBuilder()
    .setCustomId(`bj-action:${id}:stand`)
    .setLabel("스탠드")
    .setStyle(ButtonStyle.Primary);

  const row = new ActionRowBuilder().addComponents(hitButton, standButton);

  await interaction.reply({
    embeds: [buildBjEmbed(session)],
    components: [row],
  });
}

async function playRpsGame(interaction, userId, bet) {
  const choiceRaw = interaction.fields.getTextInputValue("choice").trim();

  if (!RPS_CHOICES.includes(choiceRaw)) {
    await interaction.reply({
      content: nya("가위, 바위, 보 중 하나를 입력해주세요. (오류 코드: GAMBLE-005)"),
      ephemeral: true,
    });
    return;
  }

  const botChoice = RPS_CHOICES[Math.floor(Math.random() * RPS_CHOICES.length)];

  let resultText;
  let delta;

  if (choiceRaw === botChoice) {
    resultText = "비겼습니다";
    delta = 0;
  } else if (RPS_BEATS[choiceRaw] === botChoice) {
    resultText = "이겼습니다";
    delta = bet;
  } else {
    resultText = "졌습니다";
    delta = -bet;
  }

  const newBalance = addBalance(userId, delta);
  const deltaText = delta > 0 ? `+${delta}` : delta < 0 ? `${delta}` : "±0";

  const embed = new EmbedBuilder()
    .setTitle("가위바위보")
    .setDescription(nya(`나: ${choiceRaw} / 치유미: ${botChoice} → ${resultText}!`))
    .addFields({
      name: "결과",
      value: nya(`${deltaText} 치유미코인 (현재 보유: ${newBalance}개)`),
    })
    .setColor(0xe1aa74);

  await interaction.reply({ embeds: [embed] });
}

async function handleBlackjackAction(interaction) {
  const [sessionId, action] = interaction.customId
    .slice(BJ_ACTION_PREFIX.length)
    .split(":");
  const session = getBjSession(sessionId);

  if (!session) {
    await interaction.reply({
      content: nya("이미 종료된 게임입니다. (오류 코드: BJ-002)"),
      ephemeral: true,
    });
    return;
  }

  if (interaction.user.id !== session.userId) {
    await interaction.reply({
      content: nya("자신이 시작한 게임만 진행할 수 있습니다. (오류 코드: BJ-003)"),
      ephemeral: true,
    });
    return;
  }

  if (action === "hit") {
    session.playerCards.push(drawCard());

    if (handTotal(session.playerCards) > 21) {
      deleteBjSession(sessionId);
      const newBalance = addBalance(session.userId, -session.bet);
      await interaction.update({
        embeds: [
          buildBjEmbed(session, {
            revealDealer: true,
            result: nya(
              `버스트! ${session.bet} 치유미코인을 잃었습니다. 현재 보유: ${newBalance}개`,
            ),
          }),
        ],
        components: [],
      });
      return;
    }

    await interaction.update({
      embeds: [buildBjEmbed(session)],
    });
    return;
  }

  while (handTotal(session.dealerCards) < 17) {
    session.dealerCards.push(drawCard());
  }

  const playerTotal = handTotal(session.playerCards);
  const dealerTotal = handTotal(session.dealerCards);

  let delta;
  let resultText;

  if (dealerTotal > 21 || playerTotal > dealerTotal) {
    delta = session.bet;
    resultText = `승리! ${delta} 치유미코인을 획득했습니다.`;
  } else if (playerTotal === dealerTotal) {
    delta = 0;
    resultText = "비겼습니다.";
  } else {
    delta = -session.bet;
    resultText = `패배! ${session.bet} 치유미코인을 잃었습니다.`;
  }

  deleteBjSession(sessionId);
  const newBalance = addBalance(session.userId, delta);

  await interaction.update({
    embeds: [
      buildBjEmbed(session, {
        revealDealer: true,
        result: nya(`${resultText} 현재 보유: ${newBalance}개`),
      }),
    ],
    components: [],
  });
}

async function replyWithRoleSelect(interaction, customId) {
  const roleSelect = new RoleSelectMenuBuilder()
    .setCustomId(customId)
    .setPlaceholder("인증 완료 시 지급할 역할을 선택하세요.")
    .setMinValues(1)
    .setMaxValues(1);

  const row = new ActionRowBuilder().addComponents(roleSelect);

  await interaction.reply({
    content: nya("인증 버튼 설정을 시작합니다. 먼저 지급할 역할을 선택하세요."),
    components: [row],
    ephemeral: true,
  });
}

async function showMessageIdModal(interaction, action) {
  const modal = new ModalBuilder()
    .setCustomId(`${VERIFY_ACTION_MODAL_PREFIX}${action}`)
    .setTitle(action === "edit" ? "수정할 메시지 ID 입력" : "삭제할 메시지 ID 입력");

  const messageIdInput = new TextInputBuilder()
    .setCustomId("message_id")
    .setLabel("인증 메시지의 메시지 ID")
    .setStyle(TextInputStyle.Short)
    .setPlaceholder("메시지 ID 또는 메시지 ID가 포함된 텍스트를 입력하세요.")
    .setRequired(true);

  const row = new ActionRowBuilder().addComponents(messageIdInput);
  modal.addComponents(row);

  await interaction.showModal(modal);
}

async function deleteVerifyMessage(interaction, messageId) {
  try {
    const message = await interaction.channel.messages.fetch(messageId);

    if (message.author.id !== interaction.client.user.id) {
      await interaction.reply({
        content: nya(
          "이 봇이 만든 메시지만 삭제할 수 있습니다. (오류 코드: VERIFY-004)",
        ),
        ephemeral: true,
      });
      return;
    }

    await message.delete();
    await interaction.reply({
      content: nya("인증 메시지를 삭제했습니다."),
      ephemeral: true,
    });
  } catch (error) {
    console.error(error);
    await interaction.reply({
      content: nya(
        "메시지를 삭제하지 못했습니다. 메시지 ID와 채널이 맞는지 확인해주세요. (오류 코드: VERIFY-001)",
      ),
      ephemeral: true,
    });
  }
}

async function handleAnnounceModal(interaction) {
  const [channelId, mention] = interaction.customId
    .slice(ANNOUNCE_MODAL_PREFIX.length)
    .split(":");

  const title = interaction.fields.getTextInputValue("title");
  const content = interaction.fields.getTextInputValue("content");

  const channel = interaction.guild.channels.cache.get(channelId);

  if (!channel) {
    await interaction.reply({
      content: nya("채널을 찾을 수 없습니다. (오류 코드: ANNOUNCE-001)"),
      ephemeral: true,
    });
    return;
  }

  const embed = new EmbedBuilder()
    .setTitle(title)
    .setDescription(content)
    .setColor(0xe1aa74)
    .setTimestamp();

  const mentionContent =
    mention === "everyone" ? "@everyone" : mention === "here" ? "@here" : undefined;

  await channel.send({
    content: mentionContent,
    embeds: [embed],
    allowedMentions: mentionContent ? { parse: ["everyone"] } : { parse: [] },
  });

  await interaction.reply({
    content: nya(`${channel}에 공지를 보냈습니다.`),
    ephemeral: true,
  });

  const logEmbed = new EmbedBuilder()
    .setTitle("공지 전송")
    .addFields(
      { name: "채널", value: `${channel}` },
      { name: "작성자", value: `${interaction.user}` },
      { name: "제목", value: title },
    )
    .setColor(0xe1aa74)
    .setTimestamp();

  await sendLog(interaction.guild, logEmbed);
}

async function showMessageModal(interaction, setup) {
  const modal = new ModalBuilder()
    .setCustomId(buildSetupCustomId(VERIFY_MODAL_PREFIX, setup))
    .setTitle("인증 메시지 설정");

  const messageInput = new TextInputBuilder()
    .setCustomId("message")
    .setLabel("인증 버튼 위에 표시할 메시지")
    .setStyle(TextInputStyle.Paragraph)
    .setPlaceholder(DEFAULT_VERIFY_MESSAGE)
    .setRequired(true)
    .setMaxLength(1800);

  const row = new ActionRowBuilder().addComponents(messageInput);
  modal.addComponents(row);

  await interaction.showModal(modal);
}

async function handleModalSubmit(interaction) {
  if (interaction.customId.startsWith(INQUIRY_MODAL_PREFIX)) {
    const type = interaction.customId.slice(INQUIRY_MODAL_PREFIX.length);
    await handleInquiryModal(interaction, type);
    return;
  }

  if (interaction.customId.startsWith(GAMBLE_MODAL_PREFIX)) {
    const game = interaction.customId.slice(GAMBLE_MODAL_PREFIX.length);
    await handleGambleModal(interaction, game);
    return;
  }

  if (interaction.customId === STATS_MODAL_PREFIX) {
    await handleLolStatsModal(interaction);
    return;
  }

  if (interaction.customId.startsWith(COIN_DEV_MODAL_PREFIX)) {
    const direction = interaction.customId.slice(COIN_DEV_MODAL_PREFIX.length);
    await handleDevGrantModal(interaction, direction);
    return;
  }

  if (interaction.customId.startsWith(ANNOUNCE_MODAL_PREFIX)) {
    await handleAnnounceModal(interaction);
    return;
  }

  if (interaction.customId.startsWith(VERIFY_ACTION_MODAL_PREFIX)) {
    const action = interaction.customId.slice(VERIFY_ACTION_MODAL_PREFIX.length);
    const messageId = extractMessageId(
      interaction.fields.getTextInputValue("message_id"),
    );

    if (action === "delete") {
      await deleteVerifyMessage(interaction, messageId);
      return;
    }

    await replyWithRoleSelect(interaction, `verify-setup:role:edit:${messageId}`);
    return;
  }

  if (!interaction.customId.startsWith(VERIFY_MODAL_PREFIX)) return;

  const setup = parseSetupCustomId(interaction.customId, VERIFY_MODAL_PREFIX);
  const message = interaction.fields.getTextInputValue("message");

  await saveVerifyMessage(interaction, setup, message);
}

async function saveVerifyMessage(interaction, setup, message) {
  const role = interaction.guild.roles.cache.get(setup.roleId);

  if (!role) {
    await interaction.reply({
      content: nya(
        "인증 역할을 찾을 수 없습니다. 다시 설정해주세요. (오류 코드: ROLE-005)",
      ),
      ephemeral: true,
    });
    return;
  }

  if (!role.editable) {
    await interaction.reply({
      content: nya(
        "이 역할은 봇이 지급할 수 없습니다. 봇 역할을 해당 역할보다 위로 올려주세요. (오류 코드: ROLE-006)",
      ),
      ephemeral: true,
    });
    return;
  }

  const verifyButton = new ButtonBuilder()
    .setCustomId(`${VERIFY_BUTTON_PREFIX}${role.id}`)
    .setLabel("인증 받기")
    .setStyle(ButtonStyle.Success);

  const row = new ActionRowBuilder().addComponents(verifyButton);

  if (setup.action === "edit") {
    await editVerifyMessage(interaction, setup.messageId, message, row, role);
    return;
  }

  const createdMessage = await interaction.channel.send({
    content: message,
    components: [row],
  });

  await interaction.reply({
    content: nya(
      `${role} 역할을 지급하는 인증 버튼을 생성했습니다. 메시지 ID: ${createdMessage.id}`,
    ),
    ephemeral: true,
  });
}

async function editVerifyMessage(interaction, messageId, message, row, role) {
  try {
    const targetMessage = await interaction.channel.messages.fetch(messageId);

    if (targetMessage.author.id !== interaction.client.user.id) {
      await interaction.reply({
        content: nya(
          "이 봇이 만든 메시지만 수정할 수 있습니다. (오류 코드: VERIFY-002)",
        ),
        ephemeral: true,
      });
      return;
    }

    await targetMessage.edit({
      content: message,
      components: [row],
    });

    await interaction.reply({
      content: nya(`${role} 역할을 지급하는 인증 메시지를 수정했습니다.`),
      ephemeral: true,
    });
  } catch (error) {
    console.error(error);
    await interaction.reply({
      content: nya(
        "메시지를 수정하지 못했습니다. 메시지 ID와 채널이 맞는지 확인해주세요. (오류 코드: VERIFY-003)",
      ),
      ephemeral: true,
    });
  }
}

function parseSetupCustomId(customId, prefix) {
  const parts = customId.slice(prefix.length).split(":");
  const action = parts[0];

  if (action === "edit") {
    return {
      action,
      messageId: parts[1],
      roleId: parts[2],
    };
  }

  return {
    action: "create",
    roleId: parts[1],
  };
}

function buildSetupCustomId(prefix, setup, roleId = setup.roleId) {
  if (setup.action === "edit") {
    return `${prefix}edit:${setup.messageId}:${roleId}`;
  }

  return `${prefix}create:${roleId}`;
}
