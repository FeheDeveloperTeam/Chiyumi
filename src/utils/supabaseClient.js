const { createClient } = require("@supabase/supabase-js");
const { WebSocket } = require("ws");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY,
  { realtime: { transport: WebSocket } }
);

const memoriesCache = new Map();
const MEMORY_LIMIT = 10;

function clearChannelCache(channelId) {
  for (const key of memoriesCache.keys()) {
    if (key.startsWith(`${channelId}_`)) memoriesCache.delete(key);
  }
}

async function saveMemory(channelId, userId, content) {
  const { error } = await supabase
    .from("memories")
    .insert({ channel_id: channelId, user_id: userId, content });
  if (error) { console.log("[Supabase] 기억 저장 실패:", error.message); return false; }
  clearChannelCache(channelId);
  return true;
}

async function countUserMemories(userId) {
  const { count, error } = await supabase
    .from("memories")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);
  if (error) { console.log("[Supabase] 기억 카운트 실패:", error.message); return 0; }
  return count ?? 0;
}

async function getMemories(channelId, userId) {
  const key = `${channelId}_${userId ?? ""}`;
  if (!memoriesCache.has(key)) {
    let query = supabase
      .from("memories")
      .select("content")
      .eq("channel_id", channelId)
      .order("created_at", { ascending: true });
    if (userId) query = query.or(`user_id.eq.${userId},user_id.is.null`);
    const { data, error } = await query;
    if (error) { console.log("[Supabase] 기억 로드 실패:", error.message); }
    memoriesCache.set(key, error ? [] : (data ?? []).map((r) => r.content));
  }
  return memoriesCache.get(key);
}

async function getMemoriesWithIds(channelId, userId) {
  let query = supabase
    .from("memories")
    .select("id, content")
    .eq("channel_id", channelId)
    .order("created_at", { ascending: true });
  if (userId) query = query.eq("user_id", userId);
  const { data, error } = await query;
  if (error) { console.log("[Supabase] 기억 목록 실패:", error.message); return []; }
  return data ?? [];
}

async function deleteMemory(channelId, id) {
  const { error } = await supabase.from("memories").delete().eq("id", id);
  if (error) { console.log("[Supabase] 기억 삭제 실패:", error.message); return false; }
  clearChannelCache(channelId);
  return true;
}

async function updateMemory(channelId, id, content) {
  const { error } = await supabase.from("memories").update({ content }).eq("id", id);
  if (error) { console.log("[Supabase] 기억 수정 실패:", error.message); return false; }
  clearChannelCache(channelId);
  return true;
}

async function deleteAllMemories(channelId, userId) {
  let query = supabase.from("memories").delete().eq("channel_id", channelId);
  if (userId) query = query.eq("user_id", userId);
  const { error } = await query;
  if (error) { console.log("[Supabase] 전체 기억 삭제 실패:", error.message); return false; }
  clearChannelCache(channelId);
  return true;
}

module.exports = {
  saveMemory, getMemories, getMemoriesWithIds,
  deleteMemory, updateMemory, deleteAllMemories,
  countUserMemories, MEMORY_LIMIT,
};
