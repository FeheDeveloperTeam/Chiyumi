const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);

async function isRestricted(userId) {
  return Boolean(await getRestriction(userId));
}

async function getRestriction(userId) {
  const { data, error } = await supabase
    .from("restrictions")
    .select("reason, restricted_by, restricted_at")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) {
    console.log("[Supabase] 이용제한 조회 실패:", error.message);
    return null;
  }
  if (!data) return null;
  return {
    reason: data.reason,
    restrictedBy: data.restricted_by,
    restrictedAt: data.restricted_at,
  };
}

async function restrictUser(userId, reason, byId) {
  const { error } = await supabase.from("restrictions").upsert({
    user_id: userId,
    reason: reason || "사유 없음",
    restricted_by: byId,
    restricted_at: new Date().toISOString(),
  });
  if (error) console.log("[Supabase] 이용제한 등록 실패:", error.message);
}

async function unrestrictUser(userId) {
  const existed = Boolean(await getRestriction(userId));
  const { error } = await supabase.from("restrictions").delete().eq("user_id", userId);
  if (error) {
    console.log("[Supabase] 이용제한 해제 실패:", error.message);
    return false;
  }
  return existed;
}

module.exports = {
  isRestricted,
  getRestriction,
  restrictUser,
  unrestrictUser,
};
