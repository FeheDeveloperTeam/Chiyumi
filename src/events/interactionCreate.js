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
const { isDeveloper } = require("../utils/devUser");
const { buildBjEmbed } = require("../commands/blackjack");
const {
  drawCard,
  handTotal,
  getSession: getBjSession,
  deleteSession: deleteBjSession,
} = require("../utils/blackjack");

const COIN_ACTION_PREFIX = "coin-action:";
const BJ_ACTION_PREFIX = "bj-action:";
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
const COIN_DEV_MODAL_ID = "coin-dev-modal";
const DEFAULT_VERIFY_MESSAGE = nya("아래 버튼을 눌러 서버 인증을 완료하세요.");

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

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction) {
    if (interaction.isButton()) {
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

      await showDevGrantModal(interaction);
      return;
    }

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

async function showDevGrantModal(interaction) {
  const modal = new ModalBuilder()
    .setCustomId(COIN_DEV_MODAL_ID)
    .setTitle("코인 지급/차감");

  const userIdInput = new TextInputBuilder()
    .setCustomId("user_id")
    .setLabel("대상 사용자 ID")
    .setStyle(TextInputStyle.Short)
    .setRequired(true);

  const amountInput = new TextInputBuilder()
    .setCustomId("amount")
    .setLabel("금액 (지급은 양수, 차감은 음수)")
    .setStyle(TextInputStyle.Short)
    .setPlaceholder("예: 100 또는 -100")
    .setRequired(true);

  modal.addComponents(
    new ActionRowBuilder().addComponents(userIdInput),
    new ActionRowBuilder().addComponents(amountInput),
  );

  await interaction.showModal(modal);
}

async function handleDevGrantModal(interaction) {
  if (!isDeveloper(interaction.user.id)) {
    await interaction.reply({
      content: nya("이 기능은 개발자만 사용할 수 있습니다. (오류 코드: DEV-001)"),
      ephemeral: true,
    });
    return;
  }

  const targetUserId = interaction.fields.getTextInputValue("user_id").trim();
  const amountText = interaction.fields.getTextInputValue("amount").trim();
  const amount = Number(amountText);

  if (!/^\d{15,20}$/.test(targetUserId)) {
    await interaction.reply({
      content: nya("올바른 사용자 ID가 아닙니다. (오류 코드: DEV-002)"),
      ephemeral: true,
    });
    return;
  }

  if (!Number.isInteger(amount) || amount === 0) {
    await interaction.reply({
      content: nya("올바른 금액이 아닙니다. (오류 코드: DEV-003)"),
      ephemeral: true,
    });
    return;
  }

  const newBalance = addBalance(targetUserId, amount);
  const actionText = amount > 0 ? "지급" : "차감";

  await interaction.reply({
    content: nya(
      `<@${targetUserId}>님에게 ${Math.abs(amount)} 치유미코인을 ${actionText}했습니다. 현재 보유량: ${newBalance}개`,
    ),
    ephemeral: true,
  });
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
  if (interaction.customId === COIN_DEV_MODAL_ID) {
    await handleDevGrantModal(interaction);
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
