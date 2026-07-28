const {
  ActionRowBuilder,
  AttachmentBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelSelectMenuBuilder,
  ChannelType,
  EmbedBuilder,
  Events,
  MessageType,
  ModalBuilder,
  PermissionFlagsBits,
  RoleSelectMenuBuilder,
  StringSelectMenuBuilder,
  TextInputBuilder,
  TextInputStyle,
  UserSelectMenuBuilder,
} = require("discord.js");
const path = require("node:path");
const { nya } = require("../utils/nya");
const { getBalance, getAllBalances, addBalance, setBalance, STARTING_BALANCE } = require("../utils/credits");
const {
  sendLog,
  setLogChannel,
  getLogChannelId,
  setLogTypeChannel,
  getLogTypeChannels,
  getLogOptions,
  setLogOption,
  setWelcomeChannel,
  getWelcomeChannelId,
  setJoinChannel,
  getJoinChannelId,
  setLeaveChannel,
  getLeaveChannelId,
  getWelcomeOptions,
  setWelcomeOption,
  setWelcomeMessage,
  getWelcomeMessage,
  setSpamLevel,
  getSpamLevel,
  getRaidConfig,
  setRaidConfig,
  isRaidLocked,
  setRaidLocked,
  setAnnounceChannel,
  getAnnounceChannelId,
  setLevelUpChannel,
  getLevelUpMessage,
  setLevelUpMessage,
  setTicketChannel,
  getTicketChannelId,
  getTicketMessage,
  setTicketMessage,
  setWordChainChannel,
  getWordChainChannelId,
  setSupportMessage,
  getWarnConfig,
  setWarnThreshold,
  removeWarnThreshold,
  setWarnMaxCount,
} = require("../utils/guildConfig");
const { getUserWarnings, addWarning, removeWarning, resetWarnings } = require("../utils/warnData");
const { buildWarnEmbed, buildWarnRows, formatDuration: warnFormatDuration } = require("../commands/warn");
const { buildSupportEmbed } = require("../utils/supportInfo");
const { buildLogEmbed, buildLogMainRows, buildLogTypeEmbed, buildLogTypeRows, OPTION_DEFS: LOG_OPTION_DEFS } = require("../commands/log");
const {
  buildMenuEmbed: buildCensorMenuEmbed,
  buildMenuRow: buildCensorMenuRow,
  buildFilterEmbed: buildCensorFilterEmbed,
  buildFilterRow: buildCensorFilterRow,
  buildSpamEmbed,
  buildSpamRows,
  buildRaidEmbed,
  buildRaidRows,
} = require("../commands/censor");
const { buildWelcomeEmbed, buildWelcomeRows } = require("../commands/welcome");
const { formatWelcomeMessage } = require("../utils/welcomeFormat");
const { getCommandsByCategory, buildCategoryEmbed } = require("../commands/help");
const { buildLevelUpEmbed, buildLevelUpRow } = require("../commands/rank");
const { buildTicketEmbed, buildTicketRow } = require("../commands/ticket");
const { buildPetEmbed, buildPetRow, petMessageTimeouts, PET_IDLE_TIMEOUT_MS } = require("../commands/pet");
const { getAgeDays, getStage, getMoodText, performAction, setPetName, ACTIONS } = require("../utils/pets");
const { isDeveloper } = require("../utils/devUser");
const { isRestricted, getRestriction, restrictUser, unrestrictUser } = require("../utils/restrictions");
const { buildDeveloperEmbed, buildDeveloperRow } = require("../commands/developer");
const { hasAgreed, agree } = require("../utils/consent");
const { getAllXp, levelFromXp } = require("../utils/levels");
const { getAllVoiceTimes } = require("../utils/voiceTime");
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
const { buildWordChainEmbed, buildWordChainRow } = require("../commands/wordchain");
const {
  getGuildAlerts,
  addAlert,
  removeAlert,
  extractChannelId,
  isDuplicate,
  buildNotificationContent,
  buildUploadNotificationContent,
  resolveYouTubeChannelId,
  updateAlert,
  pendingSetups,
  pendingEdits,
} = require("../utils/streamAlert");
const { buildStreamAlertPage, buildPlatformButtons, PLATFORM_LABELS } = require("../commands/streamAlert");
const { buildMarketEmbed, buildPortfolioEmbed, buildStockRow } = require("../commands/stock");
const { buildGambleEmbed, buildGambleRow } = require("../commands/gamble");
const { buildBankEmbed, buildBankRow } = require("../commands/bank");
const { getStockDef, getCurrentPrices, getPortfolio, getPortfolioValue, clearPortfolio, buyStock, sellStock } = require("../utils/stocks");
const { getAccount, getTotalOwed, deposit, withdraw, takeLoan, repayLoan, declareBankruptcy, getRebirthCooldownMs, MAX_LOAN, MIN_LOAN } = require("../utils/bank");
const {
  MIN_PARTY_SIZE: WORDCHAIN_MIN_SIZE,
  MAX_PARTY_SIZE: WORDCHAIN_MAX_SIZE,
  createParty: createWordChainParty,
  getParty: getWordChainParty,
  setPartyMessageId: setWordChainPartyMessageId,
  joinParty: joinWordChainParty,
  removeParty: removeWordChainParty,
  startGame: startWordChainGame,
} = require("../utils/wordchainGame");

const COIN_ACTION_PREFIX = "coin-action:";
const BJ_ACTION_PREFIX = "bj-action:";
const STATS_ACTION_PREFIX = "stats-action:";
const STATS_MODAL_PREFIX = "stats-modal:";
const STATS_DETAIL_PREFIX = "stats-detail:";
const STATS_FILTER_PREFIX = "stats-filter:";
const GAMBLE_ACTION_PREFIX = "gamble-action:";
const GAMBLE_MULT_PREFIX = "gamble-mult:";
const GAMBLE_MODAL_PREFIX = "gamble-modal:";
const GAMBLE_MIN_BET = 10;
const GAMBLE_MAX_BET = 1_000;
// 배율 옵션: mult=배율, luckPenalty=미사용(하위호환)
const GAMBLE_MULT_OPTIONS = [
  { mult: 1, minBet: 10, luckPenalty: 0 },
  { mult: 2, minBet: 10, luckPenalty: 0 },
  { mult: 3, minBet: 10, luckPenalty: 0 },
  { mult: 5, minBet: 10, luckPenalty: 0 },
];
const GAMBLE_TITLES = {
  slot: "슬롯머신",
  oddeven: "홀짝",
  numberguess: "숫자맞추기",
  blackjack: "블랙잭",
  rps: "가위바위보",
};
const RPS_CHOICES = ["가위", "바위", "보"];
const RPS_BEATS = { 가위: "보", 바위: "가위", 보: "바위" };
const RPS_LOSES_TO = { 가위: "바위", 바위: "보", 보: "가위" };
// 배율별 범위: 1~range 굴려서 1이 나와야 당첨 (range 클수록 당첨 확률 낮음)
const ODDEVEN_WIN_RANGES   = { 1: 2,  2: 3,  3: 6,  5: 10 }; // 50% / 33% / 17% / 10%
const RPS_WIN_RANGES       = { 1: 3,  2: 4,  3: 7,  5: 12 }; // 33% / 25% / 14% / 8%
const NUMBERGUESS_RANGES   = { 1: 10, 2: 16, 3: 25, 5: 40 }; // 10% / 6% / 4% / 2.5%
// 블랙잭 딜러 스탠드 기준: 배율 높을수록 딜러가 더 높은 값에서 스탠드 → 플레이어 불리
const DEALER_STANDS_AT     = { 1: 15, 2: 16, 3: 17, 5: 18 };
const INQUIRY_ACTION_PREFIX = "inquiry-action:";
const INQUIRY_MODAL_PREFIX = "inquiry-modal:";
const INQUIRY_CHANNEL_ID = "1518461357735936000";
const INQUIRY_TITLES = { report: "유저 신고", feedback: "피드백", bug: "버그 신고" };
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
const LOG_TEST_PREFIX = "log-test:";
const LOG_CHANNEL_SELECT_ID = "log-channel-select";
const LOG_PERCHANNEL_SELECT_PREFIX = "log-perchannel-select:";
const LOG_TYPE_SELECT_ID = "log-type-select";
const LOG_TYPE_CHANNEL_BTN_PREFIX = "log-type-channel-btn:";
const LOG_TYPE_CHANNEL_SELECT_PREFIX = "log-type-channel-select:";
const LOG_BULK_CHANNEL_SELECT_ID = "log-bulk-channel-select";
const WELCOME_ACTION_PREFIX = "welcome-action:";
const WELCOME_TOGGLE_PREFIX = "welcome-toggle:";
const WELCOME_CHANNEL_SELECT_ID = "welcome-channel-select";
const WELCOME_JOIN_CHANNEL_SELECT_ID = "welcome-join-channel-select";
const WELCOME_LEAVE_CHANNEL_SELECT_ID = "welcome-leave-channel-select";
const WELCOME_MODAL_PREFIX = "welcome-modal:";
const COIN_DEV_ACTION_PREFIX = "coin-dev-action:";
const COIN_DEV_MODAL_PREFIX = "coin-dev-modal:";
const DEFAULT_VERIFY_MESSAGE = nya("아래 버튼을 눌러 서버 인증을 완료하세요.");
const STREAMALERT_MODAL_ID = "streamalert:modal";
const STREAMALERT_EDIT_MODAL_ID = "streamalert:edit:modal";
const STREAMALERT_NOTIFCHANNEL_SELECT = "streamalert:notifchannel";
const STREAMALERT_EDIT_NOTIFCHANNEL_SELECT = "streamalert:editnotifchannel";
const STREAMALERT_NAV_PREFIX = "streamalert:nav:";
const STREAMALERT_DELETE_PREFIX = "streamalert:delete:";
const STREAMALERT_TEST_PREFIX = "streamalert:test:";
const STREAMALERT_EDIT_PREFIX = "streamalert:edit:";
const STREAMALERT_PLATFORM_BTN_PREFIX = "streamalert:platform:";
const STREAMALERT_ACTION_PREFIX = "streamalert:action:";
const STREAMALERT_LINK_PLACEHOLDERS = {
  youtube: "https://www.youtube.com/@채널핸들",
  youtube_upload: "https://www.youtube.com/@채널핸들",
  chzzk: "https://chzzk.naver.com/채널ID",
  soop: "https://www.sooplive.co.kr/아이디",
};
const STREAMALERT_PLATFORM_NAMES = {
  youtube: "유튜브 라이브",
  youtube_upload: "유튜브 업로드",
  chzzk: "치지직",
  soop: "SOOP",
};

const WARN_BTN_PREFIX = "warn-btn:";
const WARN_CFG_PREFIX = "warn-cfg:";
const WARN_MODAL_PREFIX = "warn-modal:";
const WARN_WIZARD_PREFIX = "warn-wizard:";
const WARN_WIZARD_ROLE_SELECT_ID = "warn-wizard:role-select";

const WARN_ACTION_LABEL = { none: "없음", mute: "뮤트", kick: "킥", ban: "영구 밴" };

const warnWizardState = new Map(); // `${userId}:${guildId}` → wizard state

const CONSENT_AGREE_ID = "consent-action:agree";
const TERMS_URL = "https://fehedeveloperteam.github.io/Chiyumi/terms.html";
const PRIVACY_URL = "https://fehedeveloperteam.github.io/Chiyumi/privacy.html";

function hasManageGuild(interaction) {
  return Boolean(interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild));
}

function extractMessageId(input) {
  const matches = input.match(/\d{15,20}/g);
  return matches ? matches[matches.length - 1] : input;
}

function formatVoiceDuration(ms) {
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 0) return `${hours}시간 ${minutes}분`;
  return `${minutes}분`;
}

const RANK_ACTION_PREFIX = "rank-action:";
const RANK_PAGE_PREFIX = "rank-page:";
const RANK_PAGE_SIZE = 5;
const RANK_LEVELUP_ACTION_PREFIX = "rank-levelup-action:";
const RANK_LEVELUP_CHANNEL_SELECT_ID = "rank-levelup-channel-select";
const RANK_LEVELUP_MODAL_ID = "rank-levelup-modal";
const TICKET_ACTION_PREFIX = "ticket-action:";
const TICKET_CHANNEL_SELECT_ID = "ticket-channel-select";
const DEV_SUPPORT_CHANNEL_SELECT_ID = "dev-support-channel-select";
const TICKET_MODAL_ID = "ticket-modal";
const TICKET_CREATE_ID = "ticket-create";
const TICKET_MANAGE_PREFIX = "ticket-manage:";
const WORDCHAIN_ACTION_PREFIX = "wordchain-action:";
const WORDCHAIN_CHANNEL_SELECT_ID = "wordchain-channel-select";
const WORDCHAIN_CREATE_ID = "wordchain-create";
const WORDCHAIN_SIZE_MODAL_ID = "wordchain-size-modal";
const WORDCHAIN_JOIN_PREFIX = "wordchain-join:";
const WORDCHAIN_START_PREFIX = "wordchain-start:";
const WORDCHAIN_DISBAND_PREFIX = "wordchain-disband:";
const TICKET_ADDUSER_SELECT_ID = "ticket-adduser-select";
const PET_ACTION_PREFIX = "pet-action:";
const PET_NAME_MODAL_PREFIX = "pet-name-modal:";
const DEV_ACTION_PREFIX = "dev-action:";
const DEV_MODAL_PREFIX = "dev-modal:";
const DEV_GRANT_MAX_AMOUNT = 1_000_000;
const STOCK_ACTION_PREFIX = "stock-action:";
const STOCK_BUY_MODAL_ID = "stock-modal:buy";
const STOCK_SELL_MODAL_ID = "stock-modal:sell";
const BANK_ACTION_PREFIX = "bank-action:";
const BANK_DEPOSIT_MODAL_ID = "bank-modal:deposit";
const BANK_WITHDRAW_MODAL_ID = "bank-modal:withdraw";
const BANK_LOAN_MODAL_ID = "bank-modal:loan";

function buildRankPage(guild, type, page) {
  const memberIds = [...guild.members.cache.values()]
    .filter((member) => !member.user.bot && hasAgreed(member.id))
    .map((member) => member.id);

  const data = type === "chat" ? getAllXp(guild.id) : getAllVoiceTimes(guild.id);
  const entries = memberIds
    .map((id) => ({ id, value: data[id] ?? 0 }))
    .sort((a, b) => b.value - a.value);

  const totalPages = Math.max(1, Math.ceil(entries.length / RANK_PAGE_SIZE));
  const currentPage = Math.min(Math.max(page, 0), totalPages - 1);
  const pageEntries = entries.slice(
    currentPage * RANK_PAGE_SIZE,
    currentPage * RANK_PAGE_SIZE + RANK_PAGE_SIZE,
  );

  const lines = pageEntries.map((entry, index) => {
    const rank = currentPage * RANK_PAGE_SIZE + index + 1;

    if (type === "chat") {
      const { level } = levelFromXp(entry.value);
      return `${rank}. <@${entry.id}> - 레벨 ${level} (${entry.value} XP)`;
    }

    return `${rank}. <@${entry.id}> - ${formatVoiceDuration(entry.value)}`;
  });

  const embed = new EmbedBuilder()
    .setTitle(`${guild.name} ${type === "chat" ? "채팅 순위" : "음성 통화 순위"}`)
    .setDescription(lines.join("\n") || nya("아직 데이터가 없습니다"))
    .setFooter({ text: `${currentPage + 1} / ${totalPages} 페이지` })
    .setColor(0xe1aa74);

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`${RANK_PAGE_PREFIX}${type}:${currentPage - 1}`)
      .setLabel("◀")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(currentPage === 0),
    new ButtonBuilder()
      .setCustomId(`${RANK_PAGE_PREFIX}${type}:${currentPage + 1}`)
      .setLabel("▶")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(currentPage >= totalPages - 1),
  );

  return { embed, row };
}

async function handleRankLeaderboard(interaction) {
  if (!interaction.inGuild()) {
    await interaction.reply({
      content: nya("서버에서만 사용할 수 있는 버튼입니다.") + "\n(오류 코드: GUILD-001)",
      ephemeral: true,
    });
    return;
  }

  const type = interaction.customId.slice(RANK_ACTION_PREFIX.length);
  await interaction.deferReply({ ephemeral: true });

  await interaction.guild.members.fetch().catch(() => {});
  const { embed, row } = buildRankPage(interaction.guild, type, 0);
  await interaction.editReply({ embeds: [embed], components: [row] });
}

async function handleLevelUpSettingsButton(interaction) {
  if (!interaction.inGuild()) {
    await interaction.reply({
      content: nya("서버에서만 사용할 수 있는 버튼입니다.") + "\n(오류 코드: GUILD-001)",
      ephemeral: true,
    });
    return;
  }

  if (!hasManageGuild(interaction)) {
    await interaction.reply({
      content: nya("이 설정은 서버 관리 권한이 있는 관리자만 사용할 수 있습니다.") + "\n(오류 코드: AUTH-001)",
      ephemeral: true,
    });
    return;
  }

  await interaction.reply({
    embeds: [buildLevelUpEmbed(interaction.guild.id)],
    components: [buildLevelUpRow()],
    ephemeral: true,
  });
}

async function handleLevelUpActionButton(interaction) {
  if (!hasManageGuild(interaction)) {
    await interaction.reply({
      content: nya("이 설정은 서버 관리 권한이 있는 관리자만 사용할 수 있습니다.") + "\n(오류 코드: AUTH-001)",
      ephemeral: true,
    });
    return;
  }

  const action = interaction.customId.slice(RANK_LEVELUP_ACTION_PREFIX.length);

  if (action === "channel") {
    const channelSelect = new ChannelSelectMenuBuilder()
      .setCustomId(RANK_LEVELUP_CHANNEL_SELECT_ID)
      .setPlaceholder("레벨업 알림을 받을 채널을 선택하세요")
      .addChannelTypes(ChannelType.GuildText)
      .setMinValues(1)
      .setMaxValues(1);

    const row = new ActionRowBuilder().addComponents(channelSelect);

    await interaction.update({
      content: nya("레벨업 알림을 받을 채널을 선택하세요."),
      embeds: [],
      components: [row],
    });
    return;
  }

  if (action === "message") {
    const modal = new ModalBuilder()
      .setCustomId(RANK_LEVELUP_MODAL_ID)
      .setTitle("레벨업 알림 문구 설정");

    const messageInput = new TextInputBuilder()
      .setCustomId("message")
      .setLabel("{유저}, {레벨} 치환 가능")
      .setStyle(TextInputStyle.Paragraph)
      .setValue(getLevelUpMessage(interaction.guild.id))
      .setRequired(true)
      .setMaxLength(1000);

    modal.addComponents(new ActionRowBuilder().addComponents(messageInput));

    await interaction.showModal(modal);
  }
}

async function handleTicketActionButton(interaction) {
  if (!hasManageGuild(interaction)) {
    await interaction.reply({
      content: nya("이 설정은 서버 관리 권한이 있는 관리자만 사용할 수 있습니다.") + "\n(오류 코드: AUTH-001)",
      ephemeral: true,
    });
    return;
  }

  const action = interaction.customId.slice(TICKET_ACTION_PREFIX.length);

  if (action === "channel") {
    const channelSelect = new ChannelSelectMenuBuilder()
      .setCustomId(TICKET_CHANNEL_SELECT_ID)
      .setPlaceholder("티켓 생성 버튼을 올릴 채널을 선택하세요")
      .addChannelTypes(ChannelType.GuildText)
      .setMinValues(1)
      .setMaxValues(1);

    const row = new ActionRowBuilder().addComponents(channelSelect);

    await interaction.update({
      content: nya("티켓 생성 버튼을 올릴 채널을 선택하세요."),
      embeds: [],
      components: [row],
    });
    return;
  }

  if (action === "message") {
    const modal = new ModalBuilder().setCustomId(TICKET_MODAL_ID).setTitle("티켓 안내 문구 설정");

    const messageInput = new TextInputBuilder()
      .setCustomId("message")
      .setLabel("티켓 채널에 표시할 안내 문구")
      .setStyle(TextInputStyle.Paragraph)
      .setValue(getTicketMessage(interaction.guild.id))
      .setRequired(true)
      .setMaxLength(1000);

    modal.addComponents(new ActionRowBuilder().addComponents(messageInput));

    await interaction.showModal(modal);
    return;
  }

  if (action === "post") {
    const channelId = getTicketChannelId(interaction.guild.id);
    const channel = channelId ? interaction.guild.channels.cache.get(channelId) : null;

    if (!channel) {
      await interaction.reply({
        content: nya("먼저 티켓 채널을 설정해주세요.") + "\n(오류 코드: TICKET-001)",
        ephemeral: true,
      });
      return;
    }

    const createButton = new ButtonBuilder()
      .setCustomId(TICKET_CREATE_ID)
      .setLabel("티켓 생성")
      .setStyle(ButtonStyle.Success);

    const row = new ActionRowBuilder().addComponents(createButton);

    const postEmbed = new EmbedBuilder()
      .setDescription(getTicketMessage(interaction.guild.id))
      .setColor(0xe1aa74);

    await channel.send({
      embeds: [postEmbed],
      components: [row],
    });

    await interaction.reply({
      content: nya(`${channel}에 티켓 생성 버튼을 올렸습니다.`),
      ephemeral: true,
    });
  }
}

async function handleTicketCreate(interaction) {
  if (!interaction.inGuild()) {
    await interaction.reply({
      content: nya("서버에서만 사용할 수 있는 버튼입니다.") + "\n(오류 코드: GUILD-001)",
      ephemeral: true,
    });
    return;
  }

  await interaction.deferReply({ ephemeral: true });

  try {
    const thread = await interaction.channel.threads.create({
      name: `티켓-${interaction.user.username}`,
      type: ChannelType.PrivateThread,
      reason: `${interaction.user.tag}님의 티켓`,
    });

    await thread.members.add(interaction.user.id);

    const admins = interaction.guild.members.cache.filter(
      (member) => !member.user.bot && member.permissions.has(PermissionFlagsBits.ManageGuild),
    );

    for (const admin of admins.values()) {
      await thread.members.add(admin.id).catch(() => {});
    }

    const embed = new EmbedBuilder()
      .setTitle("티켓")
      .setDescription(
        nya(`${interaction.user}님이 티켓을 생성했습니다. 관리자가 곧 도와드릴 거다`),
      )
      .addFields({
        name: "티켓 닫기",
        value: nya("누르면 운영자만 이 스레드를 볼 수 있거나 사용할 수 있게 됩니다"),
      })
      .setColor(0xe1aa74);

    const manageRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`${TICKET_MANAGE_PREFIX}adduser`)
        .setLabel("사용자 추가")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`${TICKET_MANAGE_PREFIX}close`)
        .setLabel("티켓 닫기")
        .setStyle(ButtonStyle.Secondary),
    );

    await thread.send({ embeds: [embed], components: [manageRow] });

    await interaction.editReply(nya(`티켓이 생성되었습니다: ${thread}`));
  } catch (error) {
    console.error(error);
    await interaction.editReply(
      nya("티켓을 생성하지 못했습니다. 봇의 권한을 확인해주세요.") + "\n(오류 코드: TICKET-002)",
    );
  }
}

