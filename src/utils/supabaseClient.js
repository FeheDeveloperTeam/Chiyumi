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

module.exports = { saveMemory, getMemories };
