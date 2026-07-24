const { createClient } = require("@supabase/supabase-js");
const { WebSocket } = require("ws");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY,
  { realtime: { transport: WebSocket } }
);

const memoriesCache = new Map();

async function saveMemory(channelId, content) {
  const { error } = await supabase
    .from("memories")
    .insert({ channel_id: channelId, content });
  if (error) { console.log("[Supabase] 기억 저장 실패:", error.message); return false; }
  memoriesCache.delete(channelId);
  return true;
}

async function getMemories(channelId) {
  if (!memoriesCache.has(channelId)) {
    const { data, error } = await supabase
      .from("memories")
      .select("content")
      .eq("channel_id", channelId)
      .order("created_at", { ascending: true });
    if (error) { console.log("[Supabase] 기억 로드 실패:", error.message); }
    memoriesCache.set(channelId, error ? [] : (data ?? []).map((r) => r.content));
  }
  return memoriesCache.get(channelId);
}

async function getMemoriesWithIds(channelId) {
  const { data, error } = await supabase
    .from("memories")
    .select("id, content")
    .eq("channel_id", channelId)
    .order("created_at", { ascending: true });
  if (error) { console.log("[Supabase] 기억 목록 실패:", error.message); return []; }
  return data ?? [];
}

async function deleteMemory(channelId, id) {
  const { error } = await supabase.from("memories").delete().eq("id", id);
  if (error) { console.log("[Supabase] 기억 삭제 실패:", error.message); return false; }
  memoriesCache.delete(channelId);
  return true;
}

async function updateMemory(channelId, id, content) {
  const { error } = await supabase.from("memories").update({ content }).eq("id", id);
  if (error) { console.log("[Supabase] 기억 수정 실패:", error.message); return false; }
  memoriesCache.delete(channelId);
  return true;
}

async function deleteAllMemories(channelId) {
  const { error } = await supabase.from("memories").delete().eq("channel_id", channelId);
  if (error) { console.log("[Supabase] 전체 기억 삭제 실패:", error.message); return false; }
  memoriesCache.delete(channelId);
  return true;
}

module.exports = { saveMemory, getMemories, getMemoriesWithIds, deleteMemory, updateMemory, deleteAllMemories };