async function removeNonAdmins(thread, guild, botUserId) {
  const members = await thread.members.fetch();

  for (const member of members.values()) {
    if (member.id === botUserId) continue;

    const guildMember =
      guild.members.cache.get(member.id) ?? (await guild.members.fetch(member.id).catch(() => null));

    const isHumanAdmin =
      guildMember && !guildMember.user.bot && guildMember.permissions.has(PermissionFlagsBits.ManageGuild);

    if (!isHumanAdmin) {
      await thread.members.remove(member.id).catch(() => {});
    }
  }
}

async function handleTicketManage(interaction) {
  const action = interaction.customId.slice(TICKET_MANAGE_PREFIX.length);
  const thread = interaction.channel;

  if (action !== "close" && !hasManageGuild(interaction)) {
    await interaction.reply({
      content: nya("이 기능은 관리자만 사용할 수 있습니다.") + "\n(오류 코드: AUTH-001)",
      ephemeral: true,
    });
    return;
  }

  if (action === "adduser") {
    const userSelect = new UserSelectMenuBuilder()
      .setCustomId(TICKET_ADDUSER_SELECT_ID)
      .setPlaceholder("스레드에 추가할 사용자를 선택하세요")
      .setMinValues(1)
      .setMaxValues(1);

    const row = new ActionRowBuilder().addComponents(userSelect);

    await interaction.reply({
      content: nya("추가할 사용자를 선택하세요."),
      components: [row],
      ephemeral: true,
    });
    return;
  }

  if (action === "close") {
    await interaction.deferReply({ ephemeral: true });

    await removeNonAdmins(thread, interaction.guild, interaction.client.user.id);

    const closedEmbed = new EmbedBuilder()
      .setTitle("티켓 닫힘")
      .setDescription(nya("티켓을 닫았습니다. 관리자를 제외한 모두 열람 권한에서 제외됐다"))
      .setColor(0xed4245);

    const closedRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`${TICKET_MANAGE_PREFIX}export`)
        .setLabel("대화 저장")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`${TICKET_MANAGE_PREFIX}delete`)
        .setLabel("삭제")
        .setStyle(ButtonStyle.Danger),
    );

    await thread.send({ embeds: [closedEmbed], components: [closedRow] });

    await thread.setLocked(true).catch(() => {});
    await thread.setArchived(true).catch(() => {});

    await interaction.editReply(nya("티켓을 닫았습니다."));
    return;
  }

  if (action === "delete") {
    await removeNonAdmins(thread, interaction.guild, interaction.client.user.id);

    await interaction.reply({
      content: nya("10초 후에 이 티켓 스레드가 삭제됩니다."),
      ephemeral: true,
    });

    const deleteEmbed = new EmbedBuilder()
      .setTitle("티켓 삭제")
      .setDescription(nya("10초 후에 이 스레드가 삭제됩니다"))
      .setColor(0xed4245);

    await thread.send({ embeds: [deleteEmbed] });

    setTimeout(() => {
      thread.delete().catch(() => {});
    }, 10000);

    return;
  }

  if (action === "export") {
    await interaction.deferReply({ ephemeral: true });
    await removeNonAdmins(thread, interaction.guild, interaction.client.user.id);

    const lines = [];
    let beforeId;
    let iterations = 0;

    while (iterations < 20) {
      const batch = await thread.messages.fetch({
        limit: 100,
        ...(beforeId ? { before: beforeId } : {}),
      });

      if (batch.size === 0) break;

      for (const message of batch.values()) {
        const timestamp = new Date(message.createdTimestamp).toISOString();
        lines.push(`[${timestamp}] ${message.author.tag}: ${message.content}`);
      }

      beforeId = batch.last().id;
      iterations += 1;

      if (batch.size < 100) break;
    }

    lines.reverse();

    const buffer = Buffer.from(lines.join("\n"), "utf-8");
    const attachment = new AttachmentBuilder(buffer, { name: `${thread.name}.txt` });

    await thread.send({ content: nya("대화 내용을 txt로 저장했습니다."), files: [attachment] });
    await interaction.editReply(nya("대화 내용을 txt로 저장했습니다."));
  }
}

async function handleTicketAddUserSelect(interaction) {
  const userId = interaction.values[0];
  const targetMember =
    interaction.guild.members.cache.get(userId) ??
    (await interaction.guild.members.fetch(userId).catch(() => null));

  if (targetMember?.user.bot) {
    await interaction.update({
      content: nya("봇은 티켓 스레드에 추가할 수 없습니다.") + "\n(오류 코드: TICKET-003)",
      components: [],
    });
    return;
  }

  try {
    await interaction.channel.members.add(userId);
    await interaction.update({
      content: nya(`<@${userId}>님을 스레드에 추가했습니다.`),
      components: [],
    });
  } catch (error) {
    console.error(error);
    await interaction.update({
      content: nya("사용자를 추가하지 못했습니다.") + "\n(오류 코드: TICKET-003)",
      components: [],
    });
  }
}

function buildWordChainPartyEmbed(party) {
  const memberMentions = party.members.map((id) => `<@${id}>`).join(", ");

  const embed = new EmbedBuilder()
    .setTitle("끝말잇기 파티 모집")
    .setDescription(
      nya(party.started ? "게임이 시작되었습니다!" : "참가하기 버튼을 눌러 파티에 참여하세요"),
    )
    .addFields(
      { name: "방장", value: `<@${party.hostId}>`, inline: true },
      { name: "인원", value: `${party.members.length}/${party.maxSize}`, inline: true },
      { name: "참여자", value: memberMentions },
    )
    .setColor(party.started ? 0x95a5a6 : 0xe1aa74);

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`${WORDCHAIN_JOIN_PREFIX}${party.partyId}`)
      .setLabel("참가하기")
      .setStyle(ButtonStyle.Primary)
      .setDisabled(party.started),
    new ButtonBuilder()
      .setCustomId(`${WORDCHAIN_START_PREFIX}${party.partyId}`)
      .setLabel("게임 시작")
      .setStyle(ButtonStyle.Success)
      .setDisabled(party.started),
    new ButtonBuilder()
      .setCustomId(`${WORDCHAIN_DISBAND_PREFIX}${party.partyId}`)
      .setLabel("파티 해체")
      .setStyle(ButtonStyle.Danger)
      .setDisabled(party.started),
  );

  return { embed, row };
}

async function handleWordChainActionButton(interaction) {
  if (!hasManageGuild(interaction)) {
    await interaction.reply({
      content: nya("이 설정은 서버 관리 권한이 있는 관리자만 사용할 수 있습니다.") + "\n(오류 코드: AUTH-001)",
      ephemeral: true,
    });
    return;
  }

  const action = interaction.customId.slice(WORDCHAIN_ACTION_PREFIX.length);

  if (action === "channel") {
    const channelSelect = new ChannelSelectMenuBuilder()
      .setCustomId(WORDCHAIN_CHANNEL_SELECT_ID)
      .setPlaceholder("파티 모집 버튼을 올릴 채널을 선택하세요")
      .addChannelTypes(ChannelType.GuildText)
      .setMinValues(1)
      .setMaxValues(1);

    const row = new ActionRowBuilder().addComponents(channelSelect);

    await interaction.update({
      content: nya("파티 모집 버튼을 올릴 채널을 선택하세요."),
      embeds: [],
      components: [row],
    });
    return;
  }

  if (action === "post") {
    const channelId = getWordChainChannelId(interaction.guild.id);
    const channel = channelId ? interaction.guild.channels.cache.get(channelId) : null;

    if (!channel) {
      await interaction.reply({
        content: nya("먼저 끝말잇기 채널을 설정해주세요.") + "\n(오류 코드: WORDCHAIN-001)",
        ephemeral: true,
      });
      return;
    }

    const createButton = new ButtonBuilder()
      .setCustomId(WORDCHAIN_CREATE_ID)
      .setLabel("파티 만들기")
      .setStyle(ButtonStyle.Success);

    const row = new ActionRowBuilder().addComponents(createButton);

    const postEmbed = new EmbedBuilder()
      .setDescription(nya("아래 버튼을 눌러 끝말잇기 파티를 만들어보세요!"))
      .setColor(0xe1aa74);

    await channel.send({ embeds: [postEmbed], components: [row] });

    await interaction.reply({
      content: nya(`${channel}에 파티 만들기 버튼을 올렸습니다.`),
      ephemeral: true,
    });
  }
}

async function handleWordChainCreate(interaction) {
  const modal = new ModalBuilder()
    .setCustomId(WORDCHAIN_SIZE_MODAL_ID)
    .setTitle("끝말잇기 파티 만들기");

  const sizeInput = new TextInputBuilder()
    .setCustomId("max_size")
    .setLabel(`최대 인원 (${WORDCHAIN_MIN_SIZE}~${WORDCHAIN_MAX_SIZE})`)
    .setStyle(TextInputStyle.Short)
    .setPlaceholder("예: 4")
    .setValue("4")
    .setRequired(true)
    .setMaxLength(1);

  modal.addComponents(new ActionRowBuilder().addComponents(sizeInput));

  await interaction.showModal(modal);
}

async function handleWordChainSizeModal(interaction) {
  const sizeText = interaction.fields.getTextInputValue("max_size").trim();
  const maxSize = Number(sizeText);

  if (
    !Number.isInteger(maxSize) ||
    maxSize < WORDCHAIN_MIN_SIZE ||
    maxSize > WORDCHAIN_MAX_SIZE
  ) {
    await interaction.reply({
      content: nya(`최대 인원은 ${WORDCHAIN_MIN_SIZE}~${WORDCHAIN_MAX_SIZE} 사이의 숫자여야 합니다.`) + "\n(오류 코드: WORDCHAIN-002)",
      ephemeral: true,
    });
    return;
  }

  const party = createWordChainParty({
    guildId: interaction.guild.id,
    channelId: interaction.channel.id,
    hostId: interaction.user.id,
    maxSize,
  });

  const { embed, row } = buildWordChainPartyEmbed(party);

  await interaction.reply({ embeds: [embed], components: [row] });
  const message = await interaction.fetchReply();
  setWordChainPartyMessageId(party.partyId, message.id);
}

async function handleWordChainJoin(interaction) {
  const partyId = interaction.customId.slice(WORDCHAIN_JOIN_PREFIX.length);
  const result = joinWordChainParty(partyId, interaction.user.id);

  if (!result.ok) {
    const messages = {
      not_found: "해당 파티를 찾을 수 없습니다.\n(오류 코드: WORDCHAIN-003)",
      started: "이미 시작된 파티입니다.\n(오류 코드: WORDCHAIN-004)",
      already_joined: "이미 참여한 파티입니다.\n(오류 코드: WORDCHAIN-005)",
      full: "파티 인원이 가득 찼습니다.\n(오류 코드: WORDCHAIN-006)",
    };

    await interaction.reply({
      content: nya(messages[result.reason] ?? "참가할 수 없습니다."),
      ephemeral: true,
    });
    return;
  }

  const { embed, row } = buildWordChainPartyEmbed(result.party);
  await interaction.update({ embeds: [embed], components: [row] });
}

async function handleWordChainStart(interaction) {
  const partyId = interaction.customId.slice(WORDCHAIN_START_PREFIX.length);
  const party = getWordChainParty(partyId);

  if (!party) {
    await interaction.reply({
      content: nya("해당 파티를 찾을 수 없습니다.") + "\n(오류 코드: WORDCHAIN-003)",
      ephemeral: true,
    });
    return;
  }

  if (interaction.user.id !== party.hostId) {
    await interaction.reply({
      content: nya("방장만 게임을 시작할 수 있습니다.") + "\n(오류 코드: WORDCHAIN-007)",
      ephemeral: true,
    });
    return;
  }

  await interaction.deferUpdate();

  const channel = interaction.guild.channels.cache.get(party.channelId);

  if (!channel) {
    await interaction.followUp({
      content: nya("끝말잇기 채널을 찾을 수 없습니다.") + "\n(오류 코드: WORDCHAIN-008)",
      ephemeral: true,
    });
    return;
  }

  const thread = await channel.threads.create({
    name: `끝말잇기-${interaction.user.username}`,
    type: ChannelType.PublicThread,
    reason: `${interaction.user.tag}님의 끝말잇기 파티`,
  });

  const recentMessages = await channel.messages.fetch({ limit: 1 }).catch(() => null);
  const threadStartMessage = recentMessages?.first();
  if (threadStartMessage?.type === MessageType.ThreadCreated) {
    await threadStartMessage.delete().catch(() => {});
  }

  for (const memberId of party.members) {
    await thread.members.add(memberId).catch(() => {});
  }

  party.started = true;

  const mentions = party.members.map((id) => `<@${id}>`).join(" ");
  await thread.send(nya(`${mentions}\n끝말잇기를 시작합니다! 치유미도 함께한다`));

  const { embed, row } = buildWordChainPartyEmbed(party);
  await interaction.editReply({
    content: null,
    embeds: [embed],
    components: [row],
  });

  await startWordChainGame(thread, party);
}

async function handleWordChainDisband(interaction) {
  const partyId = interaction.customId.slice(WORDCHAIN_DISBAND_PREFIX.length);
  const party = getWordChainParty(partyId);

  if (!party) {
    await interaction.reply({
      content: nya("해당 파티를 찾을 수 없습니다.") + "\n(오류 코드: WORDCHAIN-003)",
      ephemeral: true,
    });
    return;
  }

  if (interaction.user.id !== party.hostId) {
    await interaction.reply({
      content: nya("방장만 파티를 해체할 수 있습니다.") + "\n(오류 코드: WORDCHAIN-007)",
      ephemeral: true,
    });
    return;
  }

  removeWordChainParty(partyId);

  const embed = new EmbedBuilder()
    .setTitle("끝말잇기 파티 모집")
    .setDescription(nya("방장이 파티를 해체했습니다."))
    .setColor(0xed4245);

  await interaction.update({ embeds: [embed], components: [] });
}

async function handleDevAction(interaction) {
  if (!isDeveloper(interaction.user.id)) {
    await interaction.reply({
      content: nya("이 기능은 개발자만 사용할 수 있습니다.") + "\n(오류 코드: DEV-001)",
      ephemeral: true,
    });
    return;
  }

  const action = interaction.customId.slice(DEV_ACTION_PREFIX.length);

  if (action === "support") {
    const channelSelect = new ChannelSelectMenuBuilder()
      .setCustomId(DEV_SUPPORT_CHANNEL_SELECT_ID)
      .setPlaceholder("운영 안내를 게시할 채널을 선택하세요")
      .addChannelTypes(ChannelType.GuildText)
      .setMinValues(1)
      .setMaxValues(1);

    await interaction.update({
      content: nya("운영 안내를 게시할 채널을 선택하세요."),
      embeds: [],
      components: [new ActionRowBuilder().addComponents(channelSelect)],
    });
    return;
  }

  const modal = new ModalBuilder()
    .setCustomId(`${DEV_MODAL_PREFIX}${action}`)
    .setTitle(
      action === "restrict"
        ? "이용제한"
        : action === "unrestrict"
          ? "이용제한 해제"
          : "이용제한 확인",
    );

  const userIdInput = new TextInputBuilder()
    .setCustomId("user_id")
    .setLabel("대상 사용자 ID")
    .setStyle(TextInputStyle.Short)
    .setRequired(true);

  modal.addComponents(new ActionRowBuilder().addComponents(userIdInput));

  if (action === "restrict") {
    const reasonInput = new TextInputBuilder()
      .setCustomId("reason")
      .setLabel("이용제한 이유")
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(false)
      .setMaxLength(500);

    modal.addComponents(new ActionRowBuilder().addComponents(reasonInput));
  }

  await interaction.showModal(modal);
}

async function handleDevModal(interaction, action) {
  if (!isDeveloper(interaction.user.id)) {
    await interaction.reply({
      content: nya("이 기능은 개발자만 사용할 수 있습니다.") + "\n(오류 코드: DEV-001)",
      ephemeral: true,
    });
    return;
  }

  const targetUserId = interaction.fields.getTextInputValue("user_id").trim();

  if (!/^\d{15,20}$/.test(targetUserId)) {
    await interaction.update({
      content: nya("올바른 사용자 ID가 아닙니다.") + "\n(오류 코드: DEV-002)",
      embeds: [],
      components: [],
    });
    return;
  }

  if (action === "restrict") {
    const reason = interaction.fields.getTextInputValue("reason").trim();
    restrictUser(targetUserId, reason, interaction.user.id);

    await interaction.update({
      content: nya(`<@${targetUserId}>님의 이용을 제한했습니다. 사유: ${reason || "사유 없음"}`),
      embeds: [],
      components: [],
    });
    return;
  }

  if (action === "unrestrict") {
    const existed = unrestrictUser(targetUserId);

    await interaction.update({
      content: nya(
        existed
          ? `<@${targetUserId}>님의 이용제한을 해제했습니다.`
          : `<@${targetUserId}>님은 이용제한 상태가 아닙니다.`,
      ),
      embeds: [],
      components: [],
    });
    return;
  }

  if (action === "check") {
    const restriction = getRestriction(targetUserId);

    await interaction.update({
      content: restriction
        ? nya(
            `<@${targetUserId}>님은 이용제한 상태입니다.\n사유: ${restriction.reason}\n제한 시각: ${restriction.restrictedAt}`,
          )
        : nya(`<@${targetUserId}>님은 이용제한 상태가 아닙니다.`),
      embeds: [],
      components: [],
    });
  }
}

async function handleStockAction(interaction) {
  const action = interaction.customId.slice(STOCK_ACTION_PREFIX.length);
  const userId = interaction.user.id;

  if (action === "refresh") {
    await interaction.update({
      embeds: [buildMarketEmbed()],
      components: [buildStockRow()],
    });
    return;
  }

  if (action === "portfolio") {
    await interaction.reply({
      embeds: [buildPortfolioEmbed(userId)],
      ephemeral: true,
    });
    return;
  }

  if (action === "buy") {
    const prices = getCurrentPrices();

    const modal = new ModalBuilder()
      .setCustomId(STOCK_BUY_MODAL_ID)
      .setTitle("주식 매수");

    const tickerInput = new TextInputBuilder()
      .setCustomId("ticker")
      .setLabel("종목 코드")
      .setStyle(TextInputStyle.Short)
      .setPlaceholder(Object.keys(prices).join(" / "))
      .setMaxLength(3)
      .setRequired(true);

    const qtyInput = new TextInputBuilder()
      .setCustomId("quantity")
      .setLabel("수량 (주)")
      .setStyle(TextInputStyle.Short)
      .setPlaceholder("예: 5")
      .setRequired(true);

    modal.addComponents(
      new ActionRowBuilder().addComponents(tickerInput),
      new ActionRowBuilder().addComponents(qtyInput),
    );

    await interaction.showModal(modal);
    return;
  }

  if (action === "sell") {
    const portfolio = getPortfolio(userId);
    const heldIds = Object.entries(portfolio)
      .filter(([, e]) => e.qty > 0)
      .map(([id]) => id)
      .join(" / ") || "없음";

    const modal = new ModalBuilder()
      .setCustomId(STOCK_SELL_MODAL_ID)
      .setTitle("주식 매도");

    const tickerInput = new TextInputBuilder()
      .setCustomId("ticker")
      .setLabel("보유 종목 코드")
      .setStyle(TextInputStyle.Short)
      .setPlaceholder(heldIds)
      .setMaxLength(3)
      .setRequired(true);

    const qtyInput = new TextInputBuilder()
      .setCustomId("quantity")
      .setLabel("수량 (주)")
      .setStyle(TextInputStyle.Short)
      .setPlaceholder("예: 3")
      .setRequired(true);

    modal.addComponents(
      new ActionRowBuilder().addComponents(tickerInput),
      new ActionRowBuilder().addComponents(qtyInput),
    );

    await interaction.showModal(modal);
    return;
  }
}

async function handleStockBuyModal(interaction) {
  const userId = interaction.user.id;
  const ticker = interaction.fields.getTextInputValue("ticker").trim().toUpperCase();
  const quantityStr = interaction.fields.getTextInputValue("quantity").trim();
  const quantity = parseInt(quantityStr, 10);

  if (!getStockDef(ticker)) {
    await interaction.reply({
      content: nya(`존재하지 않는 종목 코드입니다: ${ticker}`) + "\n(오류 코드: STOCK-001)",
      ephemeral: true,
    });
    return;
  }

  if (!Number.isInteger(quantity) || quantity < 1) {
    await interaction.reply({
      content: nya("수량은 1 이상의 정수로 입력해주세요.") + "\n(오류 코드: STOCK-002)",
      ephemeral: true,
    });
    return;
  }

  const prices = getCurrentPrices();
  const price = prices[ticker];
  const totalCost = price * quantity;
  const balance = getBalance(userId);
  if (balance < totalCost) {
    await interaction.reply({
      content: nya(`치유미코인이 부족합니다. 필요: ${totalCost.toLocaleString()}코인, 보유: ${balance.toLocaleString()}코인`) + "\n(오류 코드: STOCK-004)",
      ephemeral: true,
    });
    return;
  }

  const result = buyStock(userId, ticker, quantity);
  if (!result.success) {
    await interaction.reply({
      content: nya(`매수에 실패했습니다: ${result.reason}`) + "\n(오류 코드: STOCK-003)",
      ephemeral: true,
    });
    return;
  }

  addBalance(userId, -result.totalCost);

  const def = getStockDef(ticker);
  await interaction.reply({
    content: nya(`**[${ticker}] ${def.name}** ${quantity}주를 ${result.totalCost.toLocaleString()}코인에 매수했습니다.\n평단가: ${result.avgPrice.toLocaleString()}코인 | 잔액: ${(balance - result.totalCost).toLocaleString()}코인`),
    ephemeral: true,
  });
}

async function handleStockSellModal(interaction) {
  const userId = interaction.user.id;
  const ticker = interaction.fields.getTextInputValue("ticker").trim().toUpperCase();
  const quantityStr = interaction.fields.getTextInputValue("quantity").trim();
  const quantity = parseInt(quantityStr, 10);

  if (!getStockDef(ticker)) {
    await interaction.reply({
      content: nya(`존재하지 않는 종목 코드입니다: ${ticker}`) + "\n(오류 코드: STOCK-001)",
      ephemeral: true,
    });
    return;
  }

  if (!Number.isInteger(quantity) || quantity < 1) {
    await interaction.reply({
      content: nya("수량은 1 이상의 정수로 입력해주세요.") + "\n(오류 코드: STOCK-002)",
      ephemeral: true,
    });
    return;
  }

  const result = sellStock(userId, ticker, quantity);
  if (!result.success) {
    const reason = result.reason === "보유량 부족"
      ? "보유 주식이 부족합니다."
      : result.reason;
    await interaction.reply({
      content: nya(`${reason}`) + "\n(오류 코드: STOCK-005)",
      ephemeral: true,
    });
    return;
  }

  addBalance(userId, result.totalGain);
  const newBalance = getBalance(userId);
  const def = getStockDef(ticker);
  const pnl = (result.price - result.avgPrice) * quantity;
  const pnlSign = pnl > 0 ? "+" : "";

  await interaction.reply({
    content: nya(`**[${ticker}] ${def.name}** ${quantity}주를 ${result.totalGain.toLocaleString()}코인에 매도했습니다.\n손익: ${pnlSign}${pnl.toLocaleString()}코인 | 잔액: ${newBalance.toLocaleString()}코인`),
    ephemeral: true,
  });
}

