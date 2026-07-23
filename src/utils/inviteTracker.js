const inviteCache = new Map(); // guildId → Map<code, uses>

async function cacheGuildInvites(guild) {
  try {
    const invites = await guild.invites.fetch();
    inviteCache.set(guild.id, new Map(invites.map((inv) => [inv.code, inv.uses ?? 0])));
  } catch {
    // MANAGE_GUILD 권한 없으면 무시
  }
}

async function findUsedInvite(guild) {
  try {
    const newInvites = await guild.invites.fetch();
    const cached = inviteCache.get(guild.id) ?? new Map();

    let usedInvite = null;
    for (const invite of newInvites.values()) {
      if ((invite.uses ?? 0) > (cached.get(invite.code) ?? 0)) {
        usedInvite = invite;
        break;
      }
    }

    inviteCache.set(guild.id, new Map(newInvites.map((inv) => [inv.code, inv.uses ?? 0])));
    return usedInvite?.inviter ?? null;
  } catch {
    return null;
  }
}

function onInviteCreate(invite) {
  const guildId = invite.guild?.id;
  if (!guildId) return;
  const cache = inviteCache.get(guildId) ?? new Map();
  cache.set(invite.code, invite.uses ?? 0);
  inviteCache.set(guildId, cache);
}

function onInviteDelete(invite) {
  const guildId = invite.guild?.id;
  if (!guildId) return;
  inviteCache.get(guildId)?.delete(invite.code);
}

module.exports = { cacheGuildInvites, findUsedInvite, onInviteCreate, onInviteDelete };
