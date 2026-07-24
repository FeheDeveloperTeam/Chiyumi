const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
);

const MAX_HISTORY = 20;

async function loadHistory(channelId) {
  const { data, error } = await supabase
    .from("chat_history")
    .select("role, content")
    .eq("channel_id", channelId)
    .order("created_at", { ascending: false })
    .limit(MAX_HISTORY);

  if (error) { console.log("[Supabase] 히스토리 로드 실패:", error.message); return []; }
  return (data ?? []).reverse();
}

async function saveMessages(channelId, messages) {
  const rows = messages.map((m) => ({ channel_id: channelId, role: m.role, content: m.content }));
  const { error } = await supabase.from("chat_history").insert(rows);
  if (error) console.log("[Supabase] 메시지 저장 실패:", error.message);
}

async function pruneHistory(channelId) {
  const { data } = await supabase
    .from("chat_history")
    .select("id")
    .eq("channel_id", channelId)
    .order("created_at", { ascending: false })
    .range(MAX_HISTORY, 10000);

  if (data?.length) {
    const ids = data.map((r) => r.id);
    await supabase.from("chat_history").delete().in("id", ids);
  }
}

module.exports = { loadHistory, saveMessages, pruneHistory };