async function handleBankAction(interaction) {
  const action = interaction.customId.slice(BANK_ACTION_PREFIX.length);
  const userId = interaction.user.id;

  if (action === "deposit") {
    const walletBalance = getBalance(userId);

    const modal = new ModalBuilder()
      .setCustomId(BANK_DEPOSIT_MODAL_ID)
      .setTitle("예금 입금");

    const input = new TextInputBuilder()
      .setCustomId("amount")
      .setLabel(`입금할 금액 (지갑: ${walletBalance.toLocaleString()}코인)`)
      .setStyle(TextInputStyle.Short)
      .setPlaceholder("예: 1000")
      .setRequired(true);

    modal.addComponents(new ActionRowBuilder().addComponents(input));
    await interaction.showModal(modal);
    return;
  }

  if (action === "withdraw") {
    const acc = getAccount(userId);

    const modal = new ModalBuilder()
      .setCustomId(BANK_WITHDRAW_MODAL_ID)
      .setTitle("예금 출금");

    const input = new TextInputBuilder()
      .setCustomId("amount")
      .setLabel(`출금할 금액 (예금: ${acc.savings.toLocaleString()}코인)`)
      .setStyle(TextInputStyle.Short)
      .setPlaceholder("예: 1000")
      .setRequired(true);

    modal.addComponents(new ActionRowBuilder().addComponents(input));
    await interaction.showModal(modal);
    return;
  }

  if (action === "loan") {
    const modal = new ModalBuilder()
      .setCustomId(BANK_LOAN_MODAL_ID)
      .setTitle("대출 신청");

    const input = new TextInputBuilder()
      .setCustomId("amount")
      .setLabel(`대출 금액 (${MIN_LOAN.toLocaleString()} ~ ${MAX_LOAN.toLocaleString()}코인)`)
      .setStyle(TextInputStyle.Short)
      .setPlaceholder("예: 10000")
      .setRequired(true);

    modal.addComponents(new ActionRowBuilder().addComponents(input));
    await interaction.showModal(modal);
    return;
  }

  if (action === "repay") {
    const acc = getAccount(userId);
    if (!acc.loan) {
      await interaction.reply({
        content: nya("현재 대출이 없습니다."),
        ephemeral: true,
      });
      return;
    }

    const owed = getTotalOwed(acc.loan);
    const walletBalance = getBalance(userId);

    if (walletBalance < owed) {
      await interaction.reply({
        content: nya(`지갑 잔액이 부족합니다. 상환 필요: ${owed.toLocaleString()}코인, 보유: ${walletBalance.toLocaleString()}코인`) + "\n(오류 코드: BANK-003)",
        ephemeral: true,
      });
      return;
    }

    addBalance(userId, -owed);
    repayLoan(userId);

    await interaction.update({
      embeds: [buildBankEmbed(userId)],
      components: [buildBankRow(false, false)],
    });
    return;
  }

  if (action === "bankrupt") {
    const cooldownMs = getRebirthCooldownMs(userId);
    if (cooldownMs > 0) {
      const hours = Math.floor(cooldownMs / 3_600_000);
      const minutes = Math.floor((cooldownMs % 3_600_000) / 60_000);
      await interaction.reply({
        content: nya(`아직 환생할 수 없습니다. 다음 환생까지 **${hours}시간 ${minutes}분** 남았습니다.`),
        ephemeral: true,
      });
      return;
    }

    const acc = getAccount(userId);
    if (!acc.loan) {
      await interaction.reply({
        content: nya("현재 대출이 없습니다."),
        ephemeral: true,
      });
      return;
    }

    const owed = getTotalOwed(acc.loan);
    const walletBalance = getBalance(userId);
    const stockValue = getPortfolioValue(userId);
    const totalAssets = walletBalance + acc.savings + stockValue;

    if (totalAssets >= owed) {
      await interaction.reply({
        content: nya("아직 대출을 갚을 수 있는 상태입니다. 파산 조건을 충족하지 않습니다."),
        ephemeral: true,
      });
      return;
    }

    const confirmEmbed = new EmbedBuilder()
      .setTitle("⚠️ 파산 신청 확인")
      .setDescription(
        nya(
          `총 자산(${totalAssets.toLocaleString()}코인)이 상환 필요액(${owed.toLocaleString()}코인)에 미치지 못합니다.\n\n` +
          `**환생 시 초기화되는 것:**\n` +
          `- 지갑 코인 → ${STARTING_BALANCE}코인으로 초기화\n` +
          `- 예금 잔액 → 0 (${acc.savings.toLocaleString()}코인 소멸)\n` +
          `- 대출 → 탕감\n` +
          `- 보유 주식 전부 소멸 (평가액 ${stockValue.toLocaleString()}코인)\n\n` +
          `**유지되는 것:** 키우기, 레벨, 출석 스트릭\n\n` +
          `정말 환생하시겠습니까?`
        )
      )
      .setColor(0xff4444);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("bank-action:bankrupt-confirm")
        .setLabel("환생하기")
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId("bank-action:bankrupt-cancel")
        .setLabel("취소")
        .setStyle(ButtonStyle.Secondary),
    );

    await interaction.reply({ embeds: [confirmEmbed], components: [row], ephemeral: true });
    return;
  }

  if (action === "bankrupt-confirm") {
    const cooldownMs = getRebirthCooldownMs(userId);
    if (cooldownMs > 0) {
      const hours = Math.floor(cooldownMs / 3_600_000);
      const minutes = Math.floor((cooldownMs % 3_600_000) / 60_000);
      await interaction.update({
        content: nya(`아직 환생할 수 없습니다. 다음 환생까지 **${hours}시간 ${minutes}분** 남았습니다.`),
        embeds: [],
        components: [],
      });
      return;
    }

    const acc = getAccount(userId);
    if (!acc.loan) {
      await interaction.update({
        content: nya("이미 처리되었거나 대출이 없습니다."),
        embeds: [],
        components: [],
      });
      return;
    }

    const walletBefore = getBalance(userId);
    const savingsBefore = acc.savings;
    const stocksBefore = getPortfolioValue(userId);

    setBalance(userId, STARTING_BALANCE);
    clearPortfolio(userId);
    const rebirthCount = declareBankruptcy(userId);

    const rebirthEmbed = new EmbedBuilder()
      .setTitle("✨ 환생")
      .setDescription(
        nya(
          `새로운 시작을 맞이했습니다.\n\n` +
          `**소멸된 자산:**\n` +
          `- 지갑 ${walletBefore.toLocaleString()}코인 → ${STARTING_BALANCE}코인\n` +
          `- 예금 ${savingsBefore.toLocaleString()}코인 → 0코인\n` +
          `- 주식 평가액 ${stocksBefore.toLocaleString()}코인 → 0코인\n\n` +
          `현재 환생 횟수: **${rebirthCount}회**`
        )
      )
      .setColor(0xe1aa74);

    await interaction.update({ embeds: [rebirthEmbed], components: [] });
    return;
  }

  if (action === "bankrupt-cancel") {
    await interaction.update({
      content: nya("파산 신청을 취소했습니다."),
      embeds: [],
      components: [],
    });
  }
}

async function handleBankDepositModal(interaction) {
  const userId = interaction.user.id;
  const amountStr = interaction.fields.getTextInputValue("amount").trim();
  const amount = parseInt(amountStr, 10);

  if (!Number.isInteger(amount) || amount < 1) {
    await interaction.reply({
      content: nya("금액은 1 이상의 정수로 입력해주세요.") + "\n(오류 코드: BANK-001)",
      ephemeral: true,
    });
    return;
  }

  const walletBalance = getBalance(userId);
  if (walletBalance < amount) {
    await interaction.reply({
      content: nya(`지갑 잔액이 부족합니다. 보유: ${walletBalance.toLocaleString()}코인`) + "\n(오류 코드: BANK-002)",
      ephemeral: true,
    });
    return;
  }

  addBalance(userId, -amount);
  deposit(userId, amount);

  const accAfterDeposit = getAccount(userId);
  const hasLoanD = Boolean(accAfterDeposit.loan);
  const canBankruptD = hasLoanD && (getBalance(userId) + accAfterDeposit.savings + getPortfolioValue(userId) < getTotalOwed(accAfterDeposit.loan));
  await interaction.update({
    embeds: [buildBankEmbed(userId)],
    components: [buildBankRow(hasLoanD, canBankruptD)],
  });
}

async function handleBankWithdrawModal(interaction) {
  const userId = interaction.user.id;
  const amountStr = interaction.fields.getTextInputValue("amount").trim();
  const amount = parseInt(amountStr, 10);

  if (!Number.isInteger(amount) || amount < 1) {
    await interaction.reply({
      content: nya("금액은 1 이상의 정수로 입력해주세요.") + "\n(오류 코드: BANK-001)",
      ephemeral: true,
    });
    return;
  }

  const result = withdraw(userId, amount);
  if (!result.success) {
    const acc = getAccount(userId);
    await interaction.reply({
      content: nya(`예금 잔액이 부족합니다. 예금: ${acc.savings.toLocaleString()}코인`) + "\n(오류 코드: BANK-002)",
      ephemeral: true,
    });
    return;
  }

  addBalance(userId, amount);

  const accAfterWithdraw = getAccount(userId);
  const hasLoanW = Boolean(accAfterWithdraw.loan);
  const canBankruptW = hasLoanW && (getBalance(userId) + accAfterWithdraw.savings + getPortfolioValue(userId) < getTotalOwed(accAfterWithdraw.loan));
  await interaction.update({
    embeds: [buildBankEmbed(userId)],
    components: [buildBankRow(hasLoanW, canBankruptW)],
  });
}

async function handleBankLoanModal(interaction) {
  const userId = interaction.user.id;
  const amountStr = interaction.fields.getTextInputValue("amount").trim();
  const amount = parseInt(amountStr, 10);

  if (!Number.isInteger(amount) || amount < MIN_LOAN || amount > MAX_LOAN) {
    await interaction.reply({
      content: nya(`대출 금액은 ${MIN_LOAN.toLocaleString()} ~ ${MAX_LOAN.toLocaleString()}코인 범위로 입력해주세요.`) + "\n(오류 코드: BANK-004)",
      ephemeral: true,
    });
    return;
  }

  const result = takeLoan(userId, amount);
  if (!result.success) {
    if (result.reason === "existing_loan") {
      await interaction.reply({
        content: nya("이미 대출 중인 건이 있습니다. 기존 대출을 먼저 상환해주세요.") + "\n(오류 코드: BANK-005)",
        ephemeral: true,
      });
    } else {
      await interaction.reply({
        content: nya(`대출 금액이 올바르지 않습니다.`) + "\n(오류 코드: BANK-004)",
        ephemeral: true,
      });
    }
    return;
  }

  addBalance(userId, amount);

  const accAfterLoan = getAccount(userId);
  const canBankruptL = getBalance(userId) + accAfterLoan.savings + getPortfolioValue(userId) < getTotalOwed(accAfterLoan.loan);
  await interaction.update({
    embeds: [buildBankEmbed(userId)],
    components: [buildBankRow(true, canBankruptL)],
  });
}

const bjSessionOptions = new Map();

function resetPetTimeout(message) {
  const old = petMessageTimeouts.get(message.id);
  if (old) clearTimeout(old);
  const timeout = setTimeout(async () => {
    await message.delete().catch(() => {});
    petMessageTimeouts.delete(message.id);
  }, PET_IDLE_TIMEOUT_MS);
  petMessageTimeouts.set(message.id, timeout);
}

async function handlePetAction(interaction) {
  const [action, ownerId] = interaction.customId.slice(PET_ACTION_PREFIX.length).split(":");

  if (interaction.user.id !== ownerId) {
    await interaction.reply({
      content: nya("이건 당신의 고양이가 아닙니다. 본인의 /키우기를 사용해주세요"),
      ephemeral: true,
    });
    return;
  }

  resetPetTimeout(interaction.message);

  if (action === "name") {
    const modal = new ModalBuilder()
      .setCustomId(`${PET_NAME_MODAL_PREFIX}${ownerId}`)
      .setTitle("고양이 이름 설정");

    const nameInput = new TextInputBuilder()
      .setCustomId("name")
      .setLabel("고양이의 이름")
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setMaxLength(20);

    modal.addComponents(new ActionRowBuilder().addComponents(nameInput));

    await interaction.showModal(modal);
    return;
  }

  const result = performAction(ownerId, action);

  if (result.alreadyDone) {
    await interaction.reply({
      content: nya(`오늘은 이미 ${ACTIONS[action].label}를 했습니다. 내일 다시 해주세요.`) + "\n(오류 코드: PET-001)",
      ephemeral: true,
    });
    return;
  }

  const ageDays = getAgeDays(result.pet);
  const stage = getStage(ageDays);
  const displayName = result.pet.name
    ? `${result.pet.name} (${interaction.user.username}님의 고양이)`
    : `${interaction.user.username}님의 고양이`;

  const embed = new EmbedBuilder()
    .setTitle(`${stage.emoji} ${displayName}`)
    .setDescription(
      nya(
        `${result.success ? "✅" : "❌"} ${ACTIONS[action].label} → ${result.message}\n${stage.name} · ${ageDays}일째 함께하고 있다 · ${getMoodText(result.pet)}`,
      ),
    )
    .addFields(
      { name: "배고픔", value: `${result.pet.hunger}/100`, inline: true },
      { name: "청결", value: `${result.pet.cleanliness}/100`, inline: true },
      { name: "애정", value: `${result.pet.affection}/100`, inline: true },
    )
    .setColor(result.success ? 0xe1aa74 : 0xed4245);

  await interaction.update({ embeds: [embed], components: [buildPetRow(ownerId)] });
}

async function handleRankPageButton(interaction) {
  if (!interaction.inGuild()) {
    await interaction.reply({
      content: nya("서버에서만 사용할 수 있는 버튼입니다.") + "\n(오류 코드: GUILD-001)",
      ephemeral: true,
    });
    return;
  }

  const [type, pageText] = interaction.customId.slice(RANK_PAGE_PREFIX.length).split(":");
  const { embed, row } = buildRankPage(interaction.guild, type, Number(pageText));
  await interaction.update({ embeds: [embed], components: [row] });
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
    new ButtonBuilder().setLabel("이용약관").setStyle(ButtonStyle.Link).setURL(TERMS_URL),
    new ButtonBuilder()
      .setLabel("개인정보 처리방침")
      .setStyle(ButtonStyle.Link)
      .setURL(PRIVACY_URL),
  );

  await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
}

async function safeHandle(interaction, fn) {
  try {
    await fn();
  } catch (err) {
    console.error("[상호작용 오류]", interaction.customId ?? interaction.commandName, err);
    const msg = { content: nya("명령어를 실행하는 중 오류가 발생했습니다.") + "\n(오류 코드: CMD-001)", ephemeral: true };
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(msg).catch(() => {});
    } else if (interaction.isRepliable()) {
      await interaction.reply(msg).catch(() => {});
    }
  }
}

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction) {
    if (!isDeveloper(interaction.user.id) && isRestricted(interaction.user.id)) {
      if (interaction.isRepliable()) {
        const restriction = getRestriction(interaction.user.id);
        await interaction.reply({
          content: nya(`이용이 제한된 사용자입니다. 제한 사유: ${restriction?.reason ?? "사유 없음"}`) + "\n(오류 코드: DEV-004)",
          ephemeral: true,
        }).catch(() => {});
      }
      return;
    }

    if (interaction.isChatInputCommand() && !hasAgreed(interaction.user.id)) {
      await promptConsent(interaction);
      return;
    }

    if (interaction.isButton()) {
      if (interaction.customId === CONSENT_AGREE_ID) {
        agree(interaction.user.id);
        await interaction.update({
          content: nya(
            "동의해주셔서 감사합니다! 이제 명령어를 다시 입력하면 바로 이용할 수 있습니다",
          ),
          embeds: [],
          components: [],
        });
        return;
      }

      await safeHandle(interaction, () => handleButton(interaction));
      return;
    }

    if (interaction.isRoleSelectMenu()) {
      await safeHandle(interaction, () => handleRoleSelect(interaction));
      return;
    }

    if (interaction.isChannelSelectMenu()) {
      await safeHandle(interaction, () => handleChannelSelect(interaction));
      return;
    }

    if (interaction.isStringSelectMenu()) {
      await safeHandle(interaction, () => handleStringSelect(interaction));
      return;
    }

    if (interaction.isUserSelectMenu()) {
      await safeHandle(interaction, () => handleTicketAddUserSelect(interaction));
      return;
    }

    if (interaction.isModalSubmit()) {
      await safeHandle(interaction, () => handleModalSubmit(interaction));
      return;
    }

    if (!interaction.isChatInputCommand()) return;

    const command = interaction.client.commands.get(interaction.commandName);

    if (!command) {
      console.error(`${interaction.commandName} 명령어를 찾을 수 없습니다.`);
      return;
    }

    if (interaction.commandName === "stats") {
      await cleanupUserStats(interaction.client, interaction.user.id);
    }

    try {
      await command.execute(interaction);
    } catch (error) {
      console.error(error);

      const message = {
        content: nya("명령어를 실행하는 중 오류가 발생했습니다.") + "\n(오류 코드: CMD-001)",
        ephemeral: true,
      };

      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(message);
      } else {
        await interaction.reply(message);
      }
    }

    if (interaction.commandName === "stats") {
      userStatsTokens.set(interaction.user.id, {
        applicationId: interaction.applicationId,
        cmdToken: interaction.token,
      });
    }
  },
};

function buildStreamAlertModal(platform) {
  const isUpload = platform === "youtube_upload";
  const modal = new ModalBuilder()
    .setCustomId(STREAMALERT_MODAL_ID)
    .setTitle(`${STREAMALERT_PLATFORM_NAMES[platform]} 알림 등록`);

  modal.addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId("link")
        .setLabel("채널 링크")
        .setStyle(TextInputStyle.Short)
        .setPlaceholder(STREAMALERT_LINK_PLACEHOLDERS[platform])
        .setRequired(true),
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId("name")
        .setLabel("{name} 에 쓰일 채널 표시 이름 (비우면 자동)")
        .setStyle(TextInputStyle.Short)
        .setPlaceholder("예: 페헤, 강호동TV, ...")
        .setRequired(false)
        .setMaxLength(50),
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId("text")
        .setLabel(isUpload ? "알림 메시지 (새 영상 올라왔을 때 · 비우면 기본값)" : "알림 메시지 (방송 켜졌을 때 · 비우면 기본값)")
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder(isUpload ? "새 영상이 올라왔습니다! 📹" : "방송이 시작되었습니다! 🎉")
        .setRequired(false)
        .setMaxLength(200),
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId("mention")
        .setLabel("멘션 (없음 / everyone / here)")
        .setStyle(TextInputStyle.Short)
        .setPlaceholder("없음")
        .setRequired(false)
        .setMaxLength(10),
    ),
  );
  return modal;
}

function buildStreamAlertEditModal(alert) {
  const modal = new ModalBuilder()
    .setCustomId(STREAMALERT_EDIT_MODAL_ID)
    .setTitle("방송 알림 수정");

  const isUpload = alert.platform === "youtube_upload";
  modal.addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId("name")
        .setLabel("{name} 에 쓰일 채널 표시 이름")
        .setStyle(TextInputStyle.Short)
        .setValue(alert.channelName || "")
        .setRequired(false)
        .setMaxLength(50),
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId("text")
        .setLabel(isUpload ? "알림 메시지 (새 영상 올라왔을 때 · 비우면 기본값)" : "알림 메시지 (방송 켜졌을 때 · 비우면 기본값)")
        .setStyle(TextInputStyle.Paragraph)
        .setValue(alert.customText || "")
        .setRequired(false)
        .setMaxLength(200),
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId("mention")
        .setLabel("멘션 (없음 / everyone / here)")
        .setStyle(TextInputStyle.Short)
        .setValue(alert.mention === "none" ? "" : (alert.mention ?? ""))
        .setRequired(false)
        .setMaxLength(10),
    ),
  );
  return modal;
}

async function handleStreamAlertPlatformButton(interaction) {
  const platform = interaction.customId.slice(STREAMALERT_PLATFORM_BTN_PREFIX.length);
  pendingSetups.set(interaction.user.id, { guildId: interaction.guild.id, platform });
  await interaction.showModal(buildStreamAlertModal(platform));
}

async function handleStreamAlertModal(interaction) {
  const pending = pendingSetups.get(interaction.user.id);
  if (!pending) {
    const alerts = getGuildAlerts(interaction.guild.id);
    await interaction.update({ ...buildStreamAlertPage(alerts, 0), content: nya("세션이 만료되었습니다. 다시 시도해주세요.") });
    return;
  }

  const link = interaction.fields.getTextInputValue("link").trim();
  const displayName = interaction.fields.getTextInputValue("name").trim();
  const customText = interaction.fields.getTextInputValue("text").trim();
  const mentionRaw = interaction.fields.getTextInputValue("mention").trim().toLowerCase();
  const mention = ["everyone", "here"].includes(mentionRaw) ? mentionRaw : "none";

  const extractedId = extractChannelId(pending.platform, link);
  if (!extractedId) {
    pendingSetups.delete(interaction.user.id);
    const alerts = getGuildAlerts(pending.guildId);
    await interaction.update({
      ...buildStreamAlertPage(alerts, 0),
      content: nya("채널 링크를 인식할 수 없습니다. 올바른 링크를 입력해주세요.") + "\n(오류 코드: STREAM-001)",
    });
    return;
  }

  let channelId = extractedId;
  if (pending.platform === "youtube_upload") {
    const resolved = await resolveYouTubeChannelId(extractedId);
    if (!resolved) {
      pendingSetups.delete(interaction.user.id);
      const alerts = getGuildAlerts(pending.guildId);
      await interaction.update({
        ...buildStreamAlertPage(alerts, 0),
        content: nya("채널 ID를 확인할 수 없습니다. 잠시 후 다시 시도해주세요.") + "\n(오류 코드: STREAM-003)",
      });
      return;
    }
    channelId = resolved;
  }

  if (isDuplicate(pending.guildId, pending.platform, channelId)) {
    pendingSetups.delete(interaction.user.id);
    const alerts = getGuildAlerts(pending.guildId);
    await interaction.update({
      ...buildStreamAlertPage(alerts, 0),
      content: nya("이미 등록된 방송인입니다.") + "\n(오류 코드: STREAM-002)",
    });
    return;
  }

  pendingSetups.set(interaction.user.id, {
    ...pending,
    channelLink: link,
    channelId,
    channelName: displayName || extractedId,
    customText,
    mention,
  });

  await interaction.update({
    content: nya("알림을 받을 채널을 선택하세요"),
    embeds: [],
    components: [
      new ActionRowBuilder().addComponents(
        new ChannelSelectMenuBuilder()
          .setCustomId(STREAMALERT_NOTIFCHANNEL_SELECT)
          .setPlaceholder("알림을 받을 채널 선택")
          .setChannelTypes(ChannelType.GuildText),
      ),
    ],
  });
}

