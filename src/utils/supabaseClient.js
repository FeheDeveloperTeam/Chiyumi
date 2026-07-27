const { createClient } = require("@supabase/supabase-js");
const { WebSocket } = require("ws");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY,
  { realtime: { transport: WebSocket } }
);

const memoriesCache = new Map();
const MEMORY_LIMIT = 10;

function clearUserCache(userId) {
  memoriesCache.delete(userId);
}

async function saveMemory(channelId, userId, content) {
  const { error } = await supabase
    .from("memories")
    .insert({ channel_id: channelId, user_id: userId, content });
  if (error) { console.log("[Supabase] 기억 저장 실패:", error.message); return false; }
  clearUserCache(userId);
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

async function getMemories(userId) {
  if (!memoriesCache.has(userId)) {
    const { data, error } = await supabase
      .from("memories")
      .select("content")
      .eq("user_id", userId)
      .order("created_at", { ascending: true });
    if (error) { console.log("[Supabase] 기억 로드 실패:", error.message); }
    memoriesCache.set(userId, error ? [] : (data ?? []).map((r) => r.content));
  }
  return memoriesCache.get(userId);
}

async function getMemoriesWithIds(channelId, userId) {
  const query = supabase
    .from("memories")
    .select("id, content")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  const { data, error } = await query;
  if (error) { console.log("[Supabase] 기억 목록 실패:", error.message); return []; }
  return data ?? [];
}

async function deleteMemory(userId, id) {
  const { error } = await supabase.from("memories").delete().eq("id", id);
  if (error) { console.log("[Supabase] 기억 삭제 실패:", error.message); return false; }
  clearUserCache(userId);
  return true;
}

async function updateMemory(userId, id, content) {
  const { error } = await supabase.from("memories").update({ content }).eq("id", id);
  if (error) { console.log("[Supabase] 기억 수정 실패:", error.message); return false; }
  clearUserCache(userId);
  return true;
}

async function deleteAllMemories(channelId, userId) {
  let query = supabase.from("memories").delete();
  if (userId) {
    query = query.eq("user_id", userId);
  } else {
    query = query.eq("channel_id", channelId);
  }
  const { error } = await query;
  if (error) { console.log("[Supabase] 전체 기억 삭제 실패:", error.message); return false; }
  if (userId) clearUserCache(userId);
  return true;
}

module.exports = {
  saveMemory, getMemories, getMemoriesWithIds,
  deleteMemory, updateMemory, deleteAllMemories,
  countUserMemories, MEMORY_LIMIT,
};
