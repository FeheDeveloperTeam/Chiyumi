// /전적검색 공통 화면 부품: 경기 고르기 드롭다운, 모드 필터, 경기 상세의 이전/목록/다음/공유 버튼,
// 그리고 다음 검색 때 이전 메시지를 지우기 위한 토큰 보관.
//
// 화면 흐름(롤·발로란트 같음)
//   목록: 프로필 + 최근 경기 목록 → [모드 필터 버튼] + [🔎 경기 고르기 드롭다운]
//   상세: 고른 경기를 같은 메시지 안에서 보여 줌 → [◀ 이전 경기] [📋 목록으로] [다음 경기 ▶] [📢 채널에 공유]
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require("discord.js");

const MAX_PICK_OPTIONS = 25;

function relativeTime(timestamp) {
  if (!timestamp) return "";
  const diff = Date.now() - new Date(timestamp).getTime();
  if (!Number.isFinite(diff) || diff < 0) return "";
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "방금";
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  return `${Math.floor(hours / 24)}일 전`;
}

const clip = (text, max) => (text.length > max ? `${text.slice(0, max - 1)}…` : text);

// filters: [{ id, label }], active: 현재 필터 id. 고른 필터는 파란색으로 보여 지금 어떤 모드를 보는지 알 수 있게 한다.
function buildFilterRow(prefix, sessionId, filters, active) {
  if (filters.length <= 1) return null;
  return new ActionRowBuilder().addComponents(
    filters.slice(0, 5).map((f) =>
      new ButtonBuilder()
        .setCustomId(`${prefix}${sessionId}:${f.id}`)
        .setLabel(f.label)
        .setStyle(String(f.id) === String(active) ? ButtonStyle.Primary : ButtonStyle.Secondary),
    ),
  );
}

// items: [{ index, label, description, emoji }] — index는 세션 안 경기 번호
function buildMatchPicker(customId, items) {
  if (items.length === 0) return null;
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(customId)
      .setPlaceholder("🔎 자세히 볼 경기를 고르세요")
      .addOptions(
        items.slice(0, MAX_PICK_OPTIONS).map((item) => ({
          label: clip(item.label, 100),
          description: item.description ? clip(item.description, 100) : undefined,
          value: String(item.index),
          emoji: item.emoji || undefined,
        })),
      ),
  );
}

// order: 지금 목록(필터 적용)에 보이는 경기 번호 순서. 그 안에서 이전/다음으로 넘긴다.
function buildDetailNavRow({ navPrefix, backId, sharePrefix, sessionId, order, index }) {
  const pos = order.indexOf(index);
  const prev = pos > 0 ? order[pos - 1] : null;
  const next = pos >= 0 && pos < order.length - 1 ? order[pos + 1] : null;
  const counter = pos >= 0 ? ` (${pos + 1}/${order.length})` : "";

  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(prev == null ? `${navPrefix}${sessionId}:none-prev` : `${navPrefix}${sessionId}:${prev}`)
      .setLabel("◀ 이전 경기")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(prev == null),
    new ButtonBuilder()
      .setCustomId(backId)
      .setLabel(`📋 목록으로${counter}`)
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(next == null ? `${navPrefix}${sessionId}:none-next` : `${navPrefix}${sessionId}:${next}`)
      .setLabel("다음 경기 ▶")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(next == null),
    new ButtonBuilder()
      .setCustomId(`${sharePrefix}${sessionId}:${index}`)
      .setLabel("📢 채널에 공유")
      .setStyle(ButtonStyle.Success),
  );
}

// ---- 다음 검색 때 이전 메시지(게임 선택·검색 결과)를 지운다.
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

// 모달 제출 시점에 게임 선택 메시지는 더 이상 필요 없으니 지운다.
async function deleteGamePicker(interaction) {
  const prev = userStatsTokens.get(interaction.user.id);
  if (prev?.cmdToken) {
    userStatsTokens.set(interaction.user.id, { applicationId: prev.applicationId });
    await tryDeleteInteractionMsg(interaction.client, prev.applicationId, prev.cmdToken);
  }
}

function rememberStatsMessage(interaction) {
  userStatsTokens.set(interaction.user.id, {
    applicationId: interaction.applicationId,
    statsToken: interaction.token,
  });
}

module.exports = {
  relativeTime,
  buildFilterRow,
  buildMatchPicker,
  buildDetailNavRow,
  userStatsTokens,
  cleanupUserStats,
  deleteGamePicker,
  rememberStatsMessage,
};