async function handleStreamAlertChannelSelect(interaction) {
  const pending = pendingSetups.get(interaction.user.id);
  if (!pending?.channelLink) {
    const alerts = getGuildAlerts(interaction.guild.id);
    await interaction.update({ ...buildStreamAlertPage(alerts, 0), content: nya("세션이 만료되었습니다. 다시 시도해주세요.") });
    return;
  }

  pendingSetups.delete(interaction.user.id);
  addAlert(pending.guildId, {
    platform: pending.platform,
    channelLink: pending.channelLink,
    channelId: pending.channelId,
    channelName: pending.channelName,
    customText: pending.customText,
    mention: pending.mention,
    notifChannelId: interaction.values[0],
  });

  const alerts = getGuildAlerts(pending.guildId);
  await interaction.update(buildStreamAlertPage(alerts, alerts.length - 1));
}

async function handleStreamAlertNavButton(interaction) {
  const index = parseInt(interaction.customId.slice(STREAMALERT_NAV_PREFIX.length), 10);
  const alerts = getGuildAlerts(interaction.guild.id);
  await interaction.update(buildStreamAlertPage(alerts, index));
}

async function handleStreamAlertDeleteButton(interaction) {
  const alertId = interaction.customId.slice(STREAMALERT_DELETE_PREFIX.length);
  removeAlert(interaction.guild.id, alertId);
  const alerts = getGuildAlerts(interaction.guild.id);
  await interaction.update(buildStreamAlertPage(alerts, 0));
}

async function handleStreamAlertTestButton(interaction) {
  const alertId = interaction.customId.slice(STREAMALERT_TEST_PREFIX.length);
  const alerts = getGuildAlerts(interaction.guild.id);
  const alert = alerts.find((a) => a.id === alertId);
  const alertIndex = alerts.findIndex((a) => a.id === alertId);

  if (!alert) {
    await interaction.update(buildStreamAlertPage(alerts, 0));
    return;
  }

  const channel = interaction.guild.channels.cache.get(alert.notifChannelId);
  if (!channel?.isTextBased()) {
    await interaction.update({ ...buildStreamAlertPage(alerts, alertIndex), content: nya("알림 채널을 찾을 수 없습니다.") });
    return;
  }

  const testContent =
    alert.platform === "youtube_upload"
      ? buildUploadNotificationContent(alert, { videoId: "dQw4w9WgXcQ", title: "테스트 영상 제목" })
      : buildNotificationContent(alert);
  await channel.send(testContent);
  await interaction.update({
    ...buildStreamAlertPage(alerts, alertIndex),
    content: nya(`<#${alert.notifChannelId}>에 테스트 알림을 전송했습니다`),
  });
}

async function handleStreamAlertActionButton(interaction) {
  const action = interaction.customId.slice(STREAMALERT_ACTION_PREFIX.length);

  if (action === "add") {
    await interaction.update({
      content: nya("알림을 등록할 플랫폼을 선택하세요"),
      embeds: [],
      components: buildPlatformButtons(),
    });
    return;
  }

  if (action === "cancel") {
    const alerts = getGuildAlerts(interaction.guild.id);
    await interaction.update(buildStreamAlertPage(alerts, 0));
    return;
  }

  if (action === "editkeep") {
    const pending = pendingEdits.get(interaction.user.id);
    if (!pending) {
      const alerts = getGuildAlerts(interaction.guild.id);
      await interaction.update(buildStreamAlertPage(alerts, 0));
      return;
    }
    pendingEdits.delete(interaction.user.id);
    updateAlert(pending.guildId, pending.alertId, {
      ...(pending.channelName ? { channelName: pending.channelName } : {}),
      customText: pending.customText,
      mention: pending.mention,
    });
    const alerts = getGuildAlerts(pending.guildId);
    const idx = alerts.findIndex((a) => a.id === pending.alertId);
    await interaction.update({
      ...buildStreamAlertPage(alerts, idx >= 0 ? idx : 0),
      content: nya("수정했습니다"),
    });
  }
}

async function handleStreamAlertEditButton(interaction) {
  const alertId = interaction.customId.slice(STREAMALERT_EDIT_PREFIX.length);
  const alerts = getGuildAlerts(interaction.guild.id);
  const alert = alerts.find((a) => a.id === alertId);
  if (!alert) {
    await interaction.update(buildStreamAlertPage(alerts, 0));
    return;
  }
  pendingEdits.set(interaction.user.id, { guildId: interaction.guild.id, alertId });
  await interaction.showModal(buildStreamAlertEditModal(alert));
}

async function handleStreamAlertEditModal(interaction) {
  const pending = pendingEdits.get(interaction.user.id);
  if (!pending) {
    const alerts = getGuildAlerts(interaction.guild.id);
    await interaction.update(buildStreamAlertPage(alerts, 0));
    return;
  }

  const channelName = interaction.fields.getTextInputValue("name").trim();
  const customText = interaction.fields.getTextInputValue("text").trim();
  const mentionRaw = interaction.fields.getTextInputValue("mention").trim().toLowerCase();
  const mention = ["everyone", "here"].includes(mentionRaw) ? mentionRaw : "none";

  pendingEdits.set(interaction.user.id, { ...pending, channelName, customText, mention });

  const alerts = getGuildAlerts(pending.guildId);
  const alert = alerts.find((a) => a.id === pending.alertId);

  await interaction.update({
    content: nya(`현재 알림 채널: <#${alert?.notifChannelId ?? "?"}>\n채널을 변경하려면 아래에서 선택하세요`),
    embeds: [],
    components: [
      new ActionRowBuilder().addComponents(
        new ChannelSelectMenuBuilder()
          .setCustomId(STREAMALERT_EDIT_NOTIFCHANNEL_SELECT)
          .setPlaceholder("변경할 채널 선택")
          .addChannelTypes(ChannelType.GuildText),
      ),
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("streamalert:action:editkeep")
          .setLabel("채널 유지")
          .setStyle(ButtonStyle.Secondary),
      ),
    ],
  });
}

async function handleStreamAlertEditChannelSelect(interaction) {
  const pending = pendingEdits.get(interaction.user.id);
  if (!pending) {
    const alerts = getGuildAlerts(interaction.guild.id);
    await interaction.update(buildStreamAlertPage(alerts, 0));
    return;
  }
  pendingEdits.delete(interaction.user.id);
  updateAlert(pending.guildId, pending.alertId, {
    ...(pending.channelName ? { channelName: pending.channelName } : {}),
    customText: pending.customText,
    mention: pending.mention,
    notifChannelId: interaction.values[0],
  });
  const alerts = getGuildAlerts(pending.guildId);
  const idx = alerts.findIndex((a) => a.id === pending.alertId);
  await interaction.update({
    ...buildStreamAlertPage(alerts, idx >= 0 ? idx : 0),
    content: nya("수정했습니다"),
  });
}

async function handleRoleSelect(interaction) {
  if (interaction.customId === WARN_WIZARD_ROLE_SELECT_ID) {
    await handleWarnWizardRoleSelect(interaction);
    return;
  }

  if (!interaction.customId.startsWith(VERIFY_SETUP_ROLE_SELECT_PREFIX)) return;

  if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageRoles)) {
    await interaction.reply({
      content: nya("이 설정은 역할 관리 권한이 있는 관리자만 사용할 수 있습니다.") + "\n(오류 코드: AUTH-001)",
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
      content: nya("선택한 역할을 찾을 수 없습니다. 다시 시도해주세요.") + "\n(오류 코드: ROLE-001)",
      components: [],
    });
    return;
  }

  if (!role.editable) {
    await interaction.update({
      content: nya("이 역할은 봇이 지급할 수 없습니다. 봇 역할을 해당 역할보다 위로 올려주세요.") + "\n(오류 코드: ROLE-002)",
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

async function handleStringSelect(interaction) {
  if (interaction.customId === LOG_TYPE_SELECT_ID) {
    if (!hasManageGuild(interaction)) {
      await interaction.reply({
        content: nya("이 설정은 서버 관리 권한이 있는 관리자만 사용할 수 있습니다.") + "\n(오류 코드: AUTH-001)",
        ephemeral: true,
      });
      return;
    }
    const key = interaction.values[0];
    await interaction.update({
      content: null,
      embeds: [buildLogTypeEmbed(interaction.guild.id, key)],
      components: buildLogTypeRows(interaction.guild.id, key),
    });
    return;
  }

  if (interaction.customId !== "help-category-select") return;

  const category = interaction.values[0];
  const grouped = getCommandsByCategory(interaction.client);
  const commands = grouped.get(category) ?? [];

  await interaction.update({
    embeds: [buildCategoryEmbed(category, commands)],
  });
}

async function handleChannelSelect(interaction) {
  if (interaction.customId === STREAMALERT_NOTIFCHANNEL_SELECT) {
    await handleStreamAlertChannelSelect(interaction);
    return;
  }

  if (interaction.customId === STREAMALERT_EDIT_NOTIFCHANNEL_SELECT) {
    await handleStreamAlertEditChannelSelect(interaction);
    return;
  }

  if (interaction.customId === RANK_LEVELUP_CHANNEL_SELECT_ID) {
    if (!hasManageGuild(interaction)) {
      await interaction.reply({
        content: nya("이 설정은 서버 관리 권한이 있는 관리자만 사용할 수 있습니다.") + "\n(오류 코드: AUTH-001)",
        ephemeral: true,
      });
      return;
    }

    const channelId = interaction.values[0];
    setLevelUpChannel(interaction.guild.id, channelId);

    await interaction.update({
      content: null,
      embeds: [buildLevelUpEmbed(interaction.guild.id)],
      components: [buildLevelUpRow()],
    });
    return;
  }

  if (interaction.customId === TICKET_CHANNEL_SELECT_ID) {
    if (!hasManageGuild(interaction)) {
      await interaction.reply({
        content: nya("이 설정은 서버 관리 권한이 있는 관리자만 사용할 수 있습니다.") + "\n(오류 코드: AUTH-001)",
        ephemeral: true,
      });
      return;
    }

    const channelId = interaction.values[0];
    setTicketChannel(interaction.guild.id, channelId);

    await interaction.update({
      content: null,
      embeds: [buildTicketEmbed(interaction.guild.id)],
      components: [buildTicketRow()],
    });
    return;
  }

  if (interaction.customId === WORDCHAIN_CHANNEL_SELECT_ID) {
    if (!hasManageGuild(interaction)) {
      await interaction.reply({
        content: nya("이 설정은 서버 관리 권한이 있는 관리자만 사용할 수 있습니다.") + "\n(오류 코드: AUTH-001)",
        ephemeral: true,
      });
      return;
    }

    const channelId = interaction.values[0];
    setWordChainChannel(interaction.guild.id, channelId);

    await interaction.update({
      content: null,
      embeds: [buildWordChainEmbed(interaction.guild.id)],
      components: [buildWordChainRow()],
    });
    return;
  }

  if (interaction.customId === WELCOME_CHANNEL_SELECT_ID) {
    if (!hasManageGuild(interaction)) {
      await interaction.reply({
        content: nya("이 설정은 서버 관리 권한이 있는 관리자만 사용할 수 있습니다.") + "\n(오류 코드: AUTH-001)",
        ephemeral: true,
      });
      return;
    }

    const channelId = interaction.values[0];
    setWelcomeChannel(interaction.guild.id, channelId);

    await interaction.update({
      content: null,
      embeds: [buildWelcomeEmbed(interaction.guild.id)],
      components: buildWelcomeRows(interaction.guild.id),
    });
    return;
  }

  if (interaction.customId === WELCOME_JOIN_CHANNEL_SELECT_ID) {
    if (!hasManageGuild(interaction)) {
      await interaction.reply({
        content: nya("이 설정은 서버 관리 권한이 있는 관리자만 사용할 수 있습니다.") + "\n(오류 코드: AUTH-001)",
        ephemeral: true,
      });
      return;
    }

    setJoinChannel(interaction.guild.id, interaction.values[0]);

    await interaction.update({
      content: null,
      embeds: [buildWelcomeEmbed(interaction.guild.id)],
      components: buildWelcomeRows(interaction.guild.id),
    });
    return;
  }

  if (interaction.customId === WELCOME_LEAVE_CHANNEL_SELECT_ID) {
    if (!hasManageGuild(interaction)) {
      await interaction.reply({
        content: nya("이 설정은 서버 관리 권한이 있는 관리자만 사용할 수 있습니다.") + "\n(오류 코드: AUTH-001)",
        ephemeral: true,
      });
      return;
    }

    setLeaveChannel(interaction.guild.id, interaction.values[0]);

    await interaction.update({
      content: null,
      embeds: [buildWelcomeEmbed(interaction.guild.id)],
      components: buildWelcomeRows(interaction.guild.id),
    });
    return;
  }

  if (interaction.customId === DEV_SUPPORT_CHANNEL_SELECT_ID) {
    if (!isDeveloper(interaction.user.id)) {
      await interaction.reply({
        content: nya("이 기능은 개발자만 사용할 수 있습니다.") + "\n(오류 코드: DEV-001)",
        ephemeral: true,
      });
      return;
    }

    const channelId = interaction.values[0];
    const channel = interaction.guild.channels.cache.get(channelId);
    if (!channel) return;

    const msg = await channel.send({ embeds: [buildSupportEmbed()] });
    setSupportMessage(interaction.guild.id, channelId, msg.id);

    await interaction.update({
      content: nya(`${channel}에 운영 안내를 게시했습니다. 운영 시간 시작(10:00)·종료(19:00) KST에 자동으로 수정됩니다.`),
      embeds: [],
      components: [],
    });
    return;
  }

  // 타입별 전용 채널 설정
  if (interaction.customId.startsWith(LOG_TYPE_CHANNEL_SELECT_PREFIX)) {
    if (!hasManageGuild(interaction)) {
      await interaction.reply({ content: nya("이 설정은 서버 관리 권한이 있는 관리자만 사용할 수 있습니다.") + "\n(오류 코드: AUTH-001)", ephemeral: true });
      return;
    }
    const type      = interaction.customId.slice(LOG_TYPE_CHANNEL_SELECT_PREFIX.length);
    const channelId = interaction.values[0];
    const label     = LOG_OPTION_DEFS.find((d) => d.key === type)?.label ?? type;
    if (type === "raidAnnounce" || type === "raidAnnounceRelease") {
      setAnnounceChannel(interaction.guild.id, channelId);
    } else {
      setLogTypeChannel(interaction.guild.id, type, channelId);
    }
    const notifCh = interaction.guild.channels.cache.get(channelId);
    if (notifCh) await notifCh.send({ embeds: [new EmbedBuilder().setDescription(nya(`${label} 채널이 <#${channelId}>으로 변경되었습니다`)).setColor(0x57f287)] }).catch(() => {});
    await interaction.update({
      content: null,
      embeds: [buildLogTypeEmbed(interaction.guild.id, type)],
      components: buildLogTypeRows(interaction.guild.id, type),
    });
    return;
  }

  // 레거시 per-channel 핸들러 (하위 호환)
  if (interaction.customId.startsWith(LOG_PERCHANNEL_SELECT_PREFIX)) {
    if (!hasManageGuild(interaction)) {
      await interaction.reply({ content: nya("이 설정은 서버 관리 권한이 있는 관리자만 사용할 수 있습니다.") + "\n(오류 코드: AUTH-001)", ephemeral: true });
      return;
    }
    const type      = interaction.customId.slice(LOG_PERCHANNEL_SELECT_PREFIX.length);
    const channelId = interaction.values[0];
    const label     = LOG_OPTION_DEFS.find((d) => d.key === type)?.label ?? type;
    if (type === "raidAnnounce" || type === "raidAnnounceRelease") {
      setAnnounceChannel(interaction.guild.id, channelId);
    } else {
      setLogTypeChannel(interaction.guild.id, type, channelId);
    }
    const notifCh = interaction.guild.channels.cache.get(channelId);
    if (notifCh) await notifCh.send({ embeds: [new EmbedBuilder().setDescription(nya(`${label} 채널이 <#${channelId}>으로 변경되었습니다`)).setColor(0x57f287)] }).catch(() => {});
    await interaction.update({
      content: null,
      embeds: [buildLogTypeEmbed(interaction.guild.id, type)],
      components: buildLogTypeRows(interaction.guild.id, type),
    });
    return;
  }

  // 전체 채널 일괄 설정
  if (interaction.customId === LOG_BULK_CHANNEL_SELECT_ID) {
    if (!hasManageGuild(interaction)) {
      await interaction.reply({ content: nya("이 설정은 서버 관리 권한이 있는 관리자만 사용할 수 있습니다.") + "\n(오류 코드: AUTH-001)", ephemeral: true });
      return;
    }
    const channelId = interaction.values[0];
    setLogChannel(interaction.guild.id, channelId);
    for (const { key } of LOG_OPTION_DEFS) {
      setLogTypeChannel(interaction.guild.id, key, null);
    }
    const notifCh = interaction.guild.channels.cache.get(channelId);
    if (notifCh) await notifCh.send({ embeds: [new EmbedBuilder().setDescription(nya(`전체 로그 채널이 <#${channelId}>으로 변경되었습니다`)).setColor(0x57f287)] }).catch(() => {});
    await interaction.update({
      content: null,
      embeds: [buildLogEmbed(interaction.guild.id)],
      components: buildLogMainRows(),
    });
    return;
  }

  // 기본 채널 설정
  if (interaction.customId !== LOG_CHANNEL_SELECT_ID) return;

  if (!hasManageGuild(interaction)) {
    await interaction.reply({
      content: nya("이 설정은 서버 관리 권한이 있는 관리자만 사용할 수 있습니다.") + "\n(오류 코드: AUTH-001)",
      ephemeral: true,
    });
    return;
  }

  const channelId = interaction.values[0];
  setLogChannel(interaction.guild.id, channelId);
  const notifCh = interaction.guild.channels.cache.get(channelId);
  if (notifCh) await notifCh.send({ content: nya(`전체 로그 채널이 <#${channelId}>으로 변경되었습니다`) }).catch(() => {});
  await interaction.update({
    content: null,
    embeds: [buildLogEmbed(interaction.guild.id)],
    components: buildLogMainRows(),
  });
}

async function handleButton(interaction) {
  if (interaction.customId.startsWith(WARN_WIZARD_PREFIX)) {
    await handleWarnWizardButton(interaction);
    return;
  }

  if (interaction.customId.startsWith(WARN_BTN_PREFIX)) {
    if (!hasManageGuild(interaction)) {
      await interaction.reply({
        content: nya("이 기능은 서버 관리자만 사용할 수 있습니다.") + "\n(오류 코드: AUTH-001)",
        ephemeral: true,
      });
      return;
    }
    await handleWarnButton(interaction);
    return;
  }

  if (interaction.customId.startsWith(WARN_CFG_PREFIX)) {
    if (!hasManageGuild(interaction)) {
      await interaction.reply({
        content: nya("이 설정은 서버 관리 권한이 있는 관리자만 사용할 수 있습니다.") + "\n(오류 코드: AUTH-001)",
        ephemeral: true,
      });
      return;
    }
    await handleWarnCfgButton(interaction);
    return;
  }

  if (interaction.customId.startsWith(STREAMALERT_PLATFORM_BTN_PREFIX)) {
    await handleStreamAlertPlatformButton(interaction);
    return;
  }

  if (interaction.customId.startsWith(STREAMALERT_NAV_PREFIX)) {
    await handleStreamAlertNavButton(interaction);
    return;
  }

  if (interaction.customId.startsWith(STREAMALERT_DELETE_PREFIX)) {
    await handleStreamAlertDeleteButton(interaction);
    return;
  }

  if (interaction.customId.startsWith(STREAMALERT_TEST_PREFIX)) {
    await handleStreamAlertTestButton(interaction);
    return;
  }

  if (
    interaction.customId.startsWith(STREAMALERT_EDIT_PREFIX) &&
    interaction.customId !== STREAMALERT_EDIT_MODAL_ID
  ) {
    await handleStreamAlertEditButton(interaction);
    return;
  }

  if (interaction.customId.startsWith(STREAMALERT_ACTION_PREFIX)) {
    await handleStreamAlertActionButton(interaction);
    return;
  }

  if (interaction.customId.startsWith(LOG_ACTION_PREFIX)) {
    if (!hasManageGuild(interaction)) {
      await interaction.reply({
        content: nya("이 설정은 서버 관리 권한이 있는 관리자만 사용할 수 있습니다.") + "\n(오류 코드: AUTH-001)",
        ephemeral: true,
      });
      return;
    }

    const action = interaction.customId.slice(LOG_ACTION_PREFIX.length);

    if (action === "test") {
      const testButtons = LOG_OPTION_DEFS.map(({ key, label }) =>
        new ButtonBuilder()
          .setCustomId(`${LOG_TEST_PREFIX}${key}`)
          .setLabel(label)
          .setStyle(ButtonStyle.Secondary),
      );
      const testRows = [];
      for (let i = 0; i < testButtons.length; i += 5) {
        testRows.push(new ActionRowBuilder().addComponents(...testButtons.slice(i, i + 5)));
      }
      const backRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("log-action:back")
          .setLabel("← 뒤로")
          .setStyle(ButtonStyle.Secondary),
      );
      await interaction.update({
        content: null,
        embeds: [],
        components: [...testRows, backRow],
      });
      return;
    }

    if (action === "back") {
      await interaction.update({
        content: null,
        embeds: [buildLogEmbed(interaction.guild.id)],
        components: buildLogMainRows(),
      });
      return;
    }

    return;
  }

  // 전체 채널 일괄 설정 버튼
  if (interaction.customId === "log-bulk-channel") {
    if (!hasManageGuild(interaction)) {
      await interaction.reply({ content: nya("이 설정은 서버 관리 권한이 있는 관리자만 사용할 수 있습니다.") + "\n(오류 코드: AUTH-001)", ephemeral: true });
      return;
    }
    const channelSelect = new ChannelSelectMenuBuilder()
      .setCustomId(LOG_BULK_CHANNEL_SELECT_ID)
      .setPlaceholder("모든 로그 항목에 적용할 채널을 선택하세요")
      .addChannelTypes(ChannelType.GuildText)
      .setMinValues(1)
      .setMaxValues(1);
    await interaction.update({
      content: null,
      embeds: [],
      components: [
        new ActionRowBuilder().addComponents(channelSelect),
        new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId("log-action:back").setLabel("← 취소").setStyle(ButtonStyle.Secondary),
        ),
      ],
    });
    return;
  }

  // 전체 켜기
  if (interaction.customId === "log-bulk-on") {
    if (!hasManageGuild(interaction)) {
      await interaction.reply({ content: nya("이 설정은 서버 관리 권한이 있는 관리자만 사용할 수 있습니다.") + "\n(오류 코드: AUTH-001)", ephemeral: true });
      return;
    }
    for (const { key } of LOG_OPTION_DEFS) {
      setLogOption(interaction.guild.id, key, true);
    }
    await interaction.update({
      content: null,
      embeds: [buildLogEmbed(interaction.guild.id)],
      components: buildLogMainRows(),
    });
    return;
  }

  // 전체 끄기
  if (interaction.customId === "log-bulk-off") {
    if (!hasManageGuild(interaction)) {
      await interaction.reply({ content: nya("이 설정은 서버 관리 권한이 있는 관리자만 사용할 수 있습니다.") + "\n(오류 코드: AUTH-001)", ephemeral: true });
      return;
    }
    for (const { key } of LOG_OPTION_DEFS) {
      setLogOption(interaction.guild.id, key, false);
    }
    await interaction.update({
      content: null,
      embeds: [buildLogEmbed(interaction.guild.id)],
      components: buildLogMainRows(),
    });
    return;
  }

  // 타입별 채널 설정 버튼
  if (interaction.customId.startsWith(LOG_TYPE_CHANNEL_BTN_PREFIX)) {
    if (!hasManageGuild(interaction)) {
      await interaction.reply({ content: nya("이 설정은 서버 관리 권한이 있는 관리자만 사용할 수 있습니다.") + "\n(오류 코드: AUTH-001)", ephemeral: true });
      return;
    }
    const type = interaction.customId.slice(LOG_TYPE_CHANNEL_BTN_PREFIX.length);
    const label = LOG_OPTION_DEFS.find((d) => d.key === type)?.label ?? type;
    const channelSelect = new ChannelSelectMenuBuilder()
      .setCustomId(`${LOG_TYPE_CHANNEL_SELECT_PREFIX}${type}`)
      .setPlaceholder(`${label} 전용 채널을 선택하세요`)
      .addChannelTypes(ChannelType.GuildText)
      .setMinValues(1)
      .setMaxValues(1);
    await interaction.update({
      content: null,
      embeds: [],
      components: [
        new ActionRowBuilder().addComponents(channelSelect),
        new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId("log-action:back").setLabel("← 취소").setStyle(ButtonStyle.Secondary),
        ),
      ],
    });
    return;
  }

  if (interaction.customId.startsWith(LOG_TEST_PREFIX)) {
    if (!hasManageGuild(interaction)) {
      await interaction.reply({
        content: nya("이 설정은 서버 관리 권한이 있는 관리자만 사용할 수 있습니다.") + "\n(오류 코드: AUTH-001)",
        ephemeral: true,
      });
      return;
    }

    const type       = interaction.customId.slice(LOG_TEST_PREFIX.length);
    const channelId  = (type === "raidAnnounce" || type === "raidAnnounceRelease")
      ? getAnnounceChannelId(interaction.guild.id)
      : (getLogTypeChannels(interaction.guild.id)[type] ?? getLogChannelId(interaction.guild.id));
    if (!channelId) {
      await interaction.reply({
        content: nya("로그 채널이 설정되어 있지 않습니다. 먼저 채널을 설정해주세요."),
        ephemeral: true,
      });
      return;
    }

    const logChannel = interaction.guild.channels.cache.get(channelId);
    if (!logChannel) {
      await interaction.reply({
        content: nya("설정된 로그 채널을 찾을 수 없습니다. 채널이 삭제되었거나 봇의 접근 권한이 없을 수 있습니다."),
        ephemeral: true,
      });
      return;
    }
    const user = interaction.user;
    const channel = interaction.channel;
    const now = Math.floor(Date.now() / 1000);

    const TEST_SUFFIX = " *(🧪 테스트)*";
    let embed;

    if (type === "messageDelete") {
      embed = new EmbedBuilder()
        .setTitle("메시지 삭제" + TEST_SUFFIX)
        .addFields(
          { name: "작성자", value: `${user}`, inline: true },
          { name: "채널", value: `${channel}`, inline: true },
          { name: "내용", value: "테스트 메시지입니다." },
        )
        .setColor(0xed4245).setTimestamp();
    } else if (type === "messageEdit") {
      embed = new EmbedBuilder()
        .setTitle("메시지 수정" + TEST_SUFFIX)
        .addFields(
          { name: "작성자", value: `${user}`, inline: true },
          { name: "채널", value: `${channel}`, inline: true },
          { name: "이전 내용", value: "수정 전 메시지입니다." },
          { name: "변경된 내용", value: "수정 후 메시지입니다." },
        )
        .setColor(0xe1aa74).setTimestamp();
    } else if (type === "voiceJoin") {
      embed = new EmbedBuilder()
        .setTitle("음성 채널 입장" + TEST_SUFFIX)
        .addFields(
          { name: "사용자", value: `${user}`, inline: true },
          { name: "채널", value: "(테스트 채널)", inline: true },
        )
        .setColor(0xe1aa74).setTimestamp();
    } else if (type === "voiceLeave") {
      embed = new EmbedBuilder()
        .setTitle("음성 채널 퇴장" + TEST_SUFFIX)
        .addFields(
          { name: "사용자", value: `${user}`, inline: true },
          { name: "채널", value: "(테스트 채널)", inline: true },
        )
        .setColor(0xed4245).setTimestamp();
    } else if (type === "profanityFilter") {
      embed = new EmbedBuilder()
        .setTitle("욕설 검열" + TEST_SUFFIX)
        .addFields(
          { name: "작성자", value: `${user}`, inline: true },
          { name: "채널", value: `${channel}`, inline: true },
          { name: "내용", value: "(욕설이 포함된 메시지)" },
        )
        .setColor(0xed4245).setTimestamp();
    } else if (type === "spamFilter") {
      embed = new EmbedBuilder()
        .setTitle("도배 검열" + TEST_SUFFIX)
        .addFields(
          { name: "작성자", value: `${user}`, inline: true },
          { name: "채널", value: `${channel}`, inline: true },
          { name: "내용", value: "(도배 메시지)" },
        )
        .setColor(0xed4245).setTimestamp();
    } else if (type === "warnLog") {
      embed = new EmbedBuilder()
        .setTitle("⚠️ 경고 지급" + TEST_SUFFIX)
        .setThumbnail(user.displayAvatarURL())
        .addFields(
          { name: "대상",      value: `${user}`,  inline: true },
          { name: "현재 경고", value: "**1회**",   inline: true },
          { name: "담당자",    value: `${user}`,  inline: true },
          { name: "이유",      value: "테스트" },
        )
        .setColor(0xffa500).setTimestamp();
    } else if (type === "raidAlert") {
      embed = new EmbedBuilder()
        .setTitle("🚨 레이드 감지!" + TEST_SUFFIX)
        .setColor(0xed4245)
        .addFields(
          { name: "감지 닉네임", value: "`TestRaider`",      inline: true },
          { name: "입장 인원",   value: "3명",               inline: true },
          { name: "조치",        value: "⚠️ 경고만",          inline: true },
          { name: "입장자 목록", value: `${user} \`(테스트)\`` },
        )
        .setTimestamp();
    } else if (type === "raidAnnounce") {
      embed = new EmbedBuilder()
        .setTitle("🚨 서버 보안 경보" + TEST_SUFFIX)
        .setDescription(
          "동일한 닉네임의 대량 입장이 감지되었습니다.\n\n**현재 상황**\n🔴 모든 초대 링크가 일시 차단되었습니다\n🔴 채널 메시지 전송이 임시 잠금되었습니다\n🔧 관리자가 조치 중입니다 — 잠시 기다려 주세요",
        )
        .setColor(0xed4245)
        .setTimestamp();
    } else if (type === "raidAnnounceRelease") {
      embed = new EmbedBuilder()
        .setTitle("✅ 서버 보안 경보 해제" + TEST_SUFFIX)
        .setDescription(
          "레이드 경보가 해제되었습니다. 서버가 정상 운영 상태로 돌아왔습니다.\n✅ 채널 잠금이 풀렸습니다\n✅ 초대 링크가 다시 활성화되었습니다",
        )
        .setColor(0x57f287)
        .setTimestamp();
    }

    if (!embed) {
      await interaction.reply({ content: nya("해당 유형의 테스트 임베드가 없습니다."), ephemeral: true });
      return;
    }

    await logChannel.send({ embeds: [embed] }).catch(() => {});
    await interaction.reply({
      content: nya(`${logChannel} 채널에 테스트 메시지를 보냈습니다`),
      ephemeral: true,
    });
    return;
  }

  if (interaction.customId.startsWith(LOG_TOGGLE_PREFIX)) {
    if (!hasManageGuild(interaction)) {
      await interaction.reply({
        content: nya("이 설정은 서버 관리 권한이 있는 관리자만 사용할 수 있습니다.") + "\n(오류 코드: AUTH-001)",
        ephemeral: true,
      });
      return;
    }

    const key = interaction.customId.slice(LOG_TOGGLE_PREFIX.length);
    const options = getLogOptions(interaction.guild.id);
    setLogOption(interaction.guild.id, key, !options[key]);

    await interaction.update({
      content: null,
      embeds: [buildLogTypeEmbed(interaction.guild.id, key)],
      components: buildLogTypeRows(interaction.guild.id, key),
    });
    return;
  }

  if (interaction.customId.startsWith(WELCOME_ACTION_PREFIX)) {
    if (!hasManageGuild(interaction)) {
      await interaction.reply({
        content: nya("이 설정은 서버 관리 권한이 있는 관리자만 사용할 수 있습니다.") + "\n(오류 코드: AUTH-001)",
        ephemeral: true,
      });
      return;
    }

    const action = interaction.customId.slice(WELCOME_ACTION_PREFIX.length);

    if (action === "join-channel") {
      const channelSelect = new ChannelSelectMenuBuilder()
        .setCustomId(WELCOME_JOIN_CHANNEL_SELECT_ID)
        .setPlaceholder("입장 알림을 받을 채널을 선택하세요")
        .addChannelTypes(ChannelType.GuildText)
        .setMinValues(1)
        .setMaxValues(1);

      const row = new ActionRowBuilder().addComponents(channelSelect);

      await interaction.update({
        content: nya("입장 알림을 받을 채널을 선택하세요."),
        embeds: [],
        components: [row],
      });
      return;
    }

    if (action === "leave-channel") {
      const channelSelect = new ChannelSelectMenuBuilder()
        .setCustomId(WELCOME_LEAVE_CHANNEL_SELECT_ID)
        .setPlaceholder("퇴장 알림을 받을 채널을 선택하세요")
        .addChannelTypes(ChannelType.GuildText)
        .setMinValues(1)
        .setMaxValues(1);

      const row = new ActionRowBuilder().addComponents(channelSelect);

      await interaction.update({
        content: nya("퇴장 알림을 받을 채널을 선택하세요."),
        embeds: [],
        components: [row],
      });
      return;
    }

    if (action === "join-message" || action === "leave-message") {
      const type = action === "join-message" ? "join" : "leave";
      await showWelcomeMessageModal(interaction, type);
      return;
    }

    if (action === "test-join" || action === "test-leave") {
      const isJoin = action === "test-join";
      const channelId = isJoin
        ? getJoinChannelId(interaction.guild.id)
        : getLeaveChannelId(interaction.guild.id);
      if (!channelId) {
        await interaction.reply({
          content: nya(`${isJoin ? "입장" : "퇴장"} 채널이 설정되어 있지 않습니다. 먼저 채널을 설정해주세요.`),
          ephemeral: true,
        });
        return;
      }

      const channel = interaction.guild.channels.cache.get(channelId);
      if (!channel) {
        await interaction.reply({
          content: nya("설정된 채널을 찾을 수 없습니다."),
          ephemeral: true,
        });
        return;
      }

      const options = getWelcomeOptions(interaction.guild.id);
      const template = getWelcomeMessage(interaction.guild.id, isJoin ? "join" : "leave");
      const description = formatWelcomeMessage(template, {
        user: interaction.user,
        guild: interaction.guild,
      }) + " *(🧪 테스트)*";

      const embed = new EmbedBuilder()
        .setDescription(description)
        .setThumbnail(interaction.user.displayAvatarURL())
        .setColor(isJoin ? 0xe1aa74 : 0xed4245)
        .setTimestamp();

      const now = Math.floor(Date.now() / 1000);
      const fields = [];
      if (options.showCreatedAt) {
        fields.push({
          name: "📅 계정 생성일",
          value: `<t:${Math.floor(interaction.user.createdTimestamp / 1000)}:F>`,
          inline: true,
        });
      }
      if (options.showJoinedAt) {
        fields.push({
          name: "🚪 서버 입장일",
          value: `<t:${now}:F>`,
          inline: true,
        });
      }
      if (isJoin && options.showInviter) {
        fields.push({ name: "📨 초대자", value: "(테스트)", inline: true });
      }
      if (!isJoin && options.showLeftAt) {
        fields.push({ name: "👋 퇴장 일시", value: `<t:${now}:F>`, inline: true });
      }
      if (options.showMemberCount) {
        fields.push({
          name: "👥 현재 인원",
          value: `${interaction.guild.memberCount}명`,
          inline: true,
        });
      }
      if (fields.length) embed.addFields(fields);

      await channel.send({ embeds: [embed] }).catch(() => {});
      await interaction.reply({
        content: nya(`${channel} 채널에 테스트 메시지를 보냈습니다`),
        ephemeral: true,
      });
      return;
    }

    return;
  }

  if (interaction.customId.startsWith(WELCOME_TOGGLE_PREFIX)) {
    if (!hasManageGuild(interaction)) {
      await interaction.reply({
        content: nya("이 설정은 서버 관리 권한이 있는 관리자만 사용할 수 있습니다.") + "\n(오류 코드: AUTH-001)",
        ephemeral: true,
      });
      return;
    }

    const key = interaction.customId.slice(WELCOME_TOGGLE_PREFIX.length);
    const options = getWelcomeOptions(interaction.guild.id);
    setWelcomeOption(interaction.guild.id, key, !options[key]);

    await interaction.update({
      embeds: [buildWelcomeEmbed(interaction.guild.id)],
      components: buildWelcomeRows(interaction.guild.id),
    });
    return;
  }

  if (interaction.customId === "censor-action:back") {
    if (!hasManageGuild(interaction)) {
      await interaction.reply({ content: nya("이 설정은 서버 관리 권한이 있는 관리자만 사용할 수 있습니다.") + "\n(오류 코드: AUTH-001)", ephemeral: true });
      return;
    }
    await interaction.update({
      content: null,
      embeds: [buildCensorMenuEmbed(interaction.guild.id)],
      components: [buildCensorMenuRow()],
    });
    return;
  }

  if (interaction.customId === "censor-action:profanity") {
    if (!hasManageGuild(interaction)) {
      await interaction.reply({ content: nya("이 설정은 서버 관리 권한이 있는 관리자만 사용할 수 있습니다.") + "\n(오류 코드: AUTH-001)", ephemeral: true });
      return;
    }
    await interaction.update({
      embeds: [buildCensorFilterEmbed(interaction.guild.id, "profanityFilter")],
      components: [buildCensorFilterRow(interaction.guild.id, "profanityFilter")],
    });
    return;
  }

  if (interaction.customId === "censor-action:spam") {
    if (!hasManageGuild(interaction)) {
      await interaction.reply({ content: nya("이 설정은 서버 관리 권한이 있는 관리자만 사용할 수 있습니다.") + "\n(오류 코드: AUTH-001)", ephemeral: true });
      return;
    }
    await interaction.update({
      embeds: [buildSpamEmbed(interaction.guild.id)],
      components: buildSpamRows(interaction.guild.id),
    });
    return;
  }

  if (interaction.customId === "censor-action:raid") {
    if (!hasManageGuild(interaction)) {
      await interaction.reply({ content: nya("이 설정은 서버 관리 권한이 있는 관리자만 사용할 수 있습니다.") + "\n(오류 코드: AUTH-001)", ephemeral: true });
      return;
    }
    await interaction.update({
      embeds: [buildRaidEmbed(interaction.guild.id)],
      components: buildRaidRows(interaction.guild.id),
    });
    return;
  }

  if (interaction.customId.startsWith("censor-toggle:")) {
    if (!hasManageGuild(interaction)) {
      await interaction.reply({ content: nya("이 설정은 서버 관리 권한이 있는 관리자만 사용할 수 있습니다.") + "\n(오류 코드: AUTH-001)", ephemeral: true });
      return;
    }
    const key = interaction.customId.slice("censor-toggle:".length);
    const enabled = getLogOptions(interaction.guild.id)[key];
    setLogOption(interaction.guild.id, key, !enabled);

    if (key === "spamFilter") {
      await interaction.update({
        embeds: [buildSpamEmbed(interaction.guild.id)],
        components: buildSpamRows(interaction.guild.id),
      });
    } else {
      await interaction.update({
        embeds: [buildCensorFilterEmbed(interaction.guild.id, key)],
        components: [buildCensorFilterRow(interaction.guild.id, key)],
      });
    }
    return;
  }

  if (interaction.customId.startsWith("censor-spam-level:")) {
    if (!hasManageGuild(interaction)) {
      await interaction.reply({ content: nya("이 설정은 서버 관리 권한이 있는 관리자만 사용할 수 있습니다.") + "\n(오류 코드: AUTH-001)", ephemeral: true });
      return;
    }
    const level = parseInt(interaction.customId.slice("censor-spam-level:".length), 10);
    setSpamLevel(interaction.guild.id, level);
    await interaction.update({
      embeds: [buildSpamEmbed(interaction.guild.id)],
      components: buildSpamRows(interaction.guild.id),
    });
    return;
  }

  if (interaction.customId.startsWith("censor-raid-toggle:")) {
    if (!hasManageGuild(interaction)) {
      await interaction.reply({ content: nya("이 설정은 서버 관리 권한이 있는 관리자만 사용할 수 있습니다.") + "\n(오류 코드: AUTH-001)", ephemeral: true });
      return;
    }
    const field = interaction.customId.slice("censor-raid-toggle:".length);
    const cfg = getRaidConfig(interaction.guild.id);
    setRaidConfig(interaction.guild.id, { [field]: !cfg[field] });
    await interaction.update({
      embeds: [buildRaidEmbed(interaction.guild.id)],
      components: buildRaidRows(interaction.guild.id),
    });
    return;
  }

  if (interaction.customId.startsWith("censor-raid-action:")) {
    if (!hasManageGuild(interaction)) {
      await interaction.reply({ content: nya("이 설정은 서버 관리 권한이 있는 관리자만 사용할 수 있습니다.") + "\n(오류 코드: AUTH-001)", ephemeral: true });
      return;
    }
    const action = interaction.customId.slice("censor-raid-action:".length);
    setRaidConfig(interaction.guild.id, { action });
    await interaction.update({
      embeds: [buildRaidEmbed(interaction.guild.id)],
      components: buildRaidRows(interaction.guild.id),
    });
    return;
  }

  if (interaction.customId === "censor-raid-unlock") {
    if (!hasManageGuild(interaction)) {
      await interaction.reply({ content: nya("이 설정은 서버 관리 권한이 있는 관리자만 사용할 수 있습니다.") + "\n(오류 코드: AUTH-001)", ephemeral: true });
      return;
    }
    if (!isRaidLocked(interaction.guild.id)) {
      await interaction.reply({ content: nya("현재 레이드 경보가 활성화되어 있지 않습니다."), ephemeral: true });
      return;
    }

    let unlockedCount = 0;
    for (const [, channel] of interaction.guild.channels.cache) {
      if (!channel.isTextBased?.() || !channel.permissionOverwrites) continue;
      try {
        await channel.permissionOverwrites.edit(
          interaction.guild.roles.everyone,
          { SendMessages: null },
          { reason: "레이드 경보 해제" },
        );
        unlockedCount++;
      } catch {
        // 채널 접근 불가 무시
      }
    }

    setRaidLocked(interaction.guild.id, false);

    // 초대 링크 재활성화
    await interaction.guild.edit({
      features: interaction.guild.features.filter((f) => f !== "INVITES_DISABLED"),
    }).catch(() => {});

    // 서버원 해제 공지 (raidAnnounceRelease 옵션이 켜진 경우)
    if (getLogOptions(interaction.guild.id).raidAnnounceRelease) {
      const announceChId = getAnnounceChannelId(interaction.guild.id);
      if (announceChId) {
        const releaseCh = interaction.guild.channels.cache.get(announceChId);
        if (releaseCh) {
          const releaseEmbed = new EmbedBuilder()
            .setTitle("✅ 서버 보안 경보 해제")
            .setDescription(
              "레이드 경보가 해제되었습니다. 서버가 정상 운영 상태로 돌아왔습니다.\n✅ 채널 잠금이 풀렸습니다\n✅ 초대 링크가 다시 활성화되었습니다",
            )
            .setColor(0x57f287)
            .setTimestamp();
          await releaseCh.send({ embeds: [releaseEmbed] }).catch(() => {});
        }
      }
    }

    await interaction.update({
      embeds: [buildRaidEmbed(interaction.guild.id)],
      components: buildRaidRows(interaction.guild.id),
    });
    await interaction.followUp({
      content: nya(`레이드 경보를 해제했습니다. ${unlockedCount}개 채널의 잠금을 풀고 초대 링크도 다시 활성화했습니다`),
      ephemeral: true,
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
      await interaction.update({
        content: nya(`${interaction.user}님의 치유미코인 보유량: ${balance}개`),
        embeds: [],
        components: [],
      });
      return;
    }

    if (action === "rank") {
      const balances = getAllBalances();
      const top10 = Object.entries(balances)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);

      const lines = top10.map(
        ([userId, balance], index) => `${index + 1}. <@${userId}> - ${balance}개`,
      );

      const embed = new EmbedBuilder()
        .setTitle("치유미코인 순위")
        .setDescription(lines.join("\n") || nya("아직 데이터가 없습니다"))
        .setColor(0xe1aa74);

      await interaction.update({
        content: null,
        embeds: [embed],
        components: [],
      });
      return;
    }

    if (action === "dev") {
      if (!isDeveloper(interaction.user.id)) {
        await interaction.reply({
          content: nya("이 버튼은 개발자만 사용할 수 있습니다.") + "\n(오류 코드: DEV-001)",
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

      const lookupButton = new ButtonBuilder()
        .setCustomId(`${COIN_DEV_ACTION_PREFIX}lookup`)
        .setLabel("다른 사용자 조회")
        .setStyle(ButtonStyle.Primary);

      const row = new ActionRowBuilder().addComponents(
        grantButton,
        deductButton,
        lookupButton,
      );

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
        content: nya("이 버튼은 개발자만 사용할 수 있습니다.") + "\n(오류 코드: DEV-001)",
        ephemeral: true,
      });
      return;
    }

    const direction = interaction.customId.slice(COIN_DEV_ACTION_PREFIX.length);

    if (direction === "lookup") {
      await showDevLookupModal(interaction);
      return;
    }

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

  if (interaction.customId.startsWith(STATS_FILTER_PREFIX)) {
    await handleStatsFilterButton(interaction);
    return;
  }

  if (interaction.customId.startsWith(STATS_DETAIL_PREFIX)) {
    await handleStatsDetailButton(interaction);
    return;
  }

  if (interaction.customId.startsWith(RANK_PAGE_PREFIX)) {
    await handleRankPageButton(interaction);
    return;
  }

  if (interaction.customId.startsWith(RANK_ACTION_PREFIX)) {
    const rankActionType = interaction.customId.slice(RANK_ACTION_PREFIX.length);

    if (rankActionType === "levelup") {
      await handleLevelUpSettingsButton(interaction);
      return;
    }

    await handleRankLeaderboard(interaction);
    return;
  }

  if (interaction.customId.startsWith(RANK_LEVELUP_ACTION_PREFIX)) {
    await handleLevelUpActionButton(interaction);
    return;
  }

  if (interaction.customId.startsWith(TICKET_ACTION_PREFIX)) {
    await handleTicketActionButton(interaction);
    return;
  }

  if (interaction.customId === TICKET_CREATE_ID) {
    await handleTicketCreate(interaction);
    return;
  }

  if (interaction.customId.startsWith(TICKET_MANAGE_PREFIX)) {
    await handleTicketManage(interaction);
    return;
  }

  if (interaction.customId.startsWith(WORDCHAIN_ACTION_PREFIX)) {
    await handleWordChainActionButton(interaction);
    return;
  }

  if (interaction.customId === WORDCHAIN_CREATE_ID) {
    await handleWordChainCreate(interaction);
    return;
  }

  if (interaction.customId.startsWith(WORDCHAIN_JOIN_PREFIX)) {
    await handleWordChainJoin(interaction);
    return;
  }

  if (interaction.customId.startsWith(WORDCHAIN_START_PREFIX)) {
    await handleWordChainStart(interaction);
    return;
  }

  if (interaction.customId.startsWith(WORDCHAIN_DISBAND_PREFIX)) {
    await handleWordChainDisband(interaction);
    return;
  }

  if (interaction.customId.startsWith(STOCK_ACTION_PREFIX)) {
    await handleStockAction(interaction);
    return;
  }

  if (interaction.customId.startsWith(BANK_ACTION_PREFIX)) {
    await handleBankAction(interaction);
    return;
  }

  if (interaction.customId.startsWith(PET_ACTION_PREFIX)) {
    await handlePetAction(interaction);
    return;
  }

  if (interaction.customId.startsWith(DEV_ACTION_PREFIX)) {
    await handleDevAction(interaction);
    return;
  }

  if (interaction.customId.startsWith(GAMBLE_ACTION_PREFIX)) {
    const game = interaction.customId.slice(GAMBLE_ACTION_PREFIX.length);
    await showGambleMult(interaction, game);
    return;
  }

  if (interaction.customId.startsWith(GAMBLE_MULT_PREFIX)) {
    const rest = interaction.customId.slice(GAMBLE_MULT_PREFIX.length);
    if (rest === "cancel") {
      await interaction.update({ embeds: [buildGambleEmbed()], components: [buildGambleRow()] });
      return;
    }
    const lastColon = rest.lastIndexOf(":");
    const game = rest.slice(0, lastColon);
    const mult = parseInt(rest.slice(lastColon + 1));
    await showGambleModal(interaction, game, mult);
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
        content: nya("이 설정은 역할 관리 권한이 있는 관리자만 사용할 수 있습니다.") + "\n(오류 코드: AUTH-001)",
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
      content: nya("서버에서만 사용할 수 있는 버튼입니다.") + "\n(오류 코드: GUILD-001)",
      ephemeral: true,
    });
    return;
  }

  const roleId = interaction.customId.slice(VERIFY_BUTTON_PREFIX.length);
  const role = interaction.guild.roles.cache.get(roleId);

  if (!role) {
    await interaction.reply({
      content: nya("인증 역할을 찾을 수 없습니다. 관리자에게 문의해주세요.") + "\n(오류 코드: ROLE-003)",
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
      content: nya("역할을 지급하지 못했습니다. 봇 권한과 역할 순서를 확인해주세요.") + "\n(오류 코드: ROLE-004)",
      ephemeral: true,
    });
  }
}

async function showDevLookupModal(interaction) {
  const modal = new ModalBuilder()
    .setCustomId(`${COIN_DEV_MODAL_PREFIX}lookup`)
    .setTitle("다른 사용자 조회");

  const userIdInput = new TextInputBuilder()
    .setCustomId("user_id")
    .setLabel("조회할 사용자 ID")
    .setStyle(TextInputStyle.Short)
    .setRequired(true);

  modal.addComponents(new ActionRowBuilder().addComponents(userIdInput));

  await interaction.showModal(modal);
}

async function handleDevLookupModal(interaction) {
  if (!isDeveloper(interaction.user.id)) {
    await interaction.reply({
      content: nya("이 기능은 개발자만 사용할 수 있습니다.") + "\n(오류 코드: DEV-001)",
      ephemeral: true,
    });
    return;
  }

  const targetUserId = interaction.fields.getTextInputValue("user_id").trim();

  if (!/^\d{15,20}$/.test(targetUserId)) {
    await interaction.reply({
      content: nya("올바른 사용자 ID가 아닙니다.") + "\n(오류 코드: DEV-002)",
      ephemeral: true,
    });
    return;
  }

  const balance = getBalance(targetUserId);

  await interaction.update({
    content: nya(`<@${targetUserId}>님의 치유미코인 보유량: ${balance}개`),
    components: [],
  });
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
      content: nya("이 기능은 개발자만 사용할 수 있습니다.") + "\n(오류 코드: DEV-001)",
      ephemeral: true,
    });
    return;
  }

  const targetUserId = interaction.fields.getTextInputValue("user_id").trim();
  const amountText = interaction.fields.getTextInputValue("amount").trim();
  const rawAmount = Number(amountText);

  if (!/^\d{15,20}$/.test(targetUserId)) {
    await interaction.reply({
      content: nya("올바른 사용자 ID가 아닙니다.") + "\n(오류 코드: DEV-002)",
      ephemeral: true,
    });
    return;
  }

  if (
    !Number.isInteger(rawAmount) ||
    rawAmount <= 0 ||
    rawAmount > DEV_GRANT_MAX_AMOUNT
  ) {
    await interaction.reply({
      content: nya(`올바른 금액이 아닙니다. 1~${DEV_GRANT_MAX_AMOUNT}개까지만 가능합니다.`) + "\n(오류 코드: DEV-003)",
      ephemeral: true,
    });
    return;
  }

  const amount = direction === "deduct" ? -rawAmount : rawAmount;
  const newBalance = addBalance(targetUserId, amount);
  const actionText = direction === "deduct" ? "차감" : "지급";

  await interaction.update({
    content: nya(
      `<@${targetUserId}>님에게 ${Math.abs(amount)} 치유미코인을 ${actionText}했습니다. 현재 보유량: ${newBalance}개`,
    ),
    components: [],
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
      content: nya("닉네임#태그 형식으로 입력해주세요. 예: Hide on bush#KR1") + "\n(오류 코드: STATS-001)",
      ephemeral: true,
    });
    return;
  }

  // 게임 선택 메시지 삭제 (모달 제출 시점에 더 이상 필요 없음)
  const prevStatsState = userStatsTokens.get(interaction.user.id);
  if (prevStatsState?.cmdToken) {
    userStatsTokens.set(interaction.user.id, { applicationId: prevStatsState.applicationId });
    await tryDeleteInteractionMsg(interaction.client, prevStatsState.applicationId, prevStatsState.cmdToken);
  }

  await interaction.deferReply({ ephemeral: true });

  let account;
  try {
    account = await getAccountByRiotId(gameName, tagLine);
  } catch (error) {
    if (error.status === 404) {
      await interaction.editReply(nya(`'${riotId}' 소환사를 찾을 수 없습니다.`) + "\n(오류 코드: STATS-002)");
      return;
    }
    console.error(error);
    await interaction.editReply(nya("전적을 불러오는 중 오류가 발생했습니다.") + "\n(오류 코드: STATS-003)");
    return;
  }

  try {
    const [summoner, leagueEntries, matchIds] = await Promise.all([
      getSummonerByPuuid(account.puuid),
      getLeagueEntriesByPuuid(account.puuid),
      getMatchIdsByPuuid(account.puuid, 10),
    ]);

    if (matchIds.length === 0) {
      await interaction.editReply(nya(`'${riotId}'님은 전적이 비공개라서 표시할 수 없습니다.`));
      return;
    }

    const matches = await Promise.all(matchIds.map((id) => getMatchById(id)));

    const soloEntry = leagueEntries.find((e) => e.queueType === "RANKED_SOLO_5x5") ?? null;
    const flexEntry = leagueEntries.find((e) => e.queueType === "RANKED_FLEX_SR") ?? null;

    const session = {
      puuid: account.puuid,
      account,
      summoner,
      soloEntry,
      flexEntry,
      matches,
    };
    const sessionId = createStatsSession(session);

    const displayWithIdx = matches.slice(0, 5).map((match, i) => ({ match, originalIndex: i }));
    const { embeds, files } = buildStatsEmbeds(session, displayWithIdx);
    const components = buildStatsRows(sessionId, displayWithIdx, session);

    await interaction.editReply({ content: null, embeds, components, files });

    // 다음 검색 시 삭제할 수 있도록 토큰 보관
    userStatsTokens.set(interaction.user.id, {
      applicationId: interaction.applicationId,
      statsToken: interaction.token,
    });
  } catch (error) {
    console.error(error);
    await interaction.editReply(nya("전적을 불러오는 중 오류가 발생했습니다.") + "\n(오류 코드: STATS-003)");
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

const TIER_COLORS = {
  IRON: 0x958a8a,
  BRONZE: 0xad5624,
  SILVER: 0x839aa3,
  GOLD: 0xcd8b3d,
  PLATINUM: 0x4aa387,
  EMERALD: 0x1a9e60,
  DIAMOND: 0x576cce,
  MASTER: 0x9d48e0,
  GRANDMASTER: 0xd44942,
  CHALLENGER: 0xf4c874,
};

const TIER_DATA = (() => {
  try {
    return require(path.join(__dirname, "..", "assets", "tiers", "tierData.js"));
  } catch {
    return {};
  }
})();

// userId → { applicationId, cmdToken?, statsToken? }
const userStatsTokens = new Map();

async function tryDeleteInteractionMsg(client, applicationId, token) {
  if (!token) return;
  try {
    await client.rest.delete(`/webhooks/${applicationId}/${token}/messages/@original`);
  } catch {}
}

async function cleanupUserStats(client, userId) {
  const state = userStatsTokens.get(userId);
  if (!state) return;
  userStatsTokens.delete(userId);
  await Promise.allSettled([
    tryDeleteInteractionMsg(client, state.applicationId, state.cmdToken),
    tryDeleteInteractionMsg(client, state.applicationId, state.statsToken),
  ]);
}

function getTierAttachment(tier, suffix) {
  if (!tier) return null;
  const key = tier.toLowerCase();
  const b64 = TIER_DATA[key];
  if (!b64) return null;
  const name = suffix ? `${key}-${suffix}.png` : `${key}.png`;
  return new AttachmentBuilder(Buffer.from(b64, "base64"), { name });
}

function formatRankEntry(entry) {
  if (!entry) return "정보 없음";
  return `${entry.tier} ${entry.rank}  ${entry.leaguePoints}LP\n${entry.wins}승 ${entry.losses}패`;
}

function buildMatchLines(matches, puuid) {
  if (matches.length === 0) return "해당 게임 모드의 전적이 없습니다";
  return matches.map(({ match }, i) => {
    const p = match.info.participants.find((x) => x.puuid === puuid);
    if (!p) return null;
    const queue = QUEUE_NAMES[match.info.queueId] ?? `큐 ${match.info.queueId}`;
    const result = p.win ? "✅ 승리" : "❌ 패배";
    return `\`${i + 1}\` ${queue}  **${p.championName}**  ${p.kills}/${p.deaths}/${p.assists}  ${result}  ${formatDuration(match.info.gameDuration)}`;
  }).filter(Boolean).join("\n") || "해당 게임 모드의 전적이 없습니다";
}

function buildStatsEmbeds(session, displayWithIdx) {
  const { account, summoner, soloEntry, flexEntry } = session;

  const soloAttachment = getTierAttachment(soloEntry?.tier, "solo");
  const flexAttachment = getTierAttachment(flexEntry?.tier, "flex");

  const embed1 = new EmbedBuilder()
    .setTitle(`${account.gameName}#${account.tagLine}`)
    .setColor(TIER_COLORS[soloEntry?.tier?.toUpperCase()] ?? 0xe1aa74)
    .addFields(
      { name: "소환사 레벨", value: `Lv. **${summoner.summonerLevel}**`, inline: true },
      { name: "솔로랭크", value: formatRankEntry(soloEntry), inline: true },
    );
  if (soloAttachment) embed1.setThumbnail(`attachment://${soloAttachment.name}`);

  const embed2 = new EmbedBuilder()
    .setColor(TIER_COLORS[flexEntry?.tier?.toUpperCase()] ?? 0xe1aa74)
    .addFields(
      { name: "자유랭크", value: formatRankEntry(flexEntry), inline: true },
      { name: "최근 전적", value: buildMatchLines(displayWithIdx, session.puuid) },
    );
  if (flexAttachment) embed2.setThumbnail(`attachment://${flexAttachment.name}`);

  const files = [soloAttachment, flexAttachment].filter(Boolean);
  return { embeds: [embed1, embed2], files };
}

function buildStatsRows(sessionId, displayWithIdx, session) {
  const presentQueues = new Set(session.matches.map((m) => m.info.queueId));
  const filterDefs = [
    { label: "전체", id: 0 },
    { label: "솔로랭크", id: 420 },
    { label: "자유랭크", id: 440 },
    { label: "칼바람", id: 450 },
  ];

  const filterRow = new ActionRowBuilder().addComponents(
    filterDefs
      .filter((f) => f.id === 0 || presentQueues.has(f.id))
      .map((f) =>
        new ButtonBuilder()
          .setCustomId(`${STATS_FILTER_PREFIX}${sessionId}:${f.id}`)
          .setLabel(f.label)
          .setStyle(ButtonStyle.Secondary),
      ),
  );

  const detailRow = new ActionRowBuilder().addComponents(
    displayWithIdx.map(({ originalIndex }, i) =>
      new ButtonBuilder()
        .setCustomId(`${STATS_DETAIL_PREFIX}${sessionId}:${originalIndex}`)
        .setLabel(`${i + 1}경기 더보기`)
        .setStyle(ButtonStyle.Primary),
    ),
  );

  return [filterRow, detailRow];
}

async function handleStatsFilterButton(interaction) {
  const [sessionId, queueIdStr] = interaction.customId
    .slice(STATS_FILTER_PREFIX.length)
    .split(":");
  const queueId = Number(queueIdStr);
  const session = getStatsSession(sessionId);

  if (!session) {
    await interaction.reply({
      content: nya("전적 정보가 만료되었습니다. 다시 검색해주세요.") + "\n(오류 코드: STATS-004)",
      ephemeral: true,
    });
    return;
  }

  const filteredWithIdx = session.matches
    .map((match, originalIndex) => ({ match, originalIndex }))
    .filter(({ match }) => queueId === 0 || match.info.queueId === queueId);

  const displayWithIdx = filteredWithIdx.slice(0, 5);
  const { embeds, files } = buildStatsEmbeds(session, displayWithIdx);
  const components = buildStatsRows(sessionId, displayWithIdx, session);

  await interaction.update({ embeds, components, files });
}

async function handleStatsDetailButton(interaction) {
  const [sessionId, indexText] = interaction.customId
    .slice(STATS_DETAIL_PREFIX.length)
    .split(":");
  const session = getStatsSession(sessionId);

  if (!session) {
    await interaction.reply({
      content: nya("전적 정보가 만료되었습니다. 다시 검색해주세요.") + "\n(오류 코드: STATS-004)",
      ephemeral: true,
    });
    return;
  }

  const match = session.matches[Number(indexText)];

  if (!match) {
    await interaction.reply({
      content: nya("해당 경기를 찾을 수 없습니다.") + "\n(오류 코드: STATS-005)",
      ephemeral: true,
    });
    return;
  }

  const participant = match.info.participants.find((p) => p.puuid === session.puuid);
  if (!participant) {
    await interaction.reply({
      content: nya("경기 데이터를 불러올 수 없습니다.") + "\n(오류 코드: STATS-006)",
      ephemeral: true,
    });
    return;
  }

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

async function showWelcomeMessageModal(interaction, type) {
  const modal = new ModalBuilder()
    .setCustomId(`${WELCOME_MODAL_PREFIX}${type}`)
    .setTitle(type === "join" ? "입장 문구 설정" : "퇴장 문구 설정");

  const messageInput = new TextInputBuilder()
    .setCustomId("message")
    .setLabel("{유저}, {서버} 치환 가능")
    .setStyle(TextInputStyle.Paragraph)
    .setValue(getWelcomeMessage(interaction.guild.id, type))
    .setRequired(true)
    .setMaxLength(1000);

  modal.addComponents(new ActionRowBuilder().addComponents(messageInput));

  await interaction.showModal(modal);
}

async function handleWelcomeMessageModal(interaction, type) {
  const message = interaction.fields.getTextInputValue("message").trim();
  if (!message) {
    await interaction.reply({ content: nya("문구는 비워둘 수 없습니다.") + "\n(오류 코드: MSG-001)", ephemeral: true });
    return;
  }
  setWelcomeMessage(interaction.guild.id, type, message);

  await interaction.update({
    embeds: [buildWelcomeEmbed(interaction.guild.id)],
    components: buildWelcomeRows(interaction.guild.id),
  });
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

  const rows = [
    new ActionRowBuilder().addComponents(serverNameInput),
    new ActionRowBuilder().addComponents(serverInviteInput),
  ];

  if (type === "bug") {
    const errorCodeInput = new TextInputBuilder()
      .setCustomId("error_code")
      .setLabel("오류 코드 (있는 경우에만 입력)")
      .setStyle(TextInputStyle.Short)
      .setPlaceholder("예: INQUIRY-001")
      .setRequired(false);
    rows.push(new ActionRowBuilder().addComponents(errorCodeInput));
  }

  rows.push(new ActionRowBuilder().addComponents(contentInput));
  modal.addComponents(...rows);

  await interaction.showModal(modal);
}

async function handleInquiryModal(interaction, type) {
  const serverName = interaction.fields.getTextInputValue("server_name").trim();
  const serverInvite = interaction.fields.getTextInputValue("server_invite").trim();
  const content = interaction.fields.getTextInputValue("content").trim();
  const errorCode = type === "bug"
    ? interaction.fields.getTextInputValue("error_code").trim()
    : null;

  try {
    const channel = await interaction.client.channels.fetch(INQUIRY_CHANNEL_ID);

    const fields = [
      { name: "작성자", value: `${interaction.user} (${interaction.user.id})` },
      { name: "서버 이름", value: serverName },
      { name: "서버 주소", value: serverInvite },
    ];
    if (errorCode) fields.push({ name: "오류 코드", value: errorCode });
    fields.push({ name: "내용", value: content });

    const embed = new EmbedBuilder()
      .setTitle(INQUIRY_TITLES[type] ?? "문의")
      .addFields(...fields)
      .setColor(type === "report" ? 0xed4245 : 0xe1aa74)
      .setTimestamp();

    await channel.send({ embeds: [embed] });

    await interaction.update({
      content: nya(
        "문의가 정상적으로 접수되었습니다. 서버 이름과 주소가 만료되지 않는 링크여야 정상 확인이 가능합니다",
      ),
      embeds: [],
      components: [],
    });
  } catch (error) {
    console.error(error);
    await interaction.update({
      content: nya("문의를 전달하지 못했습니다. 잠시 후 다시 시도해주세요.") + "\n(오류 코드: INQUIRY-001)",
      embeds: [],
      components: [],
    });
  }
}

async function showGambleMult(interaction, game) {
  const row = new ActionRowBuilder().addComponents(
    ...GAMBLE_MULT_OPTIONS.map((opt) =>
      new ButtonBuilder()
        .setCustomId(`${GAMBLE_MULT_PREFIX}${game}:${opt.mult}`)
        .setLabel(`${opt.mult}배`)
        .setStyle(
          opt.mult === 1 ? ButtonStyle.Secondary :
          opt.mult <= 2 ? ButtonStyle.Primary :
          ButtonStyle.Danger,
        )
    ),
    new ButtonBuilder()
      .setCustomId(`${GAMBLE_MULT_PREFIX}cancel`)
      .setLabel("취소")
      .setStyle(ButtonStyle.Secondary),
  );

  const isSlot = game === "slot";
  const isOddEven = game === "oddeven";
  const isRps = game === "rps";
  const isBj = game === "blackjack";
  const isNumberGuess = game === "numberguess";

  let multDesc;
  if (isSlot) {
    multDesc = "배율을 선택하세요. 배율이 높을수록 당첨 시 더 많이 받지만, **3배부터는 빈 칸이 추가되어 당첨 확률도 크게 낮아집니다.**\n베팅 범위: 10~1,000코인";
  } else if (isOddEven) {
    multDesc = "배율을 선택하세요. 배율이 높을수록 이겼을 때 더 많이 받지만, **이길 확률이 낮아집니다.**";
  } else if (isRps) {
    multDesc = "배율을 선택하세요. 배율이 높을수록 이겼을 때 더 많이 받지만, **이길 확률이 낮아집니다.** 비기면 패배입니다.";
  } else if (isBj) {
    multDesc = "배율을 선택하세요. 배율이 높을수록 이겼을 때 더 많이 받지만, **딜러가 더 유리하게 플레이합니다.**\n버스트(21 초과) 시 베팅액의 1.5배 손실 · 이기면 수수료 10%";
  } else if (isNumberGuess) {
    multDesc = "배율을 선택하세요. 배율이 높을수록 맞혔을 때 더 많이 받지만, **숫자 범위가 넓어져 당첨 확률이 낮아집니다.**";
  } else {
    multDesc = "배율을 선택하세요. 배율이 높을수록 이겼을 때 더 많이 받지만, 위험도도 함께 높아집니다.";
  }

  const embed = new EmbedBuilder()
    .setTitle(GAMBLE_TITLES[game] ?? "도박")
    .setDescription(nya(multDesc))
    .addFields(
      ...GAMBLE_MULT_OPTIONS.map((opt) => {
        let value;
        if (isSlot) {
          const m2min = 1 * opt.mult;
          const m2max = 12 * opt.mult;
          const m3min = 2 * opt.mult;
          const m3max = 25 * opt.mult;
          const m4min = 4 * opt.mult;
          const m4max = 50 * opt.mult;
          const probNote = opt.mult >= 5 ? " (당첨 확률 약 1/3로 감소)" : opt.mult >= 3 ? " (당첨 확률 약 절반으로 감소)" : "";
          value = `소당첨 (2개 일치): 베팅액 ×${m2min}~×${m2max}\n당첨 (3개 일치): 베팅액 ×${m3min}~×${m3max}\n잭팟 (4개 일치): 베팅액 ×${m4min}~×${m4max}${probNote}`;
        } else if (isOddEven) {
          const range = ODDEVEN_WIN_RANGES[opt.mult] ?? 2;
          const prob = Math.round(100 / range);
          value = `이길 확률 ${prob}% (${range}번 중 1번) · 이기면 베팅액 ×${opt.mult} 획득`;
        } else if (isRps) {
          const range = RPS_WIN_RANGES[opt.mult] ?? 3;
          const prob = Math.round(100 / range);
          value = `이길 확률 ${prob}% (${range}번 중 1번) · 이기면 베팅액 ×${opt.mult} 획득`;
        } else if (isBj) {
          const stands = DEALER_STANDS_AT[opt.mult] ?? 17;
          const diff = opt.mult >= 5 ? "어려움" : opt.mult >= 3 ? "보통" : opt.mult >= 2 ? "쉬움" : "매우 쉬움";
          value = `딜러: 합계 ${stands} 이상이면 멈춤 (${diff}) · 이기면 베팅액 ×${opt.mult} 획득`;
        } else if (isNumberGuess) {
          const range = NUMBERGUESS_RANGES[opt.mult] ?? 10;
          const prob = (100 / range).toFixed(1);
          value = `1~${range} 중 하나를 맞추면 베팅액 ×${7 * opt.mult} 획득 · 당첨 확률 ${prob}%`;
        } else {
          value = `베팅 ${GAMBLE_MIN_BET}~${GAMBLE_MAX_BET.toLocaleString()}코인`;
        }
        return { name: `${opt.mult}배`, value, inline: false };
      }),
    )
    .setColor(0xe1aa74);

  await interaction.update({ embeds: [embed], components: [row] });
}

async function showGambleModal(interaction, game, mult = 1) {
  const multOpt = GAMBLE_MULT_OPTIONS.find((o) => o.mult === mult) ?? GAMBLE_MULT_OPTIONS[0];
  const minNominal = GAMBLE_MIN_BET;
  const maxNominal = GAMBLE_MAX_BET;

  const modal = new ModalBuilder()
    .setCustomId(`${GAMBLE_MODAL_PREFIX}${game}:${mult}`)
    .setTitle(`${GAMBLE_TITLES[game] ?? "도박"} (${mult}배)`);

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
    const ngRange = NUMBERGUESS_RANGES[mult] ?? 10;
    const guessInput = new TextInputBuilder()
      .setCustomId("guess")
      .setLabel(`1부터 ${ngRange} 사이의 숫자를 입력하세요`)
      .setStyle(TextInputStyle.Short)
      .setPlaceholder(`1~${ngRange} 중 하나 (당첨 확률 ${(100 / ngRange).toFixed(1)}%)`)
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
    .setLabel(`베팅할 치유미코인 금액 (${mult}배 위험도)`)
    .setStyle(TextInputStyle.Short)
    .setPlaceholder(`최소 ${minNominal.toLocaleString()} · 최대 ${maxNominal.toLocaleString()}코인`)
    .setRequired(true);
  rows.push(new ActionRowBuilder().addComponents(betInput));

  modal.addComponents(...rows);

  await interaction.showModal(modal);
}

async function handleGambleModal(interaction, game, riskMult = 1) {
  const betText = interaction.fields.getTextInputValue("bet").trim();
  const bet = Number(betText);

  await interaction.deferUpdate();
  await interaction.deleteReply();

  const multOpt = GAMBLE_MULT_OPTIONS.find((o) => o.mult === riskMult) ?? GAMBLE_MULT_OPTIONS[0];
  const minBet = GAMBLE_MIN_BET;
  const maxBet = GAMBLE_MAX_BET;

  if (!Number.isInteger(bet) || bet <= 0) {
    await interaction.followUp({
      content: nya("올바른 베팅 금액이 아닙니다.") + "\n(오류 코드: GAMBLE-001)",
      ephemeral: true,
    });
    return;
  }

  if (bet < minBet) {
    await interaction.followUp({
      content: nya(`최소 베팅은 ${minBet.toLocaleString()}코인입니다.`) + "\n(오류 코드: GAMBLE-007)",
      ephemeral: true,
    });
    return;
  }

  if (bet > maxBet) {
    await interaction.followUp({
      content: nya(`최대 베팅은 ${maxBet.toLocaleString()}코인입니다.`) + "\n(오류 코드: GAMBLE-006)",
      ephemeral: true,
    });
    return;
  }

  const userId = interaction.user.id;
  const balance = getBalance(userId);

  if (bet > balance) {
    await interaction.followUp({
      content: nya(`보유 코인(${balance.toLocaleString()}개)이 부족합니다.`) + "\n(오류 코드: GAMBLE-002)",
      ephemeral: true,
    });
    return;
  }

  const { luckPenalty } = multOpt;

  if (game === "slot") { await playSlotGame(interaction, userId, bet, riskMult, luckPenalty); return; }
  if (game === "oddeven") { await playOddEvenGame(interaction, userId, bet, riskMult, luckPenalty); return; }
  if (game === "numberguess") { await playNumberGuessGame(interaction, userId, bet, riskMult, luckPenalty); return; }
  if (game === "blackjack") { await playBlackjackGame(interaction, userId, bet, riskMult, luckPenalty); return; }
  if (game === "rps") { await playRpsGame(interaction, userId, bet, riskMult, luckPenalty); return; }
}

async function playSlotGame(interaction, userId, bet, riskMult = 1, luckPenalty = 0) {
  const { reels, resultText: baseResultText, multiplier: baseMult } = spinSlot(riskMult);

  // 슬롯은 릴이 결과를 직접 보여주므로 luckPenalty 미적용 — 보이는 결과가 곧 최종 결과
  const multiplier = baseMult;
  const resultText = baseResultText;
  const delta = multiplier ? bet * multiplier * riskMult : -bet;

  const buildEmbed = (revealedCount, resultValue = null) => {
    const embed = new EmbedBuilder()
      .setTitle("슬롯머신")
      .setAuthor({
        name: interaction.user.username,
        iconURL: interaction.user.displayAvatarURL(),
      })
      .setDescription(buildSlotReelText(reels, revealedCount))
      .setColor(0xe1aa74);

    if (resultValue) {
      embed.addFields({ name: "결과", value: resultValue });
    }

    return embed;
  };

  const msg = await interaction.followUp({ embeds: [buildEmbed(0)], fetchReply: true });

  for (let revealed = 1; revealed <= reels.length; revealed += 1) {
    await slotWait(800);
    await msg.edit({ embeds: [buildEmbed(revealed)] });
  }

  const newBalance = addBalance(userId, delta);
  const deltaText = delta > 0 ? `+${delta.toLocaleString()}` : `${delta.toLocaleString()}`;
  const multiplierText = multiplier ? ` (슬롯 ${multiplier}배 × 위험도 ${riskMult}배)` : "";

  // 페이아웃 표: 선택된 riskMult 기준
  const payoutLine = [
    `2개 소당첨: ×${1 * riskMult} ~ ×${12 * riskMult}`,
    `3개 당첨: ×${2 * riskMult} ~ ×${25 * riskMult}`,
    `4개 잭팟: ×${4 * riskMult} ~ ×${50 * riskMult}`,
  ].join(" · ");

  await slotWait(800);

  const finalEmbed = buildEmbed(
    reels.length,
    nya(`${resultText}${multiplierText}! ${deltaText} 치유미코인 (현재 보유: ${newBalance.toLocaleString()}개)`),
  ).addFields({ name: `📊 배당표 (${riskMult}배 위험도)`, value: payoutLine });

  if (resultText === "잭팟") {
    finalEmbed
      .setTitle("🎰 J A C K P O T 🎰")
      .setDescription(`${buildSlotReelText(reels, reels.length)}\n\n✨ **${deltaText.replace("+", "")} 치유미코인 획득!** ✨`)
      .setColor(0xffd700);
  }

  await msg.edit({ embeds: [finalEmbed] });
}

async function playOddEvenGame(interaction, userId, bet, riskMult = 1, luckPenalty = 0) {
  const choiceRaw = interaction.fields.getTextInputValue("choice").trim();
  if (choiceRaw !== "홀" && choiceRaw !== "짝") {
    await interaction.followUp({ content: nya("홀 또는 짝 중 하나를 입력해주세요.") + "\n(오류 코드: GAMBLE-003)", ephemeral: true });
    return;
  }

  // 1~range 중 1이 나오면 봇이 유저와 같은 선택 → 당첨
  const range = ODDEVEN_WIN_RANGES[riskMult] ?? 2;
  const roll = Math.floor(Math.random() * range) + 1;
  const botChoice = roll === 1 ? choiceRaw : (choiceRaw === "홀" ? "짝" : "홀");
  const won = botChoice === choiceRaw;

  const delta = won ? bet * riskMult : -bet;
  const newBalance = addBalance(userId, delta);
  const deltaText = delta > 0 ? `+${delta.toLocaleString()}` : `${delta.toLocaleString()}`;

  const embed = new EmbedBuilder()
    .setTitle("홀짝")
    .setAuthor({ name: interaction.user.username, iconURL: interaction.user.displayAvatarURL() })
    .setDescription(nya(`내 선택: **${choiceRaw}** · 치유미: **${botChoice}** → ${won ? "승리" : "패배"}!`))
    .addFields({ name: "결과", value: nya(`${deltaText} 치유미코인 (현재 보유: ${newBalance.toLocaleString()}개)`) })
    .setColor(0xe1aa74);

  await interaction.followUp({ embeds: [embed] });
}

async function playNumberGuessGame(interaction, userId, bet, riskMult = 1, luckPenalty = 0) {
  const guessText = interaction.fields.getTextInputValue("guess").trim();
  const guess = Number(guessText);
  const range = NUMBERGUESS_RANGES[riskMult] ?? 10;

  if (!Number.isInteger(guess) || guess < 1 || guess > range) {
    await interaction.followUp({ content: nya(`1부터 ${range} 사이의 숫자를 입력해주세요.`) + "\n(오류 코드: GAMBLE-004)", ephemeral: true });
    return;
  }

  const answer = Math.floor(Math.random() * range) + 1;
  const won = guess === answer;
  const delta = won ? bet * 7 * riskMult : -bet;
  const newBalance = addBalance(userId, delta);
  const deltaText = delta > 0 ? `+${delta.toLocaleString()}` : `${delta.toLocaleString()}`;

  const embed = new EmbedBuilder()
    .setTitle("숫자맞추기")
    .setAuthor({ name: interaction.user.username, iconURL: interaction.user.displayAvatarURL() })
    .setDescription(nya(`정답: ${answer} → ${won ? "정답입니다" : "틀렸습니다"}!`))
    .addFields({ name: "결과", value: nya(`${deltaText} 치유미코인 (현재 보유: ${newBalance.toLocaleString()}개)`) })
    .setColor(0xe1aa74);

  await interaction.followUp({ embeds: [embed] });
}

async function playBlackjackGame(interaction, userId, bet, riskMult = 1, luckPenalty = 0) {
  const { id, session } = createBjSession(
    userId,
    bet,
    interaction.user.username,
    interaction.user.displayAvatarURL(),
  );
  bjSessionOptions.set(id, { luckPenalty, riskMult });

  if (isBlackjack(session.playerCards)) {
    bjSessionOptions.delete(id);
    const dealerBlackjack = isBlackjack(session.dealerCards);
    let delta;
    let resultText;
    if (dealerBlackjack) {
      delta = -bet;
      resultText = `둘 다 블랙잭! 딜러 승. ${bet.toLocaleString()} 치유미코인을 잃었습니다.`;
    } else {
      delta = Math.floor(bet * 1.5 * riskMult * 0.9);
      resultText = `블랙잭! ${delta.toLocaleString()} 치유미코인을 획득했습니다. (수수료 10%)`;
    }
    const newBalance = addBalance(userId, delta);
    await interaction.followUp({
      embeds: [buildBjEmbed(session, { revealDealer: true, result: nya(`${resultText} 현재 보유: ${newBalance.toLocaleString()}개`) })],
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

  await interaction.followUp({
    embeds: [buildBjEmbed(session)],
    components: [row],
  });
}

async function playRpsGame(interaction, userId, bet, riskMult = 1, luckPenalty = 0) {
  const choiceRaw = interaction.fields.getTextInputValue("choice").trim();

  if (!RPS_CHOICES.includes(choiceRaw)) {
    await interaction.followUp({ content: nya("가위, 바위, 보 중 하나를 입력해주세요.") + "\n(오류 코드: GAMBLE-005)", ephemeral: true });
    return;
  }

  // roll 1=승, 2=무(집 승), 3+=패 — range 클수록 당첨 확률 낮음
  const range = RPS_WIN_RANGES[riskMult] ?? 3;
  const roll = Math.floor(Math.random() * range) + 1;
  const outcome = roll === 1 ? "win" : roll === 2 ? "tie" : "lose";
  const botChoice = outcome === "win" ? RPS_BEATS[choiceRaw]
                  : outcome === "tie" ? choiceRaw
                  : RPS_LOSES_TO[choiceRaw];

  let resultText;
  let delta;

  if (outcome === "win") {
    resultText = "이겼습니다";
    delta = bet * riskMult;
  } else if (outcome === "tie") {
    resultText = "비겼지만 집 승";
    delta = -bet;
  } else {
    resultText = "졌습니다";
    delta = -bet;
  }

  const newBalance = addBalance(userId, delta);
  const deltaText = delta > 0 ? `+${delta.toLocaleString()}` : `${delta.toLocaleString()}`;

  const embed = new EmbedBuilder()
    .setTitle("가위바위보")
    .setAuthor({ name: interaction.user.username, iconURL: interaction.user.displayAvatarURL() })
    .setDescription(nya(`나: ${choiceRaw} / 치유미: ${botChoice} → ${resultText}!`))
    .addFields({ name: "결과", value: nya(`${deltaText} 치유미코인 (현재 보유: ${newBalance.toLocaleString()}개)`) })
    .setColor(0xe1aa74);

  await interaction.followUp({ embeds: [embed] });
}

async function handleBlackjackAction(interaction) {
  const [sessionId, action] = interaction.customId
    .slice(BJ_ACTION_PREFIX.length)
    .split(":");
  const session = getBjSession(sessionId);

  if (!session) {
    await interaction.reply({
      content: nya("이미 종료된 게임입니다.") + "\n(오류 코드: BJ-002)",
      ephemeral: true,
    });
    return;
  }

  if (interaction.user.id !== session.userId) {
    await interaction.reply({
      content: nya("자신이 시작한 게임만 진행할 수 있습니다.") + "\n(오류 코드: BJ-003)",
      ephemeral: true,
    });
    return;
  }

  if (action === "hit") {
    session.playerCards.push(drawCard());

    if (handTotal(session.playerCards) > 21) {
      deleteBjSession(sessionId);
      bjSessionOptions.delete(sessionId);
      const bustLoss = Math.ceil(session.bet * 1.5);
      const newBalance = addBalance(session.userId, -bustLoss);
      await interaction.update({
        embeds: [
          buildBjEmbed(session, {
            revealDealer: true,
            result: nya(`버스트! ${bustLoss.toLocaleString()} 치유미코인을 잃었습니다. (×1.5 패널티) 현재 보유: ${newBalance.toLocaleString()}개`),
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

  const bjOpts = bjSessionOptions.get(sessionId) ?? { luckPenalty: 0, riskMult: 1 };
  deleteBjSession(sessionId);
  bjSessionOptions.delete(sessionId);

  const dealerStands = DEALER_STANDS_AT[bjOpts.riskMult] ?? 17;
  while (handTotal(session.dealerCards) < dealerStands) {
    session.dealerCards.push(drawCard());
  }

  const playerTotal = handTotal(session.playerCards);
  const dealerTotal = handTotal(session.dealerCards);

  let delta;
  let resultText;

  const isDealerNatural = session.dealerCards.length === 2 && dealerTotal === 21;

  if (isDealerNatural) {
    delta = -(session.bet * 2);
    resultText = `딜러 블랙잭! ${(session.bet * 2).toLocaleString()} 치유미코인을 잃었습니다. (×2 패널티)`;
  } else if (dealerTotal > 21 || playerTotal > dealerTotal) {
    delta = Math.floor(session.bet * bjOpts.riskMult * 0.9);
    resultText = `승리! ${delta.toLocaleString()} 치유미코인을 획득했습니다. (수수료 10%)`;
  } else if (playerTotal === dealerTotal) {
    delta = -session.bet;
    resultText = `동점이지만 딜러 승! ${session.bet.toLocaleString()} 치유미코인을 잃었습니다.`;
  } else {
    delta = -session.bet;
    resultText = `패배! ${session.bet.toLocaleString()} 치유미코인을 잃었습니다.`;
  }

  const newBalance = addBalance(session.userId, delta);

  await interaction.update({
    embeds: [
      buildBjEmbed(session, {
        revealDealer: true,
        result: nya(`${resultText} 현재 보유: ${newBalance.toLocaleString()}개`),
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

  await interaction.update({
    content: nya("인증 버튼 설정을 시작합니다. 먼저 지급할 역할을 선택하세요."),
    components: [row],
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
      await interaction.update({
        content: nya("이 봇이 만든 메시지만 삭제할 수 있습니다.") + "\n(오류 코드: VERIFY-004)",
        components: [],
      });
      return;
    }

    await message.delete();
    await interaction.update({
      content: nya("인증 메시지를 삭제했습니다."),
      components: [],
    });
  } catch (error) {
    console.error(error);
    await interaction.update({
      content: nya("메시지를 삭제하지 못했습니다. 메시지 ID와 채널이 맞는지 확인해주세요.") + "\n(오류 코드: VERIFY-001)",
      components: [],
    });
  }
}

async function handleAnnounceModal(interaction) {
  const [channelId, mention] = interaction.customId
    .slice(ANNOUNCE_MODAL_PREFIX.length)
    .split(":");

  const content = interaction.fields.getTextInputValue("content");

  const channel = interaction.guild.channels.cache.get(channelId);

  if (!channel) {
    await interaction.reply({
      content: nya("채널을 찾을 수 없습니다.") + "\n(오류 코드: ANNOUNCE-001)",
      ephemeral: true,
    });
    return;
  }

  const embed = new EmbedBuilder().setDescription(content).setColor(0xe1aa74).setTimestamp();

  const mentionContent =
    mention === "everyone" ? "@everyone" : mention === "here" ? "@here" : undefined;

  try {
    await channel.send({
      content: mentionContent,
      embeds: [embed],
      allowedMentions: mentionContent ? { parse: ["everyone"] } : { parse: [] },
    });
  } catch (error) {
    console.error(error);
    await interaction.reply({
      content: nya(`${channel}에 공지를 보내지 못했습니다. 봇에게 해당 채널의 메시지 보내기/임베드 권한이 있는지 확인해주세요.`) + "\n(오류 코드: ANNOUNCE-002)",
      ephemeral: true,
    });
    return;
  }

  await interaction.reply({
    content: nya(`${channel}에 공지를 보냈습니다.`),
    ephemeral: true,
  });

  const logEmbed = new EmbedBuilder()
    .setTitle("공지 전송")
    .addFields(
      { name: "채널", value: `${channel}`, inline: true },
      { name: "작성자", value: `${interaction.user}`, inline: true },
      { name: "제목", value: title || "(없음)" },
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
  if (interaction.customId === STREAMALERT_MODAL_ID) {
    await handleStreamAlertModal(interaction);
    return;
  }

  if (interaction.customId === STREAMALERT_EDIT_MODAL_ID) {
    await handleStreamAlertEditModal(interaction);
    return;
  }

  if (interaction.customId === STOCK_BUY_MODAL_ID) {
    await handleStockBuyModal(interaction);
    return;
  }

  if (interaction.customId === STOCK_SELL_MODAL_ID) {
    await handleStockSellModal(interaction);
    return;
  }

  if (interaction.customId === BANK_DEPOSIT_MODAL_ID) {
    await handleBankDepositModal(interaction);
    return;
  }

  if (interaction.customId === BANK_WITHDRAW_MODAL_ID) {
    await handleBankWithdrawModal(interaction);
    return;
  }

  if (interaction.customId === BANK_LOAN_MODAL_ID) {
    await handleBankLoanModal(interaction);
    return;
  }

  if (interaction.customId === WORDCHAIN_SIZE_MODAL_ID) {
    await handleWordChainSizeModal(interaction);
    return;
  }

  if (interaction.customId.startsWith(PET_NAME_MODAL_PREFIX)) {
    const ownerId = interaction.customId.slice(PET_NAME_MODAL_PREFIX.length);
    const name = interaction.fields.getTextInputValue("name").trim();
    const pet = setPetName(ownerId, name);

    await interaction.update({
      embeds: [buildPetEmbed(pet, interaction.user.username)],
      components: [buildPetRow(ownerId)],
    });
    if (interaction.message) resetPetTimeout(interaction.message);
    return;
  }

  if (interaction.customId.startsWith(DEV_MODAL_PREFIX)) {
    const action = interaction.customId.slice(DEV_MODAL_PREFIX.length);
    await handleDevModal(interaction, action);
    return;
  }

  if (interaction.customId === RANK_LEVELUP_MODAL_ID) {
    const message = interaction.fields.getTextInputValue("message").trim();
    if (!message) {
      await interaction.reply({ content: nya("문구는 비워둘 수 없습니다.") + "\n(오류 코드: MSG-001)", ephemeral: true });
      return;
    }
    setLevelUpMessage(interaction.guild.id, message);

    await interaction.update({
      embeds: [buildLevelUpEmbed(interaction.guild.id)],
      components: [buildLevelUpRow()],
    });
    return;
  }

  if (interaction.customId === TICKET_MODAL_ID) {
    const message = interaction.fields.getTextInputValue("message").trim();
    if (!message) {
      await interaction.reply({ content: nya("문구는 비워둘 수 없습니다.") + "\n(오류 코드: MSG-001)", ephemeral: true });
      return;
    }
    setTicketMessage(interaction.guild.id, message);

    await interaction.update({
      embeds: [buildTicketEmbed(interaction.guild.id)],
      components: [buildTicketRow()],
    });
    return;
  }

  if (interaction.customId.startsWith(WARN_MODAL_PREFIX)) {
    await handleWarnModal(interaction);
    return;
  }

  if (interaction.customId.startsWith(WARN_WIZARD_PREFIX)) {
    await handleWarnWizardModal(interaction);
    return;
  }

  if (interaction.customId.startsWith(WELCOME_MODAL_PREFIX)) {
    const type = interaction.customId.slice(WELCOME_MODAL_PREFIX.length);
    await handleWelcomeMessageModal(interaction, type);
    return;
  }

  if (interaction.customId.startsWith(INQUIRY_MODAL_PREFIX)) {
    const type = interaction.customId.slice(INQUIRY_MODAL_PREFIX.length);
    await handleInquiryModal(interaction, type);
    return;
  }

  if (interaction.customId.startsWith(GAMBLE_MODAL_PREFIX)) {
    const rest = interaction.customId.slice(GAMBLE_MODAL_PREFIX.length);
    const lastColon = rest.lastIndexOf(":");
    const game = rest.slice(0, lastColon);
    const riskMult = parseInt(rest.slice(lastColon + 1)) || 1;
    await handleGambleModal(interaction, game, riskMult);
    return;
  }

  if (interaction.customId === STATS_MODAL_PREFIX) {
    await handleLolStatsModal(interaction);
    return;
  }

  if (interaction.customId.startsWith(COIN_DEV_MODAL_PREFIX)) {
    const direction = interaction.customId.slice(COIN_DEV_MODAL_PREFIX.length);

    if (direction === "lookup") {
      await handleDevLookupModal(interaction);
      return;
    }

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
    await interaction.update({
      content: nya("인증 역할을 찾을 수 없습니다. 다시 설정해주세요.") + "\n(오류 코드: ROLE-005)",
      components: [],
    });
    return;
  }

  if (!role.editable) {
    await interaction.update({
      content: nya("이 역할은 봇이 지급할 수 없습니다. 봇 역할을 해당 역할보다 위로 올려주세요.") + "\n(오류 코드: ROLE-006)",
      components: [],
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

  await interaction.update({
    content: nya(
      `${role} 역할을 지급하는 인증 버튼을 생성했습니다. 메시지 ID: ${createdMessage.id}`,
    ),
    components: [],
  });
}

async function editVerifyMessage(interaction, messageId, message, row, role) {
  try {
    const targetMessage = await interaction.channel.messages.fetch(messageId);

    if (targetMessage.author.id !== interaction.client.user.id) {
      await interaction.update({
        content: nya("이 봇이 만든 메시지만 수정할 수 있습니다.") + "\n(오류 코드: VERIFY-002)",
        components: [],
      });
      return;
    }

    await targetMessage.edit({
      content: message,
      components: [row],
    });

    await interaction.update({
      content: nya(`${role} 역할을 지급하는 인증 메시지를 수정했습니다.`),
      components: [],
    });
  } catch (error) {
    console.error(error);
    await interaction.update({
      content: nya("메시지를 수정하지 못했습니다. 메시지 ID와 채널이 맞는지 확인해주세요.") + "\n(오류 코드: VERIFY-003)",
      components: [],
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

// ─── 경고 마법사 ────────────────────────────────────────────────────────────

function warnWizardKey(interaction) {
  return `${interaction.user.id}:${interaction.guild.id}`;
}

function warnWizardFormatStep(c) {
  const actionText =
    c.action === "mute" && c.duration
      ? `뮤트 (${warnFormatDuration(c.duration)})`
      : WARN_ACTION_LABEL[c.action] ?? c.action;
  const roleText = c.roleId ? `<@&${c.roleId}>` : "없음";
  return `경고 **${c.count}회** → ${actionText} | 역할: ${roleText}`;
}

function buildWizardStepEmbed(state) {
  const completedText =
    state.configs.length > 0 ? state.configs.map(warnWizardFormatStep).join("\n") : "(아직 없음)";
  return new EmbedBuilder()
    .setTitle("⚠️ 경고 설정 마법사")
    .addFields(
      { name: `완료 (${state.configs.length}/${state.total})`, value: completedText },
      { name: `경고 ${state.current}회 — 행동 선택`, value: "아래 버튼에서 이 경고 횟수에 적용할 행동을 선택하세요" },
    )
    .setColor(0xffa500);
}

function buildWizardActionRows() {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("warn-wizard:action:none").setLabel("없음").setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId("warn-wizard:action:mute").setLabel("뮤트 (타임아웃)").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId("warn-wizard:action:kick").setLabel("킥").setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId("warn-wizard:action:ban").setLabel("영구 밴").setStyle(ButtonStyle.Danger),
    ),
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("warn-wizard:cancel").setLabel("취소").setStyle(ButtonStyle.Secondary),
    ),
  ];
}

function buildWizardDurationEmbed(state) {
  return new EmbedBuilder()
    .setTitle("⚠️ 경고 설정 마법사")
    .setDescription(`경고 **${state.current}회** — 뮤트 시간을 선택해주세요`)
    .setColor(0xffa500);
}

function buildWizardDurationRows() {
  const presets = [
    ["10분",  10 * 60 * 1000],
    ["30분",  30 * 60 * 1000],
    ["1시간",  1 * 60 * 60 * 1000],
    ["6시간",  6 * 60 * 60 * 1000],
    ["12시간", 12 * 60 * 60 * 1000],
    ["1일",   24 * 60 * 60 * 1000],
    ["3일",    3 * 24 * 60 * 60 * 1000],
    ["7일",    7 * 24 * 60 * 60 * 1000],
  ];
  return [
    new ActionRowBuilder().addComponents(
      ...presets.slice(0, 5).map(([label, ms]) =>
        new ButtonBuilder().setCustomId(`warn-wizard:dur:${ms}`).setLabel(label).setStyle(ButtonStyle.Primary),
      ),
    ),
    new ActionRowBuilder().addComponents(
      ...presets.slice(5).map(([label, ms]) =>
        new ButtonBuilder().setCustomId(`warn-wizard:dur:${ms}`).setLabel(label).setStyle(ButtonStyle.Primary),
      ),
      new ButtonBuilder().setCustomId("warn-wizard:dur:custom").setLabel("직접입력").setStyle(ButtonStyle.Secondary),
    ),
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("warn-wizard:cancel").setLabel("취소").setStyle(ButtonStyle.Secondary),
    ),
  ];
}

function buildWizardRoleEmbed(state) {
  const actionText =
    state.pendingAction === "mute" && state.pendingDuration
      ? `뮤트 (${warnFormatDuration(state.pendingDuration)})`
      : WARN_ACTION_LABEL[state.pendingAction] ?? state.pendingAction;
  return new EmbedBuilder()
    .setTitle("⚠️ 경고 설정 마법사")
    .setDescription(
      `경고 **${state.current}회** — ${actionText} 선택됨\n부여할 역할을 선택하거나 건너뛰세요`,
    )
    .setColor(0xffa500);
}

function buildWizardRoleRows() {
  return [
    new ActionRowBuilder().addComponents(
      new RoleSelectMenuBuilder()
        .setCustomId(WARN_WIZARD_ROLE_SELECT_ID)
        .setPlaceholder("부여할 역할 선택"),
    ),
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("warn-wizard:skip-role").setLabel("역할 없이 다음").setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId("warn-wizard:cancel").setLabel("취소").setStyle(ButtonStyle.Secondary),
    ),
  ];
}

function parseWarnDuration(input) {
  const s = input.trim();
  const match = s.match(/^(\d+(?:\.\d+)?)\s*(분|시간|일|주|m|h|d|w)?$/i);
  if (!match) return null;
  const num = parseFloat(match[1]);
  const unit = (match[2] ?? "분").toLowerCase();
  const mult = { 분: 60000, m: 60000, 시간: 3600000, h: 3600000, 일: 86400000, d: 86400000, 주: 604800000, w: 604800000 };
  return mult[unit] ? Math.floor(num * mult[unit]) : null;
}

async function warnWizardSaveAndAdvance(interaction, state, key, roleId) {
  state.configs.push({
    count: state.current,
    action: state.pendingAction,
    duration: state.pendingDuration ?? null,
    roleId: roleId ?? null,
  });
  state.pendingAction = null;
  state.pendingDuration = null;
  state.current += 1;

  if (state.current > state.total) {
    for (const c of state.configs) {
      setWarnThreshold(state.guildId, c.count, c.roleId, c.action, c.duration);
    }
    warnWizardState.delete(key);
    return interaction.update({
      content: null,
      embeds: [buildWarnEmbed(state.guildId)],
      components: buildWarnRows(),
    });
  }

  return interaction.update({
    embeds: [buildWizardStepEmbed(state)],
    components: buildWizardActionRows(),
  });
}

async function handleWarnWizardButton(interaction) {
  const customId = interaction.customId;
  const key = warnWizardKey(interaction);

  if (customId === "warn-wizard:cancel") {
    warnWizardState.delete(key);
    return interaction.update({ content: "경고 설정 마법사가 취소됐습니다.", embeds: [], components: [] });
  }

  const state = warnWizardState.get(key);
  if (!state) {
    return interaction.update({
      content: "⚠️ 세션이 만료됐어요. `/경고` 커맨드를 다시 실행해주세요.",
      embeds: [],
      components: [],
    });
  }

  // 행동 선택
  if (customId.startsWith("warn-wizard:action:")) {
    const action = customId.split(":")[2];
    state.pendingAction = action;
    if (action === "mute") {
      return interaction.update({ embeds: [buildWizardDurationEmbed(state)], components: buildWizardDurationRows() });
    }
    return interaction.update({ embeds: [buildWizardRoleEmbed(state)], components: buildWizardRoleRows() });
  }

  // 뮤트 시간 선택 (프리셋)
  if (customId.startsWith("warn-wizard:dur:")) {
    const durPart = customId.split(":")[2];
    if (durPart === "custom") {
      const modal = new ModalBuilder().setCustomId("warn-wizard:dur-custom").setTitle("뮤트 시간 직접 입력");
      modal.addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId("기간")
            .setLabel("기간 입력")
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setPlaceholder("예: 30분, 2시간, 1일, 7일"),
        ),
      );
      return interaction.showModal(modal);
    }
    state.pendingDuration = parseInt(durPart);
    return interaction.update({ embeds: [buildWizardRoleEmbed(state)], components: buildWizardRoleRows() });
  }

  // 역할 건너뛰기
  if (customId === "warn-wizard:skip-role") {
    return warnWizardSaveAndAdvance(interaction, state, key, null);
  }
}

async function handleWarnWizardRoleSelect(interaction) {
  const key = warnWizardKey(interaction);
  const state = warnWizardState.get(key);
  if (!state) {
    return interaction.update({ content: "⚠️ 세션이 만료됐어요. `/경고` 커맨드를 다시 실행해주세요.", embeds: [], components: [] });
  }
  return warnWizardSaveAndAdvance(interaction, state, key, interaction.values[0] ?? null);
}

async function handleWarnWizardModal(interaction) {
  const customId = interaction.customId;
  const key = warnWizardKey(interaction);

  // 총 횟수 입력 → 마법사 시작
  if (customId === "warn-wizard:count") {
    const total = parseInt(interaction.fields.getTextInputValue("횟수"));
    if (!total || total < 1 || total > 10) {
      return interaction.reply({ content: "횟수는 1~10 사이의 숫자를 입력해주세요.", ephemeral: true });
    }
    const state = { guildId: interaction.guild.id, total, current: 1, pendingAction: null, pendingDuration: null, configs: [] };
    warnWizardState.set(key, state);
    return interaction.update({ content: null, embeds: [buildWizardStepEmbed(state)], components: buildWizardActionRows() });
  }

  // 뮤트 시간 직접 입력
  if (customId === "warn-wizard:dur-custom") {
    const state = warnWizardState.get(key);
    if (!state) return interaction.reply({ content: "⚠️ 세션이 만료됐어요.", ephemeral: true });

    const ms = parseWarnDuration(interaction.fields.getTextInputValue("기간"));
    if (!ms || ms < 60000) return interaction.reply({ content: "올바른 기간을 입력해주세요. (예: 30분, 2시간, 1일)", ephemeral: true });
    if (ms > 28 * 24 * 60 * 60 * 1000) return interaction.reply({ content: "최대 28일까지 설정할 수 있어요.", ephemeral: true });

    state.pendingDuration = ms;
    return interaction.update({ content: null, embeds: [buildWizardRoleEmbed(state)], components: buildWizardRoleRows() });
  }
}

// ─── 경고 시스템 헬퍼 ───────────────────────────────────────────────────────

function resolveWarnUserId(input) {
  const match = input.match(/<@!?(\d+)>/);
  return match ? match[1] : input.trim();
}

async function fetchWarnMember(guild, input) {
  const id = resolveWarnUserId(input);
  return guild.members.fetch(id).catch(() => null);
}

async function handleWarnButton(interaction) {
  const action = interaction.customId.slice(WARN_BTN_PREFIX.length);

  if (action === "give") {
    const modal = new ModalBuilder().setCustomId("warn-modal:give").setTitle("경고 주기");
    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId("유저").setLabel("유저 ID 또는 멘션 (@유저)").setStyle(TextInputStyle.Short).setRequired(true),
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId("이유").setLabel("경고 이유").setStyle(TextInputStyle.Short).setRequired(false).setPlaceholder("이유 없음"),
      ),
    );
    return interaction.showModal(modal);
  }

  if (action === "remove") {
    const modal = new ModalBuilder().setCustomId("warn-modal:remove").setTitle("경고 취소");
    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId("유저").setLabel("유저 ID 또는 멘션 (@유저)").setStyle(TextInputStyle.Short).setRequired(true),
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId("개수").setLabel("취소할 경고 수").setStyle(TextInputStyle.Short).setRequired(false).setPlaceholder("기본값: 1"),
      ),
    );
    return interaction.showModal(modal);
  }

  if (action === "check") {
    const modal = new ModalBuilder().setCustomId("warn-modal:check").setTitle("경고 조회");
    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId("유저").setLabel("유저 ID 또는 멘션 (@유저)").setStyle(TextInputStyle.Short).setRequired(true),
      ),
    );
    return interaction.showModal(modal);
  }

  if (action === "reset") {
    const modal = new ModalBuilder().setCustomId("warn-modal:reset").setTitle("경고 초기화");
    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId("유저").setLabel("유저 ID 또는 멘션 (@유저)").setStyle(TextInputStyle.Short).setRequired(true),
      ),
    );
    return interaction.showModal(modal);
  }
}

async function handleWarnCfgButton(interaction) {
  const action = interaction.customId.slice(WARN_CFG_PREFIX.length);

  if (action === "wizard") {
    const modal = new ModalBuilder().setCustomId("warn-wizard:count").setTitle("경고 기준 설정 마법사");
    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("횟수")
          .setLabel("몇 회까지 설정할까요?")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setPlaceholder("예: 3 → 경고 1회·2회·3회 순서대로 설정")
          .setMaxLength(2),
      ),
    );
    return interaction.showModal(modal);
  }

  if (action === "delete") {
    const modal = new ModalBuilder().setCustomId("warn-modal:delete").setTitle("경고 기준 제거");
    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId("횟수").setLabel("제거할 경고 횟수 기준 (숫자)").setStyle(TextInputStyle.Short).setRequired(true),
      ),
    );
    return interaction.showModal(modal);
  }

  if (action === "max") {
    const modal = new ModalBuilder().setCustomId("warn-modal:max").setTitle("최대 경고 횟수 설정");
    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId("횟수").setLabel("최대 경고 횟수 (비워두면 설정 해제)").setStyle(TextInputStyle.Short).setRequired(false).setPlaceholder("예: 5"),
      ),
    );
    return interaction.showModal(modal);
  }

}

async function handleWarnModal(interaction) {
  const type = interaction.customId.slice(WARN_MODAL_PREFIX.length);

  if (type === "give") {
    const userInput = interaction.fields.getTextInputValue("유저");
    const reason = interaction.fields.getTextInputValue("이유") || "이유 없음";

    const member = await fetchWarnMember(interaction.guild, userInput);
    if (!member) return interaction.reply({ content: "유저를 찾을 수 없어요.", ephemeral: true });
    if (member.user.bot) return interaction.reply({ content: "봇에게는 경고를 줄 수 없어요!", ephemeral: true });
    if (member.id === interaction.user.id) return interaction.reply({ content: "자기 자신에게 경고를 줄 수 없어요!", ephemeral: true });

    const config = getWarnConfig(interaction.guild.id);
    const current = getUserWarnings(interaction.guild.id, member.id);

    if (config.maxCount !== null && current.count >= config.maxCount) {
      return interaction.reply({
        content: `⚠️ ${member} 님은 이미 최대 경고 횟수(${config.maxCount}회)에 도달했습니다.`,
        ephemeral: true,
      });
    }

    const { count } = addWarning(interaction.guild.id, member.id, reason, interaction.user.id);
    const threshold = config.thresholds.find((t) => t.count === count);
    const isMaxReached = config.maxCount !== null && count >= config.maxCount;

    // 이전 경고 기준 역할 제거
    const prevRoleIds = config.thresholds
      .filter((t) => t.count < count && t.roleId)
      .map((t) => t.roleId);
    for (const rid of prevRoleIds) {
      if (member.roles.cache.has(rid)) {
        const prevRole = interaction.guild.roles.cache.get(rid);
        if (prevRole) await member.roles.remove(prevRole).catch(() => {});
      }
    }

    // 현재 경고 기준 역할 부여
    if (threshold?.roleId) {
      const role = interaction.guild.roles.cache.get(threshold.roleId);
      if (role) await member.roles.add(role).catch(() => {});
    }

    const effectiveAction = isMaxReached ? "ban" : (threshold?.action ?? null);

    const embed = new EmbedBuilder()
      .setTitle("⚠️ 경고 지급")
      .setThumbnail(member.user.displayAvatarURL())
      .addFields(
        { name: "대상",      value: `${member}`,  inline: true },
        { name: "현재 경고", value: `**${count}회**${config.maxCount ? ` / ${config.maxCount}회` : ""}`, inline: true },
        { name: "담당자",    value: `${interaction.user}`, inline: true },
        { name: "이유",      value: reason },
      )
      .setColor(0xffa500)
      .setTimestamp();

    if (threshold) {
      const roleText = threshold.roleId
        ? (interaction.guild.roles.cache.get(threshold.roleId)?.toString() ?? "역할 없음")
        : "없음";
      embed.addFields(
        { name: "부여 역할", value: roleText, inline: true },
        { name: "자동 제재", value: WARN_ACTION_LABEL[threshold.action] ?? "없음", inline: true },
      );
    }
    if (isMaxReached && !threshold) {
      embed.addFields({ name: "🚨 자동 제재", value: "최대 경고 도달 → 영구 밴" });
    }

    await interaction.reply({ embeds: [embed] });

    if (getLogOptions(interaction.guild.id).warnLog) {
      await sendLog(interaction.guild, embed, "warnLog");
    }

    if (effectiveAction === "kick") await member.kick(`경고 ${count}회: ${reason}`).catch(() => {});
    else if (effectiveAction === "ban") await member.ban({ reason: `경고 ${count}회: ${reason}` }).catch(() => {});
    else if (effectiveAction === "mute") {
      const duration = threshold?.duration ?? 3600000;
      await member.timeout(duration, `경고 ${count}회: ${reason}`).catch(() => {});
    }
    return;
  }

  if (type === "remove") {
    const userInput = interaction.fields.getTextInputValue("유저");
    const amountStr = interaction.fields.getTextInputValue("개수");
    const amount = Math.max(1, parseInt(amountStr) || 1);

    const member = await fetchWarnMember(interaction.guild, userInput);
    if (!member) return interaction.reply({ content: "유저를 찾을 수 없어요.", ephemeral: true });

    const { count } = removeWarning(interaction.guild.id, member.id, amount);
    return interaction.update({
      content: `✅ ${member} 님의 경고 ${amount}회를 취소했습니다. 남은 경고: **${count}회**`,
      embeds: [buildWarnEmbed(interaction.guild.id)],
      components: buildWarnRows(),
    });
  }

  if (type === "check") {
    const userInput = interaction.fields.getTextInputValue("유저");
    const userId = resolveWarnUserId(userInput);

    let user;
    try { user = await interaction.client.users.fetch(userId); }
    catch { return interaction.reply({ content: "유저를 찾을 수 없어요.", ephemeral: true }); }

    const { count, history } = getUserWarnings(interaction.guild.id, userId);
    const config = getWarnConfig(interaction.guild.id);

    const historyText =
      history.length === 0
        ? "없음"
        : history.slice(-10).map((h) => `**${h.id}.** ${h.reason} · <t:${h.timestamp}:d> · <@${h.moderatorId}>`).join("\n");

    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle(`⚠️ ${user.username} 경고 내역`)
          .setThumbnail(user.displayAvatarURL())
          .addFields(
            { name: "현재 경고", value: `${count}회${config.maxCount ? ` / 최대 ${config.maxCount}회` : ""}`, inline: true },
            { name: "경고 내역 (최근 10개)", value: historyText },
          )
          .setColor(0xffa500)
          .setTimestamp(),
      ],
      ephemeral: true,
    });
  }

  if (type === "reset") {
    const userInput = interaction.fields.getTextInputValue("유저");
    const member = await fetchWarnMember(interaction.guild, userInput);
    if (!member) return interaction.reply({ content: "유저를 찾을 수 없어요.", ephemeral: true });

    resetWarnings(interaction.guild.id, member.id);
    return interaction.update({
      content: `✅ ${member} 님의 경고를 모두 초기화했습니다.`,
      embeds: [buildWarnEmbed(interaction.guild.id)],
      components: buildWarnRows(),
    });
  }

  if (type === "add") {
    const countStr = interaction.fields.getTextInputValue("횟수");
    const actionStr = interaction.fields.getTextInputValue("행동").trim();
    const roleStr = interaction.fields.getTextInputValue("역할").trim();

    const count = parseInt(countStr);
    if (!count || count < 1) return interaction.reply({ content: "횟수는 1 이상의 숫자를 입력해주세요.", ephemeral: true });

    const actionMap = { "없음": "none", "킥": "kick", "밴": "ban", "none": "none", "kick": "kick", "ban": "ban" };
    const action = actionMap[actionStr];
    if (!action) return interaction.reply({ content: '행동은 "없음", "킥", "밴" 중 하나를 입력해주세요.', ephemeral: true });

    let roleId = null;
    if (roleStr) {
      const match = roleStr.match(/<@&(\d+)>/);
      roleId = match ? match[1] : roleStr;
      const role = interaction.guild.roles.cache.get(roleId);
      if (!role) return interaction.reply({ content: "역할을 찾을 수 없어요. 역할 ID 또는 멘션을 확인해주세요.", ephemeral: true });
    }

    setWarnThreshold(interaction.guild.id, count, roleId, action);
    const roleText = roleId ? `<@&${roleId}>` : "없음";
    return interaction.update({
      content: `✅ 경고 **${count}회** 기준 설정\n역할: ${roleText} | 제재: **${WARN_ACTION_LABEL[action]}**`,
      embeds: [buildWarnEmbed(interaction.guild.id)],
      components: buildWarnRows(),
    });
  }

  if (type === "delete") {
    const countStr = interaction.fields.getTextInputValue("횟수");
    const count = parseInt(countStr);
    if (!count || count < 1) return interaction.reply({ content: "횟수는 1 이상의 숫자를 입력해주세요.", ephemeral: true });

    removeWarnThreshold(interaction.guild.id, count);
    return interaction.update({
      content: `✅ 경고 **${count}회** 기준을 제거했습니다.`,
      embeds: [buildWarnEmbed(interaction.guild.id)],
      components: buildWarnRows(),
    });
  }

  if (type === "max") {
    const countStr = interaction.fields.getTextInputValue("횟수").trim();
    const maxCount = countStr ? parseInt(countStr) : null;

    if (countStr && (!maxCount || maxCount < 1)) return interaction.reply({ content: "횟수는 1 이상의 숫자를 입력해주세요.", ephemeral: true });

    setWarnMaxCount(interaction.guild.id, maxCount);
    return interaction.update({
      content: maxCount
        ? `✅ 최대 경고 횟수를 **${maxCount}회**로 설정했습니다.`
        : "✅ 최대 경고 횟수 설정을 해제했습니다.",
      embeds: [buildWarnEmbed(interaction.guild.id)],
      components: buildWarnRows(),
    });
  }
}
